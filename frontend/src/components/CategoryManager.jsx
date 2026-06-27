import React, { useState } from 'react';
import { Trash2, Plus, Edit2, Check, X, Layers } from 'lucide-react';
import { getCategoryConfig } from './Dashboard';

function CategoryManager({ categories, setCategories, setActiveTab, tgUser, apiUrl, t }) {
  const [activeType, setActiveType] = useState('expense'); // 'expense' or 'income'
  const [newCatName, setNewCatName] = useState('');
  const [editingCat, setEditingCat] = useState(null);
  const [editVal, setEditVal] = useState('');

  const currentList = activeType === 'expense' ? categories.expense : categories.income;

  const handleAdd = async () => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    if (currentList.includes(trimmed)) return;

    try {
      await fetch(`${apiUrl}/api/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-telegram-user-id': tgUser?.id || '123456' },
        body: JSON.stringify({ type: activeType, name: trimmed })
      });
      const newList = [...currentList, trimmed];
      setCategories({
        ...categories,
        [activeType]: newList
      });
      setNewCatName('');
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (catName) => {
    try {
      await fetch(`${apiUrl}/api/categories`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-telegram-user-id': tgUser?.id || '123456' },
        body: JSON.stringify({ type: activeType, name: catName })
      });
      const newList = currentList.filter(c => c !== catName);
      setCategories({
        ...categories,
        [activeType]: newList
      });
    } catch (e) { console.error(e); }
  };

  const startEdit = (catName) => {
    setEditingCat(catName);
    setEditVal(catName);
  };

  const saveEdit = async (oldName) => {
    const trimmed = editVal.trim();
    if (!trimmed || trimmed === oldName) {
      setEditingCat(null);
      return;
    }
    
    try {
      await fetch(`${apiUrl}/api/categories`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-telegram-user-id': tgUser?.id || '123456' },
        body: JSON.stringify({ type: activeType, oldName, newName: trimmed })
      });
      // Replace in list
      const newList = currentList.map(c => c === oldName ? trimmed : c);
      setCategories({
        ...categories,
        [activeType]: newList
      });
      setEditingCat(null);
    } catch (e) { console.error(e); }
  };

  return (
    <div style={{ paddingBottom: '30px', animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <button 
          onClick={() => setActiveTab('profile')}
          style={{ background: 'var(--secondary-bg-color)', border: '1px solid var(--card-border)', color: 'var(--text-color)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600' }}
        >
          &larr; Orqaga
        </button>
        <h2 style={{ fontSize: '18px', fontWeight: '700', marginLeft: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={20} color="var(--link-color)" /> Kategoriyalar
        </h2>
      </div>

      <div className="tabs-container" style={{ marginBottom: '20px' }}>
        <button 
          className={`tab-btn ${activeType === 'expense' ? 'active' : ''}`}
          onClick={() => setActiveType('expense')}
        >
          {t.typeExpense}
        </button>
        <button 
          className={`tab-btn ${activeType === 'income' ? 'active' : ''}`}
          onClick={() => setActiveType('income')}
        >
          {t.typeIncome}
        </button>
      </div>

      <div style={{ background: 'var(--secondary-bg-color)', borderRadius: '16px', padding: '16px', border: '1px solid var(--card-border)', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder="Yangi kategoriya..."
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            style={{ flex: 1, background: 'rgba(0,0,0,0.1)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '12px', color: 'var(--text-color)' }}
          />
          <button 
            onClick={handleAdd}
            disabled={!newCatName.trim()}
            style={{ background: 'var(--button-color)', color: 'white', border: 'none', padding: '0 16px', borderRadius: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', opacity: !newCatName.trim() ? 0.5 : 1 }}
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {currentList.map(cat => {
          const conf = getCategoryConfig(cat);
          const Icon = conf.icon;
          const isEditing = editingCat === cat;

          return (
            <div key={cat} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--secondary-bg-color)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
              {isEditing ? (
                <div style={{ display: 'flex', flex: 1, gap: '8px', alignItems: 'center' }}>
                  <input 
                    type="text"
                    value={editVal}
                    onChange={(e) => setEditVal(e.target.value)}
                    style={{ flex: 1, background: 'var(--bg-color)', border: '1px solid var(--button-color)', borderRadius: '6px', padding: '8px', color: 'var(--text-color)' }}
                    autoFocus
                  />
                  <button onClick={() => saveEdit(cat)} style={{ background: 'rgba(16,185,129,0.15)', border: 'none', padding: '8px', borderRadius: '6px', color: 'var(--income-color)' }}>
                    <Check size={18} />
                  </button>
                  <button onClick={() => setEditingCat(null)} style={{ background: 'rgba(239,68,68,0.15)', border: 'none', padding: '8px', borderRadius: '6px', color: 'var(--expense-color)' }}>
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: conf.bg, color: conf.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={16} />
                    </div>
                    <span style={{ fontSize: '15px', fontWeight: '600' }}>{cat}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => startEdit(cat)} style={{ background: 'none', border: 'none', color: 'var(--hint-color)', padding: '8px' }}>
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(cat)} style={{ background: 'none', border: 'none', color: 'var(--expense-color)', padding: '8px' }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
        {currentList.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--hint-color)' }}>
            Hali kategoriya qo'shilmagan
          </div>
        )}
      </div>
    </div>
  );
}

export default CategoryManager;
