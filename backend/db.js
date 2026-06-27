import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ WARNING: SUPABASE_URL or SUPABASE_KEY is missing! Database transactions will fail.');
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

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
  async getSettings(userId) {
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
        budget: 0
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
      .upsert(updateData)
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
  }
};
