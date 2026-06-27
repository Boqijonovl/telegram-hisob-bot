import React from 'react';
import { Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { getCategoryConfig } from './Dashboard';

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
        style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingRight: '12px', background: 'var(--secondary-bg-color)', padding: '12px', border: '1px solid var(--card-border)', marginBottom: '8px' }}
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

function History({ transactions, formatAmount, onDelete, t, lang, setActiveTab }) {
  const groupedDays = groupTransactionsByDay(transactions);

  return (
    <div style={{ paddingBottom: '30px', animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <button 
          onClick={() => setActiveTab('profile')}
          style={{ background: 'var(--secondary-bg-color)', border: '1px solid var(--card-border)', color: 'var(--text-color)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600' }}
        >
          &larr; Orqaga
        </button>
        <h2 style={{ fontSize: '18px', fontWeight: '700', marginLeft: '16px' }}>Operatsiyalar tarixi</h2>
      </div>

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
              <div style={{ display: 'flex', flexDirection: 'column' }}>
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

export default History;
