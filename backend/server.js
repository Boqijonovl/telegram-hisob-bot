import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db } from './db.js';
import { initBot, bot, sendBudgetAlert, broadcastMessage } from './bot.js';
import { generateWordReport } from './reportGenerator.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Middleware to extract Telegram User ID
const getUserId = (req) => {
  const userId = req.headers['x-telegram-user-id'] || req.query.userId || req.body.userId;
  if (!userId) {
    return '123456';
  }
  return String(userId);
};

// --- API Endpoints ---

// Premium check middleware
app.use(async (req, res, next) => {
  if (req.path === '/api/settings' || req.path.startsWith('/api/admin')) {
    return next();
  }
  
  const userId = getUserId(req);
  if (userId === '123456') return next();
  
  try {
    const settings = await db.getSettings(userId);
    if (settings.premium_until && new Date(settings.premium_until) < new Date()) {
      return res.status(402).json({ error: 'To\'lov muddati tugagan', code: 'PAYMENT_REQUIRED' });
    }
  } catch (e) {
    console.error('Premium check error:', e);
  }
  next();
});

// Get all transactions (with pagination)
app.get('/api/transactions', async (req, res) => {
  try {
    const userId = getUserId(req);
    const limit = req.query.limit ? parseInt(req.query.limit) : null;
    const offset = req.query.offset ? parseInt(req.query.offset) : null;
    
    const transactions = await db.getTransactions(userId, limit, offset);
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add a transaction
app.post('/api/transactions', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { amount, type, category, description, date } = req.body;

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Mablag\' to\'g\'ri kiritilishi shart' });
    }

    const transaction = await db.addTransaction(userId, {
      amount,
      type,
      category,
      description,
      date
    });

    res.status(201).json(transaction);

    // Budget exceeded alert trigger (Non-blocking async check)
    if (type === 'expense') {
      (async () => {
        try {
          const stats = await db.getStats(userId);
          if (stats.budget > 0 && stats.totalExpense > stats.budget) {
            const settings = await db.getSettings(userId);
            // Send alert to Telegram chat
            await sendBudgetAlert(userId, stats.totalExpense, stats.budget, settings.currency);
          }
        } catch (err) {
          console.error('Error in budget notification check:', err);
        }
      })();
    }

  } catch (error) {
    console.error('Error adding transaction:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a transaction
app.delete('/api/transactions/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    const transactionId = req.params.id;

    const success = await db.deleteTransaction(userId, transactionId);
    if (!success) {
      return res.status(404).json({ error: 'Tranzaksiya topilmadi' });
    }

    res.json({ success: true, message: 'Tranzaksiya muvaffaqiyatli o\'chirildi' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get statistics
app.get('/api/stats', async (req, res) => {
  try {
    const userId = getUserId(req);
    const stats = await db.getStats(userId);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get settings (captures Telegram names and returns isAdmin flag)
app.get('/api/settings', async (req, res) => {
  try {
    const userId = getUserId(req);
    const firstName = decodeURIComponent(req.headers['x-telegram-first-name'] || '');
    const username = decodeURIComponent(req.headers['x-telegram-username'] || '');

    const settings = await db.getSettings(userId, firstName, username);
    
    // Check if user is the admin via ENV, Hardcode, or Database
    const isAdmin = String(userId) === '1037362053' || (process.env.ADMIN_ID && String(userId) === String(process.env.ADMIN_ID)) || settings.is_admin;
    res.json({ ...settings, isAdmin: !!isAdmin });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update settings
app.post('/api/settings', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { currency, budget } = req.body;

    const updatedSettings = await db.updateSettings(userId, {
      currency,
      budget: budget !== undefined ? parseFloat(budget) : undefined
    });

    res.json(updatedSettings);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset user account transactions and budget
app.post('/api/settings/reset', async (req, res) => {
  try {
    const userId = getUserId(req);
    const settings = await db.resetUserData(userId);
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Error resetting user data:', error);
    res.status(500).json({ error: 'Reset failed' });
  }
});

// --- Categories Endpoints ---
app.get('/api/categories', async (req, res) => {
  try {
    const userId = getUserId(req);
    const categories = await db.getCategories(userId);
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/categories', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { type, name } = req.body;
    if (!type || !name) return res.status(400).json({ error: 'Type and name are required' });
    const category = await db.addCategory(userId, { type, name });
    res.status(201).json(category);
  } catch (error) {
    console.error('Error adding category:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/categories', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { type, oldName, newName } = req.body;
    if (!type || !oldName || !newName) return res.status(400).json({ error: 'Missing parameters' });
    const updated = await db.updateCategory(userId, type, oldName, newName);
    res.json(updated);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/categories', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { type, name } = req.body;
    await db.deleteCategory(userId, type, name);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Recurring Transactions Endpoints ---
app.get('/api/recurring', async (req, res) => {
  try {
    const userId = getUserId(req);
    const data = await db.getRecurringTransactions(userId);
    res.json(data);
  } catch (error) {
    console.error('Error fetching recurring:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/recurring', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { type, category, amount, description, cron_expression } = req.body;
    if (!amount || !category) return res.status(400).json({ error: 'Missing fields' });
    const created = await db.addRecurringTransaction(userId, { type, category, amount, description, cron_expression });
    res.status(201).json(created);
  } catch (error) {
    console.error('Error adding recurring:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/recurring/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { category, amount, cron_expression } = req.body;
    if (!amount || !category) return res.status(400).json({ error: 'Missing fields' });
    const updated = await db.updateRecurringTransaction(userId, req.params.id, { category, amount, cron_expression });
    res.json(updated);
  } catch (error) {
    console.error('Error updating recurring:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/recurring/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    await db.deleteRecurringTransaction(userId, req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting recurring:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Admin Panel Endpoints ---

// Helper to check admin rights
const checkAdmin = async (req) => {
  const adminId = getUserId(req);
  if (String(adminId) === '1037362053') return true;
  if (process.env.ADMIN_ID && String(adminId) === String(process.env.ADMIN_ID)) return true;
  
  try {
    const settings = await db.getSettings(adminId);
    if (settings && settings.is_admin) return true;
  } catch (e) {
    console.error('Error checking admin status', e);
  }
  return false;
};

// Get all users (Admin only)
app.get('/api/admin/users', async (req, res) => {
  try {
    const isAdmin = await checkAdmin(req);
    if (!isAdmin) return res.status(403).json({ error: 'Ruxsat berilmagan' });
    
    const allUsers = await db.getAllUserSettings();
    res.json(allUsers);
  } catch (error) {
    console.error('Error fetching users for admin:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Block/unblock a user (Admin only)
app.post('/api/admin/block', async (req, res) => {
  try {
    const isAdmin = await checkAdmin(req);
    if (!isAdmin) return res.status(403).json({ error: 'Ruxsat berilmagan' });
    
    const { targetUserId, isBlocked } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ error: 'Target user ID is required' });
    }
    const updated = await db.blockUser(targetUserId, !!isBlocked);
    res.json(updated);
  } catch (error) {
    console.error('Error blocking user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Broadcast push alert message to all users (Admin only)
app.post('/api/admin/broadcast', async (req, res) => {
  try {
    const isAdmin = await checkAdmin(req);
    if (!isAdmin) return res.status(403).json({ error: 'Ruxsat berilmagan' });
    
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message body cannot be empty' });
    }
    const result = await broadcastMessage(message);
    res.json(result);
  } catch (error) {
    console.error('Error in broadcast execution:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user stats (Admin only)
app.get('/api/admin/users/:id/stats', async (req, res) => {
  try {
    const isAdmin = await checkAdmin(req);
    if (!isAdmin) return res.status(403).json({ error: 'Ruxsat berilmagan' });

    const targetUserId = req.params.id;
    const stats = await db.getStats(targetUserId);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Make user admin (Admin only)
app.post('/api/admin/make-admin', async (req, res) => {
  try {
    const isAdmin = await checkAdmin(req);
    if (!isAdmin) return res.status(403).json({ error: 'Ruxsat berilmagan' });

    const { targetUserId } = req.body;
    if (!targetUserId) return res.status(400).json({ error: 'Target user ID is required' });

    const updated = await db.makeAdmin(targetUserId);
    res.json(updated);
  } catch (error) {
    console.error('Error making admin:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get latest exchange rates from CBU (Central Bank of Uzbekistan)
app.get('/api/rates', async (req, res) => {
  try {
    const response = await fetch('https://cbu.uz/uz/arkhiv-kursov-valyut/json/');
    const data = await response.json();
    
    const usd = data.find(c => c.Ccy === 'USD');
    const eur = data.find(c => c.Ccy === 'EUR');
    const rub = data.find(c => c.Ccy === 'RUB');
    
    res.json({
      USD: usd ? parseFloat(usd.Rate) : 12650,
      EUR: eur ? parseFloat(eur.Rate) : 13540,
      RUB: rub ? parseFloat(rub.Rate) : 140,
      UZS: 1
    });
  } catch (error) {
    console.error('Error fetching exchange rates from CBU:', error);
    // Fallback static rates
    res.json({
      USD: 12650,
      EUR: 13540,
      RUB: 140,
      UZS: 1
    });
  }
});

// Generate and send Word report via Telegram Bot
app.post('/api/send-word', async (req, res) => {
  try {
    const userId = getUserId(req);
    
    // Fetch transactions and settings
    const { data: transactions } = await db.getTransactions(userId);
    const settings = await db.getSettings(userId);
    
    if (!transactions || transactions.length === 0) {
      return res.status(400).json({ error: 'No transactions found' });
    }

    const sortedTx = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    const startDate = new Date(sortedTx[0].date).toLocaleDateString('uz-UZ');
    const endDate = new Date(sortedTx[sortedTx.length - 1].date).toLocaleDateString('uz-UZ');
    
    const buffer = await generateWordReport(sortedTx, settings, `${startDate} - ${endDate}`, settings.currency);
    
    await bot.telegram.sendDocument(
      userId,
      { source: buffer, filename: `Hisobot_${new Date().toISOString().substring(0,10)}.docx` },
      { caption: `📊 Sizning barcha tranzaksiyalaringiz Word hisoboti.\nDavr: ${startDate} - ${endDate}` }
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error sending Word report via bot:', error);
    res.status(500).json({ error: 'Failed to send Word report' });
  }
});

// --- Debts Endpoints ---
app.get('/api/debts', async (req, res) => {
  try {
    const userId = getUserId(req);
    const debts = await db.getDebts(userId);
    res.json(debts);
  } catch (error) {
    console.error('Error fetching debts:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/debts', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { type, person_name, amount, due_date } = req.body;
    if (!type || !person_name || !amount) return res.status(400).json({ error: 'Missing required fields' });
    const debt = await db.addDebt(userId, { type, person_name, amount, due_date });
    res.status(201).json(debt);
  } catch (error) {
    console.error('Error adding debt:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/debts/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    const updated = await db.updateDebt(userId, req.params.id, req.body);
    res.json(updated);
  } catch (error) {
    console.error('Error updating debt:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/debts/:id', async (req, res) => {
  try {
    const userId = getUserId(req);
    await db.deleteDebt(userId, req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting debt:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/settings/link', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { linked_to } = req.body;
    const updatedSettings = await db.updateSettings(userId, { linked_to: linked_to || null });
    res.json(updatedSettings);
  } catch (error) {
    console.error('Error linking accounts:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Simple healthcheck
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`📡 Backend API Server running on http://localhost:${PORT}`);
  
  // Start the bot
  initBot();
});
