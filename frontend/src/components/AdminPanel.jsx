import React, { useState } from 'react';
import { ShieldAlert, Users, Send, BarChart2, CheckCircle, X, ExternalLink } from 'lucide-react';

export default function AdminPanel({ 
  adminUsers, 
  adminBroadcastMsg, 
  setAdminBroadcastMsg, 
  handleSendBroadcast, 
  handleToggleBlock, 
  tgUser, 
  t,
  setActiveTab,
  apiUrl,
  formatAmount,
  fetchAdminUsers
}) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const fetchUserStats = async (user) => {
    setSelectedUser(user);
    setLoadingStats(true);
    try {
      const res = await fetch(`${apiUrl}/api/admin/users/${user.user_id}/stats`, {
        headers: { 'x-telegram-user-id': tgUser.id }
      });
      if (res.ok) {
        setUserStats(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStats(false);
    }
  };



  const handleMakeAdmin = async (targetUserId) => {
    if (!window.confirm(t.adminMakeConfirm)) return;
    try {
      const res = await fetch(`${apiUrl}/api/admin/make-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-telegram-user-id': tgUser.id },
        body: JSON.stringify({ targetUserId })
      });
      if (res.ok) {
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
        setSelectedUser(null);
        alert(t.adminMadeSuccess);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ paddingBottom: '100px', animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ background: 'var(--secondary-bg-color)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
        <button 
          onClick={() => setActiveTab('profile')}
          style={{ background: 'none', border: 'none', color: 'var(--text-color)', padding: '0', marginBottom: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600' }}
        >
          &larr; Orqaga
        </button>
        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: 'var(--expense-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={20} /> {t.adminPanel}
        </h3>
        
        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-color)', marginBottom: '8px', display: 'block' }}>
            {t.broadcastLabel}
          </label>
          <textarea
            rows="4"
            placeholder={t.broadcastPlaceholder}
            value={adminBroadcastMsg}
            onChange={(e) => setAdminBroadcastMsg(e.target.value)}
            style={{ 
              width: '100%', background: 'rgba(0,0,0,0.1)', border: '1px solid var(--card-border)', 
              borderRadius: '12px', padding: '12px', color: 'var(--text-color)', resize: 'none', 
              fontSize: '14px', boxSizing: 'border-box'
            }}
          />
          <button
            onClick={handleSendBroadcast}
            disabled={!adminBroadcastMsg.trim()}
            style={{ 
              width: '100%', padding: '14px', background: 'var(--expense-color)', color: 'white', 
              border: 'none', borderRadius: '12px', marginTop: '12px', fontWeight: '700',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              opacity: !adminBroadcastMsg.trim() ? 0.5 : 1
            }}
          >
            <Send size={16} />
            {t.broadcastBtn}
          </button>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={16} /> {t.usersList} ({adminUsers.length})
            </label>
            <button 
              onClick={() => {
                if(fetchAdminUsers) {
                  window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
                  fetchAdminUsers();
                }
              }}
              style={{ background: 'none', border: '1px solid var(--card-border)', color: 'var(--text-color)', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}
            >
              🔄 Yangilash
            </button>
          </div>
          <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {adminUsers.map(user => {
              const isSelf = String(user.user_id) === String(tgUser.id);
              return (
                <div key={user.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px' }}>
                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => fetchUserStats(user)}>
                    <div style={{ fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {user.first_name || 'Noma\'lum'} {isSelf ? '(Siz)' : ''}
                      {user.is_admin && <CheckCircle size={12} color="var(--button-color)" />}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--hint-color)', fontWeight: '400', marginTop: '2px' }}>ID: {user.user_id}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        if (user.username) {
                          window.open(`https://t.me/${user.username}`, '_blank');
                        } else {
                          window.open(`tg://user?id=${user.user_id}`, '_blank');
                        }
                      }}
                      style={{ padding: '8px', borderRadius: '8px', border: 'none', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', cursor: 'pointer' }}
                    >
                      <ExternalLink size={14} />
                    </button>
                    <button
                      disabled={isSelf}
                      onClick={() => handleToggleBlock(user.user_id, user.is_blocked)}
                      style={{
                        padding: '8px 16px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: '700',
                        background: user.is_blocked ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: user.is_blocked ? 'var(--income-color)' : 'var(--expense-color)',
                        cursor: isSelf ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {user.is_blocked ? t.unblock : t.block}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* User Insights Modal */}
      {selectedUser && (
        <div className="settings-modal" style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
          background: 'rgba(0,0,0,0.8)', zIndex: 1100, padding: '20px', 
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ background: 'var(--bg-color)', width: '100%', maxWidth: '400px', borderRadius: '24px', padding: '24px', animation: 'fadeIn 0.2s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700' }}>{t.userReport}</h3>
              <button onClick={() => setSelectedUser(null)} style={{ background: 'none', border: 'none', color: 'var(--text-color)' }}>
                <X size={24} />
              </button>
            </div>
            
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--button-color), #0d9488)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold', margin: '0 auto 12px' }}>
                {selectedUser.first_name ? selectedUser.first_name.charAt(0).toUpperCase() : '?'}
              </div>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{selectedUser.first_name}</div>
              <div style={{ fontSize: '12px', color: 'var(--hint-color)' }}>@{selectedUser.username || 'username_yoq'} | ID: {selectedUser.user_id}</div>
            </div>

            {loadingStats ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--hint-color)' }}>Yuklanmoqda...</div>
            ) : userStats ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--secondary-bg-color)', borderRadius: '12px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--hint-color)' }}>Daromad:</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--income-color)' }}>+{formatAmount(userStats.totalIncome)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--secondary-bg-color)', borderRadius: '12px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--hint-color)' }}>Harajat:</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--expense-color)' }}>-{formatAmount(userStats.totalExpense)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--secondary-bg-color)', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                  <span style={{ fontSize: '13px', color: 'var(--hint-color)' }}>Qoldiq:</span>
                  <span style={{ fontWeight: 'bold', color: userStats.balance >= 0 ? 'var(--income-color)' : 'var(--expense-color)' }}>
                    {formatAmount(userStats.balance)}
                  </span>
                </div>
                
                {userStats.recentTransactions && userStats.recentTransactions.length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-color)' }}>Oxirgi tranzaksiyalar:</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {userStats.recentTransactions.map(tx => (
                        <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--card-border)', fontSize: '13px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontWeight: '600' }}>{tx.category}</span>
                            <span style={{ color: 'var(--hint-color)', fontSize: '11px' }}>{new Date(tx.date).toLocaleDateString('uz-UZ')}</span>
                          </div>
                          <div style={{ fontWeight: 'bold', color: tx.type === 'income' ? 'var(--income-color)' : 'var(--expense-color)' }}>
                            {tx.type === 'income' ? '+' : '-'}{formatAmount(tx.amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--expense-color)' }}>Xatolik yuz berdi</div>
            )}

            {!selectedUser.is_admin && String(selectedUser.user_id) !== String(tgUser.id) && (
              <button 
                onClick={() => handleMakeAdmin(selectedUser.user_id)}
                style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)', fontWeight: 'bold' }}
              >
                {t.makeAdmin}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
