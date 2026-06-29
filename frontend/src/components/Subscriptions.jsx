import React, { useState, useEffect } from 'react';
import { CalendarClock, Plus, Trash2, ChevronLeft, Calendar } from 'lucide-react';

const Subscriptions = ({ tgUser, apiUrl, t, setActiveTab, formatAmount, showToast }) => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', amount: '', day: '1' });
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      const headers = { 'x-telegram-user-id': String(tgUser?.id) };
      const res = await fetch(`${apiUrl}/api/recurring`, { headers });
      if (res.ok) {
        const data = await res.json();
        setSubscriptions(data);
      }
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.amount || !formData.day) return;
    
    try {
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
      const headers = { 
        'Content-Type': 'application/json',
        'x-telegram-user-id': String(tgUser?.id) 
      };
      
      const payload = {
        type: 'expense',
        category: formData.name, // using name as category for simplicity
        amount: parseFloat(formData.amount),
        description: 'Obuna',
        cron_expression: formData.day // Storing the day of the month as cron_expression
      };

      let res;
      if (editId) {
        res = await fetch(`${apiUrl}/api/recurring/${editId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`${apiUrl}/api/recurring`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        setFormData({ name: '', amount: '', day: '1' });
        setShowAddForm(false);
        setEditId(null);
        fetchSubscriptions();
        if (showToast) showToast(editId ? 'Obuna tahrirlandi!' : 'Obuna muvaffaqiyatli qo\'shildi!', 'success');
      } else {
        if (showToast) showToast('Xatolik yuz berdi', 'error');
      }
    } catch (error) {
      console.error('Error saving subscription:', error);
      if (showToast) showToast('Xatolik yuz berdi', 'error');
    }
  };

  const handleEdit = (sub) => {
    setEditId(sub.id);
    setFormData({ name: sub.category, amount: sub.amount, day: sub.cron_expression });
    setShowAddForm(true);
  };

  const handleDelete = async (id) => {
    try {
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('heavy');
      const headers = { 'x-telegram-user-id': String(tgUser?.id) };
      const res = await fetch(`${apiUrl}/api/recurring/${id}`, {
        method: 'DELETE',
        headers
      });
      if (res.ok) {
        fetchSubscriptions();
        if (showToast) showToast('Obuna o\'chirildi', 'success');
      } else {
        if (showToast) showToast('O\'chirishda xatolik yuz berdi', 'error');
      }
    } catch (error) {
      console.error('Error deleting subscription:', error);
      if (showToast) showToast('O\'chirishda xatolik yuz berdi', 'error');
    }
  };

  return (
    <div className="subscriptions-page" style={{ padding: '16px', paddingBottom: '100px', animation: 'fadeIn 0.3s' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
        <button onClick={() => setActiveTab('profile')} style={{ background: 'none', border: 'none', color: 'var(--text-color)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <ChevronLeft size={24} />
          <span style={{ fontSize: '16px', fontWeight: '600', marginLeft: '4px' }}>{t.subscriptions}</span>
        </button>
      </div>

      <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: 'var(--radius-lg)', marginBottom: '24px', border: '1px solid var(--card-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ padding: '10px', background: 'rgba(139, 92, 246, 0.15)', color: 'var(--button-color)', borderRadius: '12px' }}>
            <CalendarClock size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>{t.subsTitle}</h3>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--hint-color)' }}>{t.subsDesc}</p>
          </div>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--hint-color)', lineHeight: 1.4, marginTop: '12px' }}>
          {t.subsHint}
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700' }}>{t.activeSubs}</h3>
        <button onClick={() => {
          setEditId(null);
          setFormData({ name: '', amount: '', day: '1' });
          setShowAddForm(!showAddForm);
        }} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--button-color)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: '600' }}>
          <Plus size={16} /> {t.addBtn}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAdd} className="glass-panel" style={{ padding: '16px', marginBottom: '20px', animation: 'slideUp 0.3s' }}>
          <div className="form-group">
            <label className="form-label">{t.serviceName}</label>
            <input type="text" className="text-input" placeholder="Wi-Fi, Netflix..." value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
          </div>
          <div className="form-group">
            <label className="form-label">{t.amountUzs}</label>
            <input type="number" className="text-input" placeholder="0" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} required />
          </div>
          <div className="form-group">
            <label className="form-label">{t.paymentDay}</label>
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--secondary-bg-color)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-md)', padding: '0 12px' }}>
              <Calendar size={18} color="var(--hint-color)" />
              <input type="number" min="1" max="31" className="text-input" style={{ border: 'none', background: 'transparent' }} value={formData.day} onChange={e => setFormData({...formData, day: e.target.value})} required />
            </div>
          </div>
          <button type="submit" className="submit-btn" style={{ marginTop: '0' }}>{t.save || 'Saqlash'}</button>
        </form>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--hint-color)' }}>{t.loading || 'Yuklanmoqda...'}</div>
      ) : subscriptions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--hint-color)', background: 'var(--secondary-bg-color)', borderRadius: '16px', border: '1px dashed var(--card-border)' }}>
          {t.emptySubs}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {subscriptions.map(sub => (
            <div key={sub.id} style={{ background: 'var(--secondary-bg-color)', padding: '16px', borderRadius: '16px', border: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '600' }}>{sub.category}</h4>
                <div style={{ fontSize: '12px', color: 'var(--hint-color)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CalendarClock size={12} /> {sub.cron_expression}-{t.dayOfMonth}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '15px', fontWeight: '700' }}>{formatAmount(sub.amount)}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleEdit(sub)} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <CalendarClock size={16} />
                  </button>
                  <button onClick={() => handleDelete(sub.id)} style={{ background: 'rgba(244, 63, 94, 0.1)', color: 'var(--expense-color)', border: 'none', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Subscriptions;
