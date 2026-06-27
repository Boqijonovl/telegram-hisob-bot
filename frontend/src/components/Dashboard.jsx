import React, { useState, useEffect, useRef } from 'react';
import { 
  Trash2, 
  Apple, 
  Car, 
  Home, 
  ShoppingBag, 
  Gamepad2, 
  Coffee, 
  Wallet, 
  Briefcase, 
  Gift, 
  HelpCircle,
  TrendingUp,
  TrendingDown,
  HeartPulse,
  GraduationCap,
  Settings,
  Download,
  Loader
} from 'lucide-react';
import html2pdf from 'html2pdf.js';

// Categories Configuration
export const getCategoryConfig = (categoryName) => {
  const configs = {
    'Oziq-ovqat': { icon: Apple, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
    'Transport': { icon: Car, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
    'Kommunal': { icon: Home, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' },
    'Xaridlar': { icon: ShoppingBag, color: '#ec4899', bg: 'rgba(236, 72, 153, 0.12)' },
    'Ko\'ngilochar': { icon: Gamepad2, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' },
    'Kafe': { icon: Coffee, color: '#14b8a6', bg: 'rgba(20, 184, 166, 0.12)' },
    'Sog\'liq': { icon: HeartPulse, color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.12)' },
    'Ta\'lim': { icon: GraduationCap, color: '#a855f7', bg: 'rgba(168, 85, 247, 0.12)' },
    'Xizmatlar': { icon: Settings, color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
    'Maosh': { icon: Wallet, color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
    'Biznes': { icon: Briefcase, color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.12)' },
    'Sovg\'alar': { icon: Gift, color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.12)' },
    'Daromad': { icon: TrendingUp, color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
    'Xazna': { icon: Wallet, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' },
    'Boshqa': { icon: HelpCircle, color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)' }
  };
  return configs[categoryName] || configs['Boshqa'];
};

function AnimatedCounter({ value, duration = 800 }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseFloat(value) || 0;
    if (start === end) {
      setCount(end);
      return;
    }
    const totalMiliseconds = duration;
    const incrementTime = 25; 
    const totalSteps = totalMiliseconds / incrementTime;
    const increment = (end - start) / totalSteps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      start += increment;
      if (currentStep >= totalSteps) {
        clearInterval(timer);
        setCount(end);
      } else {
        setCount(Math.floor(start));
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value]);

  return new Intl.NumberFormat('uz-UZ').format(count);
}

const formatDayHeader = (dateStr, t, lang) => {
  const date = new Date(dateStr);
  const todayStr = new Date().toISOString().substring(0, 10);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().substring(0, 10);
  const locale = lang === 'uz' ? 'uz-UZ' : lang === 'ru' ? 'ru-RU' : 'en-US';

  if (dateStr === todayStr) return `${t.today}, ` + date.toLocaleDateString(locale, { day: 'numeric', month: 'long' });
  if (dateStr === yesterdayStr) return `${t.yesterday}, ` + date.toLocaleDateString(locale, { day: 'numeric', month: 'long' });
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
};

// Group transactions by calendar day YYYY-MM-DD
const groupTransactionsByDay = (txList) => {
  const groups = {};
  txList.forEach(tx => {
    const date = new Date(tx.date);
    const dateKey = date.toISOString().substring(0, 10);
    if (!groups[dateKey]) {
      groups[dateKey] = { dateStr: dateKey, transactions: [], dayIncome: 0, dayExpense: 0 };
    }
    groups[dateKey].transactions.push(tx);
    const amount = parseFloat(tx.amount);
    if (tx.type === 'income') groups[dateKey].dayIncome += amount;
    else groups[dateKey].dayExpense += amount;
  });
  return Object.values(groups).sort((a, b) => b.dateStr.localeCompare(a.dateStr));
};

function TransactionItem({ tx, formatAmount, onDelete, t }) {
  const conf = getCategoryConfig(tx.category);
  const Icon = conf.icon;

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-sm)' }}>
      <div 
        className="transaction-item"
        style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingRight: '12px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <div className="tx-icon" style={{ backgroundColor: conf.bg, color: conf.color }}>
            <Icon size={18} />
          </div>
          <div className="tx-details">
            <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '2px', color: 'var(--text-color)' }}>
              {t.categories[tx.category] || tx.category}
            </h4>
            <p style={{ fontSize: '11px', color: 'var(--hint-color)' }}>{tx.description || t.categories[tx.category]}</p>
          </div>
        </div>
        <div className="tx-amount" style={{ textAlign: 'right', marginRight: '8px' }}>
          <p style={{ 
            fontSize: '14px', 
            fontWeight: '700', 
            color: tx.type === 'income' ? 'var(--income-color)' : 'var(--expense-color)' 
          }}>
            {tx.type === 'income' ? '+' : '-'}{formatAmount(tx.amount)}
          </p>
        </div>
        <button 
          onClick={() => onDelete(tx.id)} 
          style={{ 
            background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: 'var(--expense-color)', 
            padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}

function Dashboard({ transactions, stats, onDelete, formatAmount, t, lang, API_URL, tgUser, showToast }) {
  const [activeTab, setActiveTab] = useState('kategoriya'); // 'kategoriya' or 'tranzaksiya'
  const [activeCategory, setActiveCategory] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const pdfRef = useRef(null);

  // Group transactions for "Tranzaksiya" tab
  const groupedDays = groupTransactionsByDay(transactions);

  // Filter out 'Xazna' from display if needed, but the stats already computes it correctly
  
  const incomeCount = transactions.filter(t => t.type === 'income').length;
  const expenseCount = transactions.filter(t => t.type === 'expense').length;

  const totalOps = incomeCount + expenseCount;
  const progressPercent = stats.totalIncome > 0 ? Math.min(100, Math.round((stats.totalExpense / stats.totalIncome) * 100)) : (stats.totalExpense > 0 ? 100 : 0);

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
      
      const element = pdfRef.current;
      const opt = {
        margin:       10,
        filename:     'Hisobot.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#0f172a' },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // Generate base64 PDF
      const pdfBase64 = await html2pdf().set(opt).from(element).outputPdf('datauristring');
      
      // Send to backend to forward to Telegram Bot
      const res = await fetch(`${API_URL}/api/send-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-telegram-user-id': String(tgUser.id)
        },
        body: JSON.stringify({ pdfBase64, filename: `Hisobot_${new Date().toISOString().substring(0,10)}.pdf` })
      });

      if (!res.ok) throw new Error('Failed to send PDF');
      
      showToast(t.toastSaved || 'PDF telegram bot orqali yuborildi!', 'success');
    } catch (error) {
      console.error('PDF Export Error:', error);
      showToast(t.toastError || 'PDF yuborishda xatolik', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{ paddingBottom: '30px' }} ref={pdfRef}>
      {/* Top Balance Card */}
      <div style={{
        background: 'var(--secondary-bg-color)',
        borderRadius: '24px',
        padding: '20px',
        marginBottom: '20px',
        border: '1px solid var(--card-border)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '13px', color: 'var(--hint-color)', fontWeight: '600' }}>Umumiy aylanma:</span>
          <span style={{ fontSize: '15px', fontWeight: '800', color: stats.balance < 0 ? 'var(--expense-color)' : 'var(--text-color)' }}>
            {stats.balance < 0 ? '-' : ''}{formatAmount(Math.abs(stats.balance))} <span style={{ fontSize: '11px' }}>UZS</span>
          </span>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.15)', borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '8px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--income-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={12} color="var(--income-color)" />
              </div>
              <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-color)' }}>Kirim</span>
            </div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--income-color)', marginBottom: '4px' }}>
              +{formatAmount(stats.totalIncome)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--hint-color)' }}>{incomeCount} ta operatsiya</div>
          </div>

          <div style={{ flex: 1, background: 'rgba(0,0,0,0.15)', borderRadius: '16px', padding: '16px', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '8px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--expense-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingDown size={12} color="var(--expense-color)" />
              </div>
              <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-color)' }}>Chiqim</span>
            </div>
            <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--expense-color)', marginBottom: '4px' }}>
              -{formatAmount(stats.totalExpense)}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--hint-color)' }}>{expenseCount} ta operatsiya</div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ position: 'relative', height: '28px', background: 'rgba(16, 185, 129, 0.2)', borderRadius: '14px', overflow: 'hidden' }}>
           {/* Diagonal stripes background for the green part can be added via css, but simple color is fine */}
           <div style={{ 
             position: 'absolute', top: 0, left: 0, bottom: 0, 
             width: '100%', 
             background: 'repeating-linear-gradient(45deg, rgba(16, 185, 129, 0.3), rgba(16, 185, 129, 0.3) 10px, rgba(16, 185, 129, 0.4) 10px, rgba(16, 185, 129, 0.4) 20px)'
           }}></div>
           
           <div style={{
             position: 'absolute', top: 0, right: 0, bottom: 0,
             background: 'var(--expense-color)',
             width: `${progressPercent}%`,
             borderRadius: '14px',
             display: 'flex', alignItems: 'center', justifyContent: 'center',
             color: 'white', fontSize: '11px', fontWeight: '800'
           }}>
             {progressPercent > 15 ? `-${progressPercent}%` : ''}
           </div>
           {progressPercent <= 15 && progressPercent > 0 && (
             <div style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', color: 'white', fontSize: '11px', fontWeight: '800' }}>
               -{progressPercent}%
             </div>
           )}
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="tabs-container">
        <button 
          className={`tab-btn ${activeTab === 'kategoriya' ? 'active' : ''}`}
          onClick={() => setActiveTab('kategoriya')}
        >
          Kategoriya
        </button>
        <button 
          className={`tab-btn ${activeTab === 'tranzaksiya' ? 'active' : ''}`}
          onClick={() => setActiveTab('tranzaksiya')}
        >
          Tranzaksiya
        </button>
      </div>

      {/* Content based on Tab */}
      {activeTab === 'kategoriya' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {activeCategory ? (
            <div>
              <button 
                onClick={() => setActiveCategory(null)}
                style={{ background: 'var(--secondary-bg-color)', border: '1px solid var(--card-border)', color: 'var(--text-color)', padding: '8px 16px', borderRadius: '8px', marginBottom: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600' }}
              >
                &larr; Orqaga
              </button>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>
                {t.categories[activeCategory] || activeCategory}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {transactions.filter(tx => tx.category === activeCategory).map(tx => (
                  <TransactionItem 
                    key={tx.id} 
                    tx={tx} 
                    formatAmount={formatAmount} 
                    onDelete={onDelete}
                    t={t}
                  />
                ))}
              </div>
            </div>
          ) : (
            stats.categories && stats.categories.length > 0 ? stats.categories.map(cat => {
              const conf = getCategoryConfig(cat.name);
              const Icon = conf.icon;
              return (
                <div key={cat.name} 
                  onClick={() => setActiveCategory(cat.name)}
                  style={{
                  background: 'var(--secondary-bg-color)',
                  borderRadius: '16px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid var(--card-border)',
                  cursor: 'pointer'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: conf.bg, color: conf.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-color)' }}>{t.categories[cat.name] || cat.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--hint-color)' }}>{cat.count} ta operatsiya</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {cat.income > 0 && <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--income-color)' }}>+{formatAmount(cat.income)}</div>}
                    {cat.expense > 0 && <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--expense-color)' }}>-{formatAmount(cat.expense)}</div>}
                  </div>
                </div>
              );
            }) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--hint-color)' }}>Kategoriyalar yo'q</div>
            )
          )}
        </div>
      )}

      {activeTab === 'tranzaksiya' && (
        <div className="transactions-list">
          {groupedDays.length === 0 ? (
            <div className="empty-state">
              <TrendingUp className="empty-state-icon" style={{ opacity: 0.2 }} />
              <p>{t.noTransactions}</p>
            </div>
          ) : (
            groupedDays.map(group => (
              <div key={group.dateStr} className="daily-group-box" style={{ marginBottom: '16px' }}>
                <div className="daily-group-header" style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                  <span className="daily-date" style={{ fontSize: '12px', fontWeight: '600', color: 'var(--hint-color)' }}>{formatDayHeader(group.dateStr, t, lang)}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {group.transactions.map(tx => (
                    <TransactionItem 
                      key={tx.id} 
                      tx={tx} 
                      formatAmount={formatAmount} 
                      onDelete={onDelete}
                      t={t}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* PDF Export Button */}
      <button 
        onClick={handleExportPDF}
        disabled={isExporting}
        style={{
          width: '100%',
          marginTop: '24px',
          padding: '16px',
          borderRadius: '16px',
          background: 'var(--button-color)',
          color: 'white',
          border: 'none',
          fontSize: '14px',
          fontWeight: '700',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          opacity: isExporting ? 0.7 : 1
        }}
      >
        {isExporting ? <Loader size={18} className="spin-animation" /> : <Download size={18} />}
        {t.downloadPdf}
      </button>
    </div>
  );
}

export default Dashboard;
