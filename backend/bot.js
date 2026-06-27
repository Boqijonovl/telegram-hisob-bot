import { Telegraf, Markup } from 'telegraf';
import dotenv from 'dotenv';
import { createWorker } from 'tesseract.js';
import { db } from './db.js';

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

// Transaction parser from chat message text (finds amount at any position in the sentence)
function parseTransactionText(text) {
  // Convert word-based numbers to digits first (e.g. "ellik ming" -> "50000")
  const preparedText = replaceUzbekNumberWords(text);
  const parts = preparedText.trim().split(/\s+/);
  if (parts.length === 0) return null;

  let amount = NaN;
  let amountIndex = -1;
  let isIncome = false;

  // Search for the first valid number in the words list
  for (let i = 0; i < parts.length; i++) {
    let cleanWord = parts[i].replace(/[^\d+.-]/g, '');
    const incomeCheck = cleanWord.startsWith('+');
    if (incomeCheck || cleanWord.startsWith('-')) {
      cleanWord = cleanWord.substring(1);
    }
    const val = parseFloat(cleanWord);
    if (!isNaN(val) && val > 0) {
      amount = val;
      amountIndex = i;
      isIncome = incomeCheck;
      break;
    }
  }

  if (isNaN(amount)) return null;

  // Description is everything else excluding the parsed amount word
  const remaining = parts.filter((_, idx) => idx !== amountIndex);
  const remainingText = remaining.join(' ');
  const remainingLower = remainingText.toLowerCase();

  // Default parameters
  let category = isIncome ? 'Maosh' : 'Boshqa';
  let description = remainingText || (isIncome ? 'Kiritilgan daromad' : 'Kiritilgan harajat');

  // Keyword to category mappings
  const keywordMap = {
    'Oziq-ovqat': ['ovqat', 'tushlik', 'kechki', 'non', 'kafe', 'restoran', 'choyxona', 'shirinlik', 'bozor-ochar', 'supermarket', 'korzinka', 'makro', 'osh', 'fastfood', 'pitsa', 'somsa', 'burger'],
    'Transport': ['taksi', 'benzin', 'metro', 'avtobus', 'yo\'l', 'yol', 'zapravka', 'propan', 'metan', 'yandex', 'mashina', 'remont', 'moy', 'shina'],
    'Kommunal': ['svet', 'gaz', 'suv', 'arenda', 'ijara', 'uy', 'kvartira', 'issiq', 'internet', 'wifi', 'komunalka', 'payme', 'click'],
    'Xaridlar': ['kiyim', 'bozor', 'shopping', 'telefon', 'noutbuk', 'texnika', 'oyoq-kiyim', 'shim', 'kofta', 'ko\'zoynak', 'soat'],
    'Ko\'ngilochar': ['kino', 'teatr', 'oyin', 'o\'yin', 'konsert', 'park', 'attraksion', 'playstation', 'ps', 'klub', 'sayohat', 'dam'],
    'Sog\'liqni saqlash': ['dori', 'doktor', 'shifokor', 'apteka', 'kasal', 'klinika', 'tish', 'shifoxona', 'analiz'],
    'Ta\'lim': ['kurs', 'maktab', 'universitet', 'kitob', 'institut', 'repetitor', 'shartnoma', 'kontrakt', 'o\'quv', 'oquv'],
    'Sovg\'alar': ['sovg\'a', 'sovga', 'hadyalar', 'hadya', 'ehson', 'sadaqa', 'sovg\'alar']
  };

  if (isIncome) {
    category = 'Maosh'; // defaults for income
    if (remainingLower.includes('biznes') || remainingLower.includes('foyda') || remainingLower.includes('sotuv') || remainingLower.includes('kassa')) {
      category = 'Biznes';
    } else if (remainingLower.includes('sovga') || remainingLower.includes('sovg\'a') || remainingLower.includes('hadya') || remainingLower.includes('hadyalar')) {
      category = 'Sovg\'alar';
    } else if (remainingLower.includes('boshqa') || remainingLower.includes('mayda')) {
      category = 'Boshqa';
    }
  } else {
    // Check expense keywords
    for (const [catName, keywords] of Object.entries(keywordMap)) {
      const match = keywords.some(keyword => remainingLower.includes(keyword));
      if (match) {
        category = catName;
        break;
      }
    }
  }

  return {
    amount,
    type: isIncome ? 'income' : 'expense',
    category,
    description
  };
}

// Helper to filter out phone/date candidates from OCR text
function looksLikeDateOrPhone(num) {
  const str = String(num);
  if (str.length === 9 || str.length === 12) return true; // Phone formats
  if (str.startsWith('2025') || str.startsWith('2026')) return true; // Year formats
  return false;
}

