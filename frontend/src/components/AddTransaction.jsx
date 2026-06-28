import React, { useState, useEffect } from 'react';
import { X, Calendar, Users } from 'lucide-react';
import { getCategoryConfig } from './Dashboard';
import { useQueryClient } from '@tanstack/react-query';

function AddTransaction({ onClose, onSubmit, categories, t, tgUser, apiUrl }) {
  const queryClient = useQueryClient();
  const [type, setType] = useState('expense'); 
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Oziq-ovqat');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10)); 
  const [clickedCategory, setClickedCategory] = useState(null);
  
  // Split Bill state
  const [isSplit, setIsSplit] = useState(false);
  const [splitNames, setSplitNames] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    let parsedAmount = parseFloat(amount);
    if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setIsSubmitting(false);
      return;
    }

    let expenseAmount = parsedAmount;

    // Split Bill logic
    if (type === 'expense' && isSplit && splitNames) {
      const names = splitNames.split(',').map(n => n.trim()).filter(Boolean);
      if (names.length > 0) {
        const numPeople = names.length + 1; // You + friends
        expenseAmount = parsedAmount / numPeople; // Your share
        const debtAmount = parsedAmount / numPeople;

        // Create debts for friends
        try {
          await Promise.all(names.map(name => 
            fetch(`${apiUrl}/api/debts`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-telegram-user-id': tgUser?.id || '123456' },
              body: JSON.stringify({
                type: 'given', // you gave money
                person_name: name,
                amount: debtAmount,
                due_date: null
              })
            })
          ));
          // Invalidate debts cache
          queryClient.invalidateQueries({ queryKey: ['debts'] });
          window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
        } catch (error) {
          console.error('Error creating debts:', error);
        }
      }
    }

    const now = new Date();
    const [year, month, day] = date.split('-');
    const finalDate = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());

    await onSubmit({
      amount: expenseAmount,
      type,
      category: type === 'income' && category === 'Maosh' ? 'Daromad' : category,
      description: isSplit ? `${description.trim()} (Jami: ${parsedAmount})` : description.trim(),
      date: finalDate.toISOString()
    });
    
    setIsSubmitting(false);
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

          {/* Chekni bo'lishish (Split Bill) */}
          {type === 'expense' && (
            <div style={{ marginBottom: '20px', background: 'rgba(59, 130, 246, 0.05)', padding: '12px', borderRadius: '12px', border: '1px dashed rgba(59, 130, 246, 0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setIsSplit(!isSplit)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--link-color)', fontWeight: '600', fontSize: '14px' }}>
                  <Users size={18} /> Chekni bo'lishish (Guruh)
                </div>
                <div style={{ width: '40px', height: '22px', background: isSplit ? 'var(--button-color)' : 'var(--card-border)', borderRadius: '20px', position: 'relative', transition: 'all 0.2s' }}>
                  <div style={{ width: '18px', height: '18px', background: 'white', borderRadius: '50%', position: 'absolute', top: '2px', left: isSplit ? '20px' : '2px', transition: 'all 0.2s' }}></div>
                </div>
              </div>
              
              {isSplit && (
                <div style={{ marginTop: '16px', animation: 'slideUp 0.2s' }}>
                  <label style={{ fontSize: '12px', color: 'var(--hint-color)', marginBottom: '8px', display: 'block' }}>
                    Sizdan tashqari yana kimlar bilan to'layapsiz? Ismlarni vergul bilan yozing:
                  </label>
                  <input
                    type="text"
                    placeholder="Masalan: Ali, Jasur"
                    value={splitNames}
                    onChange={(e) => setSplitNames(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'var(--bg-color)', color: 'var(--text-color)' }}
                  />
                  {splitNames && parseFloat(amount) > 0 && (
                    <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--link-color)' }}>
                      Dastur sizga harajatingizni va boshqalarga bergan qarzingizni avtomatik hisoblab bo'lib beradi!
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
              style={{ flex: 1, padding: '16px', borderRadius: '16px', fontWeight: '700', fontSize: '16px', opacity: isSubmitting ? 0.7 : 1 }}
            >
              {isSubmitting ? 'Saqlanmoqda...' : t.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddTransaction;
