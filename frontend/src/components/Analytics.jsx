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

function Analytics({ stats, currency, formatAmount, t, lang }) {
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

  // Dynamic Rule-Based AI Insights Engine translated based on lang
  const generateInsights = () => {
    const insights = [];

    if (lang === 'ru') {
      // Russian insights
      if (stats.totalIncome > 0) {
        if (savingsRate >= 30) {
          insights.push({
            type: 'success',
            text: `Отличный показатель! Вы сэкономили ${savingsRate}% своих доходов. Ваш финансовый план очень здоровый.`
          });
        } else if (savingsRate > 0 && savingsRate < 15) {
          insights.push({
            type: 'warning',
            text: `Низкий уровень сбережений: осталось только ${savingsRate}% от дохода. Рекомендуем немного сократить расходы.`
          });
        } else if (savingsAmount < 0) {
          insights.push({
            type: 'danger',
            text: `Внимание! В этом месяце ваши расходы превысили ваши доходы. Ваш бюджет может уйти в долг.`
          });
        }
      }
      if (hasExpenses) {
        const sortedCategories = [...stats.categories].sort((a, b) => b.percentage - a.percentage);
        const topCat = sortedCategories[0];
        if (topCat && topCat.percentage > 35) {
          insights.push({
            type: 'info',
            text: `Больше всего вы потратили на категорию "${t.categories[topCat.name] || topCat.name}" (${topCat.percentage}%). Стоит обратить на это внимание.`
          });
        }
        const food = stats.categories.find(c => c.name === 'Oziq-ovqat');
        if (food && food.percentage > 40) {
          insights.push({
            type: 'warning',
            text: `Расходы на продукты питания составляют ${food.percentage}% ваших расходов. Домашняя еда поможет вам сэкономить.`
          });
        }
        const entertainment = stats.categories.find(c => c.name === 'Ko\'ngilochar');
        if (entertainment && entertainment.percentage > 25) {
          insights.push({
            type: 'info',
            text: `Вы потратили много средств на развлечения. Сокращение этих расходов положительно скажется на вашем бюджете.`
          });
        }
      }
      if (stats.budget > 0) {
        const budgetProgress = (stats.totalExpense / stats.budget) * 100;
        if (budgetProgress > 95) {
          insights.push({
            type: 'danger',
            text: `Лимит бюджета почти заполнен (${Math.round(budgetProgress)}%). Прекратите дополнительные траты.`
          });
        } else if (budgetProgress > 75) {
          insights.push({
            type: 'warning',
            text: `Использовано ${Math.round(budgetProgress)}% лимита бюджета. Безопасный предел на исходе.`
          });
        }
      }
    } else if (lang === 'en') {
      // English insights
      if (stats.totalIncome > 0) {
        if (savingsRate >= 30) {
          insights.push({
            type: 'success',
            text: `Excellent! You saved ${savingsRate}% of your income. Your financial plan is very healthy.`
          });
        } else if (savingsRate > 0 && savingsRate < 15) {
          insights.push({
            type: 'warning',
            text: `Low savings rate: only ${savingsRate}% of income is left. We recommend reviewing your expenses.`
          });
        } else if (savingsAmount < 0) {
          insights.push({
            type: 'danger',
            text: `Warning! You spent more than you earned this month. Your budget may go into debt.`
          });
        }
      }
      if (hasExpenses) {
        const sortedCategories = [...stats.categories].sort((a, b) => b.percentage - a.percentage);
        const topCat = sortedCategories[0];
        if (topCat && topCat.percentage > 35) {
          insights.push({
            type: 'info',
            text: `Your biggest expense is "${t.categories[topCat.name] || topCat.name}" (${topCat.percentage}%). Focus on managing this area.`
          });
        }
        const food = stats.categories.find(c => c.name === 'Oziq-ovqat');
        if (food && food.percentage > 40) {
          insights.push({
            type: 'warning',
            text: `Food expenses make up ${food.percentage}% of your expenses. Cooking at home could help you save.`
          });
        }
        const entertainment = stats.categories.find(c => c.name === 'Ko\'ngilochar');
        if (entertainment && entertainment.percentage > 25) {
          insights.push({
            type: 'info',
            text: `You spent quite a bit on entertainment. Cutting back slightly will benefit your monthly plan.`
          });
        }
      }
      if (stats.budget > 0) {
        const budgetProgress = (stats.totalExpense / stats.budget) * 100;
        if (budgetProgress > 95) {
          insights.push({
            type: 'danger',
            text: `Budget limit is almost filled (${Math.round(budgetProgress)}%). Stop extra spending.`
          });
        } else if (budgetProgress > 75) {
          insights.push({
            type: 'warning',
            text: `${Math.round(budgetProgress)}% of budget limit is used. Safe threshold is running out.`
          });
        }
      }
    } else {
      // Uzbek insights (default)
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
      if (hasExpenses) {
        const sortedCategories = [...stats.categories].sort((a, b) => b.percentage - a.percentage);
        const topCat = sortedCategories[0];
        if (topCat && topCat.percentage > 35) {
          insights.push({
            type: 'info',
            text: `Eng ko'p xarajatingiz "${t.categories[topCat.name] || topCat.name}" toifasiga to'g'ri kelmoqda (${topCat.percentage}%). Ushbu sohaga e'tibor qarating.`
          });
        }
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
    }

    if (insights.length === 0) {
      insights.push({
        type: 'info',
        text: lang === 'ru' ? 'Вводите больше операций для аналитических отчетов ИИ.' : lang === 'en' ? 'Enter more transactions to generate AI smart tips.' : 'Aqlli AI maslahatlari hosil bo\'lishi uchun ko\'proq ma\'lumot kiriting.'
      });
    }

    return insights;
  };

  const activeInsights = generateInsights();

  // Selected or hovered category label configuration
  const centerCategory = hoveredCategory || (stats.categories.length > 0 ? stats.categories[0] : null);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <div className="section-title-bar">
        <h3>{t.analytics}</h3>
      </div>

      {/* Grid of Key Financial Statistics */}
      <div className="analytics-metrics-grid">
        {/* Metric Card 1: Saving Rate */}
        <div className="metric-box">
          <div className="metric-box-header">
            <span className="metric-label">{t.spendingRate}</span>
            <TrendingUp size={16} className="metric-icon income" />
          </div>
          <h2 className="metric-value">{savingsRate}%</h2>
        </div>

        {/* Metric Card 2: Daily Average */}
        <div className="metric-box">
          <div className="metric-box-header">
            <span className="metric-label">{t.dailyAvg}</span>
            <TrendingDown size={16} className="metric-icon expense" />
          </div>
          <h2 className="metric-value">
            {formatAmount(dailyAverage)} <span style={{ fontSize: '11px', fontWeight: '500', color: 'var(--hint-color)' }}>{currency}</span>
          </h2>
        </div>
      </div>

      {/* Interactive SVG Donut Chart */}
      {hasExpenses ? (
        <div className="analytics-card interactive-donut-section">
          <p className="donut-tip" style={{ color: 'var(--hint-color)', fontSize: '11px', textAlign: 'center', marginBottom: '14px' }}>
            {lang === 'ru' ? 'Нажимайте на сегменты диаграммы для просмотра деталей' : lang === 'en' ? 'Tap/hover over chart segments to inspect details' : 'Tahlil qilish uchun diagramma segmentlari ustiga bosing'}
          </p>
          
          <div style={{ position: 'relative', width: '180px', height: '180px', margin: '0 auto' }}>
            <svg width="100%" height="100%" viewBox="0 0 100 100">
              {/* Background guide circle */}
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
                  const isHovered = centerCategory && centerCategory.name === cat.name;

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
                      onClick={() => {
                        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
                        setHoveredCategory(cat);
                      }}
                      onMouseEnter={() => setHoveredCategory(cat)}
                      style={{ cursor: 'pointer', transition: 'stroke-width 0.2s ease, stroke 0.2s ease' }}
                    />
                  );
                });
              })()}
            </svg>
            
            {/* Center label content of Donut chart */}
            {centerCategory && (
              <div className="donut-center-label" style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                width: '100px',
                pointerEvents: 'none',
                zIndex: 2,
                animation: 'scaleIn 0.3s ease-out'
              }}>
                <span className="donut-center-category" style={{
                  fontSize: '11px',
                  fontWeight: '800',
                  color: 'var(--hint-color)',
                  textTransform: 'uppercase',
                  display: 'block',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden'
                }}>
                  {t.categories[centerCategory.name] || centerCategory.name}
                </span>
                <span className="donut-center-percentage" style={{
                  fontSize: '18px',
                  fontWeight: '900',
                  color: getCategoryConfig(centerCategory.name).color,
                  display: 'block',
                  margin: '2px 0'
                }}>
                  {centerCategory.percentage}%
                </span>
                <span className="donut-center-amount" style={{
                  fontSize: '10px',
                  color: 'var(--text-color)',
                  fontWeight: '700',
                  display: 'block'
                }}>
                  {formatAmount(centerCategory.amount)} {currency}
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="empty-state" style={{ padding: '36px 0' }}>
          <PieChart size={36} style={{ opacity: 0.15, marginBottom: '8px' }} />
          <p>{t.noTransactions}</p>
        </div>
      )}

      {/* Categories summary lists cards */}
      {hasExpenses && (
        <div className="analytics-card" style={{ padding: '16px 14px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', color: 'var(--hint-color)', margin: '0 0 14px 0', letterSpacing: '0.5px' }}>
            {t.topCategory}
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {stats.categories.map((cat) => {
              const config = getCategoryConfig(cat.name);
              const Icon = config.icon;
              return (
                <div key={cat.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '55%' }}>
                    <div style={{ 
                      width: '28px', 
                      height: '28px', 
                      borderRadius: '50%', 
                      backgroundColor: config.bg, 
                      color: config.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Icon size={14} />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: '700', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                      {t.categories[cat.name] || cat.name}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'flex-end', width: '45%' }}>
                    <span style={{ fontSize: '11px', color: 'var(--hint-color)', fontWeight: '800' }}>
                      {cat.percentage}%
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: '900' }}>
                      {formatAmount(cat.amount)} {currency}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* AI Smart recommendation insights */}
      <div className="ai-insights-container">
        <div className="ai-insights-header">
          <Sparkles size={16} />
          <h4>{t.aiInsights}</h4>
        </div>
        <div className="ai-insights-list">
          {activeInsights.map((insight, idx) => (
            <div key={idx} className={`ai-insight-card ${insight.type}`}>
              <Info size={14} className="insight-icon" />
              <p>{insight.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Analytics;
