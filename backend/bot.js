import { Telegraf, Markup } from 'telegraf';
import dotenv from 'dotenv';
import { createWorker } from 'tesseract.js';
import { db } from './db.js';
import axios from 'axios';
import cron from 'node-cron';
import { generateWordReport } from './reportGenerator.js';

dotenv.config();

const token = process.env.BOT_TOKEN;
const webAppUrl = process.env.WEBAPP_URL || 'http://localhost:5173';

if (!token) {
  console.warn('⚠️ WARNING: BOT_TOKEN is not set in environmental variables! Telegram Bot will not start.');
}

export let bot = null;

// Helper to escape MarkdownV2 characters
function escapeMarkdown(text) {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

// Converts Uzbek text numbers ("ellik ming", "yigirma besh ming") to digits (e.g. 50000, 25000)
function replaceUzbekNumberWords(str) {
  const numberWords = {
    'bir': 1, 'ikki': 2, 'uch': 3, 'to\'rt': 4, 'besh': 5, 'olti': 6, 'yetti': 7, 'sakkiz': 8, 'to\'qqiz': 9, 'toqqiz': 9,
    'o\'n': 10, 'on': 10, 'yigirma': 20, 'o\'ttiz': 30, 'ottiz': 30, 'qirq': 40, 'ellik': 50, 'oltmish': 60, 'yetmish': 70, 'sakson': 80, 'to\'qson': 90, 'toqson': 90,
    'yuz': 100, 'ming': 1000, 'million': 1000000
  };

  const words = str.toLowerCase().split(/\s+/);
  let result = [];
  let currentNumber = 0;
  let accumulated = 0;
  let inNumberSequence = false;

  for (let i = 0; i < words.length; i++) {
    const word = words[i].replace(/[.,?!()]/g, ""); // Clean formatting punctuation
    const val = numberWords[word];

    if (val !== undefined) {
      inNumberSequence = true;
      if (val === 1000 || val === 1000000) {
        accumulated += (currentNumber || 1) * val;
        currentNumber = 0;
      } else if (val === 100) {
        currentNumber = (currentNumber || 1) * 100;
      } else {
        currentNumber += val;
      }
    } else {
      if (inNumberSequence) {
        result.push(accumulated + currentNumber);
        accumulated = 0;
        currentNumber = 0;
        inNumberSequence = false;
      }
      result.push(words[i]);
    }
  }

  if (inNumberSequence) {
    result.push(accumulated + currentNumber);
  }

  return result.join(' ');
}

// AI Transaction parser using Groq Llama-3 model
async function parseTransactionWithLLM(text, userId) {
  try {
    const groqToken = process.env.GROQ_API_KEY;
    if (!groqToken) throw new Error("GROQ_API_KEY is not set");

    // Fetch user's custom categories
    const userCategories = await db.getCategories(userId);
    const expenseCats = userCategories.filter(c => c.type === 'expense').map(c => c.name);
    const incomeCats = userCategories.filter(c => c.type === 'income').map(c => c.name);
    
    // Default categories if user hasn't set any
    const defaultExpense = ['Oziq-ovqat', 'Transport', 'Xaridlar', 'Kafe', 'Ko\'ngilochar', 'Kommunal', 'Sog\'liq', 'Ta\'lim', 'Xizmatlar', 'Boshqa'];
    const defaultIncome = ['Maosh', 'Biznes', 'Sovg\'alar', 'Boshqa'];
    
    const validExpense = expenseCats.length > 0 ? expenseCats : defaultExpense;
    const validIncome = incomeCats.length > 0 ? incomeCats : defaultIncome;

    const systemPrompt = `You are a financial assistant for an Uzbek user. 
    Analyze the following transcribed text from a voice message or raw text, and extract the transaction details.
    Respond ONLY with a valid raw JSON object. Do not wrap in markdown \`\`\`json blocks.
    
    Required JSON structure:
    {
      "amount": (Number, required. Extract the amount. Convert text numbers like "ellik ming" to 50000. If missing or unclear, return null),
      "type": (String, "income" or "expense". Default is expense unless words like maosh, foyda, biznes imply income),
      "category": (String, required. Must be EXACTLY ONE of the following:
         For expense: [${validExpense.join(', ')}]
         For income: [${validIncome.join(', ')}]
         If it doesn't fit well, use 'Boshqa'
      ),
      "description": (String. The rest of the words. e.g. "bozordan go'sht oldim")
    }`;

    const res = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ],
        temperature: 0.1
      },
      {
        headers: {
          "Authorization": `Bearer ${groqToken}`,
          "Content-Type": "application/json"
        }
      }
    );

    let content = res.data.choices[0].message.content.trim();
    if (content.startsWith('```json')) {
      content = content.replace(/```json/g, '').replace(/```/g, '').trim();
    } else if (content.startsWith('```')) {
      content = content.replace(/```/g, '').trim();
    }

    const parsed = JSON.parse(content);
    if (!parsed.amount || isNaN(parsed.amount)) return null;

    return {
      amount: parsed.amount,
      type: parsed.type === 'income' ? 'income' : 'expense',
      category: parsed.category || 'Boshqa',
      description: parsed.description || ''
    };
  } catch (error) {
    console.error("LLM Parsing error:", error.response?.data || error.message);
    return null; // Fallback to failing parsing
  }
}



export function initBot() {
  if (!token) return null;

  bot = new Telegraf(token);

  // Blocked check middleware
  bot.use(async (ctx, next) => {
    const userId = String(ctx.from?.id);
    if (!userId) return next();
    try {
      const settings = await db.getSettings(userId);
      if (settings && settings.is_blocked) {
        return ctx.reply("⚠️ Kechirasiz, siz botdan foydalanishdan bloklangansiz. Muammo yuzasidan adminga murojaat qiling.");
      }
    } catch (e) {
      console.error('Error in bot block check:', e);
    }
    
    // Premium check
    const isStart = ctx.message?.text?.startsWith('/start');
    const isGetId = ctx.message?.text?.startsWith('/getid');
    const isHelp = ctx.message?.text?.startsWith('/help');
    const isPayCallback = ctx.callbackQuery?.data === 'pay_receipt';
    
    if (!isStart && !isGetId && !isHelp && !isPayCallback && userId !== '123456') {
      try {
        const settings = await db.getSettings(userId);
        if (settings.premium_until && new Date(settings.premium_until) < new Date()) {
          const msg = `⚠️ Hurmatli foydalanuvchi, sizning obuna muddatingiz tugagan.

Botdan va ilovadan foydalanishni davom ettirish uchun oylik to'lovni amalga oshiring:
💳 Karta: 9860 3501 4637 6586 (Boqijonov Boburjon)
💵 Summa: 15 000 so'm

To'lovni amalga oshirgach, quyidagi tugmani bosing va chekni yuboring.`;
          
          if (ctx.callbackQuery) {
            try { await ctx.answerCbQuery(); } catch(e){}
            return ctx.editMessageText(msg, Markup.inlineKeyboard([[Markup.button.callback('To\'ladim ✅', 'pay_receipt')]]));
          } else {
            return ctx.reply(msg, Markup.inlineKeyboard([[Markup.button.callback('To\'ladim ✅', 'pay_receipt')]]));
          }
        }
      } catch (e) {
        console.error('Premium bot check error:', e);
      }
    }

    // Awaiting receipt state handle for text (if they just type something instead of sending photo)
    if (ctx.message?.text && !isStart && !isGetId && !isHelp) {
      const settings = await db.getSettings(userId);
      if (settings.awaiting_receipt) {
        return ctx.reply("Sizdan to'lov chekining rasmini (skrinshotini) kutmoqdaman. Iltimos, rasm yuboring.");
      }
    }
    
    return next();
  });

  // Get ID command for admins
  bot.command('getid', (ctx) => {
    ctx.reply(`Guruh / Chat ID: ${ctx.chat.id}`);
  });

  // Start command
  bot.start(async (ctx) => {
    const firstName = ctx.from.first_name || 'Foydalanuvchi';
    const userId = String(ctx.from.id);
    
    // Set 5-day trial if premium_until is null
    try {
      const settings = await db.getSettings(userId, firstName, ctx.from.username);
      if (!settings.premium_until) {
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 5);
        await db.updatePremiumStatus(userId, { premium_until: trialEnd.toISOString() });
        ctx.reply("🎁 Sizga botdan to'liq foydalanish uchun 5 kunlik Bepul muddat taqdim etildi!");
      }
    } catch(e) {
      console.log('Error setting trial', e);
    }

    const message = `👋 Assalomu alaykum, ${firstName}!

Sizning moliyaviy holatingizni to'liq nazorat qiluvchi Hisob-kitob botiga xush kelibsiz! Bu loyiha orqali o'z daromad va harajatlaringizni osongina hisob-kitob qilishingiz mumkin.

👇 Barcha qulayliklarni ko'rish uchun quyidagi 'Hisobni Ochish 📊' tugmasini bosing.

💡 Qo'llanma va bot haqida to'liq ma'lumot olish uchun /help buyrug'ini bosing!`;

    const keyboardButton = Markup.keyboard([
      [Markup.button.webApp('Hisobni Ochish 📊', webAppUrl)]
    ]).resize();

    const inlineButton = Markup.inlineKeyboard([
      [Markup.button.webApp('Mini App-ni ochish 📱', webAppUrl)]
    ]);

    ctx.replyWithMarkdownV2(
      escapeMarkdown(message),
      {
        reply_markup: {
          inline_keyboard: inlineButton.reply_markup.inline_keyboard,
          keyboard: keyboardButton.reply_markup.keyboard,
          resize_keyboard: true
        }
      }
    );
  });

  // Help command with language selection
  bot.help((ctx) => {
    const message = `Qaysi tilda yordam kerak? 🌐\nНа каком языке нужна помощь?\nIn which language do you need help?`;
    
    const inlineButton = Markup.inlineKeyboard([
      [
        Markup.button.callback('🇺🇿 O\'zbekcha', 'help_uz'),
        Markup.button.callback('🇷🇺 Русский', 'help_ru'),
        Markup.button.callback('🇬🇧 English', 'help_en')
      ]
    ]);
    
    ctx.reply(message, inlineButton);
  });

  // Help actions for each language
  bot.action('help_uz', async (ctx) => {
    try { await ctx.answerCbQuery(); } catch (e) {}
    const text = `🤖 Hisob-kitob Boti Yordamnomasi

Bu loyiha sizning moliyaviy holatingizni to'liq nazorat qilish uchun yordam beruvchi eng zamonaviy vositadir.

Asosiy Imkoniyatlar (Mini App):
📊 Dashboard & Statistika: Barcha daromad va harajatlaringizni chiroyli grafiklarda ko'rish.
💳 Xazna (Vault): Alohida jamg'arma hisobini yuritish.
🔄 Doimiy To'lovlar: Internet, Netflix yoki kommunal to'lovlaringizni kiritib qo'ysangiz, bot sizga 1 kun oldin eslatadi.
🤝 Umumiy Hisob (Shared): Oilangiz yoki sherigingiz bilan bitta hisobni birga ishlatish.
💵 Qarz Daftari: Kimdan qarz oldingiz, kimga berdingiz — barchasini eslatma bilan yozib borish.
📥 Eksport: Hisobotlarni PDF, CSV yoki JSON formatida yuklab olish imkoni.
🧠 AI Maslahatlar: Sun'iy intellekt sizning xarajatlaringizni tahlil qilib maslahat beradi.

Bot orqali tezkor yozish usullari:
✍️ Matn orqali: \`50000 taksi\` yoki \`+1500000 oylik\` deb yozish kifoya.
🎙 Ovozli yozish: Ovozli xabar yuborib kiritishingiz ham mumkin! (Masalan: "Taksi yigirma ming so'm")
📸 Chek Skaner: Xarid qilingan chek rasmini botga yuboring, AI uni avtomat o'qiydi va bazaga qo'shadi!

/start - Botni qayta ishga tushirish
/backup - Barcha ma'lumotlarni JSON qilib yuklab olish

👨‍💻 Qo'shimcha savollar va takliflar uchun: @Boqijonovv
`;
    ctx.editMessageText(escapeMarkdown(text), { parse_mode: 'MarkdownV2', reply_markup: Markup.inlineKeyboard([[Markup.button.webApp('Mini App-ni ochish 📱', webAppUrl)]]).reply_markup });
  });

  bot.action('help_ru', async (ctx) => {
    try { await ctx.answerCbQuery(); } catch (e) {}
    const text = `🤖 Руководство по боту

Этот проект - самый современный инструмент для полного контроля за вашими финансами.

Основные функции (Mini App):
📊 Дашборд и Статистика: Красивые графики ваших доходов и расходов.
💳 Сейф (Vault): Ведение отдельного сберегательного счета.
🔄 Регулярные платежи: Добавьте свои счета за Интернет или Netflix, и бот напомнит вам за 1 день до оплаты.
🤝 Общий счет: Используйте один счет вместе с семьей или партнером.
💵 Долговая книга: Учет долгов с автоматическими напоминаниями.
📥 Экспорт: Выгрузка отчетов в PDF, CSV или JSON.
🧠 ИИ Советы: Искусственный интеллект анализирует ваши расходы и дает советы.

Быстрый ввод через бота:
✍️ Текстом: Просто напишите \`50000 такси\` или \`+1500000 зарплата\`.
🎙 Голосом: Отправьте голосовое сообщение! (Например: "Такси двадцать тысяч")
📸 Скан чека: Отправьте фото чека, ИИ автоматически распознает его и добавит в базу!

/start - Перезапустить бота
/backup - Скачать все данные в JSON

👨‍💻 Дополнительные вопросы и предложения: @Boqijonovv
`;
    ctx.editMessageText(escapeMarkdown(text), { parse_mode: 'MarkdownV2', reply_markup: Markup.inlineKeyboard([[Markup.button.webApp('Открыть Mini App 📱', webAppUrl)]]).reply_markup });
  });

  bot.action('help_en', async (ctx) => {
    try { await ctx.answerCbQuery(); } catch (e) {}
    const text = `🤖 Bot User Guide

This project is the ultimate modern tool to help you fully control your financial life.

Main Features (Mini App):
📊 Dashboard & Analytics: View all your income and expenses in beautiful charts.
💳 Vault: Manage a separate savings account.
🔄 Recurring Payments: Add your Internet or Netflix bills, and the bot will remind you 1 day before.
🤝 Shared Account: Share a single account with your family or partner.
💵 Debt Tracker: Track who owes you and who you owe, with reminders.
📥 Exporting: Download reports in PDF, CSV, or JSON format.
🧠 AI Insights: Artificial Intelligence analyzes your spending and provides advice.

Quick Input via Bot:
✍️ By Text: Just type \`50000 taxi\` or \`+1500000 salary\`.
🎙 By Voice: Send a voice message! (e.g. "Taxi twenty thousand")
📸 Receipt Scanner: Send a photo of a receipt, the AI will automatically read it and add it to your database!

/start - Restart the bot
/backup - Download all data as JSON

👨‍💻 For additional questions and feedback: @Boqijonovv
`;
    ctx.editMessageText(escapeMarkdown(text), { parse_mode: 'MarkdownV2', reply_markup: Markup.inlineKeyboard([[Markup.button.webApp('Open Mini App 📱', webAppUrl)]]).reply_markup });
    ctx.editMessageText(escapeMarkdown(text), { parse_mode: 'MarkdownV2', reply_markup: Markup.inlineKeyboard([[Markup.button.webApp('Open Mini App 📱', webAppUrl)]]).reply_markup });
  });

  // Pay receipt action (Obuna)
  bot.action('pay_receipt', async (ctx) => {
    try { await ctx.answerCbQuery(); } catch(e) {}
    const msg = `Iltimos, to'lovni tasdiqlovchi chek (skrinshot yoki rasm) ni quyidagi adminga yuboring:\n👉 @Boqijonovv\n\nChekni yuborib bo'lgach, pastdagi "Jo'natdim ✅" tugmasini bosing.`;
    ctx.reply(msg, Markup.inlineKeyboard([[Markup.button.callback("Jo'natdim ✅", 'receipt_sent')]]));
  });

  // Receipt sent action
  bot.action('receipt_sent', async (ctx) => {
    const userId = String(ctx.from.id);
    try { await ctx.answerCbQuery(); } catch(e) {}
    
    // Automatically grant 30 days
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 30);
    await db.updatePremiumStatus(userId, { premium_until: trialEnd.toISOString(), awaiting_receipt: false });
    
    ctx.reply("✅ Obuna muvaffaqiyatli qabul qilindi! Botdan to'liq foydalanishga ruxsat berildi. (Agar chek yubormagan bo'lsangiz yoki chek qalbaki bo'lsa, obunangiz admin tomonidan bloklanishi mumkin).");
    
    const ADMIN_GROUP_ID = process.env.ADMIN_GROUP_ID || ''; 
    if (ADMIN_GROUP_ID) {
      try {
        await ctx.telegram.sendMessage(ADMIN_GROUP_ID, `📝 Foydalanuvchi ${ctx.from.first_name} (@${ctx.from.username || 'yoq'}) "Jo'natdim ✅" tugmasini bosdi va o'ziga 1 oy obuna oldi. Iltimos chekini @Boqijonovv orqali tekshiring.`);
      } catch (e) {
        console.error('Failed to notify admin group', e);
      }
    }
  });

  // Handle photos (general)
  bot.on('photo', async (ctx) => {
    ctx.reply("Rasm qabul qilindi. Hozirda rasm asosida tranzaksiyalarni qo'shish funksiyasi AI yordamida tez orada to'liq ishga tushadi.");
  });

  // Backup command
  bot.command('backup', async (ctx) => {
    const userId = String(ctx.from.id);
    try {
      const { data: transactions } = await db.getTransactions(userId);
      const settings = await db.getSettings(userId);
      
      if (!transactions || transactions.length === 0) {
        return ctx.reply("Sizda hali hech qanday tranzaksiyalar mavjud emas. Hisobot fayli yaratilmadi.");
      }

      // Sort transactions by date ascending
      const sortedTx = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
      
      const startDate = new Date(sortedTx[0].date).toLocaleDateString('uz-UZ');
      const endDate = new Date(sortedTx[sortedTx.length - 1].date).toLocaleDateString('uz-UZ');
      
      // Generate Word Document
      const buffer = await generateWordReport(sortedTx, settings, `${startDate} dan ${endDate} gacha`);

      await ctx.replyWithDocument(
        { source: buffer, filename: `hisobot_${userId}.docx` },
        { caption: `📊 Sizning barcha tranzaksiyalaringiz Word hisoboti.\nDavr: ${startDate} - ${endDate}` }
      );
    } catch (error) {
      console.error('Backup creation error:', error);
      ctx.reply("❌ Zaxira nusxasini yaratishda xatolik yuz berdi. Iltimos keyinroq urinib ko'ring.");
    }
  });

  // Handle voice messages (Speech-to-Text via Hugging Face Whisper API)
  bot.on('voice', async (ctx) => {
    const voice = ctx.message.voice;
    const fileId = voice.file_id;
    const userId = String(ctx.from.id);

    const progressMsg = await ctx.reply("🎙 Ovozli xabar eshitilmoqda, tahlil qilinmoqda...");

    try {
      const groqToken = process.env.GROQ_API_KEY;
      if (!groqToken) {
        return ctx.telegram.editMessageText(
          ctx.chat.id,
          progressMsg.message_id,
          null,
          "⚠️ Ovozli xabarlar bilan ishlash uchun GROQ_API_KEY o'rnatilishi shart."
        ).catch(() => {});
      }

      // Download file stream
      let audioBuffer;
      try {
        const fileLink = await ctx.telegram.getFileLink(fileId);
        const audioRes = await axios.get(fileLink.href, { responseType: 'arraybuffer' });
        audioBuffer = audioRes.data;
      } catch (err) {
        throw new Error(`Telegram API dan fayl yuklashda xatolik: ${err.message}`);
      }

      // Submit to Groq Whisper Large v3
      let transcribedText = "";
      try {
        const blob = new Blob([audioBuffer], { type: 'audio/ogg' });
        const formData = new FormData();
        formData.append('file', blob, 'audio.ogg');
        formData.append('model', 'whisper-large-v3');
        formData.append('language', 'uz');
        formData.append('response_format', 'json');

        const groqRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${groqToken}`
          },
          body: formData
        });

        if (!groqRes.ok) {
          const errData = await groqRes.text();
          throw new Error(`Groq API xatosi (${groqRes.status}): ${errData}`);
        }

        const hfData = await groqRes.json();
        transcribedText = hfData.text || "";
      } catch (err) {
        throw new Error(`Groq serveriga ulanishda xatolik: ${err.message}`);
      }

      if (!transcribedText.trim()) {
        return ctx.telegram.editMessageText(
          ctx.chat.id,
          progressMsg.message_id,
          null,
          "🎙 Ovozli xabardan hech narsa tushunib bo'lmadi. Iltimos, aniqroq va balandroq gapiring."
        );
      }

      const parsed = await parseTransactionWithLLM(transcribedText, userId);
      if (!parsed) {
        return ctx.telegram.editMessageText(
          ctx.chat.id,
          progressMsg.message_id,
          null,
          `🎙 *Eshitildi:* "${transcribedText}"\n\n⚠️ Matndan xarajat miqdori (summasi) aniqlanmadi. Masalan: "ellik ming non" yoki "taksi o'ttiz ming" deb gapiring.`
        );
      }

      const tx = await db.addTransaction(userId, parsed);
      const formattedAmount = new Intl.NumberFormat('uz-UZ').format(tx.amount);
      const settings = await db.getSettings(userId);
      const currency = settings.currency || 'UZS';

      const typeLabel = tx.type === 'income' ? '🟢 Daromad' : '🔴 Harajat';
      
      const successMessage = `🎙 *Ovozli xabar saqlandi!*
💬 *Eshitildi:* "${transcribedText}"

📌 *Turi:* ${typeLabel}
💰 *Miqdor:* ${formattedAmount} ${currency}
🗂 *Kategoriya:* ${tx.category === 'Maosh' ? 'Daromad' : tx.category}
📝 *Izoh:* ${tx.description || '-'}`;

      await ctx.telegram.editMessageText(
        ctx.chat.id,
        progressMsg.message_id,
        null,
        escapeMarkdown(successMessage),
        { parse_mode: 'MarkdownV2' }
      );

      // Check budget limits
      if (tx.type === 'expense') {
        const stats = await db.getStats(userId);
        if (stats.budget > 0 && stats.totalExpense > stats.budget) {
          const warningMessage = `🚨 *OGOHLANTIRISH! (Byudjet Limiti)*
Siz belgilagan oylik harajatlar limiti (${new Intl.NumberFormat('uz-UZ').format(stats.budget)} ${currency}) oshib ketdi!
📈 *Joriy oylik harajatlar:* ${new Intl.NumberFormat('uz-UZ').format(stats.totalExpense)} ${currency}`;
          
          setTimeout(() => {
            ctx.replyWithMarkdownV2(escapeMarkdown(warningMessage)).catch(e => console.error(e));
          }, 1000);
        }
      }

    } catch (error) {
      console.error('Speech-to-Text error:', error);
      ctx.telegram.editMessageText(
        ctx.chat.id,
        progressMsg.message_id,
        null,
        `❌ Ovozli xabarni tahlil qilishda xatolik yuz berdi: ${error.message || error}`
      ).catch(() => {});
    }
  });

  // Handle photo uploads (Receipt scanning OCR)
  bot.on('photo', async (ctx) => {
    const photo = ctx.message.photo;
    const fileId = photo[photo.length - 1].file_id; // Max resolution
    const userId = String(ctx.from.id);

    const progressMsg = await ctx.reply("📸 Chek rasmi qabul qilindi. Matn skanerlanmoqda...");

    try {
      const groqToken = process.env.GROQ_API_KEY;
      if (!groqToken) throw new Error("GROQ_API_KEY is not set");

      const fileLink = await ctx.telegram.getFileLink(fileId);
      
      // Download image and convert to base64
      const imageRes = await axios.get(fileLink.href, { responseType: 'arraybuffer' });
      const base64Image = Buffer.from(imageRes.data).toString('base64');
      const dataUrl = `data:image/jpeg;base64,${base64Image}`;

      // Call Groq Vision API
      const groqRes = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: "llama-3.2-90b-vision-preview",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: "Look at this receipt. Extract ONLY the final total amount paid as a raw number. Do not include any currency symbols or text." },
                { type: "image_url", image_url: { url: dataUrl } }
              ]
            }
          ],
          temperature: 0.1
        },
        {
          headers: {
            "Authorization": `Bearer ${groqToken}`,
            "Content-Type": "application/json"
          }
        }
      );

      const content = groqRes.data.choices[0].message.content.trim();
      const amount = parseFloat(content.replace(/[^\d.]/g, ''));

      if (!amount || amount <= 0) {
        return ctx.telegram.editMessageText(
          ctx.chat.id,
          progressMsg.message_id,
          null,
          "📸 Chekdan summa aniqlanmadi. Iltimos rasmni aniqroq qilib yuboring yoki xarajatni matn ko'rinishida yozing."
        );
      }

      const tx = await db.addTransaction(userId, {
        amount,
        type: 'expense',
        category: 'Boshqa',
        description: 'Chek skaneri orqali'
      });

      const formattedAmount = new Intl.NumberFormat('uz-UZ').format(tx.amount);
      const settings = await db.getSettings(userId);
      const currency = settings.currency || 'UZS';

      const successMessage = `📸 *Chek muvaffaqiyatli saqlandi!*

🔴 *Turi:* Harajat
💰 *Miqdor:* ${formattedAmount} ${currency}
🗂 *Kategoriya:* Boshqa
📝 *Izoh:* Chek skaneri orqali`;

      await ctx.telegram.editMessageText(
        ctx.chat.id,
        progressMsg.message_id,
        null,
        escapeMarkdown(successMessage),
        { parse_mode: 'MarkdownV2' }
      );

      // Check budget
      if (tx.type === 'expense') {
        const stats = await db.getStats(userId);
        if (stats.budget > 0 && stats.totalExpense > stats.budget) {
          const warningMessage = `🚨 *OGOHLANTIRISH! (Byudjet Limiti)*
Siz belgilagan oylik harajatlar limiti (${new Intl.NumberFormat('uz-UZ').format(stats.budget)} ${currency}) oshib ketdi!
📈 *Joriy oylik harajatlar:* ${new Intl.NumberFormat('uz-UZ').format(stats.totalExpense)} ${currency}`;
          
          setTimeout(() => {
            ctx.replyWithMarkdownV2(escapeMarkdown(warningMessage)).catch(e => console.error(e));
          }, 1000);
        }
      }

    } catch (error) {
      console.error('Receipt OCR error:', error);
      ctx.telegram.editMessageText(
        ctx.chat.id,
        progressMsg.message_id,
        null,
        "❌ Chek rasmini skanerlashda xatolik yuz berdi. Iltimos keyinroq urinib ko'ring."
      );
    }
  });

  // Handle all other text messages (Direct text logging)
  bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    const userId = String(ctx.from.id);

    if (text.startsWith('/')) return;

    const parsed = await parseTransactionWithLLM(text, userId);
    if (!parsed) {
      return ctx.reply("Tushunarsiz format. Harajat yozish uchun masalan: '50000 taksi' yoki daromad uchun '+100000 maosh' ko'rinishida yuboring. Yordam uchun /help bosing.");
    }

    try {
      const tx = await db.addTransaction(userId, parsed);
      const formattedAmount = new Intl.NumberFormat('uz-UZ').format(tx.amount);
      const settings = await db.getSettings(userId);
      const currency = settings.currency || 'UZS';

      const typeLabel = tx.type === 'income' ? '🟢 Daromad' : '🔴 Harajat';
      
      const successMessage = `✅ *Muvaffaqiyatli qo'shildi!*

📌 *Turi:* ${typeLabel}
💰 *Miqdor:* ${formattedAmount} ${currency}
🗂 *Kategoriya:* ${tx.category === 'Maosh' ? 'Daromad' : tx.category}
📝 *Izoh:* ${tx.description || '-'}

Hisoblarni ko'rish uchun Mini App-ni oching!`;

      await ctx.replyWithMarkdownV2(escapeMarkdown(successMessage));

      if (tx.type === 'expense') {
        const stats = await db.getStats(userId);
        if (stats.budget > 0 && stats.totalExpense > stats.budget) {
          const warningMessage = `🚨 *OGOHLANTIRISH! (Byudjet Limiti)*
Siz belgilagan oylik harajatlar limiti (${new Intl.NumberFormat('uz-UZ').format(stats.budget)} ${currency}) oshib ketdi!
📈 *Joriy oylik harajatlar:* ${new Intl.NumberFormat('uz-UZ').format(stats.totalExpense)} ${currency}`;
          
          setTimeout(() => {
            ctx.replyWithMarkdownV2(escapeMarkdown(warningMessage)).catch(e => console.error(e));
          }, 1000);
        }
      }
    } catch (error) {
      console.error('Error saving transaction from bot text:', error);
      ctx.reply("❌ Ma'lumotlarni saqlashda serverda xatolik yuz berdi. Iltimos keyinroq urinib ko'ring.");
    }
  });

  // Handle errors
  bot.catch((err, ctx) => {
    console.error(`Telegraf error for ${ctx.updateType}`, err);
  });

  // Launch bot
  bot.launch()
    .then(() => {
      console.log('🚀 Telegram Bot muvaffaqiyatli ishga tushdi!');
      initCronJobs(); // Start cron jobs
    })
    .catch((err) => console.error('❌ Telegram Botni ishga tushirishda xato:', err.message));

  process.once('SIGINT', () => bot && bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot && bot.stop('SIGTERM'));

  return bot;
}

