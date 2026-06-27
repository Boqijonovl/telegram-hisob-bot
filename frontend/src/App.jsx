import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  PieChart, 
  Settings, 
  Plus, 
  RefreshCw, 
  Download, 
  Trash2, 
  Users, 
  Send, 
  ShieldAlert, 
  Lock,
  FileCode,
  AlertTriangle
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import Analytics from './components/Analytics';
import AddTransaction from './components/AddTransaction';

// Dynamically compute API URL based on frontend host
const getApiUrl = () => {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:5000';
  }
  return 'https://hisob-bot.onrender.com';
};

const API_URL = getApiUrl();

function App() {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'analytics', 'settings'
  const [showAddModal, setShowAddModal] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({ balance: 0, totalIncome: 0, totalExpense: 0, budget: 0, categories: [] });
  const [settings, setSettings] = useState({ currency: 'UZS', budget: 0, isAdmin: false, is_blocked: false });
  const [loading, setLoading] = useState(true);
  const [tgUser, setTgUser] = useState(null);
  const [toast, setToast] = useState(null);
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());

  // Admin States
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminBroadcastMsg, setAdminBroadcastMsg] = useState('');
  const [isBlockedUser, setIsBlockedUser] = useState(false);

  // Show status toasts
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch Telegram WebApp User Details
  useEffect(() => {
    try {
      if (window.Telegram && window.Telegram.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        
        // Match header and system backgrounds with the app theme
        if (tg.setHeaderColor) {
          tg.setHeaderColor(tg.themeParams?.bg_color || '#0f172a');
        }
        if (tg.setBackgroundColor) {
          tg.setBackgroundColor(tg.themeParams?.bg_color || '#0f172a');
        }

        // Apply Telegram theme colors if provided
        if (tg.themeParams && tg.themeParams.bg_color) {
          document.documentElement.style.setProperty('--bg-color', tg.themeParams.bg_color);
          document.documentElement.style.setProperty('--text-color', tg.themeParams.text_color);
          document.documentElement.style.setProperty('--secondary-bg-color', tg.themeParams.secondary_bg_color);
          document.documentElement.style.setProperty('--button-color', tg.themeParams.button_color);
          document.documentElement.style.setProperty('--button-text-color', tg.themeParams.button_text_color);
          document.documentElement.style.setProperty('--hint-color', tg.themeParams.hint_color);
          document.documentElement.style.setProperty('--link-color', tg.themeParams.link_color);
        }

        const user = tg.initDataUnsafe?.user;
        if (user) {
          setTgUser(user);
        } else {
          // Fallback user for browser testing
          setTgUser({
            id: '123456',
            first_name: 'Dasturchi',
            last_name: '(Browser Test)',
            username: 'dev_test'
          });
        }
      } else {
        // Fallback user if not loaded inside Telegram
        setTgUser({
          id: '123456',
          first_name: 'Dasturchi',
          last_name: '(Browser)',
          username: 'dev_browser'
        });
      }
    } catch (error) {
      console.error("Telegram WebApp initialization error:", error);
    }
  }, []);

  // Fetch data when user ID is available
  useEffect(() => {
    if (tgUser?.id) {
      fetchData();
    }
  }, [tgUser]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 
        'x-telegram-user-id': String(tgUser.id),
        'x-telegram-first-name': encodeURIComponent(tgUser.first_name || ''),
        'x-telegram-username': encodeURIComponent(tgUser.username || '')
      };
      
      const [txRes, settingsRes] = await Promise.all([
        fetch(`${API_URL}/api/transactions`, { headers }),
        fetch(`${API_URL}/api/settings`, { headers })
      ]);

      if (!txRes.ok || !settingsRes.ok) {
        throw new Error('API server returned error responses');
      }

      const txData = await txRes.json();
      const settingsData = await settingsRes.json();

      // Check if blocked by admin
      if (settingsData.is_blocked) {
        setIsBlockedUser(true);
        return;
      }

      setTransactions(txData);
      setSettings(settingsData);
    } catch (error) {
      console.error('Error fetching data from backend:', error);
      showToast('Backend server bilan bog\'lanishda xatolik yuz berdi!', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Filter transactions based on the selected month/year
  const monthlyTransactions = transactions.filter(tx => {
    const d = new Date(tx.date);
    return d.getFullYear() === currentMonthDate.getFullYear() && d.getMonth() === currentMonthDate.getMonth();
  });

  // Calculate monthly stats client-side
  const getMonthlyStats = () => {
    let totalIncome = 0;
    let totalExpense = 0;
    const categoryTotals = {};

    monthlyTransactions.forEach(tx => {
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
  };

  const monthlyStats = getMonthlyStats();

  // Add Transaction handler
  const handleAddTransaction = async (txData) => {
    try {
      const headers = { 
        'Content-Type': 'application/json',
        'x-telegram-user-id': String(tgUser.id) 
      };

      const res = await fetch(`${API_URL}/api/transactions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(txData)
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Tranzaksiya qo\'shishda xatolik');
      }

      showToast(txData.type === 'income' ? 'Daromad qo\'shildi' : 'Harajat qo\'shildi');
      setShowAddModal(false);
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      
      // Refresh database records
      await fetchData();
    } catch (error) {
      console.error('Error adding transaction:', error);
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
      showToast(error.message, 'error');
    }
  };

  // Delete Transaction handler
  const handleDeleteTransaction = async (txId) => {
    const confirmText = "Ushbu operatsiyani o'chirmoqchimisiz?";
    let shouldDelete = false;

    if (window.Telegram?.WebApp?.showConfirm) {
      await new Promise((resolve) => {
        window.Telegram.WebApp.showConfirm(confirmText, (confirmed) => {
          shouldDelete = confirmed;
          resolve();
        });
      });
    } else {
      shouldDelete = window.confirm(confirmText);
    }

    if (!shouldDelete) return;

    try {
      const headers = { 'x-telegram-user-id': String(tgUser.id) };
      const res = await fetch(`${API_URL}/api/transactions/${txId}`, {
        method: 'DELETE',
        headers
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'O\'chirishda xatolik yuz berdi');
      }

      showToast('Operatsiya o\'chirildi');
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      await fetchData();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
      showToast(error.message, 'error');
    }
  };

  // Update Settings/Budget handler
  const handleUpdateSettings = async (newSettings) => {
    try {
      const headers = { 
        'Content-Type': 'application/json',
        'x-telegram-user-id': String(tgUser.id) 
      };

      const res = await fetch(`${API_URL}/api/settings`, {
        method: 'POST',
        headers,
        body: JSON.stringify(newSettings)
      });

      if (!res.ok) {
        throw new Error('Sozlamalarni yangilab bo\'lmadi');
      }

      const data = await res.json();
      setSettings(prev => ({ ...prev, ...data }));
      showToast('Sozlamalar saqlandi');
    } catch (error) {
      console.error('Error updating settings:', error);
      showToast(error.message, 'error');
    }
  };

  // Reset Account Data handler
  const handleResetData = async () => {
    const confirmText = "Diqqat! Barcha operatsiyalar tarixi va limit sozlamalari butunlay o'chiriladi. Ushbu amalni ortga qaytarib bo'lmaydi. Rozimisiz?";
    let shouldReset = false;

    if (window.Telegram?.WebApp?.showConfirm) {
      await new Promise((resolve) => {
        window.Telegram.WebApp.showConfirm(confirmText, (confirmed) => {
          shouldReset = confirmed;
          resolve();
        });
      });
    } else {
      shouldReset = window.confirm(confirmText);
    }

    if (!shouldReset) return;

    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('warning');

    try {
      const headers = { 'x-telegram-user-id': String(tgUser.id) };
      const res = await fetch(`${API_URL}/api/settings/reset`, {
        method: 'POST',
        headers
      });

      if (!res.ok) throw new Error('Ma\'lumotlarni tozalashda xatolik');
      
      showToast('Hisobingiz tozalab tashlandi!');
      await fetchData();
    } catch (err) {
      console.error(err);
      showToast('Tizimni tozalab bo\'lmadi', 'error');
    }
  };

  // Fetch admin users list
  const fetchAdminUsers = async () => {
    try {
      const headers = { 'x-telegram-user-id': String(tgUser.id) };
      const res = await fetch(`${API_URL}/api/admin/users`, { headers });
      if (res.ok) {
        const data = await res.json();
        setAdminUsers(data);
      }
    } catch (err) {
      console.error('Error fetching users in admin check:', err);
    }
  };

  // Toggle user block status (Admin only)
  const handleToggleBlock = async (targetUserId, currentBlockStatus) => {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
    try {
      const headers = { 
        'Content-Type': 'application/json',
        'x-telegram-user-id': String(tgUser.id) 
      };
      const res = await fetch(`${API_URL}/api/admin/block`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ targetUserId, isBlocked: !currentBlockStatus })
      });
      if (res.ok) {
        showToast(currentBlockStatus ? 'Blokdan chiqarildi' : 'Foydalanuvchi bloklandi');
        fetchAdminUsers();
      }
    } catch (err) {
      console.error(err);
      showToast('Xatolik yuz berdi', 'error');
    }
  };

  // Send Broadcast alert message to all bot users
  const handleSendBroadcast = async () => {
    if (!adminBroadcastMsg.trim()) return;
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
    
    try {
      const headers = { 
        'Content-Type': 'application/json',
        'x-telegram-user-id': String(tgUser.id) 
      };
      const res = await fetch(`${API_URL}/api/admin/broadcast`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: adminBroadcastMsg })
      });
      if (res.ok) {
        const data = await res.json();
        showToast(`Yuborildi! (Ok: ${data.successCount}, Xato: ${data.failCount})`);
        setAdminBroadcastMsg('');
      } else {
        showToast('Matn yuborishda xato', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Broadcast failed', 'error');
    }
  };

  // Load admin panels if settings opens
  useEffect(() => {
    if (activeTab === 'settings' && settings.isAdmin) {
      fetchAdminUsers();
    }
  }, [activeTab, settings.isAdmin]);

  // Format amount utility
  const formatAmount = (num) => {
    return new Intl.NumberFormat('uz-UZ').format(num);
  };

  // Export history in CSV format
  const exportToCSV = () => {
    if (transactions.length === 0) {
      showToast('Export qilish uchun tranzaksiyalar mavjud emas!', 'error');
      return;
    }
    
    const headers = ['ID', 'Turi', 'Kategoriya', 'Izoh', 'Sana', 'Miqdori'];
    const rows = transactions.map(tx => [
      tx.id,
      tx.type === 'income' ? 'Daromad' : 'Harajat',
      tx.category,
      tx.description || '',
      new Date(tx.date).toLocaleDateString(),
      tx.amount
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `hisob_kitob_tarixi_${tgUser?.id || 'export'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Tarix CSV shaklida yuklab olindi!');
  };

  // Export history in JSON format
  const exportToJSON = () => {
    if (transactions.length === 0) {
      showToast('Export qilish uchun tranzaksiyalar mavjud emas!', 'error');
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(transactions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `hisob_backup_${tgUser?.id || 'export'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Zaxira JSON shaklida yuklab olindi!');
  };

  // Blocked View Screen
  if (isBlockedUser) {
    return (
      <div className="app-container locked-screen" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', padding: '24px' }}>
        <div className="empty-state" style={{ padding: '36px 24px', textAlign: 'center', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-lg)' }}>
          <Lock size={48} color="var(--expense-color)" style={{ margin: '0 auto 16px auto', display: 'block' }} />
          <h2 style={{ color: 'var(--expense-color)', fontSize: '20px', fontWeight: '800', marginBottom: '8px' }}>Hisobingiz bloklangan</h2>
          <p style={{ color: 'var(--hint-color)', fontSize: '13px', lineHeight: 1.5 }}>
            Kechirasiz, xavfsizlik yuzasidan botdan foydalanish huquqingiz admin tomonidan cheklangan. Savollar yuzasidan bot adminga murojaat qiling.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Ambient Glow Bubbles */}
      <div className="ambient-glow-1"></div>
      <div className="ambient-glow-2"></div>

      {/* Toast Alert */}
      {toast && (
        <div className={`toast-msg ${toast.type}`}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="app-header">
        <div className="user-profile">
          <div className="avatar">
            {tgUser?.first_name ? tgUser.first_name[0].toUpperCase() : 'U'}
          </div>
          <div className="user-info">
            <h2>{tgUser?.first_name || 'Foydalanuvchi'} {tgUser?.last_name || ''}</h2>
            <p>@{tgUser?.username || 'hisob_bot'}</p>
          </div>
        </div>
        <div>
          <button 
            onClick={fetchData} 
            className="section-link" 
            style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.8 }}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'spinner' : ''} style={{ animation: loading ? 'spin 1s infinite linear' : 'none' }} />
          </button>
        </div>
      </header>

      {/* Page Content Rendering */}
      {loading && transactions.length === 0 ? (
        <div className="loader-container">
          <div className="spinner"></div>
          <p>Yuklanmoqda...</p>
        </div>
      ) : (
        <>
          {/* Month Navigation Selector Bar */}
          {activeTab !== 'settings' && (
            <div className="month-navigation-bar">
              <button type="button" className="month-nav-btn" onClick={handlePrevMonth}>&larr;</button>
              <span className="month-nav-label">
                {currentMonthDate.toLocaleDateString('uz-UZ', { month: 'long', year: 'numeric' })}
              </span>
              <button type="button" className="month-nav-btn" onClick={handleNextMonth}>&rarr;</button>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <Dashboard 
              transactions={monthlyTransactions} 
              stats={monthlyStats} 
              currency={settings.currency}
              formatAmount={formatAmount}
              onDelete={handleDeleteTransaction}
              onAdd={handleAddTransaction}
            />
          )}

          {activeTab === 'analytics' && (
            <Analytics 
              stats={monthlyStats} 
              currency={settings.currency}
              formatAmount={formatAmount}
            />
          )}

          {activeTab === 'settings' && (
            <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
              <div className="section-title-bar">
                <h3>Sozlamalar</h3>
              </div>
              <div className="settings-list">
                {/* General Settings */}
                <div className="settings-item">
                  <div className="form-group">
                    <label className="form-label">Valyuta</label>
                    <select 
                      value={settings.currency}
                      onChange={(e) => handleUpdateSettings({ ...settings, currency: e.target.value })}
                      className="text-input"
                    >
                      <option value="UZS">So'm (UZS)</option>
                      <option value="USD">AQSH Dollari ($)</option>
                      <option value="EUR">Yevro (€)</option>
                      <option value="RUB">Rubl (₽)</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Oylik Byudjet (Limit)</label>
                    <div style={{ position: 'relative' }}>
                      <input 
                        type="number"
                        placeholder="Limit summasini kiriting"
                        value={settings.budget || ''}
                        onChange={(e) => handleUpdateSettings({ ...settings, budget: e.target.value })}
                        className="text-input"
                      />
                      <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: 'var(--hint-color)' }}>
                        {settings.currency}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--hint-color)', marginTop: '6px', display: 'block' }}>
                      Oylik xarajatlaringiz limitdan oshganda analytics bo'limida ogohlantiriladi.
                    </span>
                  </div>
                </div>

                {/* Exporters and Reset actions */}
                <div className="settings-item" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h4 style={{ fontSize: '12px', color: 'var(--hint-color)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                    Zaxira & Eksport
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button 
                      onClick={exportToCSV}
                      className="submit-btn" 
                      style={{ margin: 0, padding: '10px', fontSize: '12px', backgroundColor: 'var(--secondary-bg-color)', border: '1px solid var(--card-border)', color: 'var(--text-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <Download size={14} />
                      CSV yuklash
                    </button>
                    <button 
                      onClick={exportToJSON}
                      className="submit-btn" 
                      style={{ margin: 0, padding: '10px', fontSize: '12px', backgroundColor: 'var(--secondary-bg-color)', border: '1px solid var(--card-border)', color: 'var(--text-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <FileCode size={14} />
                      JSON yuklash
                    </button>
                  </div>

                  <button 
                    onClick={handleResetData}
                    className="submit-btn" 
                    style={{ margin: '8px 0 0 0', backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--expense-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <Trash2 size={16} />
                    Barcha ma'lumotlarni o'chirish
                  </button>
                </div>

                {/* Bot Creator Admin Control Panel Panel */}
                {settings.isAdmin && (
                  <div className="settings-item admin-panel-box" style={{ border: '1px solid rgba(59, 130, 246, 0.2)', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.4), rgba(59, 130, 246, 0.05))', borderRadius: 'var(--radius-md)', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--button-color)' }}>
                      <ShieldAlert size={20} />
                      <h4 style={{ fontSize: '14px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px', margin: 0 }}>
                        Bot Admin Panel
                      </h4>
                    </div>

                    {/* Broadcast Messaging */}
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label" style={{ color: 'var(--text-color)' }}>Hamma foydalanuvchilarga xabar yuborish</label>
                      <textarea
                        rows="3"
                        placeholder="Xabar matnini yozing..."
                        value={adminBroadcastMsg}
                        onChange={(e) => setAdminBroadcastMsg(e.target.value)}
                        className="text-input"
                        style={{ fontFamily: 'inherit', fontSize: '13px', resize: 'none', padding: '10px' }}
                      />
                      <button
                        type="button"
                        onClick={handleSendBroadcast}
                        disabled={!adminBroadcastMsg.trim()}
                        className="submit-btn"
                        style={{ margin: '8px 0 0 0', padding: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                      >
                        <Send size={14} />
                        Ommaviy yuborish (Broadcast)
                      </button>
                    </div>

                    {/* Registered Users List */}
                    <div className="admin-users-list-section" style={{ borderTop: '1px solid var(--card-border)', paddingTop: '14px' }}>
                      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-color)', marginBottom: '8px' }}>
                        <Users size={15} />
                        Foydalanuvchilar ro'yxati ({adminUsers.length} ta)
                      </label>
                      
                      <div className="admin-users-scroll" style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                        {adminUsers.map(user => {
                          const isSelf = String(user.user_id) === String(tgUser.id);
                          return (
                            <div key={user.user_id} className="admin-user-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--card-border)', borderRadius: '6px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxWidth: '65%' }}>
                                <span style={{ fontSize: '12px', fontWeight: '700', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                  {user.first_name || 'Noma\'lum'} {isSelf ? '(Siz)' : ''}
                                </span>
                                <span style={{ fontSize: '10px', color: 'var(--hint-color)' }}>
                                  ID: {user.user_id} {user.username ? `@${user.username}` : ''}
                                </span>
                              </div>

                              <button
                                type="button"
                                disabled={isSelf} // Cannot block oneself
                                onClick={() => handleToggleBlock(user.user_id, user.is_blocked)}
                                style={{ 
                                  fontSize: '11px', 
                                  fontWeight: '700', 
                                  padding: '5px 10px', 
                                  borderRadius: '12px', 
                                  border: 'none',
                                  cursor: isSelf ? 'not-allowed' : 'pointer',
                                  backgroundColor: user.is_blocked ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                  color: user.is_blocked ? 'var(--income-color)' : 'var(--expense-color)',
                                  transition: 'background-color 0.2s'
                                }}
                              >
                                {user.is_blocked ? 'Blokdan ochish' : 'Bloklash'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                <div className="settings-item" style={{ textAlign: 'center', color: 'var(--hint-color)', fontSize: '13px' }}>
                  <p>Hisob Bot v1.2.0 (VIP)</p>
                  <p style={{ marginTop: '4px' }}>Telegram Mini App loyihasi</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Floating Add Transaction Modal */}
      {showAddModal && (
        <AddTransaction 
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddTransaction}
          currency={settings.currency}
        />
      )}

      {/* Persistent Floating Bottom Navigation Bar */}
      <nav className="bottom-nav">
        <button 
          className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <LayoutDashboard className="nav-icon" />
          <span>Dashboard</span>
        </button>

        <button 
          className="nav-item-center"
          onClick={() => setShowAddModal(true)}
          aria-label="Yangi tranzaksiya"
        >
          <Plus size={28} />
        </button>

        <button 
          className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <PieChart className="nav-icon" />
          <span>Statistika</span>
        </button>

        <button 
          className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <Settings className="nav-icon" />
          <span>Sozlamalar</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
