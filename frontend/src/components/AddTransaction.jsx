import React, { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
import { getCategoryConfig } from './Dashboard';

function AddTransaction({ onClose, onSubmit, categories, t }) {
  const [type, setType] = useState('expense'); 
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Oziq-ovqat');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10)); 
  const [clickedCategory, setClickedCategory] = useState(null);

  // Update default category when switching expense/income
  useEffect(() => {
    if (type === 'expense') {
      setCategory(categories.expense[0] || 'Boshqa');
    } else {
      setCategory(categories.income[0] || 'Boshqa');
    }
  }, [type, categories]);

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

    onSubmit({
      amount: parsedAmount,
      type,
      category: type === 'income' && category === 'Maosh' ? 'Daromad' : category,
      description: description.trim(),
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

  // Auto-scaling font size based on input length
  const getAmountFontSize = () => {
    const len = amount.length;
    if (len < 6) return '36px';
    if (len < 9) return '28px';
    return '22px';
  };

  const categoriesList = type === 'expense' ? categories.expense : categories.income;

  return (
    <div style={{ paddingBottom: '30px', animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ background: 'var(--secondary-bg-color)', borderRadius: '16px', padding: '20px', border: '1px solid var(--card-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>{t.addTransactionTitle}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-color)', cursor: 'pointer' }}>
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
          <div className="amount-input-wrapper" style={{ marginBottom: '20px' }}>
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
            <span className="amount-currency">{t.currencySymbol}</span>
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
