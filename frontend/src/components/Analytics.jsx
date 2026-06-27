import React from 'react';
import { PieChart, TrendingDown, DollarSign } from 'lucide-react';
import { getCategoryConfig } from './Dashboard';

function Analytics({ stats, currency, formatAmount }) {
  const hasExpenses = stats.totalExpense > 0;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <div className="section-title-bar">
        <h3>Tahlillar (Statistika)</h3>
      </div>

      {/* Analytics Summary */}
      <div className="analytics-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--hint-color)', fontSize: '13px' }}>Sarflangan jami mablag'</span>
          <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--expense-color)' }}>
            -{formatAmount(stats.totalExpense)} {currency}
          </span>
        </div>
        
        {stats.budget > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--card-border)', paddingTop: '12px' }}>
            <span style={{ color: 'var(--hint-color)', fontSize: '13px' }}>Byudjetdan ishlatilgan foiz</span>
            <span style={{ fontSize: '15px', fontWeight: '700', color: stats.totalExpense > stats.budget ? 'var(--expense-color)' : 'var(--button-color)' }}>
              {Math.round((stats.totalExpense / stats.budget) * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* Category Breakdown */}
      <div className="section-title-bar">
        <h3>Kategoriyalar bo'yicha</h3>
      </div>

      {!hasExpenses ? (
        <div className="empty-state" style={{ backgroundColor: 'var(--card-bg)', borderRadius: 'var(--radius-lg)' }}>
          <PieChart className="empty-state-icon" />
          <h4>Ma'lumotlar yetarli emas</h4>
          <p>Tahlillarni ko'rish uchun kamida bitta harajat qo'shing.</p>
        </div>
      ) : (
        <div className="analytics-card" style={{ padding: '24px' }}>
          <div className="progress-section">
            {stats.categories.map((cat) => {
              const config = getCategoryConfig(cat.name);
              const IconComponent = config.icon;

              return (
                <div key={cat.name} className="progress-row">
                  <div className="progress-row-header">
                    <div className="progress-row-cat">
                      <div 
                        style={{ 
                          width: '28px', 
                          height: '28px', 
                          borderRadius: '8px', 
                          backgroundColor: config.bg, 
                          color: config.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <IconComponent size={14} />
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: '600' }}>{cat.name}</span>
                      <span style={{ color: 'var(--hint-color)', fontSize: '12px', fontWeight: '400' }}>
                        ({cat.percentage}%)
                      </span>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: '700' }}>
                      {formatAmount(cat.amount)} {currency}
                    </span>
                  </div>

                  <div className="progress-bar-container">
                    <div 
                      className="progress-bar-fill" 
                      style={{ 
                        width: `${cat.percentage}%`,
                        backgroundColor: config.color
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default Analytics;
