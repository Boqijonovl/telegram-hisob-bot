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
  AlertTriangle,
  Search,
  TrendingUp,
  TrendingDown,
  HeartPulse,
  GraduationCap,
  Settings
} from 'lucide-react';

// Map categories to appropriate Lucide icons and colors (Modern & Specific)
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
    'Boshqa': { icon: HelpCircle, color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)' }
  };
  return configs[categoryName] || configs['Boshqa'];
};

// Odometer animated counter for financial figures
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

// Format day header based on selected language
const formatDayHeader = (dateStr, t, lang) => {
  const date = new Date(dateStr);
  const todayStr = new Date().toISOString().substring(0, 10);
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().substring(0, 10);

  const locale = lang === 'uz' ? 'uz-UZ' : lang === 'ru' ? 'ru-RU' : 'en-US';

  if (dateStr === todayStr) {
    return `${t.today}, ` + date.toLocaleDateString(locale, { day: 'numeric', month: 'long' });
  } else if (dateStr === yesterdayStr) {
    return `${t.yesterday}, ` + date.toLocaleDateString(locale, { day: 'numeric', month: 'long' });
  } else {
    return date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  }
};

// Group transactions by calendar day YYYY-MM-DD
const groupTransactionsByDay = (txList) => {
  const groups = {};
  txList.forEach(tx => {
    const date = new Date(tx.date);
    const dateKey = date.toISOString().substring(0, 10);
    if (!groups[dateKey]) {
      groups[dateKey] = {
        dateStr: dateKey,
        transactions: [],
        dayIncome: 0,
        dayExpense: 0
      };
    }
    groups[dateKey].transactions.push(tx);
    const amount = parseFloat(tx.amount);
    if (tx.type === 'income') {
      groups[dateKey].dayIncome += amount;
    } else {
      groups[dateKey].dayExpense += amount;
    }
  });

  return Object.values(groups).sort((a, b) => b.dateStr.localeCompare(a.dateStr));
};

