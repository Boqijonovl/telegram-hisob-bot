import React, { useState } from 'react';
import { 
  PieChart, 
  TrendingUp, 
  TrendingDown, 
  Sparkles,
  Info,
  DollarSign,
  Calendar
} from 'lucide-react';
import { getCategoryConfig } from './Dashboard';

function Analytics({ stats, currency, formatAmount }) {
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const hasExpenses = stats.totalExpense > 0;
  
  // Calculate Savings Rate
  const savingsAmount = stats.totalIncome - stats.totalExpense;
  const savingsRate = stats.totalIncome > 0 
    ? Math.max(0, Math.round((savingsAmount / stats.totalIncome) * 100)) 
    : 0;

  // Calculate Daily Average Expense
  const currentDate = new Date();
  const daysInCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const currentDay = currentDate.getDate();
  const dailyAverage = hasExpenses ? Math.round(stats.totalExpense / currentDay) : 0;

  // Dynamic Rule-Based AI Insights Engine
  const generateInsights = () => {
    const insights = [];

    // Savings insight
    if (stats.totalIncome > 0) {
      if (savingsRate >= 30) {
        insights.push({
          type: 'success',
          text: `Ajoyib ko'rsatkich! Daromadlaringizning ${savingsRate}% qismini tejab qoldingiz. Moliyaviy rejangiz juda sog'lom.`
        });
      } else if (savingsRate > 0 && savingsRate < 15) {
        insights.push({
          type: 'warning',
          text: `Tejamkorlik past: Olingan daromadning faqat ${savingsRate}% qismi qoldi. Harajatlarni biroz nazoratga olishni tavsiya qilamiz.`
        });
      } else if (savingsAmount < 0) {
        insights.push({
          type: 'danger',
          text: `Diqqat! Bu oy daromadingizdan ko'ra ko'proq xarajat qildingiz. Byudjetingiz qarzdorlik holatiga tushishi mumkin.`
        });
      }
    }

    // High expense categories insights
    if (hasExpenses) {
      const sortedCategories = [...stats.categories].sort((a, b) => b.percentage - a.percentage);
      const topCat = sortedCategories[0];

      if (topCat && topCat.percentage > 35) {
        insights.push({
          type: 'info',
          text: `Eng ko'p xarajatingiz "${topCat.name}" toifasiga to'g'ri kelmoqda (${topCat.percentage}%). Ushbu sohaga e'tibor qarating.`
        });
      }

      // Specific warnings
      const food = stats.categories.find(c => c.name === 'Oziq-ovqat');
      if (food && food.percentage > 40) {
        insights.push({
          type: 'warning',
          text: `Oziq-ovqat xarajatlari umumiy xarajatlaringizning ${food.percentage}% qismini tashkil qilmoqda. Uyda ovqatlanish tejashga yordam beradi.`
        });
      }

      const entertainment = stats.categories.find(c => c.name === 'Ko\'ngilochar');
      if (entertainment && entertainment.percentage > 25) {
        insights.push({
          type: 'info',
          text: `Ko'ngilochar tadbirlarga ko'p mablag' sarfladingiz. Ularni biroz cheklash oylik rejaga ijobiy ta'sir qiladi.`
        });
      }
    }

    // Budget progress insight
    if (stats.budget > 0) {
      const budgetProgress = (stats.totalExpense / stats.budget) * 100;
      if (budgetProgress > 95) {
        insights.push({
          type: 'danger',
          text: `Byudjet limiti deyarli to'ldi (${Math.round(budgetProgress)}%). Qo'shimcha xarajatlarni to'xtating.`
        });
      } else if (budgetProgress > 75) {
        insights.push({
          type: 'warning',
          text: `Byudjet limitining ${Math.round(budgetProgress)}% qismi ishlatildi. Xavfsiz chegara tugab bormoqda.`
        });
      }
    }

    // Default insight if empty
    if (insights.length === 0) {
      insights.push({
        type: 'info',
        text: "Kechagi kunga nisbatan moliyaviy barqarorlik saqlanmoqda. Harajatlarni muntazam yozib borishda davom eting."
      });
    }

    return insights;
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <div className="section-title-bar">
        <h3>Tahlillar (Statistika)</h3>
      </div>

      {/* Grid of Key Financial Statistics */}
      <div className="analytics-metrics-grid">
        {/* Metric Card 1: Saving Rate */}
        <div className="metric-box">
          <div className="metric-box-header">
            <span className="metric-label">Tejamkorlik koeffitsiyenti</span>
            <TrendingUp size={16} className="metric-icon income" />
          </div>
          <h2 className="metric-value">{savingsRate}%</h2>
          <p className="metric-desc">Daromaddan tejab qolingan qism</p>
        </div>

        {/* Metric Card 2: Daily Average */}
        <div className="metric-box">
          <div className="metric-box-header">
            <span className="metric-label">Kunlik o'rtacha xarajat</span>
            <TrendingDown size={16} className="metric-icon expense" />
          </div>
          <h2 className="metric-value">
            {formatAmount(dailyAverage)} <span style={{ fontSize: '11px', fontWeight: '500', color: 'var(--hint-color)' }}>{currency}</span>
          </h2>
          <p className="metric-desc">Oylik hisob-kitob bo'yicha</p>
        </div>
      </div>

      {/* Interactive SVG Donut Chart */}
      {hasExpenses && (
        <div className="analytics-card interactive-donut-section">
          <p className="donut-tip">Tahlil qilish uchun diagramma ustiga bosing yoki tanlang</p>
          
          <div style={{ position: 'relative', width: '180px', height: '180px', margin: '0 auto' }}>
            <svg width="100%" height="100%" viewBox="0 0 100 100">
              {/* Background gray guide circle */}
              <circle
                cx="50"
                cy="50"
                r="38"
                fill="transparent"
                stroke="rgba(255, 255, 255, 0.03)"
                strokeWidth="8.5"
              />
              
              {/* Colored Category Slices */}
              {(() => {
                let accumulatedPercent = 0;
                const r = 38;
                const c = 2 * Math.PI * r; 

                return stats.categories.map((cat) => {
                  const config = getCategoryConfig(cat.name);
                  const strokeDasharray = `${(cat.percentage / 100) * c} ${c}`;
                  const strokeDashoffset = c - (accumulatedPercent / 100) * c;
                  accumulatedPercent += cat.percentage;
                  const isHovered = hoveredCategory && hoveredCategory.name === cat.name;

                  return (
                    <circle
                      key={cat.name}
                      cx="50"
                      cy="50"
                      r={r}
                      fill="transparent"
                      stroke={config.color}
                      strokeWidth={isHovered ? "10.5" : "8.5"}
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                      transform="rotate(-90 50 50)"
                      strokeLinecap={cat.percentage > 2 ? 'round' : 'butt'}
                      style={{ 
                        transition: 'stroke-width 0.2s ease, stroke 0.2s ease',
                        cursor: 'pointer'
                      }}
                      onClick={() => setHoveredCategory(isHovered ? null : cat)}
                      onMouseEnter={() => setHoveredCategory(cat)}
                    />
                  );
                });
              })()}
            </svg>
            
            {/* Interactive Dynamic Center Text */}
            <div className="donut-center-overlay" onClick={() => setHoveredCategory(null)}>
              {hoveredCategory ? (
                <div style={{ animation: 'scaleUp 0.15s ease-out' }}>
                  <p className="donut-center-label" style={{ color: getCategoryConfig(hoveredCategory.name).color }}>
                    {hoveredCategory.name}
                  </p>
                  <h4 className="donut-center-amount">
                    {formatAmount(hoveredCategory.amount)}
                  </h4>
                  <p className="donut-center-percent">
                    {hoveredCategory.percentage}% xarajat
                  </p>
                </div>
              ) : (
                <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
                  <p className="donut-center-label">Jami xarajat</p>
                  <h4 className="donut-center-amount">
                    {formatAmount(stats.totalExpense)}
                  </h4>
                  <p className="donut-center-currency">{currency}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Smart Financial Insights Section */}
      <div className="section-title-bar">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={18} style={{ color: 'var(--button-color)' }} />
          Aqlli maslahatlar
        </h3>
      </div>

      <div className="insights-container">
        {generateInsights().map((insight, idx) => (
          <div key={idx} className={`insight-card ${insight.type}`}>
            <Info size={16} className="insight-card-icon" />
            <p className="insight-card-text">{insight.text}</p>
          </div>
        ))}
      </div>

      {/* Category Breakdown list */}
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
        <div className="analytics-card" style={{ padding: '24px', marginBottom: '24px' }}>
          <div className="progress-section">
            {stats.categories.map((cat) => {
              const config = getCategoryConfig(cat.name);
              const IconComponent = config.icon;
              const isSelected = hoveredCategory && hoveredCategory.name === cat.name;

              return (
                <div 
                  key={cat.name} 
                  className={`progress-row ${isSelected ? 'row-highlighted' : ''}`}
                  onClick={() => setHoveredCategory(isSelected ? null : cat)}
                  style={{ cursor: 'pointer', transition: 'background-color 0.2s ease', padding: '6px', borderRadius: '8px' }}
                >
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