// Programmatic alert sender
export async function sendBudgetAlert(userId, totalExpense, budget, currency) {
  if (!bot) return;
  try {
    const formattedExpense = new Intl.NumberFormat('uz-UZ').format(totalExpense);
    const formattedBudget = new Intl.NumberFormat('uz-UZ').format(budget);
    
    const message = `🚨 *OGOHLANTIRISH! (Byudjet Limiti)*
Mini App orqali kiritilgan harajat natijasida belgilangan limit (${formattedBudget} ${currency}) oshib ketdi!

📊 *Jami harajatlar:* ${formattedExpense} ${currency}
💸 *Oshib ketgan summa:* ${new Intl.NumberFormat('uz-UZ').format(totalExpense - budget)} ${currency}

Tejamkor bo'lishni tavsiya qilamiz! 📉`;
    
    await bot.telegram.sendMessage(userId, escapeMarkdown(message), { parse_mode: 'MarkdownV2' });
  } catch (error) {
    console.error('Error sending budget alert via webhook:', error);
  }
}

// Programmatic message broadcaster to all bot users
export async function broadcastMessage(message) {
  if (!bot) return { success: false, error: 'Bot is not running' };
  
  try {
    const users = await db.getAllUserSettings();
    let successCount = 0;
    let failCount = 0;
    
    for (const user of users) {
      if (user.user_id === '123456') continue; // Skip dev fallback ID
      
      try {
        await bot.telegram.sendMessage(user.user_id, message);
        successCount++;
      } catch (err) {
        console.error(`Failed to send broadcast to ${user.user_id}:`, err.message);
        failCount++;
      }
    }
    return { success: true, successCount, failCount };
  } catch (error) {
    console.error('Error in broadcastMessage:', error);
    throw error;
  }
}