// Swipe-to-delete item wrapper
function TransactionItem({ tx, formatAmount, onDelete, t }) {
  const [startX, setStartX] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiped, setIsSwiped] = useState(false);

  const handleTouchStart = (e) => {
    setStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e) => {
    const currentX = e.touches[0].clientX;
    let diff = currentX - startX;

    if (isSwiped) {
      diff -= 80;
    }

    if (diff < 0) {
      setOffsetX(Math.max(diff, -100));
    } else {
      setOffsetX(0);
    }
  };

  const handleTouchEnd = () => {
    if (offsetX < -45) {
      setOffsetX(-80);
      setIsSwiped(true);
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
    } else {
      setOffsetX(0);
      setIsSwiped(false);
    }
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    onDelete(tx.id);
  };

  const config = getCategoryConfig(tx.category);
  const IconComponent = config.icon;
  
  const formatTime = (isoString) => {
    const date = new Date(isoString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return (
    <div className="swipe-item-container">
      {/* Background red delete box */}
      <div onClick={handleDeleteClick} className="swipe-delete-action">
        <Trash2 size={18} />
        <span>O'chirish</span>
      </div>

      {/* Slideable transaction card */}
      <div 
        className="transaction-card swipe-front"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ 
          transform: `translateX(${offsetX}px)`, 
          transition: offsetX === 0 || offsetX === -80 ? 'transform 0.2s ease-out' : 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="tx-icon-box" style={{ backgroundColor: config.bg, color: config.color }}>
            <IconComponent size={20} />
          </div>
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: '800', margin: '0 0 2px 0' }}>
              {t.categories[tx.category] || tx.category}
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--hint-color)' }}>
                {formatTime(tx.date)}
              </span>
              {tx.description && (
                <>
                  <span style={{ width: '3px', height: '3px', borderRadius: '50%', backgroundColor: 'var(--hint-color)' }}></span>
                  <span style={{ fontSize: '11px', color: 'var(--hint-color)', maxWidth: '140px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {tx.description}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span style={{ 
            fontSize: '15px', 
            fontWeight: '900', 
            color: tx.type === 'income' ? 'var(--income-color)' : 'var(--expense-color)' 
          }}>
            {tx.type === 'income' ? '+' : '-'}{formatAmount(tx.amount)} {t.currencySymbol}
          </span>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ transactions, stats, formatAmount, onDelete, onAdd, t, lang }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Barchasi');
  const [tiltStyle, setTiltStyle] = useState({});
  const cardRef = useRef(null);

  // Budget calculations
  const budgetProgress = stats.budget > 0 ? (stats.totalExpense / stats.budget) * 100 : 0;
  const isBudgetExceeded = stats.budget > 0 && stats.totalExpense > stats.budget;
  const budgetRemaining = stats.budget - stats.totalExpense;

  // Filter transactions dynamically based on search and category filters
  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = 
      (tx.description || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (tx.category || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const displayCategory = tx.category === 'Daromad' ? 'Daromad' : tx.category;
    const matchesCategory = selectedCategory === 'Barchasi' || displayCategory === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const groupedDays = groupTransactionsByDay(filteredTransactions);

  // 3D Parallax Card Tilt handlers
  const handleMouseMove = (e) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    const rotateX = -(y / (rect.height / 2)) * 12; 
    const rotateY = (x / (rect.width / 2)) * 12;

    setTiltStyle({
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`,
      transition: 'transform 0.1s ease'
    });
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = touch.clientX - rect.left - rect.width / 2;
    const y = touch.clientY - rect.top - rect.height / 2;

    const rotateX = -(y / (rect.height / 2)) * 10;
    const rotateY = (x / (rect.width / 2)) * 10;

    setTiltStyle({
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`,
      transition: 'transform 0.1s ease'
    });
  };

  const handleMouseLeave = () => {
    setTiltStyle({
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
      transition: 'transform 0.4s ease-out'
    });
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* 3D Parallax Balance Card (Focused on balance only) */}
      <div 
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseLeave}
        className="balance-card-container"
      >
        <div className="balance-card" style={tiltStyle}>
          {/* Ambient card glows */}
          <div className="card-ambient-glow"></div>
          
          <div style={{ position: 'relative', zIndex: 2 }}>
            <span className="card-label">{t.totalBalance}</span>
            <h1 className="card-balance">
              <AnimatedCounter value={stats.balance} /> <span style={{ fontSize: '20px', fontWeight: '800' }}>{t.currencySymbol}</span>
            </h1>
            
            {/* Minimal Neon Glow Highlight bar inside card */}
            <div style={{ 
              marginTop: '16px', 
              height: '4px', 
              width: '100%', 
              backgroundColor: 'rgba(255, 255, 255, 0.1)', 
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{ 
                height: '100%', 
                width: `${Math.min(Math.max((stats.balance / (stats.totalIncome || 1)) * 100, 0), 100)}%`, 
                backgroundColor: 'var(--income-color)',
                boxShadow: '0 0 8px var(--income-color)',
                transition: 'width 0.8s ease-out'
              }}></div>
            </div>

            {/* Divider Line */}
            <div style={{ 
              margin: '18px 0 14px 0', 
              height: '1px', 
              backgroundColor: 'rgba(255, 255, 255, 0.08)' 
            }}></div>
            
            {/* Income & Expense Side-by-Side (Yonma-yon) Grid inside Card */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                  <TrendingUp size={11} color="var(--income-color)" />
                  <span style={{ fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.4)', letterSpacing: '0.5px' }}>
                    {t.monthlyIncome}
                  </span>
                </div>
                <span style={{ fontSize: '15px', fontWeight: '900', color: 'var(--income-color)' }}>
                  +<AnimatedCounter value={stats.totalIncome} /> <span style={{ fontSize: '10px', fontWeight: '700' }}>{t.currencySymbol}</span>
                </span>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                  <TrendingDown size={11} color="var(--expense-color)" />
                  <span style={{ fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.4)', letterSpacing: '0.5px' }}>
                    {t.monthlyExpense}
                  </span>
                </div>
                <span style={{ fontSize: '15px', fontWeight: '900', color: 'var(--expense-color)' }}>
                  -<AnimatedCounter value={stats.totalExpense} /> <span style={{ fontSize: '10px', fontWeight: '700' }}>{t.currencySymbol}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Budget Limit Tracker */}
      {stats.budget > 0 && (
        <div className="budget-alert-box" style={{
          backgroundColor: isBudgetExceeded ? 'rgba(239, 68, 68, 0.05)' : 'rgba(255, 255, 255, 0.02)',
          border: isBudgetExceeded ? '1px solid rgba(239, 68, 68, 0.15)' : '1px solid var(--card-border)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={15} color={isBudgetExceeded ? 'var(--expense-color)' : 'var(--hint-color)'} />
              <span style={{ fontSize: '12px', fontWeight: '800', color: isBudgetExceeded ? 'var(--expense-color)' : 'var(--text-color)' }}>
                {isBudgetExceeded ? 'Byudjet oshib ketdi!' : t.remainingBudget}
              </span>
            </div>
            <span style={{ fontSize: '12px', fontWeight: '900', color: isBudgetExceeded ? 'var(--expense-color)' : 'var(--income-color)' }}>
              {isBudgetExceeded ? '-' : ''}{formatAmount(Math.abs(budgetRemaining))} {t.currencySymbol}
            </span>
          </div>
          
          <div style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ 
              height: '100%', 
              width: `${Math.min(budgetProgress, 100)}%`, 
              backgroundColor: isBudgetExceeded ? 'var(--expense-color)' : 'var(--button-color)',
              boxShadow: isBudgetExceeded ? '0 0 6px var(--expense-color)' : 'none',
              transition: 'width 0.4s ease-out'
            }}></div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--hint-color)', marginTop: '6px' }}>
            <span>{formatAmount(stats.totalExpense)} {t.currencySymbol}</span>
            <span>{t.budget}: {formatAmount(stats.budget)} {t.currencySymbol}</span>
          </div>
        </div>
      )}

      {/* Transaction History Filter and List */}
      <div className="section-title-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <h3 style={{ margin: 0 }}>Tarix</h3>
      </div>

      {/* Elegant search filter */}
      <div className="search-bar-wrapper">
        <Search className="search-icon" size={16} />
        <input 
          type="text" 
          placeholder="Tranzaksiyalarni qidirish..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Filter Categories Horizontal Scroll */}
      <div className="categories-filter-scroll">
        {['Barchasi', 'Oziq-ovqat', 'Transport', 'Xaridlar', 'Ko\'ngilochar', 'Kafe', 'Kommunal', 'Sog\'liq', 'Ta\'lim', 'Xizmatlar', 'Daromad', 'Boshqa'].map(cat => (
          <button
            key={cat}
            onClick={() => {
              window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
              setSelectedCategory(cat);
            }}
            className={`filter-cat-btn ${selectedCategory === cat ? 'active' : ''}`}
          >
            {cat === 'Barchasi' ? 'Barchasi' : (t.categories[cat] || cat)}
          </button>
        ))}
      </div>

      {/* Transaction Groups List */}
      <div className="transactions-list">
        {groupedDays.length === 0 ? (
          <div className="empty-state">
            <TrendingUp className="empty-state-icon" style={{ opacity: 0.2 }} />
            <p>{t.noTransactions}</p>
          </div>
        ) : (
          groupedDays.map(group => (
            <div key={group.dateStr} className="daily-group-box">
              {/* Day Header badge */}
              <div className="daily-group-header">
                <span className="daily-date">{formatDayHeader(group.dateStr, t, lang)}</span>
                <div className="daily-totals">
                  {group.dayIncome > 0 && <span className="daily-income">+{formatAmount(group.dayIncome)}</span>}
                  {group.dayExpense > 0 && <span className="daily-expense">-{formatAmount(group.dayExpense)}</span>}
                </div>
              </div>

              {/* Transactions in Day */}
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
    </div>
  );
}

export default Dashboard;
