import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ WARNING: SUPABASE_URL or SUPABASE_KEY is missing! Database transactions will fail.');
}

// Configured with ws transport for compatibility with Node.js < 22
const supabase = createClient(supabaseUrl || '', supabaseKey || '', {
  auth: {
    persistSession: false
  },
  realtime: {
    transport: ws
  }
});

export const db = {
  // Get all transactions for a user
  async getTransactions(userId) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', String(userId))
      .order('date', { ascending: false });

    if (error) {
      console.error('Supabase error fetching transactions:', error);
      throw error;
    }
    return data || [];
  },

  // Add a new transaction
  async addTransaction(userId, { amount, type, category, description, date }) {
    const newTransaction = {
      id: 'tx_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now(),
      user_id: String(userId),
      amount: parseFloat(amount),
      type: type || 'expense', // 'expense' or 'income'
      category: category || 'Boshqa',
      description: description || '',
      date: date || new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('transactions')
      .insert([newTransaction])
      .select()
      .single();

    if (error) {
      console.error('Supabase error inserting transaction:', error);
      throw error;
    }
    return data;
  },

  // Delete a transaction
  async deleteTransaction(userId, transactionId) {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('user_id', String(userId))
      .eq('id', transactionId);

    if (error) {
      console.error('Supabase error deleting transaction:', error);
      throw error;
    }
    return true;
  },

  // Get budget & settings
  async getSettings(userId, firstName = '', username = '') {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', String(userId))
      .maybeSingle();

    if (error) {
      console.error('Supabase error fetching settings:', error);
      throw error;
    }

    if (!data) {
      // Create and return default settings if not exists
      const defaultSettings = {
        user_id: String(userId),
        currency: 'UZS',
        budget: 0,
        first_name: firstName || '',
        username: username || '',
        is_blocked: false
      };

      const { data: inserted, error: insertError } = await supabase
        .from('user_settings')
        .insert([defaultSettings])
        .select()
        .single();

      if (insertError) {
        console.error('Supabase error inserting default settings:', insertError);
        throw insertError;
      }
      return inserted;
    }

    // Update names if changed
    if ((firstName && data.first_name !== firstName) || (username && data.username !== username)) {
      const { data: updated } = await supabase
        .from('user_settings')
        .update({
          first_name: firstName || data.first_name,
          username: username || data.username
        })
        .eq('user_id', String(userId))
        .select()
        .maybeSingle();
      if (updated) return updated;
    }

    return data;
  },

  // Update budget & settings
  async updateSettings(userId, settings) {
    const updateData = {
      user_id: String(userId),
      currency: settings.currency || 'UZS',
      budget: settings.budget !== undefined ? parseFloat(settings.budget) : 0
    };

    const { data, error } = await supabase
      .from('user_settings')
      .update(updateData)
      .eq('user_id', String(userId))
      .select()
      .single();

    if (error) {
      console.error('Supabase error updating settings:', error);
      throw error;
    }
    return data;
  },

  // Get statistics
  async getStats(userId) {
    const transactions = await this.getTransactions(userId);
    const settings = await this.getSettings(userId);
    
    let totalIncome = 0;
    let totalExpense = 0;
    const categoryTotals = {};

    transactions.forEach(tx => {
      const amount = parseFloat(tx.amount);
      if (tx.type === 'income') {
        totalIncome += amount;
      } else {
        totalExpense += amount;
        categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + amount;
      }
    });

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
  },

  // Get all user settings for admin panel
  async getAllUserSettings() {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .order('user_id');

    if (error) {
      console.error('Supabase error fetching all users:', error);
      throw error;
    }
    return data || [];
  },

  // Block/unblock a user
  async blockUser(userId, isBlocked) {
    const { data, error } = await supabase
      .from('user_settings')
      .update({ is_blocked: isBlocked })
      .eq('user_id', String(userId))
      .select()
      .single();

    if (error) {
      console.error('Supabase error blocking user:', error);
      throw error;
    }
    return data;
  },

  // Reset user data (delete all transactions and reset settings budget)
  async resetUserData(userId) {
    // 1. Delete all transactions
    const { error: txError } = await supabase
      .from('transactions')
      .delete()
      .eq('user_id', String(userId));

    if (txError) {
      console.error('Supabase error resetting transactions:', txError);
      throw txError;
    }

    // 2. Reset budget
    const { data: settings, error: setStrError } = await supabase
      .from('user_settings')
      .update({ budget: 0 })
      .eq('user_id', String(userId))
      .select()
      .single();

    if (setStrError) {
      console.error('Supabase error resetting budget settings:', setStrError);
      throw setStrError;
    }

    return settings;
  },

  // -------------------------
  // CATEGORIES
  // -------------------------
  async getCategories(userId) {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', String(userId));
      
    if (error) {
      console.error('Supabase error fetching categories:', error);
      // Fallback defaults if table doesn't exist yet
      if (error.code === '42P01') return [];
      throw error;
    }
    return data || [];
  },

  async addCategory(userId, type, name) {
    const { data, error } = await supabase
      .from('categories')
      .insert([{ user_id: String(userId), type, name }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteCategory(userId, type, name) {
    const { error } = await supabase
      .from('categories')
      .delete()
      .match({ user_id: String(userId), type, name });
    if (error) throw error;
    return true;
  },

  async updateCategory(userId, type, oldName, newName) {
    const { data, error } = await supabase
      .from('categories')
      .update({ name: newName })
      .match({ user_id: String(userId), type, name: oldName })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // -------------------------
  // RECURRING TRANSACTIONS
  // -------------------------
  async getRecurringTransactions(userId) {
    const { data, error } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('user_id', String(userId))
      .order('created_at', { ascending: false });
    
    if (error) {
      if (error.code === '42P01') return []; // table not found fallback
      throw error;
    }
    return data || [];
  },

  async addRecurringTransaction(userId, { type, category, amount, description, cron_expression }) {
    const { data, error } = await supabase
      .from('recurring_transactions')
      .insert([{ 
        user_id: String(userId), 
        type, 
        category, 
        amount: parseFloat(amount), 
        description, 
        cron_expression 
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteRecurringTransaction(id) {
    const { error } = await supabase
      .from('recurring_transactions')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
};
