import { Telegraf, Markup } from 'telegraf';
import dotenv from 'dotenv';
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

// Transaction parser from chat message text
function parseTransactionText(text) {
  const parts = text.trim().split(/\s+/);
  if (parts.length === 0) return null;

  // Clean the first part to extract amount
  let amountStr = parts[0].replace(/[^\d+.-]/g, '');
  const isIncome = amountStr.startsWith('+');
  if (isIncome || amountStr.startsWith('-')) {
    amountStr = amountStr.substring(1);
  }
  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) return null;

  // Extract the remaining words
  const remaining = parts.slice(1);
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

export function initBot() {
  if (!token) return null;

  bot = new Telegraf(token);

  // Start command
  bot.start((ctx) => {
    const firstName = ctx.from.first_name || 'Foydalanuvchi';
    
    const message = `👋 *Assalomu alaykum, ${firstName}!*

Hisob-kitob botiga xush kelibsiz!

📊 *Mini App:* Pastdagi *'Hisobni Ochish 📊'* tugmasini bosing.
✍️ *Tezkor hisoblash:* Botga to'g'ridan-to'g'ri yozishingiz ham mumkin!
   *Masalan:*
   • \`50000 oziq-ovqat tushlik\` (harajat)
   • \`+2500000 maosh\` (daromad)
   
💾 *Zaxira yuklash:* Foydalanuvchi ma'lumotlarini yuklash uchun /backup buyrug'ini bosing.`;

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
2️⃣ *Tezkor yozish formatlari:*
   • \`[summa] [kategoriya (ixtiyoriy)] [izoh]\`
   • Harajat yozish: \`20000 taksi uyga\` (Transportga yoziladi)
   • Daromad yozish: \`+150000 sovg'a do'stimdan\` (Daromadga yoziladi)
3️⃣ *Zaxiralash:* Ma'lumotlarni yuklash uchun /backup buyrug'ini yuboring.`;
    
    ctx.replyWithMarkdownV2(escapeMarkdown(message));
  });

  // Backup command - Sends transactions file as JSON document
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

  // Handle all other text messages (Direct logging)
  bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    const userId = String(ctx.from.id);

    // Skip commands (e.g. starting with /)
    if (text.startsWith('/')) return;

    const parsed = parseTransactionText(text);
    if (!parsed) {
      // If it doesn't look like a transaction entry, remind the user about format
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

      // Check if it is an expense and triggers budget alarm
      if (tx.type === 'expense') {
        const stats = await db.getStats(userId);
        if (stats.budget > 0 && stats.totalExpense > stats.budget) {
          const formattedExpense = new Intl.NumberFormat('uz-UZ').format(stats.totalExpense);
          const formattedBudget = new Intl.NumberFormat('uz-UZ').format(stats.budget);
          
          const warningMessage = `🚨 *OGOHLANTIRISH! (Byudjet Limiti)*
Siz belgilagan oylik harajatlar limiti (${formattedBudget} ${currency}) oshib ketdi!

📊 *Joriy oylik harajatlar:* ${formattedExpense} ${currency}
💸 *Oshib ketgan summa:* ${new Intl.NumberFormat('uz-UZ').format(stats.totalExpense - stats.budget)} ${currency}

Iltimos, harajatlarni nazorat qiling! 📉`;
          
          // Send notification with a slight delay
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

  // Enable graceful stop
  process.once('SIGINT', () => bot && bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot && bot.stop('SIGTERM'));

  return bot;
}

// Programmatic alert sender for budget overflows (triggered by WebApp API calls)
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
