import React, { useState, useEffect, useRef } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Trash2, 
  Utensils, 
  Car, 
  Home, 
  ShoppingBag, 
  Tv, 
  HeartPulse, 
  GraduationCap, 
  Gift, 
  Coins, 
  HelpCircle,
  AlertTriangle,
  Search
} from 'lucide-react';

// Map categories to appropriate Lucide icons and colors
export const getCategoryConfig = (categoryName) => {
  const configs = {
    'Oziq-ovqat': { icon: Utensils, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
    'Transport': { icon: Car, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
    'Kommunal': { icon: Home, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' },
    'Xaridlar': { icon: ShoppingBag, color: '#ec4899', bg: 'rgba(236, 72, 153, 0.12)' },
    'Ko\'ngilochar': { icon: Tv, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' },
    'Sog\'liqni saqlash': { icon: HeartPulse, color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
    'Ta\'lim': { icon: GraduationCap, color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.12)' },
    'Sovg\'alar': { icon: Gift, color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.12)' },
    'Daromad': { icon: TrendingUp, color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
    'Boshqa': { icon: HelpCircle, color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)' }
  };
  return configs[categoryName] || configs['Boshqa'];
};

const QUICK_TEMPLATES = [
  { label: '🍞 Non', amount: 4000, type: 'expense', category: 'Oziq-ovqat', desc: 'Non xaridi' },
  { label: '🚕 Taksi', amount: 15000, type: 'expense', category: 'Transport', desc: 'Taksi yo\'lkira' },
  { label: '☕ Kofe', amount: 18000, type: 'expense', category: 'Oziq-ovqat', desc: 'Kofe' },
  { label: '🍛 Tushlik', amount: 45000, type: 'expense', category: 'Oziq-ovqat', desc: 'Tushlik ovqat' },
  { label: '💼 Oylik', amount: 5000000, type: 'income', category: 'Daromad', desc: 'Oylik maosh' },
  { label: '🎬 Kino', amount: 35000, type: 'expense', category: 'Ko\'ngilochar', desc: 'Kino chipta' }
];

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
    const incrementTime = 25; // Update every 25ms
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

// Swipe-to-delete item wrapper
function TransactionItem({ tx, currency, formatAmount, onDelete }) {
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

    // Only allow left swiping
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
      // Native light haptic feedback on swipe snap
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
  
  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('uz-UZ', { 
      day: 'numeric', 
      month: 'long', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
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
          transition: offsetX === 0 || offsetX === -80 ? 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
        }}
      >
        <div className="tx-left">
          <div className="tx-icon-wrapper" style={{ backgroundColor: config.bg, color: config.color }}>
            <IconComponent size={20} />
          </div>
          <div className="tx-details">
            <h4>{tx.description || tx.category}</h4>
            <p>{formatDate(tx.date)}</p>
          </div>
        </div>
        <div className="tx-right">
          <span className={`tx-amount ${tx.type}`}>
            {tx.type === 'income' ? '+' : '-'}{formatAmount(tx.amount)} {currency}
          </span>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ transactions, stats, currency, formatAmount, onDelete, onAdd }) {
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

  const handleQuickTemplateClick = (tmpl) => {
    // Trigger Telegram haptic click
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
    if (onAdd) {
      onAdd({
        amount: tmpl.amount,
        type: tmpl.type,
        category: tmpl.category,
        description: tmpl.desc,
        date: new Date().toISOString()
      });
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* 3D Parallax Balance Card */}
      <div 
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseLeave}
        className="balance-card" 
        style={tiltStyle}
      >
        <p className="balance-title">Umumiy balans</p>
        <h1 className="balance-amount">
          <AnimatedCounter value={stats.balance} /> <span>{currency}</span>
        </h1>
        
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-icon income">
              <TrendingUp size={18} />
            </div>
            <div>
              <p className="stat-label">Daromad</p>
              <p className="stat-val">+<AnimatedCounter value={stats.totalIncome} /></p>
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-icon expense">
              <TrendingDown size={18} />
            </div>
            <div>
              <p className="stat-label">Harajat</p>
              <p className="stat-val">-<AnimatedCounter value={stats.totalExpense} /></p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Templates Panel */}
      <div className="quick-templates-section">
        <div className="section-title-bar" style={{ marginTop: 0, marginBottom: '8px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--hint-color)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            ⚡ Tezkor shablonlar
          </h4>
        </div>
        <div className="quick-templates-list">
          {QUICK_TEMPLATES.map((tmpl, idx) => (
            <button 
              key={idx} 
              onClick={() => handleQuickTemplateClick(tmpl)}
              className="quick-template-pill"
            >
              <span className="tmpl-label">{tmpl.label}</span>
              <span className="tmpl-amount">
                {tmpl.type === 'income' ? '+' : ''}{formatAmount(tmpl.amount)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Budget Limit warning card */}
      {stats.budget > 0 && (
        <div className="analytics-card" style={{ marginBottom: '24px', borderLeft: `4px solid ${isBudgetExceeded ? 'var(--expense-color)' : 'var(--button-color)'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {isBudgetExceeded ? (
                <>
                  <AlertTriangle size={16} color="var(--expense-color)" />
                  <span style={{ color: 'var(--expense-color)' }}>Limit oshib ketdi!</span>
                </>
              ) : (
                <span>Oylik byudjet holati</span>
              )}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--hint-color)' }}>
              {formatAmount(stats.totalExpense)} / {formatAmount(stats.budget)} {currency}
            </span>
          </div>

          <div className="progress-bar-container" style={{ height: '6px', marginBottom: '10px' }}>
            <div 
              className="progress-bar-fill" 
              style={{ 
                width: `${Math.min(budgetProgress, 100)}%`,
                backgroundColor: isBudgetExceeded ? 'var(--expense-color)' : 'var(--button-color)'
              }}
            ></div>
          </div>

          <p style={{ fontSize: '11px', color: 'var(--hint-color)' }}>
            {isBudgetExceeded 
              ? `Belgilangan limitdan ${formatAmount(Math.abs(budgetRemaining))} ${currency} ko'p sarflandi.`
              : `Limit tugashiga yana ${formatAmount(budgetRemaining)} ${currency} qoldi.`}
          </p>
        </div>
      )}

      {/* Search & Category Filter Section */}
      <div className="search-filter-section">
        <div className="search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input 
            type="text" 
            placeholder="Operatsiyalardan qidirish..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="category-pills-list">
          {['Barchasi', 'Oziq-ovqat', 'Transport', 'Kommunal', 'Xaridlar', 'Ko\'ngilochar', 'Sog\'liqni saqlash', 'Ta\'lim', 'Sovg\'alar', 'Daromad', 'Boshqa'].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Transactions Section */}
      <div className="section-title-bar">
        <h3>Operatsiyalar tarixi</h3>
      </div>

      {filteredTransactions.length === 0 ? (
        <div className="empty-state">
          <Coins className="empty-state-icon" />
          <h4>Hech qanday operatsiya topilmadi</h4>
          <p>
            {searchQuery || selectedCategory !== 'Barchasi' 
              ? "Qidiruv shartlariga mos keladigan operatsiya mavjud emas." 
              : "Operatsiyalarni qo'shish uchun pastdagi '+' tugmasini bosing."}
          </p>
        </div>
      ) : (
        <div className="transaction-list">
          {filteredTransactions.map((tx) => (
            <TransactionItem 
              key={tx.id} 
              tx={tx} 
              currency={currency} 
              formatAmount={formatAmount} 
              onDelete={onDelete} 
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
