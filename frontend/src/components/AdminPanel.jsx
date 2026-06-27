import React from 'react';
import { ShieldAlert, Users, Send } from 'lucide-react';

function AdminPanel({ 
  adminUsers, 
  adminBroadcastMsg, 
  setAdminBroadcastMsg, 
  handleSendBroadcast, 
  handleToggleBlock, 
  tgUser, 
  t,
  setActiveTab
}) {
  return (
    <div style={{ paddingBottom: '30px', animation: 'fadeIn 0.3s ease-out' }}>
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
          <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-color)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Users size={16} /> {t.usersList} ({adminUsers.length})
          </label>
          <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {adminUsers.map(user => {
              const isSelf = String(user.user_id) === String(tgUser.id);
              return (
                <div key={user.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.first_name || 'Noma\'lum'} {isSelf ? '(Siz)' : ''}
                    <div style={{ fontSize: '11px', color: 'var(--hint-color)', fontWeight: '400', marginTop: '2px' }}>ID: {user.user_id}</div>
                  </div>
                  <button
                    disabled={isSelf}
                    onClick={() => handleToggleBlock(user.user_id, user.is_blocked)}
                    style={{
                      padding: '8px 16px', borderRadius: '12px', border: 'none', fontSize: '12px', fontWeight: '700',
                      background: user.is_blocked ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: user.is_blocked ? 'var(--income-color)' : 'var(--expense-color)',
                      cursor: isSelf ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {user.is_blocked ? t.unblock : t.block}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;
