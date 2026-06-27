import React, { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
import { getCategoryConfig } from './Dashboard';

const EXPENSE_CATEGORIES = [
  'Oziq-ovqat',
  'Transport',
  'Kommunal',
  'Xaridlar',
  'Ko\'ngilochar',
  'Sog\'liqni saqlash',
  'Ta\'lim',
  'Sovg\'alar',
  'Boshqa'
];

const INCOME_CATEGORIES = [
  'Maosh',
  'Biznes',
  'Sovg\'alar',
  'Boshqa'
];

function AddTransaction({ onClose, onSubmit, currency }) {
  const [type, setType] = useState('expense'); 
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Oziq-ovqat');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10)); 
  const [clickedCategory, setClickedCategory] = useState(null);

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
    // Play native Telegram haptic tick on every input character typed
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

  const categoriesList = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Yangi qo'shish</h3>
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
              Harajat
            </button>
            <button
              type="button"
              className={`type-btn ${type === 'income' ? 'active income' : ''}`}
              onClick={() => handleTypeChange('income')}
            >
              Daromad
            </button>
          </div>

          {/* Amount input using native phone keyboard */}
          <div className="amount-input-wrapper">
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
            <span className="amount-currency">{currency}</span>
          </div>

          {/* Category Selection Grid */}
          <div className="form-group">
            <label className="form-label">Kategoriya tanlang</label>
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
                    <span className="category-name">{cat}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Izoh / Nima uchun?</label>
            <input
              type="text"
              placeholder="Izoh yozing..."
              className="text-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Date Selector */}
          <div className="form-group">
            <label className="form-label">Sana</label>
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
            {type === 'expense' ? 'Harajatni Saqlash' : 'Daromadni Saqlash'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AddTransaction;
