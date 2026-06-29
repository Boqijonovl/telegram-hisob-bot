import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Users, 
  Plus, 
  Trash2, 
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Edit2
} from 'lucide-react';

function Debts({ tgUser, apiUrl, formatAmount, setActiveTab }) {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [debtType, setDebtType] = useState('given'); // 'given' (qarz berdim) or 'taken' (qarz oldim)
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [editId, setEditId] = useState(null);

  const { data: debts = [], isLoading } = useQuery({
    queryKey: ['debts', tgUser?.id],
    queryFn: async () => {
      const res = await fetch(`${apiUrl}/api/debts`, {
        headers: { 'x-telegram-user-id': tgUser?.id || '123456' }
      });
      if (!res.ok) throw new Error('Failed to fetch debts');
      return res.json();
    }
  });

  const addMutation = useMutation({
    mutationFn: async (newDebt) => {
      const res = await fetch(`${apiUrl}/api/debts`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-telegram-user-id': tgUser?.id || '123456' 
        },
        body: JSON.stringify(newDebt)
      });
      if (!res.ok) throw new Error('Error adding debt');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['debts']);
      setShowAddModal(false);
      setPersonName('');
      setAmount('');
      setDueDate('');
      setEditId(null);
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
    }
  });

  const editMutation = useMutation({
    mutationFn: async (updatedDebt) => {
      const res = await fetch(`${apiUrl}/api/debts/${editId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-telegram-user-id': tgUser?.id || '123456' 
        },
        body: JSON.stringify(updatedDebt)
      });
      if (!res.ok) throw new Error('Error updating debt');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['debts']);
      setShowAddModal(false);
      setPersonName('');
      setAmount('');
      setDueDate('');
      setEditId(null);
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`${apiUrl}/api/debts/${id}`, {
        method: 'DELETE',
        headers: { 'x-telegram-user-id': tgUser?.id || '123456' }
      });
      if (!res.ok) throw new Error('Error deleting');
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['debts']);
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
    }
  });

  const togglePaidMutation = useMutation({
    mutationFn: async ({ id, is_paid }) => {
      const res = await fetch(`${apiUrl}/api/debts/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-telegram-user-id': tgUser?.id || '123456' 
        },
        body: JSON.stringify({ is_paid })
      });
      if (!res.ok) throw new Error('Error updating');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['debts']);
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
    }
  });

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!personName || !amount) return;
    const debtData = {
      type: debtType,
      person_name: personName,
      amount: parseFloat(amount),
      due_date: dueDate || null
    };
    if (editId) {
      editMutation.mutate(debtData);
    } else {
      addMutation.mutate(debtData);
    }
  };

  const handleEdit = (debt) => {
    setEditId(debt.id);
    setDebtType(debt.type);
    setPersonName(debt.person_name);
    setAmount(debt.amount);
    setDueDate(debt.due_date ? debt.due_date.split('T')[0] : '');
    setShowAddModal(true);
  };

  const calculateTotal = (type) => {
    return debts
      .filter(d => d.type === type && !d.is_paid)
      .reduce((sum, d) => sum + parseFloat(d.amount), 0);
  };

  return (
    <div style={{ paddingBottom: '80px', animation: 'fadeIn 0.3s ease-out' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div className="section-title-bar">
          <h3 style={{ fontSize: '20px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={24} color="var(--button-color)" /> {t.debtsNotebook}
          </h3>
        </div>
        <button 
          onClick={() => {
            setEditId(null);
            setPersonName('');
            setAmount('');
            setDueDate('');
            setShowAddModal(true);
          }}
          style={{ background: 'var(--button-color)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <Plus size={18} /> {t.add}
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <div style={{ flex: 1, background: 'rgba(16, 185, 129, 0.1)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <div style={{ fontSize: '12px', color: 'var(--hint-color)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowDownLeft size={14} color="#10b981" /> {t.myReceivables}
          </div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>
            {formatAmount(calculateTotal('given'))}
          </div>
        </div>
        <div style={{ flex: 1, background: 'rgba(239, 68, 68, 0.1)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <div style={{ fontSize: '12px', color: 'var(--hint-color)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowUpRight size={14} color="#ef4444" /> {t.myPayables}
          </div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ef4444' }}>
            {formatAmount(calculateTotal('taken'))}
          </div>
        </div>
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', color: 'var(--hint-color)', padding: '20px' }}>{t.loading}...</div>
        ) : debts.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--hint-color)', padding: '40px 20px', background: 'var(--secondary-bg-color)', borderRadius: '16px' }}>
            <Users size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
            <p>{t.debtsEmpty}</p>
          </div>
        ) : (
          debts.map(debt => (
            <div key={debt.id} style={{
              background: 'var(--secondary-bg-color)', 
              borderRadius: '16px', 
              padding: '16px',
              border: '1px solid var(--card-border)',
              opacity: debt.is_paid ? 0.6 : 1
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {debt.person_name}
                    {debt.is_paid && <CheckCircle size={14} color="#10b981" />}
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--hint-color)', marginTop: '4px' }}>
                    {debt.type === 'given' ? t.youGaveDebt : t.youTookDebt}
                  </p>
                </div>
                <div style={{ fontWeight: '700', fontSize: '16px', color: debt.type === 'given' ? '#10b981' : '#ef4444' }}>
                  {debt.type === 'given' ? '+' : '-'}{formatAmount(debt.amount)}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--card-border)', paddingTop: '12px' }}>
                <div style={{ fontSize: '12px', color: 'var(--hint-color)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={14} /> 
                  {debt.due_date ? new Date(debt.due_date).toLocaleDateString('uz-UZ') : t.noDate}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => togglePaidMutation.mutate({ id: debt.id, is_paid: !debt.is_paid })}
                    style={{ background: debt.is_paid ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: debt.is_paid ? '#f59e0b' : '#10b981', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    {debt.is_paid ? t.returnDebt : t.paidDebt}
                  </button>
                  <button 
                    onClick={() => handleEdit(debt)}
                    style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer' }}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={() => deleteMutation.mutate(debt.id)}
                    style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '6px 12px', borderRadius: '8px' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'var(--bg-color)', zIndex: 1000, padding: '20px', boxSizing: 'border-box'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700' }}>{t.addDebt}</h2>
            <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-color)' }}>
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div className="tabs-container">
              <button 
                type="button"
                className={`tab-btn ${debtType === 'given' ? 'active' : ''}`}
                onClick={() => setDebtType('given')}
                style={{ background: debtType === 'given' ? '#10b981' : 'transparent', color: debtType === 'given' ? 'white' : 'var(--hint-color)' }}
              >
                {t.iGave}
              </button>
              <button 
                type="button"
                className={`tab-btn ${debtType === 'taken' ? 'active' : ''}`}
                onClick={() => setDebtType('taken')}
                style={{ background: debtType === 'taken' ? '#ef4444' : 'transparent', color: debtType === 'taken' ? 'white' : 'var(--hint-color)' }}
              >
                {t.iTook}
              </button>
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', display: 'block' }}>{t.whoName}</label>
              <input 
                type="text" 
                required
                placeholder="Masalan: Alisher"
                value={personName}
                onChange={e => setPersonName(e.target.value)}
                style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--secondary-bg-color)', border: '1px solid var(--card-border)', color: 'var(--text-color)', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', display: 'block' }}>Summa:</label>
              <input 
                type="number" 
                inputMode="decimal"
                required
                placeholder="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--secondary-bg-color)', border: '1px solid var(--card-border)', color: 'var(--text-color)', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', display: 'block' }}>{t.returnDateOptional}</label>
              <input 
                type="date" 
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--secondary-bg-color)', border: '1px solid var(--card-border)', color: 'var(--text-color)', boxSizing: 'border-box' }}
              />
            </div>

            <button 
              type="submit" 
              disabled={addMutation.isPending || editMutation.isPending}
              style={{ width: '100%', padding: '16px', borderRadius: '12px', background: 'var(--button-color)', color: 'white', border: 'none', fontWeight: '700', marginTop: '16px', opacity: (addMutation.isPending || editMutation.isPending) ? 0.7 : 1 }}
            >
              {addMutation.isPending || editMutation.isPending ? t.loading : t.save}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default Debts;
