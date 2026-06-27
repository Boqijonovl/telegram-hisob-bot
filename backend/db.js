import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, 'database.json');

// Initialize database file if it doesn't exist
async function initDb() {
  try {
    await fs.access(DB_FILE);
  } catch (error) {
    const initialData = { users: {} };
    await fs.writeFile(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

// Read database content
async function readDb() {
  await initDb();
  const content = await fs.readFile(DB_FILE, 'utf-8');
  return JSON.parse(content);
}

// Write database content
async function writeDb(data) {
  await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// Helper to get or create user data structure
function getOrCreateUser(data, userId) {
  const strId = String(userId);
  if (!data.users[strId]) {
    data.users[strId] = {
      settings: {
        currency: 'UZS',
        budget: 0
      },
      transactions: []
    };
  }
  return data.users[strId];
}

export const db = {
  // Get all transactions for a user
  async getTransactions(userId) {
    const data = await readDb();
    const user = getOrCreateUser(data, userId);
    // Sort transactions by date descending
    return user.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  // Add a new transaction
  async addTransaction(userId, { amount, type, category, description, date }) {
    const data = await readDb();
    const user = getOrCreateUser(data, userId);

    const newTransaction = {
      id: 'tx_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now(),
      amount: parseFloat(amount),
      type: type || 'expense', // 'expense' or 'income'
      category: category || 'Boshqa',
      description: description || '',
      date: date || new Date().toISOString()
    };

    user.transactions.push(newTransaction);
    await writeDb(data);
    return newTransaction;
  },

  // Delete a transaction
  async deleteTransaction(userId, transactionId) {
    const data = await readDb();
    const user = getOrCreateUser(data, userId);
    
    const initialLength = user.transactions.length;
    user.transactions = user.transactions.filter(tx => tx.id !== transactionId);
    
    if (user.transactions.length === initialLength) {
      return false; // not found
    }
    
    await writeDb(data);
    return true;
  },

  // Get budget & settings
  async getSettings(userId) {
    const data = await readDb();
    const user = getOrCreateUser(data, userId);
    return user.settings;
  },

  // Update budget & settings
  async updateSettings(userId, settings) {
    const data = await readDb();
    const user = getOrCreateUser(data, userId);
    user.settings = { ...user.settings, ...settings };
    await writeDb(data);
    return user.settings;
  },

  // Get statistics
  async getStats(userId) {
    const transactions = await this.getTransactions(userId);
    const settings = await this.getSettings(userId);
    
    let totalIncome = 0;
    let totalExpense = 0;
    const categoryTotals = {};

    transactions.forEach(tx => {
      const amount = tx.amount;
      if (tx.type === 'income') {
        totalIncome += amount;
      } else {
        totalExpense += amount;
        categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + amount;
      }
    });

    // Format category totals into an array for easy charting
    const categories = Object.keys(categoryTotals).map(name => ({
      name,
      amount: categoryTotals[name],
      percentage: totalExpense > 0 ? Math.round((categoryTotals[name] / totalExpense) * 100) : 0
    })).sort((a, b) => b.amount - a.amount);

    return {
      balance: totalIncome - totalExpense,
      totalIncome,
      totalExpense,
      budget: settings.budget || 0,
      categories
    };
  }
};