// Receipt text parser to find final receipt amount
function parseReceiptAmount(text) {
  const lines = text.split('\n');
  const totalKeywords = ['jami', 'summa', 'total', 'itog', 'oplata', 'to\'lov', 'tlov', 'kas', 'kassa', 'xizmat', 'ittogo', 'itogo', 'itg', 'fiş', 'fis'];
  
  let candidates = [];

  for (const line of lines) {
    const lineLower = line.toLowerCase();
    const matchesKeyword = totalKeywords.some(keyword => lineLower.includes(keyword));
    
    if (matchesKeyword) {
      const matches = line.match(/\b\d+[\s.,]?\d*[\s.,]?\d+\b/g);
      if (matches) {
        matches.forEach(m => {
          const val = parseFloat(m.replace(/[^\d]/g, ''));
          if (val && val > 100 && val < 50000000) {
            candidates.push(val);
          }
        });
      }
    }
  }

  if (candidates.length > 0) {
    return Math.max(...candidates);
  }

  // Fallback: get largest number matching money criteria
  const allNumbers = text.match(/\b\d+[\s.,]?\d*[\s.,]?\d+\b/g);
  if (allNumbers) {
    const vals = allNumbers
      .map(m => parseFloat(m.replace(/[^\d]/g, '')))
      .filter(val => val && val > 100 && val < 10000000 && !looksLikeDateOrPhone(val));
    if (vals.length > 0) {
      return Math.max(...vals);
    }
  }

  return null;
}

export function initBot() {
  if (!token) return null;

  bot = new Telegraf(token);

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
      const transactions = await db.getTransactions(userId);
      const settings = await db.getSettings(userId);
      
      if (!transactions || transactions.length === 0) {
        return ctx.reply("Sizda hali hech qanday tranzaksiyalar mavjud emas. Zaxira fayli yaratilmadi.");
      }

      const backupData = {
        userId,
        timestamp: new Date().toISOString(),
        settings,
        transactions
      };

      const fileContent = JSON.stringify(backupData, null, 2);
      const buffer = Buffer.from(fileContent, 'utf-8');

      await ctx.replyWithDocument(
        { source: buffer, filename: `hisob_backup_${userId}.json` },
        { caption: "📊 Sizning barcha tranzaksiyalaringiz zaxira nusxasi (JSON formatida)." }
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
      const hfToken = process.env.HUGGINGFACE_TOKEN;
      if (!hfToken) {
        return ctx.telegram.editMessageText(
          ctx.chat.id,
          progressMsg.message_id,
          null,
          "⚠️ Ovozli xabarlar bilan ishlash uchun HUGGINGFACE_TOKEN o'rnatilishi shart. O'rnatish yo'riqnomasi uchun /help buyrug'ini bosing."
        );
      }

      // Download file stream
      const fileLink = await ctx.telegram.getFileLink(fileId);
      const audioRes = await fetch(fileLink.href);
      const audioBuffer = await audioRes.arrayBuffer();

      // Submit to Hugging Face Whisper Large v3 with load-recovery retries
      let retries = 5;
      const delay = 5000;
      let hfRes;
      let hfData;

      while (retries > 0) {
        hfRes = await fetch(
          "https://api-inference.huggingface.co/models/openai/whisper-large-v3",
          {
            headers: {
              Authorization: `Bearer ${hfToken}`,
              "Content-Type": "audio/ogg"
            },
            method: "POST",
            body: audioBuffer
          }
        );

        hfData = await hfRes.json().catch(() => ({}));

        if (hfRes.status === 503 && hfData.error && hfData.error.includes("loading")) {
          const waitSec = Math.round(hfData.estimated_time || 10);
          await ctx.telegram.editMessageText(
            ctx.chat.id,
            progressMsg.message_id,
            null,
            `🎙 Sun'iy intellekt modeli yuklanmoqda, iltimos ${waitSec} soniya kutib turing...`
          );
          // Wait and retry
          await new Promise(resolve => setTimeout(resolve, Math.max(waitSec * 1000, delay)));
          retries--;
        } else if (!hfRes.ok) {
          throw new Error(hfData.error || `Hugging Face returned status ${hfRes.status}`);
        } else {
          break;
        }
      }

      const transcribedText = hfData?.text || "";

      if (!transcribedText.trim()) {
        return ctx.telegram.editMessageText(
          ctx.chat.id,
          progressMsg.message_id,
          null,
          "🎙 Ovozli xabardan hech narsa tushunib bo'lmadi. Iltimos, aniqroq va balandroq gapiring."
        );
      }

      const parsed = parseTransactionText(transcribedText);
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
        "❌ Ovozli xabarni tahlil qilishda xatolik yuz berdi. Iltimos keyinroq urinib ko'ring."
      );
    }
  });

  // Handle photo uploads (Receipt scanning OCR)
  bot.on('photo', async (ctx) => {
    const photo = ctx.message.photo;
    const fileId = photo[photo.length - 1].file_id; // Max resolution
    const userId = String(ctx.from.id);

    const progressMsg = await ctx.reply("📸 Chek rasmi qabul qilindi. Matn skanerlanmoqda...");

    try {
      const fileLink = await ctx.telegram.getFileLink(fileId);
      
      // Perform OCR
      const worker = await createWorker('eng+rus');
      const { data: { text } } = await worker.recognize(fileLink.href);
      await worker.terminate();

      const amount = parseReceiptAmount(text);

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

    const parsed = parseTransactionText(text);
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
    .then(() => console.log('🚀 Telegram Bot muvaffaqiyatli ishga tushdi!'))
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
