import React, { useState, useEffect } from 'react';
import { CalendarClock, Plus, Trash2, ChevronLeft, Calendar } from 'lucide-react';

const Subscriptions = ({ tgUser, apiUrl, t, setActiveTab, formatAmount }) => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', amount: '', day: '1' });

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

      const res = await fetch(`${apiUrl}/api/recurring`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setFormData({ name: '', amount: '', day: '1' });
        setShowAddForm(false);
        fetchSubscriptions();
      }
    } catch (error) {
      console.error('Error adding subscription:', error);
    }
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
      }
    } catch (error) {
      console.error('Error deleting subscription:', error);
    }
  };

  return (
    <div className="subscriptions-page" style={{ padding: '16px', paddingBottom: '100px', animation: 'fadeIn 0.3s' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
        <button onClick={() => setActiveTab('profile')} style={{ background: 'none', border: 'none', color: 'var(--text-color)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <ChevronLeft size={24} />
          <span style={{ fontSize: '16px', fontWeight: '600', marginLeft: '4px' }}>Doimiy to'lovlar</span>
        </button>
      </div>

      <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: 'var(--radius-lg)', marginBottom: '24px', border: '1px solid var(--card-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div style={{ padding: '10px', background: 'rgba(139, 92, 246, 0.15)', color: 'var(--button-color)', borderRadius: '12px' }}>
            <CalendarClock size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>Oylik to'lovlar</h3>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--hint-color)' }}>Internet, Kommunal, Netflix...</p>
          </div>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--hint-color)', lineHeight: 1.4, marginTop: '12px' }}>
          To'lov kuningizdan 1 kun oldin Telegram botingiz eslatib turadi!
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Faol obunalar</h3>
        <button onClick={() => setShowAddForm(!showAddForm)} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--button-color)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '12px', fontSize: '13px', fontWeight: '600' }}>
          <Plus size={16} /> Qo'shish
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAdd} className="glass-panel" style={{ padding: '16px', marginBottom: '20px', animation: 'slideUp 0.3s' }}>
          <div className="form-group">
            <label className="form-label">Xizmat nomi</label>
            <input type="text" className="text-input" placeholder="Masalan: Uy Wi-Fi" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
          </div>
          <div className="form-group">
            <label className="form-label">Miqdori (UZS)</label>
            <input type="number" className="text-input" placeholder="0" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} required />
          </div>
          <div className="form-group">
            <label className="form-label">Har oydagi to'lov sanasi</label>
            <div style={{ display: 'flex', alignItems: 'center', background: 'var(--secondary-bg-color)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-md)', padding: '0 12px' }}>
              <Calendar size={18} color="var(--hint-color)" />
              <input type="number" min="1" max="31" className="text-input" style={{ border: 'none', background: 'transparent' }} value={formData.day} onChange={e => setFormData({...formData, day: e.target.value})} required />
            </div>
          </div>
          <button type="submit" className="submit-btn" style={{ marginTop: '0' }}>Saqlash</button>
        </form>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--hint-color)' }}>Yuklanmoqda...</div>
      ) : subscriptions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--hint-color)', background: 'var(--secondary-bg-color)', borderRadius: '16px', border: '1px dashed var(--card-border)' }}>
          Hozircha hech qanday obuna qo'shilmagan.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {subscriptions.map(sub => (
            <div key={sub.id} style={{ background: 'var(--secondary-bg-color)', padding: '16px', borderRadius: '16px', border: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '600' }}>{sub.category}</h4>
                <div style={{ fontSize: '12px', color: 'var(--hint-color)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CalendarClock size={12} /> Har oyning {sub.cron_expression}-sanasi
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '15px', fontWeight: '700' }}>{formatAmount(sub.amount)}</span>
                <button onClick={() => handleDelete(sub.id)} style={{ background: 'rgba(244, 63, 94, 0.1)', color: 'var(--expense-color)', border: 'none', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Subscriptions;
