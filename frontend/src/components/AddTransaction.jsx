import React, { useState, useEffect } from 'react';
import { X, Calendar, Delete } from 'lucide-react';
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

const NUMPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'backspace'];

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

  // Custom iOS Numpad key tap logic
  const handleKeyClick = (key) => {
    // Standard haptic light vibration on keypress
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');

    if (key === 'backspace') {
      setAmount(prev => prev.slice(0, -1));
      return;
    }

    if (key === '.') {
      if (amount.includes('.')) return;
      if (amount === '') {
        setAmount('0.');
        return;
      }
    }

    if (amount.length >= 11) return; // Prevent layout overflows

    if (amount === '0' && key === '0') return;
    if (amount === '0' && key !== '.') {
      setAmount(key);
      return;
    }

    setAmount(prev => prev + key);
  };

  const handleCategoryClick = (catName) => {
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
    setClickedCategory(catName);
    setCategory(catName);
    setTimeout(() => setClickedCategory(null), 250); // Duration matches CSS bounce animation
  };

  // Auto-scaling font size logic based on character length
  const getAmountFontSize = () => {
    const len = amount.length;
    if (len < 6) return '38px';
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

          {/* Amount input displaying simulated text input with dynamic scaling */}
          <div className="amount-input-wrapper">
            <div 
              className="amount-input-display"
              style={{ fontSize: getAmountFontSize() }}
            >
              {amount || '0'}
            </div>
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

          {/* Custom iOS-style Numpad Grid */}
          <div className="ios-numpad-container">
            {NUMPAD_KEYS.map((key) => {
              const isBackspace = key === 'backspace';
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleKeyClick(key)}
                  className={`numpad-key-btn ${isBackspace ? 'backspace-key' : ''}`}
                >
                  {isBackspace ? <Delete size={20} /> : key}
                </button>
              );
            })}
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
