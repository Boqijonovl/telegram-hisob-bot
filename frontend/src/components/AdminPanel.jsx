import React, { useState, useEffect } from 'react';
import { ShieldAlert, Users, Send, BarChart2, CheckCircle, X, ExternalLink, Activity, Search, FileText } from 'lucide-react';

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
  const [activeAdminTab, setActiveAdminTab] = useState('stats'); // stats, users, logs
  
  const [superStats, setSuperStats] = useState(null);
  const [systemLogs, setSystemLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSuperStats();
    if (activeAdminTab === 'logs') {
      fetchLogs();
    }
  }, [activeAdminTab]);

  const fetchSuperStats = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/admin/super-stats`, {
        headers: { 'x-telegram-user-id': String(tgUser.id) }
      });
      if (res.ok) setSuperStats(await res.json());
    } catch (e) {
      console.error('Failed to fetch super stats', e);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/admin/logs`, {
        headers: { 'x-telegram-user-id': String(tgUser.id) }
      });
      if (res.ok) setSystemLogs(await res.json());
    } catch (e) {
      console.error('Failed to fetch logs', e);
    }
  };

  const fetchUserStats = async (user) => {
    setSelectedUser(user);
    setLoadingStats(true);
    try {
      const res = await fetch(`${apiUrl}/api/admin/users/${user.user_id}/stats`, {
        headers: { 'x-telegram-user-id': String(tgUser.id) }
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
    if (!window.confirm(t.adminMakeConfirm || "Haqiqatan ham ushbu foydalanuvchini admin qilmoqchimisiz?")) return;
    try {
      const res = await fetch(`${apiUrl}/api/admin/make-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-telegram-user-id': String(tgUser.id) },
        body: JSON.stringify({ targetUserId })
      });
      if (res.ok) {
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
        setSelectedUser(null);
        alert(t.adminMadeSuccess || "Muvaffaqiyatli admin qilindi");
        fetchAdminUsers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredUsers = adminUsers.filter(u => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const idMatch = String(u.user_id).includes(q);
    const nameMatch = u.first_name && u.first_name.toLowerCase().includes(q);
    const usernameMatch = u.username && u.username.toLowerCase().includes(q);
    return idMatch || nameMatch || usernameMatch;
  });

  return (
    <div style={{ paddingBottom: '100px', animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ background: 'var(--secondary-bg-color)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(239, 68, 68, 0.3)', marginBottom: '20px' }}>
        <button 
          onClick={() => setActiveTab('profile')}
          style={{ background: 'none', border: 'none', color: 'var(--text-color)', padding: '0', marginBottom: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600' }}
        >
          &larr; Orqaga
        </button>
        <h3 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px', color: 'var(--expense-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={24} /> Super Admin
        </h3>
        
        {/* Admin Tabs */}
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.1)', borderRadius: '12px', padding: '4px', marginBottom: '24px' }}>
          <button 
            onClick={() => setActiveAdminTab('stats')}
            style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '10px', background: activeAdminTab === 'stats' ? 'var(--card-bg)' : 'transparent', color: activeAdminTab === 'stats' ? 'var(--text-color)' : 'var(--hint-color)', fontSize: '13px', fontWeight: '600', transition: '0.2s' }}
          >
            Tizim
          </button>
          <button 
            onClick={() => setActiveAdminTab('users')}
            style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '10px', background: activeAdminTab === 'users' ? 'var(--card-bg)' : 'transparent', color: activeAdminTab === 'users' ? 'var(--text-color)' : 'var(--hint-color)', fontSize: '13px', fontWeight: '600', transition: '0.2s' }}
          >
            Mijozlar
          </button>
          <button 
            onClick={() => setActiveAdminTab('logs')}
            style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '10px', background: activeAdminTab === 'logs' ? 'var(--card-bg)' : 'transparent', color: activeAdminTab === 'logs' ? 'var(--text-color)' : 'var(--hint-color)', fontSize: '13px', fontWeight: '600', transition: '0.2s' }}
          >
            Jurnal
          </button>
        </div>

        {activeAdminTab === 'stats' && (
          <div className="admin-stats-tab" style={{ animation: 'fadeIn 0.3s' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
              <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <Users size={24} color="#3b82f6" />
                <span style={{ fontSize: '12px', color: 'var(--hint-color)', fontWeight: '600', textAlign: 'center' }}>Foydalanuvchilar</span>
                <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-color)' }}>{superStats?.totalUsers || 0}</span>
              </div>
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <BarChart2 size={24} color="#10b981" />
                <span style={{ fontSize: '12px', color: 'var(--hint-color)', fontWeight: '600', textAlign: 'center' }}>Tranzaksiyalar</span>
                <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-color)' }}>{superStats?.totalTransactions || 0}</span>
              </div>
              <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <Activity size={24} color="#f59e0b" />
                <span style={{ fontSize: '12px', color: 'var(--hint-color)', fontWeight: '600', textAlign: 'center' }}>Bugungi Faollik</span>
                <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-color)' }}>+{superStats?.todayTransactions || 0}</span>
              </div>
              <div style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)', padding: '16px', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={24} color="#8b5cf6" />
                <span style={{ fontSize: '12px', color: 'var(--hint-color)', fontWeight: '600', textAlign: 'center' }}>Jami Aylanma</span>
                <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-color)' }}>{superStats ? formatAmount(superStats.totalVolume) : 0}</span>
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-color)', marginBottom: '8px', display: 'block' }}>
                {t.broadcastLabel || "Barchaga xabar yuborish (Broadcast)"}
              </label>
              <textarea
                rows="4"
                placeholder={t.broadcastPlaceholder || "Xabar matnini kiriting..."}
                value={adminBroadcastMsg}
                onChange={(e) => setAdminBroadcastMsg(e.target.value)}
                style={{ 
                  width: '100%', background: 'var(--bg-color)', border: '1px solid var(--card-border)', 
                  borderRadius: '12px', padding: '12px', color: 'var(--text-color)', resize: 'none', 
                  fontSize: '14px', boxSizing: 'border-box'
                }}
              />
              <button
                onClick={handleSendBroadcast}
                disabled={!adminBroadcastMsg.trim()}
                style={{ 
                  width: '100%', padding: '14px', background: 'var(--button-color)', color: 'white', 
                  border: 'none', borderRadius: '12px', marginTop: '12px', fontWeight: '700',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  opacity: !adminBroadcastMsg.trim() ? 0.5 : 1
                }}
              >
                <Send size={16} />
                {t.broadcastBtn || "Yuborish"}
              </button>
            </div>
          </div>
        )}

        {activeAdminTab === 'users' && (
          <div className="admin-users-tab" style={{ animation: 'fadeIn 0.3s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-color)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--card-border)', marginBottom: '20px' }}>
              <Search size={18} color="var(--hint-color)" />
              <input 
                type="text" 
                placeholder="ID yoki Ism bo'yicha qidiruv..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1, background: 'none', border: 'none', color: 'var(--text-color)', fontSize: '14px', outline: 'none' }}
              />
            </div>

            <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-color)' }}>
              Topilgan: {filteredUsers.length} ta
            </h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredUsers.map(user => {
                const isSelf = String(user.user_id) === String(tgUser.id);
                return (
                  <div key={user.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px' }}>
                    <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => fetchUserStats(user)}>
                      <div style={{ fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-color)' }}>
                        {user.first_name || 'Noma\'lum'} {isSelf ? '(Siz)' : ''}
                        {user.is_admin && <CheckCircle size={14} color="var(--button-color)" />}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--hint-color)', fontWeight: '400', marginTop: '4px' }}>ID: {user.user_id}</div>
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
                        <ExternalLink size={16} />
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
                        {user.is_blocked ? t.unblock || "Ochish" : t.block || "Bloklash"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeAdminTab === 'logs' && (
          <div className="admin-logs-tab" style={{ animation: 'fadeIn 0.3s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={16} /> Tizim Jurnali (Xatolar)
              </h4>
              <button onClick={fetchLogs} style={{ background: 'var(--button-color)', color: 'white', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }}>
                Yangilash
              </button>
            </div>
            
            <div style={{ background: '#1e1e1e', borderRadius: '12px', padding: '16px', maxHeight: '400px', overflowY: 'auto' }}>
              {systemLogs.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#888', fontSize: '13px', padding: '20px' }}>Xatoliklar topilmadi</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {systemLogs.map((log, i) => (
                    <div key={i} style={{ borderBottom: '1px solid #333', paddingBottom: '12px' }}>
                      <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>
                        {new Date(log.time).toLocaleString('uz-UZ')}
                      </div>
                      <div style={{ fontSize: '13px', color: '#ff6b6b', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                        {log.message}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* User Insights Modal */}
      {selectedUser && (
        <div className="settings-modal" style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
          background: 'rgba(0,0,0,0.8)', zIndex: 1100, padding: '20px', 
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ background: 'var(--bg-color)', width: '100%', maxWidth: '400px', borderRadius: '24px', padding: '24px', animation: 'fadeIn 0.2s', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700' }}>{t.userReport || "Foydalanuvchi hisoboti"}</h3>
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
                {t.makeAdmin || "Administrator qilish"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
