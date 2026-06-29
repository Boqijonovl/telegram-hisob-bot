import React, { useState } from 'react';
import { X, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

function VaultModal({ onClose, vaultBalance, onSubmit, t, formatAmount }) {
  const [amount, setAmount] = useState('');
  const [action, setAction] = useState('deposit'); // 'deposit' or 'withdraw'

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount) || amount <= 0) return;
    
    onSubmit({
      amount: parseFloat(amount),
      type: action === 'deposit' ? 'expense' : 'income',
      category: 'Xazna',
      description: action === 'deposit' ? 'Xaznaga pul o\'tkazish' : 'Xaznadan pul yechish',
      date: new Date().toISOString()
    });
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1050 }}>
      <div className="modal-content" style={{ padding: '24px', paddingBottom: '40px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2>{t.vault}</h2>
          <button type="button" onClick={onClose} className="close-btn"><X size={24} /></button>
        </div>
        
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <p style={{ color: 'var(--hint-color)', fontSize: '13px', marginBottom: '4px' }}>{t.vaultBalance}</p>
          <h1 style={{ color: '#8b5cf6', fontSize: '28px', margin: 0 }}>{formatAmount(vaultBalance)} UZS</h1>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <button
            type="button"
            onClick={() => setAction('deposit')}
            style={{ flex: 1, padding: '12px', borderRadius: '12px', border: action === 'deposit' ? '1px solid #8b5cf6' : '1px solid var(--card-border)', background: action === 'deposit' ? 'rgba(139, 92, 246, 0.1)' : 'transparent', color: action === 'deposit' ? '#8b5cf6' : 'var(--hint-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '600' }}
          >
            <ArrowDownCircle size={18} /> O'tkazish
          </button>
          <button
            type="button"
            onClick={() => setAction('withdraw')}
            style={{ flex: 1, padding: '12px', borderRadius: '12px', border: action === 'withdraw' ? '1px solid #10b981' : '1px solid var(--card-border)', background: action === 'withdraw' ? 'rgba(16, 185, 129, 0.1)' : 'transparent', color: action === 'withdraw' ? '#10b981' : 'var(--hint-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '600' }}
          >
            <ArrowUpCircle size={18} /> Olish
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t.amountLabel}</label>
            <input 
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Summani kiriting"
              className="text-input"
              autoFocus
            />
          </div>
          <button type="submit" className="submit-btn" style={{ background: action === 'deposit' ? '#8b5cf6' : '#10b981' }}>
            Tasdiqlash
          </button>
        </form>
      </div>
    </div>
  );
}

export default VaultModal;