// CRON JOBS for Scheduled Tasks
export function initCronJobs() {
  // Run every day at 09:00 AM
  cron.schedule('0 9 * * *', async () => {
    if (!bot) return;
    try {
      console.log('⏰ Running daily debts cron job...');
      const today = new Date().toISOString().split('T')[0];
      const users = await db.getAllUserSettings();
      
      for (const user of users) {
        if (user.user_id === '123456') continue;
        
        try {
          const debts = await db.getDebts(user.user_id);
          const dueDebts = debts.filter(d => !d.is_paid && d.due_date === today);
          
          for (const debt of dueDebts) {
            const formattedAmount = new Intl.NumberFormat('uz-UZ').format(debt.amount);
            const typeStr = debt.type === 'given' ? 'qarzni qaytarib olishingiz' : 'qarzni qaytarishingiz';
            
            const message = `🔔 *Eslatma\\! \\(Qarz daftari\\)*\n\nBugun *${escapeMarkdown(debt.person_name)}* bilan hisob\\-kitob qilish muddati yetib keldi\\!\n\n💰 Summa: *${escapeMarkdown(formattedAmount)}*\n📝 Holati: Siz bu odamdan ${escapeMarkdown(typeStr)} kerak\\.`;
            
            await bot.telegram.sendMessage(user.user_id, message, { parse_mode: 'MarkdownV2' });
          }
          // Subscriptions (Recurring) logic
          try {
            const subs = await db.getRecurringTransactions(user.user_id);
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowDay = tomorrow.getDate().toString();
            
            const dueSubs = subs.filter(s => s.cron_expression === tomorrowDay);
            
            for (const sub of dueSubs) {
              const formattedAmount = new Intl.NumberFormat('uz-UZ').format(sub.amount);
              const message = `🔔 *Eslatma\\! \\(Doimiy to'lov\\)*\n\nErtaga *${escapeMarkdown(sub.category)}* uchun *${escapeMarkdown(formattedAmount)}* so'm to'lashingiz kerak\\!`;
              await bot.telegram.sendMessage(user.user_id, message, { parse_mode: 'MarkdownV2' });
            }
          } catch (e) {
            console.error(`Error processing subscriptions for user ${user.user_id}:`, e);
          }

        } catch (e) {
          console.error(`Error processing debts for user ${user.user_id}:`, e);
        }
      }
    } catch (error) {
      console.error('Error in daily cron job execution:', error);
    }
  });

  // Weekly Word Report (Sunday 23:59)
  cron.schedule('59 23 * * 0', async () => {
    if (!bot) return;
    try {
      console.log('⏰ Running weekly word report cron job...');
      const users = await db.getAllUserSettings();
      for (const user of users) {
        if (user.user_id === '123456') continue;
        try {
          const { data: transactions } = await db.getTransactions(user.user_id);
          if (!transactions || transactions.length === 0) continue;

          // Filter for last 7 days
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
          
          const weeklyTx = transactions.filter(tx => new Date(tx.date) >= oneWeekAgo);
          if (weeklyTx.length === 0) continue;

          const startDate = oneWeekAgo.toLocaleDateString('uz-UZ');
          const endDate = new Date().toLocaleDateString('uz-UZ');
          
          const buffer = await generateWordReport(weeklyTx, null, `${startDate} - ${endDate}`);
          
          await bot.telegram.sendDocument(
            user.user_id,
            { source: buffer, filename: `Haftalik_Hisobot_${endDate}.docx` },
            { caption: `📊 Sizning haftalik moliyaviy hisobotingiz (Word formati).\nDavr: ${startDate} - ${endDate}` }
          );
        } catch (e) {
          console.error(`Error generating weekly report for ${user.user_id}:`, e);
        }
      }
    } catch (error) {
      console.error('Error in weekly cron job execution:', error);
    }
  });

  // Monthly Word Report (1st day of the month at 00:00)
  cron.schedule('0 0 1 * *', async () => {
    if (!bot) return;
    try {
      console.log('⏰ Running monthly word report cron job...');
      const users = await db.getAllUserSettings();
      for (const user of users) {
        if (user.user_id === '123456') continue;
        try {
          const { data: transactions } = await db.getTransactions(user.user_id);
          if (!transactions || transactions.length === 0) continue;

          // Filter for last month
          const firstDayOfCurrentMonth = new Date();
          firstDayOfCurrentMonth.setDate(1);
          firstDayOfCurrentMonth.setHours(0,0,0,0);

          const firstDayOfLastMonth = new Date(firstDayOfCurrentMonth);
          firstDayOfLastMonth.setMonth(firstDayOfLastMonth.getMonth() - 1);

          const monthlyTx = transactions.filter(tx => {
            const d = new Date(tx.date);
            return d >= firstDayOfLastMonth && d < firstDayOfCurrentMonth;
          });
          
          if (monthlyTx.length === 0) continue;

          const periodName = `${firstDayOfLastMonth.toLocaleDateString('uz-UZ', { month: 'long', year: 'numeric' })} oyi uchun`;
          
          const buffer = await generateWordReport(monthlyTx, null, periodName);
          
          await bot.telegram.sendDocument(
            user.user_id,
            { source: buffer, filename: `Oylik_Hisobot_${firstDayOfLastMonth.getMonth()+1}.docx` },
            { caption: `📊 Sizning ${periodName} moliyaviy hisobotingiz (Word formati).` }
          );
        } catch (e) {
          console.error(`Error generating monthly report for ${user.user_id}:`, e);
        }
      }
    } catch (error) {
      console.error('Error in monthly cron job execution:', error);
    }
  });
}
