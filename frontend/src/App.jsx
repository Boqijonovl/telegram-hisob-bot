import React, { useState, useEffect } from 'react';
import { LayoutDashboard, PieChart, Settings, Plus, Bell, RefreshCw, Download } from 'lucide-react';
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
  const [settings, setSettings] = useState({ currency: 'UZS', budget: 0 });
  const [loading, setLoading] = useState(true);
  const [tgUser, setTgUser] = useState(null);
  const [toast, setToast] = useState(null);

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
      const headers = { 'x-telegram-user-id': String(tgUser.id) };
      
      const [txRes, statsRes, settingsRes] = await Promise.all([
        fetch(`${API_URL}/api/transactions`, { headers }),
        fetch(`${API_URL}/api/stats`, { headers }),
        fetch(`${API_URL}/api/settings`, { headers })
      ]);

      if (!txRes.ok || !statsRes.ok || !settingsRes.ok) {
        throw new Error('API server returned error responses');
      }

      const txData = await txRes.json();
      const statsData = await statsRes.json();
      const settingsData = await settingsRes.json();

      setTransactions(txData);
      setStats(statsData);
      setSettings(settingsData);
    } catch (error) {
      console.error('Error fetching data from backend:', error);
      showToast('Backend server bilan bog\'lanishda xatolik yuz berdi!', 'error');
    } finally {
      setLoading(false);
    }
  };

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
      
      // Refresh database records
      await fetchData();
    } catch (error) {
      console.error('Error adding transaction:', error);
      showToast(error.message, 'error');
    }
  };

  // Delete Transaction handler
  const handleDeleteTransaction = async (txId) => {
    // Show Telegram's native confirmation dialog if available, otherwise use JS confirm
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
      await fetchData();
    } catch (error) {
      console.error('Error deleting transaction:', error);
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
        throw new Error('Sozlamalarni saqlashda xato');
      }

      const updated = await res.json();
      setSettings(updated);
      showToast('Sozlamalar saqlandi');
      await fetchData();
    } catch (error) {
      console.error('Error updating settings:', error);
      showToast(error.message, 'error');
    }
  };

  // Format currency helpers
  const formatAmount = (num) => {
    return new Intl.NumberFormat('uz-UZ').format(num);
  };

  const exportToCSV = () => {
    if (transactions.length === 0) {
      showToast('Eksport qilish uchun tranzaksiyalar mavjud emas!', 'error');
      return;
    }

    // CSV headers
    const headers = ['ID', 'Sana', 'Kategoriya', 'Turi', 'Miqdor', 'Izoh'];
    
    // Format rows
    const rows = transactions.map(tx => [
      tx.id,
      new Date(tx.date).toLocaleString('uz-UZ'),
      tx.category,
      tx.type === 'income' ? 'Daromad' : 'Harajat',
      tx.amount,
      // escape double quotes and wrap in quotes to prevent breaking commas
      `"${(tx.description || '').replace(/"/g, '""')}"`
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    // Create file blob and download
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `hisob_kitob_tarixi_${tgUser?.id || 'export'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Tarix muvaffaqiyatli CSV shaklida yuklab olindi!');
  };

  return (
    <div className="app-container">
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
          {activeTab === 'dashboard' && (
            <Dashboard 
              transactions={transactions} 
              stats={stats} 
              currency={settings.currency}
              formatAmount={formatAmount}
              onDelete={handleDeleteTransaction}
            />
          )}

          {activeTab === 'analytics' && (
            <Analytics 
              stats={stats} 
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
                      Oylik harajatlaringiz limitdan oshganda analytics bo'limida ogohlantiriladi.
                    </span>
                  </div>
                </div>

                <div className="settings-item">
                  <button 
                    onClick={exportToCSV}
                    className="submit-btn" 
                    style={{ backgroundColor: 'var(--secondary-bg-color)', border: '1px solid var(--card-border)', color: 'var(--text-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <Download size={18} />
                    Tarixni yuklab olish (CSV)
                  </button>
                </div>

                <div className="settings-item" style={{ textAlign: 'center', color: 'var(--hint-color)', fontSize: '13px' }}>
                  <p>Hisob Bot v1.0.0</p>
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
