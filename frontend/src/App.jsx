import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  Printer,
  Globe,
  User
} from 'lucide-react';
import { translations } from './translations';

const Dashboard = lazy(() => import('./components/Dashboard'));
const Analytics = lazy(() => import('./components/Analytics'));
const AddTransaction = lazy(() => import('./components/AddTransaction'));
const Profile = lazy(() => import('./components/Profile'));
const VaultModal = lazy(() => import('./components/VaultModal'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const History = lazy(() => import('./components/History'));
const CategoryManager = lazy(() => import('./components/CategoryManager'));
const Debts = lazy(() => import('./components/Debts'));

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
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'analytics', 'profile', 'add-transaction', 'history', 'admin'
  const [showVaultModal, setShowVaultModal] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState({
    expense: ['Oziq-ovqat', 'Transport', 'Xaridlar', 'Kafe', 'Ko\'ngilochar', 'Kommunal', 'Sog\'liq', 'Ta\'lim', 'Xizmatlar', 'Boshqa'],
    income: ['Maosh', 'Biznes', 'Sovg\'alar', 'Boshqa']
  });
  const [settings, setSettings] = useState({ budget: 0, isAdmin: false, is_blocked: false });
  const [loading, setLoading] = useState(true);
  const [tgUser, setTgUser] = useState(null);
  const [toast, setToast] = useState(null);
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [theme, setTheme] = useState(localStorage.getItem('appTheme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('appTheme', newTheme);
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
  };
  
  // Multilingual State
  const [lang, setLang] = useState(localStorage.getItem('appLang') || 'uz');

  // Admin States
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminBroadcastMsg, setAdminBroadcastMsg] = useState('');
  const [isBlockedUser, setIsBlockedUser] = useState(false);

  // Active translation helper
  const t = translations[lang] || translations.uz;

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

  // Prefetch components to eliminate load times on tab switch
  useEffect(() => {
    const prefetch = () => {
      import('./components/Dashboard');
      import('./components/Analytics');
      import('./components/AddTransaction');
      import('./components/Profile');
      import('./components/History');
      import('./components/CategoryManager');
      import('./components/VaultModal');
      import('./components/AdminPanel');
    };
    setTimeout(prefetch, 2000);
  }, []);

  const queryClient = useQueryClient();

  const headers = { 
    'x-telegram-user-id': String(tgUser?.id || '123456'),
    'x-telegram-first-name': encodeURIComponent(tgUser?.first_name || ''),
    'x-telegram-username': encodeURIComponent(tgUser?.username || '')
  };

  const { data: queryData, isLoading: queryLoading, refetch: fetchData } = useQuery({
    queryKey: ['appData', tgUser?.id],
    queryFn: async () => {
      if (!tgUser?.id) return null;
      const [txRes, settingsRes, catRes] = await Promise.all([
        fetch(`${API_URL}/api/transactions`, { headers }),
        fetch(`${API_URL}/api/settings`, { headers }),
        fetch(`${API_URL}/api/categories`, { headers })
      ]);

      if (!txRes.ok || !settingsRes.ok) {
        throw new Error('API server returned error responses');
      }

      const txData = await txRes.json();
      const settingsData = await settingsRes.json();
      const catData = catRes.ok ? await catRes.json() : [];
      
      let expCats = [];
      let incCats = [];
      if (catData && catData.length > 0) {
        expCats = catData.filter(c => c.type === 'expense').map(c => c.name);
        incCats = catData.filter(c => c.type === 'income').map(c => c.name);
      }

      return {
        transactions: txData.data || txData,
        settings: settingsData,
        expenseCats: expCats,
        incomeCats: incCats
      };
    },
    enabled: !!tgUser?.id,
    staleTime: 60 * 1000 // 1 minute cache
  });

  useEffect(() => {
    if (queryData) {
      if (queryData.settings.is_blocked) {
        setIsBlockedUser(true);
        return;
      }
      setTransactions(queryData.transactions);
      setSettings(queryData.settings);
      
      setCategories(prev => ({
        expense: queryData.expenseCats.length > 0 ? queryData.expenseCats : prev.expense,
        income: queryData.incomeCats.length > 0 ? queryData.incomeCats : prev.income
      }));
      setLoading(false);
    }
  }, [queryData]);

  useEffect(() => {
    if (queryLoading && !queryData) {
      setLoading(true);
    }
  }, [queryLoading, queryData]);

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
      const isXazna = tx.category === 'Xazna';
      
      if (!categoryTotals[tx.category]) {
        categoryTotals[tx.category] = { name: tx.category, income: 0, expense: 0, count: 0 };
      }
      
      categoryTotals[tx.category].count += 1;

      if (tx.type === 'income') {
        if (!isXazna) totalIncome += amount;
        categoryTotals[tx.category].income += amount;
      } else {
        if (!isXazna) totalExpense += amount;
        categoryTotals[tx.category].expense += amount;
      }
    });

    const categories = Object.values(categoryTotals)
      .filter(c => c.name !== 'Xazna') // Keep Xazna out of the main categories display if wanted, or leave it. We'll leave it for now.
      .sort((a, b) => (b.expense + b.income) - (a.expense + a.income));

    return {
      balance: totalIncome - totalExpense,
      totalIncome,
      totalExpense,
      budget: settings.budget || 0,
      categories,
      vaultBalance: categoryTotals['Xazna'] ? (categoryTotals['Xazna'].income - categoryTotals['Xazna'].expense) : 0
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

      showToast(txData.type === 'income' ? t.toastAddedIncome : t.toastAddedExpense);
      setActiveTab('dashboard');
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      
      // Refresh database records
      queryClient.invalidateQueries({ queryKey: ['appData'] });
    } catch (error) {
      console.error('Error adding transaction:', error);
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
      showToast(error.message, 'error');
    }
  };

  // Delete Transaction handler
  const handleDeleteTransaction = async (txId) => {
    const confirmText = t.deleteConfirm;
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

      showToast(t.toastDeleted);
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      queryClient.invalidateQueries({ queryKey: ['appData'] });
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
      showToast(t.toastSaved);
    } catch (error) {
      console.error('Error updating settings:', error);
      showToast(error.message, 'error');
    }
  };

  // Reset Account Data handler
  const handleResetData = async () => {
    const confirmText = t.resetConfirm;
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
      
      showToast(t.toastReset);
      await fetchData();
    } catch (err) {
      console.error(err);
      showToast('Tizimni tozalab bo\'lmadi', 'error');
    }
  };

  // Trigger browser print dialog for HTML/PDF Report
  const handlePrintReport = () => {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
    window.print();
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
        showToast(currentBlockStatus ? t.unblock : t.block);
        fetchAdminUsers();
      }
    } catch (err) {
      console.error(err);
      showToast(t.toastError, 'error');
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
        showToast(`Broadcasting ok: ${data.successCount}, fail: ${data.failCount}`);
        setAdminBroadcastMsg('');
      } else {
        showToast('Broadcast error', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Broadcast failed', 'error');
    }
  };

  // Load admin panels if admin tab opens
  useEffect(() => {
    if (activeTab === 'admin' && settings.isAdmin) {
      fetchAdminUsers();
      queryClient.prefetchQuery({
        queryKey: ['debts', tgUser?.id],
        queryFn: async () => {
          const res = await fetch(`${API_URL}/api/debts`, {
            headers: { 'x-telegram-user-id': tgUser?.id || '123456' }
          });
          return res.json();
        }
      });
    }
  }, [tgUser, activeTab, queryClient]);

  // Format amount utility
  const formatAmount = (num) => {
    return new Intl.NumberFormat('uz-UZ').format(num);
  };

  // Export history in CSV format
  const exportToCSV = () => {
    if (transactions.length === 0) {
      showToast('No data', 'error');
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
    
    showToast('CSV downloaded');
  };

  // Export history in JSON format
  const exportToJSON = () => {
    if (transactions.length === 0) {
      showToast('No data', 'error');
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(transactions, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `hisob_backup_${tgUser?.id || 'export'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('JSON backup downloaded');
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

      {/* HTML PDF Report Header (Only visible on Print output) */}
      <div className="print-only-header">
        <h1>{t.printHeader}</h1>
        <p style={{ fontSize: '14px', color: '#64748b', marginTop: '6px' }}>
          {tgUser?.first_name} (@{tgUser?.username}) | {currentMonthDate.toLocaleDateString(lang === 'uz' ? 'uz-UZ' : lang === 'ru' ? 'ru-RU' : 'en-US', { month: 'long', year: 'numeric' })}
        </p>
        <hr style={{ border: 'none', borderTop: '1px solid #cbd5e1', margin: '16px 0' }} />
      </div>

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
          <p>{t.loading}</p>
        </div>
      ) : (
        <Suspense fallback={<div className="loader-container"><div className="spinner"></div></div>}>
          {/* Month Navigation Selector Bar */}
          {(activeTab === 'dashboard' || activeTab === 'analytics' || activeTab === 'history') && (
            <div className="month-navigation-bar">
              <button type="button" className="month-nav-btn" onClick={handlePrevMonth}>&larr;</button>
              <span className="month-nav-label">
                {currentMonthDate.toLocaleDateString(lang === 'uz' ? 'uz-UZ' : lang === 'ru' ? 'ru-RU' : 'en-US', { month: 'long', year: 'numeric' })}
              </span>
              <button type="button" className="month-nav-btn" onClick={handleNextMonth}>&rarr;</button>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <Dashboard 
              transactions={monthlyTransactions} 
              stats={monthlyStats} 
              formatAmount={formatAmount}
              onDelete={handleDeleteTransaction}
              onAdd={handleAddTransaction}
              t={t}
              lang={lang}
            />
          )}

          {activeTab === 'analytics' && (
            <Analytics 
              stats={monthlyStats} 
              currency={t.currencySymbol}
              formatAmount={formatAmount}
              t={t}
              lang={lang}
            />
          )}

          {activeTab === 'debts' && (
            <Debts 
              tgUser={tgUser}
              apiUrl={API_URL}
              t={t}
              formatAmount={formatAmount}
            />
          )}

          {activeTab === 'profile' && (
            <Profile
              tgUser={tgUser}
              settings={settings}
              t={t}
              lang={lang}
              setLang={(l) => {
                setLang(l);
                localStorage.setItem('appLang', l);
              }}
              vaultBalance={monthlyStats.vaultBalance}
              onOpenVault={() => setShowVaultModal(true)}
              isAdmin={settings.isAdmin}
              formatAmount={formatAmount}
              onReset={handleResetData}
              setActiveTab={setActiveTab}
              theme={theme}
              toggleTheme={toggleTheme}
            />
          )}

          {activeTab === 'admin' && settings.isAdmin && (
            <AdminPanel 
              adminUsers={adminUsers}
              adminBroadcastMsg={adminBroadcastMsg}
              setAdminBroadcastMsg={setAdminBroadcastMsg}
              handleSendBroadcast={handleSendBroadcast}
              handleToggleBlock={handleToggleBlock}
              tgUser={tgUser}
              t={t}
              setActiveTab={setActiveTab}
              apiUrl={API_URL}
              formatAmount={formatAmount}
            />
          )}

          {activeTab === 'history' && (
            <History 
              transactions={monthlyTransactions}
              formatAmount={formatAmount}
              onDelete={handleDeleteTransaction}
              t={t}
              lang={lang}
              setActiveTab={setActiveTab}
            />
          )}
          {activeTab === 'category-manager' && (
            <CategoryManager 
              categories={categories}
              setCategories={setCategories}
              setActiveTab={setActiveTab}
              tgUser={tgUser}
              apiUrl={API_URL}
              t={t}
            />
          )}

          {/* Add Transaction Tab */}
          {activeTab === 'add-transaction' && (
            <AddTransaction 
              onClose={() => setActiveTab('dashboard')}
              onSubmit={(tx) => {
                 handleAddTransaction(tx);
                 setActiveTab('dashboard');
              }}
              categories={categories}
              tgUser={tgUser}
              apiUrl={API_URL}
              t={t}
            />
          )}

          {/* Vault Modal */}
          {showVaultModal && (
            <VaultModal 
              onClose={() => setShowVaultModal(false)}
              vaultBalance={monthlyStats.vaultBalance}
              onSubmit={async (tx) => {
                await handleAddTransaction(tx);
                setShowVaultModal(false);
              }}
              t={t}
              formatAmount={formatAmount}
            />
          )}
        </Suspense>
      )}

      {/* Persistent Floating Bottom Navigation Bar */}
      <nav className="floating-nav">
        <button 
          className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <LayoutDashboard size={22} />
          <span style={{ fontSize: '10px', marginTop: '4px' }}>{t.dashboard}</span>
        </button>

        <button 
          className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <PieChart size={22} />
          <span style={{ fontSize: '10px', marginTop: '4px' }}>{t.analytics}</span>
        </button>

        <button 
          className={`nav-item ${activeTab === 'debts' ? 'active' : ''}`}
          onClick={() => setActiveTab('debts')}
        >
          <Users size={22} />
          <span style={{ fontSize: '10px', marginTop: '4px' }}>Qarzlar</span>
        </button>

        <button 
          className={`nav-item-plus ${activeTab === 'add-transaction' ? 'active' : ''}`}
          onClick={() => setActiveTab('add-transaction')}
          aria-label="Yangi tranzaksiya"
        >
          <Plus size={26} />
        </button>

        <button 
          className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <User size={22} />
          <span style={{ fontSize: '10px', marginTop: '4px' }}>{t.profile || 'Profil'}</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
