import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db } from './db.js';
import { initBot, sendBudgetAlert, broadcastMessage } from './bot.js';

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
    
    // Check if user is the admin
    const isAdmin = process.env.ADMIN_ID && String(userId) === String(process.env.ADMIN_ID);
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
    const category = await db.addCategory(userId, type, name);
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

app.delete('/api/recurring/:id', async (req, res) => {
  try {
    await db.deleteRecurringTransaction(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting recurring:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Admin Panel Endpoints ---

// Get all users (Admin only)
app.get('/api/admin/users', async (req, res) => {
  try {
    const adminId = getUserId(req);
    if (!process.env.ADMIN_ID || String(adminId) !== String(process.env.ADMIN_ID)) {
      return res.status(403).json({ error: 'Ruxsat berilmagan' });
    }
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
    const adminId = getUserId(req);
    if (!process.env.ADMIN_ID || String(adminId) !== String(process.env.ADMIN_ID)) {
      return res.status(403).json({ error: 'Ruxsat berilmagan' });
    }
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
    const adminId = getUserId(req);
    if (!process.env.ADMIN_ID || String(adminId) !== String(process.env.ADMIN_ID)) {
      return res.status(403).json({ error: 'Ruxsat berilmagan' });
    }
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

// Send PDF report via Telegram Bot
app.post('/api/send-pdf', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { pdfBase64, filename } = req.body;
    
    if (!pdfBase64) {
      return res.status(400).json({ error: 'Missing PDF data' });
    }

    // Convert base64 to buffer
    const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, "");
    const pdfBuffer = Buffer.from(base64Data, 'base64');
    
    const fileOptions = {
      filename: filename || 'Hisobot.pdf',
      contentType: 'application/pdf',
    };

    await bot.sendDocument(userId, pdfBuffer, {}, fileOptions);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error sending PDF via bot:', error);
    res.status(500).json({ error: 'Failed to send PDF' });
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
