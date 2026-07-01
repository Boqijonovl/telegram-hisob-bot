import { db } from './db.js';
import { Telegraf } from 'telegraf';
import { generateExcelReport } from './reportGenerator.js';
import dotenv from 'dotenv';
dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);

async function run() {
  console.log('Fetching all users...');
  const users = await db.getAllUserSettings();
  console.log(`Found ${users.length} users.`);
  
  const firstDayOfJune = new Date(2026, 5, 1); // Month is 0-indexed, so 5 is June
  const firstDayOfJuly = new Date(2026, 6, 1);
  const periodName = `Iyun 2026 oyi uchun`;

  let sentCount = 0;

  for (const user of users) {
    if (user.user_id === '123456') continue;
    try {
      const { data: transactions } = await db.getTransactions(user.user_id);
      if (!transactions || transactions.length === 0) continue;

      const monthlyTx = transactions.filter(tx => {
        const d = new Date(tx.date);
        return d >= firstDayOfJune && d < firstDayOfJuly;
      });

      if (monthlyTx.length === 0) continue;

      console.log(`Sending June report to user ${user.user_id}...`);
      const buffer = await generateExcelReport(monthlyTx, null, periodName);
      
      await bot.telegram.sendDocument(
        user.user_id,
        { source: buffer, filename: `Oylik_Hisobot_Iyun_2026.xlsx` },
        { caption: `📊 Sizning ${periodName} moliyaviy hisobotingiz (Zamonaviy Excel formati).` }
      );
      sentCount++;
    } catch (e) {
      console.error(`Error sending to ${user.user_id}:`, e);
    }
  }

  console.log(`Finished! Sent ${sentCount} reports.`);
  process.exit(0);
}

run();
