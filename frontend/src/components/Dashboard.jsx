import React from 'react';
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
  AlertTriangle
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

function Dashboard({ transactions, stats, currency, formatAmount, onDelete }) {
  // Budget calculations
  const budgetProgress = stats.budget > 0 ? (stats.totalExpense / stats.budget) * 100 : 0;
  const isBudgetExceeded = stats.budget > 0 && stats.totalExpense > stats.budget;
  const budgetRemaining = stats.budget - stats.totalExpense;

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
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Balance Card */}
      <div className="balance-card">
        <p className="balance-title">Umumiy balans</p>
        <h1 className="balance-amount">
          {formatAmount(stats.balance)} <span>{currency}</span>
        </h1>
        
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-icon income">
              <TrendingUp size={18} />
            </div>
            <div>
              <p className="stat-label">Daromad</p>
              <p className="stat-val">+{formatAmount(stats.totalIncome)}</p>
            </div>
          </div>
          <div className="stat-item">
            <div className="stat-icon expense">
              <TrendingDown size={18} />
            </div>
            <div>
              <p className="stat-label">Harajat</p>
              <p className="stat-val">-{formatAmount(stats.totalExpense)}</p>
            </div>
          </div>
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

      {/* Recent Transactions Section */}
      <div className="section-title-bar">
        <h3>So'nggi operatsiyalar</h3>
      </div>

      {transactions.length === 0 ? (
        <div className="empty-state">
          <Coins className="empty-state-icon" />
          <h4>Hech qanday ma'lumot yo'q</h4>
          <p>Operatsiyalarni qo'shish uchun pastdagi "+" tugmasini bosing</p>
        </div>
      ) : (
        <div className="transaction-list">
          {transactions.map((tx) => {
            const config = getCategoryConfig(tx.category);
            const IconComponent = config.icon;
            
            return (
              <div key={tx.id} className="transaction-card">
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
                  <button 
                    onClick={() => onDelete(tx.id)} 
                    className="tx-delete-btn"
                    title="O'chirish"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
