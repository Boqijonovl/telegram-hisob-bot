import { Telegraf, Markup } from 'telegraf';
import dotenv from 'dotenv';
import { createWorker } from 'tesseract.js';
import { db } from './db.js';
import axios from 'axios';
import cron from 'node-cron';
import * as XLSX from 'xlsx';

dotenv.config();

const token = process.env.BOT_TOKEN;
const webAppUrl = process.env.WEBAPP_URL || 'http://localhost:5173';

if (!token) {
  console.warn('⚠️ WARNING: BOT_TOKEN is not set in environmental variables! Telegram Bot will not start.');
}

let bot = null;

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
        model: "llama3-8b-8192",
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
    return next();
  });

  // Start command
  bot.start((ctx) => {
    const firstName = ctx.from.first_name || 'Foydalanuvchi';
    
    const message = `👋 *Assalomu alaykum, ${firstName}!*

Hisob-kitob botiga xush kelibsiz!

📊 *Mini App:* Pastdagi *'Hisobni Ochish 📊'* tugmasini bosing.
✍️ *Matn orqali:* \`50000 taksi\` yoki \`+150000 maosh\`
🎙 *Ovozli yozish:* Ovozli xabar yuborib kiritishingiz ham mumkin! (Masalan: *"Taksi yigirma ming so'm"*)
📸 *Chek Skaner:* Chek rasmini yuboring, bazaga avtomatik saqlaymiz!
   
💾 *Zaxira yuklash:* /backup buyrug'ini bosing.`;

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

  // Help command
  bot.help((ctx) => {
    const message = `📋 *Botdan foydalanish bo'yicha yordam:*

1️⃣ *Mini App:* 'Hisobni Ochish' tugmasi yordamida chiroyli diagrammalar va hisobotlarni ko'ring.
2️⃣ *Matn va Ovoz formatlari:*
   • Ovozli xabarni yuboring: *"Taksi ellik ming so'm uyga"*
   • Matnli xabarni yuboring: \`50000 taksi\`
3️⃣ *Cheklarni skanerlash:*
   • Chek rasmini (photo) to'g'ridan-to'g'ri botga yuboring. Matn skanerlanib, summasi harajatga yoziladi.
4️⃣ *Zaxira:* Ma'lumotlarni yuklash uchun /backup buyrug'ini yuboring.`;
    
    ctx.replyWithMarkdownV2(escapeMarkdown(message));
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
      
      let totalIncome = 0;
      let totalExpense = 0;

      const excelData = sortedTx.map(tx => {
        const amount = parseFloat(tx.amount);
        if (tx.type === 'income') totalIncome += amount;
        else totalExpense += amount;
        
        return {
          "Sana": new Date(tx.date).toLocaleString('uz-UZ'),
          "Turi": tx.type === 'income' ? 'Daromad' : 'Harajat',
          "Kategoriya": tx.category,
          "Summa": amount,
          "Izoh": tx.description || ''
        };
      });

      // Add empty row
      excelData.push({ "Sana": "", "Turi": "", "Kategoriya": "", "Summa": "", "Izoh": "" });
      
      // Add totals
      excelData.push({
        "Sana": `Davr: ${startDate} dan ${endDate} gacha`,
        "Turi": "",
        "Kategoriya": "Jami Daromad:",
        "Summa": totalIncome,
        "Izoh": ""
      });
      excelData.push({
        "Sana": "",
        "Turi": "",
        "Kategoriya": "Jami Harajat:",
        "Summa": totalExpense,
        "Izoh": ""
      });
      excelData.push({
        "Sana": "",
        "Turi": "",
        "Kategoriya": "Sof Qoldiq:",
        "Summa": totalIncome - totalExpense,
        "Izoh": ""
      });

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // Auto-size columns slightly
      const wscols = [
        {wch: 20}, // Sana
        {wch: 10}, // Turi
        {wch: 20}, // Kategoriya
        {wch: 15}, // Summa
        {wch: 30}  // Izoh
      ];
      worksheet['!cols'] = wscols;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Hisobot");

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      await ctx.replyWithDocument(
        { source: buffer, filename: `hisobot_${userId}.xlsx` },
        { caption: `📊 Sizning barcha tranzaksiyalaringiz Excel hisoboti.\nDavr: ${startDate} - ${endDate}` }
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
        } catch (e) {
          console.error(`Error processing debts for user ${user.user_id}:`, e);
        }
      }
    } catch (error) {
      console.error('Error in cron job execution:', error);
    }
  });
}
