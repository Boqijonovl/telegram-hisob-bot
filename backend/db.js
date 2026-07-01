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
  // Resolve linked user ID for shared wallets
  async resolveUserId(userId) {
    const { data } = await supabase
      .from('user_settings')
      .select('linked_to')
      .eq('user_id', String(userId))
      .maybeSingle();
      
    return data?.linked_to ? data.linked_to : String(userId);
  },

  // Get transactions for a user (with optional pagination)
  async getTransactions(userId, limit = null, offset = null) {
    const resolvedId = await this.resolveUserId(userId);
    let query = supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', resolvedId)
      .order('date', { ascending: false });

    if (limit !== null) {
      const start = offset || 0;
      query = query.range(start, start + limit - 1);
    } else {
      query = query.limit(100000); // Prevent Supabase default 1000 row limit
    }

    const { data, count, error } = await query;

    if (error) {
      console.error('Supabase error fetching transactions:', error);
      throw error;
    }
    return { data: data || [], total: count || 0 };
  },

  // Add a new transaction
  async addTransaction(userId, { amount, type, category, description, date }) {
    const resolvedId = await this.resolveUserId(userId);
    const newTransaction = {
      id: 'tx_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now(),
      user_id: resolvedId,
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
    const resolvedId = await this.resolveUserId(userId);
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('user_id', resolvedId)
      .eq('id', transactionId);

    if (error) {
      console.error('Supabase error deleting transaction:', error);
      throw error;
    }
    return true;
  },

  // Get settings for a user
  async getSettings(userId, firstName = '', username = '') {
    const { data: rawData } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', String(userId))
      .maybeSingle();
      
    // Default config if none
    const defaultConfig = {
      user_id: String(userId),
      currency: 'UZS',
      budget: null,
      is_blocked: false,
      first_name: firstName || '',
      username: username || '',
      premium_until: null,
      awaiting_receipt: false
    };

    if (!rawData) {
      const { data: inserted } = await supabase
        .from('user_settings')
        .insert([defaultConfig])
        .select()
        .single();
      return inserted;
    }

    const resolvedId = rawData.linked_to || String(userId);
    let targetData = rawData;

    if (rawData.linked_to) {
      const { data: linkedData } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', resolvedId)
        .maybeSingle();
      targetData = linkedData || rawData;
    }

    // Update names if they changed and weren't set
    if (firstName || username) {
      const isNameMissing = !targetData.first_name && !targetData.username;
      const isNameDifferent = targetData.first_name !== firstName || targetData.username !== username;
      if (isNameMissing || isNameDifferent) {
        const { data: updated } = await supabase
          .from('user_settings')
          .update({
            first_name: firstName || targetData.first_name,
            username: username || targetData.username
          })
          .eq('user_id', String(userId))
          .select()
          .maybeSingle();
        if (updated) return updated;
      }
    }

    // Pass back their own linked_to status regardless of whose budget they are using
    targetData.my_linked_to = rawData.linked_to || null;
    return targetData;
  },

  // Update budget & settings
  async updateSettings(userId, settings) {
    // If they update linked_to, it applies to THEIR account, not the resolved one
    const updateData = {
      user_id: String(userId)
    };
    if (settings.currency !== undefined) updateData.currency = settings.currency;
    if (settings.budget !== undefined) updateData.budget = parseFloat(settings.budget);
    if (settings.linked_to !== undefined) updateData.linked_to = settings.linked_to;

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

  // Update Premium & Receipt Status
  async updatePremiumStatus(userId, updates) {
    const { data, error } = await supabase
      .from('user_settings')
      .update(updates)
      .eq('user_id', String(userId))
      .select()
      .single();

    if (error) {
      console.error('Supabase error updating premium status:', error);
      throw error;
    }
    return data;
  },

  // Get statistics
  async getStats(userId) {
    const { data: transactions } = await this.getTransactions(userId);
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

  // Get Super Admin System Stats
  async getSuperAdminStats() {
    try {
      const { count: userCount } = await supabase
        .from('user_settings')
        .select('*', { count: 'exact', head: true });
        
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, type, date')
        .limit(100000);

      let totalIncome = 0;
      let totalExpense = 0;
      let todayTxCount = 0;
      
      const today = new Date().toISOString().substring(0, 10);

      if (transactions) {
        transactions.forEach(tx => {
          const amount = parseFloat(tx.amount);
          if (tx.type === 'income') totalIncome += amount;
          else totalExpense += amount;
          
          if (tx.date.substring(0, 10) === today) {
            todayTxCount++;
          }
        });
      }

      return {
        totalUsers: userCount || 0,
        totalTransactions: transactions ? transactions.length : 0,
        todayTransactions: todayTxCount,
        totalVolume: totalIncome + totalExpense
      };
    } catch (e) {
      console.error("Super Admin Stats Error:", e);
      return { totalUsers: 0, totalTransactions: 0, todayTransactions: 0, totalVolume: 0 };
    }
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

  // Make user an admin
  async makeAdmin(userId) {
    const { data, error } = await supabase
      .from('user_settings')
      .update({ is_admin: true })
      .eq('user_id', String(userId))
      .select()
      .single();

    if (error) {
      console.error('Supabase error making admin:', error);
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
    const resolvedId = await this.resolveUserId(userId);
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', resolvedId);
      
    if (error) {
      console.error('Supabase error fetching categories:', error);
      if (error.code === '42P01') return [];
      throw error;
    }
    return data || [];
  },

  async addCategory(userId, category) {
    const resolvedId = await this.resolveUserId(userId);
    const { data, error } = await supabase
      .from('categories')
      .insert([{
        user_id: resolvedId,
        type: category.type,
        name: category.name
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteCategory(userId, type, name) {
    const resolvedId = await this.resolveUserId(userId);
    const { error } = await supabase
      .from('categories')
      .delete()
      .match({ user_id: resolvedId, type, name });

    if (error) throw error;
    return true;
  },

  async updateCategory(userId, type, oldName, newName) {
    const resolvedId = await this.resolveUserId(userId);
    const { data, error } = await supabase
      .from('categories')
      .update({ name: newName })
      .match({ user_id: resolvedId, type, name: oldName })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // -------------------------
  // RECURRING TRANSACTIONS
  // -------------------------
  async getRecurringTransactions(userId) {
    const resolvedId = await this.resolveUserId(userId);
    const { data, error } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('user_id', resolvedId);
    if (error) {
      if (error.code === '42P01') return [];
      throw error;
    }
    return data;
  },

  async addRecurringTransaction(userId, tx) {
    const resolvedId = await this.resolveUserId(userId);
    const { data, error } = await supabase
      .from('recurring_transactions')
      .insert([{ ...tx, user_id: resolvedId }])
      .select().single();
    if (error) throw error;
    return data;
  },

  async updateRecurringTransaction(userId, id, updates) {
    const resolvedId = await this.resolveUserId(userId);
    const { data, error } = await supabase
      .from('recurring_transactions')
      .update(updates)
      .match({ user_id: resolvedId, id })
      .select().single();
    if (error) throw error;
    return data;
  },

  async deleteRecurringTransaction(userId, id) {
    const resolvedId = await this.resolveUserId(userId);
    const { error } = await supabase
      .from('recurring_transactions')
      .delete()
      .match({ user_id: resolvedId, id });
    if (error) throw error;
    return true;
  },

  // -------------------------
  // DEBTS (Qarz daftari)
  // -------------------------
  async getDebts(userId) {
    const resolvedId = await this.resolveUserId(userId);
    const { data, error } = await supabase
      .from('debts')
      .select('*')
      .eq('user_id', resolvedId)
      .order('due_date', { ascending: true });
    if (error) {
      if (error.code === '42P01') return [];
      throw error;
    }
    return data;
  },

  async addDebt(userId, debtData) {
    const resolvedId = await this.resolveUserId(userId);
    const { data, error } = await supabase
      .from('debts')
      .insert([{ ...debtData, user_id: resolvedId }])
      .select().single();
    if (error) throw error;
    return data;
  },

  async updateDebt(userId, id, updates) {
    const resolvedId = await this.resolveUserId(userId);
    const { data, error } = await supabase
      .from('debts')
      .update(updates)
      .match({ user_id: resolvedId, id })
      .select().single();
    if (error) throw error;
    return data;
  },

  async deleteDebt(userId, id) {
    const resolvedId = await this.resolveUserId(userId);
    const { error } = await supabase
      .from('debts')
      .delete()
      .match({ user_id: resolvedId, id });
    if (error) throw error;
    return true;
  },

  // --- Debts Methods ---
  async getDebts(userId) {
    const resolvedId = await this.resolveUserId(userId);
    const { data, error } = await supabase
      .from('debts')
      .select('*')
      .eq('user_id', resolvedId)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') return [];
      console.error('Supabase error fetching debts:', error);
      throw error;
    }
    return data || [];
  },

  async addDebt(userId, { type, person_name, amount, due_date }) {
    const resolvedId = await this.resolveUserId(userId);
    const newDebt = {
      user_id: resolvedId,
      type: type,
      person_name: person_name,
      amount: parseFloat(amount),
      due_date: due_date || null,
      is_paid: false,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('debts')
      .insert([newDebt])
      .select()
      .single();

    if (error) {
      console.error('Supabase error adding debt:', error);
      throw error;
    }
    return data;
  },

  async updateDebt(userId, debtId, updates) {
    const resolvedId = await this.resolveUserId(userId);
    const { data, error } = await supabase
      .from('debts')
      .update(updates)
      .eq('user_id', resolvedId)
      .eq('id', debtId)
      .select()
      .single();

    if (error) {
      console.error('Supabase error updating debt:', error);
      throw error;
    }
    return data;
  },

  async deleteDebt(userId, debtId) {
    const resolvedId = await this.resolveUserId(userId);
    const { error } = await supabase
      .from('debts')
      .delete()
      .eq('user_id', resolvedId)
      .eq('id', debtId);

    if (error) {
      console.error('Supabase error deleting debt:', error);
      throw error;
    }
    return true;
  }
};
