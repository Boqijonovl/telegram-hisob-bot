import React, { useState, useEffect } from 'react';
import { X, Calendar, Landmark } from 'lucide-react';
import { getCategoryConfig } from './Dashboard';

const EXPENSE_CATEGORIES = [
  'Oziq-ovqat',
  'Transport',
  'Xaridlar',
  'Ko\'ngilochar',
  'Kafe',
  'Boshqa'
];

const INCOME_CATEGORIES = [
  'Maosh',
  'Biznes',
  'Sovg\'alar',
  'Boshqa'
];

function AddTransaction({ onClose, onSubmit, currency, rates, t }) {
  const [type, setType] = useState('expense'); 
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Oziq-ovqat');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10)); 
  const [clickedCategory, setClickedCategory] = useState(null);
  
  // Input Currency Select (USD, EUR, RUB, UZS)
  const [inputCurrency, setInputCurrency] = useState(currency || 'UZS');

  // Update default category when switching expense/income
  useEffect(() => {
    if (type === 'expense') {
      setCategory('Oziq-ovqat');
    } else {
      setCategory('Maosh');
    }
  }, [type]);

  const handleTypeChange = (newType) => {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
    setType(newType);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      return;
    }

    // Convert amount to settings base currency
    const amountInUZS = parsedAmount * (rates[inputCurrency] || 1);
    const amountInBase = amountInUZS / (rates[currency] || 1);
    const finalAmount = currency === 'UZS' ? Math.round(amountInBase) : Math.round(amountInBase * 100) / 100;

    // Append original input currency to description if converted
    const conversionLabel = inputCurrency !== currency ? `[${t.originalAmount}: ${parsedAmount} ${inputCurrency}]` : '';
    const finalDescription = [description.trim(), conversionLabel].filter(Boolean).join(' ');

    onSubmit({
      amount: finalAmount,
      type,
      category: type === 'income' && category === 'Maosh' ? 'Daromad' : category,
      description: finalDescription,
      date: new Date(date).toISOString()
    });
  };

  const handleCategoryClick = (catName) => {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
    setClickedCategory(catName);
    setCategory(catName);
    setTimeout(() => setClickedCategory(null), 250); 
  };

  const handleAmountChange = (e) => {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
    setAmount(e.target.value);
  };

  const handleCurrencyChange = (cur) => {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
    setInputCurrency(cur);
  };

  // Auto-scaling font size based on input length
  const getAmountFontSize = () => {
    const len = amount.length;
    if (len < 6) return '36px';
    if (len < 9) return '28px';
    return '22px';
  };

  const categoriesList = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{t.addTransactionTitle}</h3>
          <button onClick={onClose} className="close-btn">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleFormSubmit}>
          {/* Type Toggle */}
          <div className="type-toggle">
            <button
              type="button"
              className={`type-btn ${type === 'expense' ? 'active expense' : ''}`}
              onClick={() => handleTypeChange('expense')}
            >
              {t.typeExpense}
            </button>
            <button
              type="button"
              className={`type-btn ${type === 'income' ? 'active income' : ''}`}
              onClick={() => handleTypeChange('income')}
            >
              {t.typeIncome}
            </button>
          </div>

          {/* Amount input using native phone keyboard */}
          <div className="amount-input-wrapper" style={{ marginBottom: '14px' }}>
            <input
              type="number"
              inputMode="decimal"
              placeholder="0"
              className="amount-input"
              style={{ fontSize: getAmountFontSize() }}
              value={amount}
              onChange={handleAmountChange}
              required
              autoFocus
            />
            <span className="amount-currency">{inputCurrency}</span>
          </div>

          {/* Currency conversion selector buttons */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              {['UZS', 'USD', 'EUR', 'RUB'].map((cur) => (
                <button
                  key={cur}
                  type="button"
                  onClick={() => handleCurrencyChange(cur)}
                  style={{
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: '800',
                    borderRadius: '16px',
                    border: '1px solid var(--card-border)',
                    backgroundColor: inputCurrency === cur ? 'var(--button-color)' : 'var(--secondary-bg-color)',
                    color: inputCurrency === cur ? 'var(--button-text-color)' : 'var(--text-color)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {cur}
                </button>
              ))}
            </div>
            {inputCurrency !== currency && (
              <span style={{ display: 'block', textAlign: 'center', fontSize: '11px', color: 'var(--hint-color)', marginTop: '8px' }}>
                🏦 1 {inputCurrency} = {new Intl.NumberFormat('uz-UZ').format(rates[inputCurrency])} UZS
              </span>
            )}
          </div>

          {/* Category Selection Grid */}
          <div className="form-group">
            <label className="form-label">{t.categoryLabel}</label>
            <div className="category-grid">
              {categoriesList.map((cat) => {
                const displayCategory = type === 'income' && cat === 'Maosh' ? 'Daromad' : cat;
                const config = getCategoryConfig(displayCategory);
                const IconComponent = config.icon;
                const isSelected = category === cat;
                const isPopping = clickedCategory === cat;

                return (
                  <div
                    key={cat}
                    className={`category-item ${isSelected ? 'selected' : ''} ${isPopping ? 'pop-active' : ''}`}
                    onClick={() => handleCategoryClick(cat)}
                  >
                    <div className="category-icon-box" style={{ 
                      backgroundColor: isSelected ? 'var(--button-color)' : config.bg, 
                      color: isSelected ? 'var(--button-text-color)' : config.color
                    }}>
                      <IconComponent size={20} />
                    </div>
                    <span className="category-name">{t.categories[displayCategory] || displayCategory}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">{t.descriptionLabel}</label>
            <input
              type="text"
              placeholder={t.descriptionPlaceholder}
              className="text-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Date Selector */}
          <div className="form-group">
            <label className="form-label">{t.today}</label>
            <div style={{ position: 'relative' }}>
              <input
                type="date"
                className="text-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
              <Calendar size={18} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--hint-color)', pointerEvents: 'none' }} />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="submit-btn"
            disabled={!amount || parseFloat(amount) <= 0}
          >
            {t.save}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AddTransaction;
