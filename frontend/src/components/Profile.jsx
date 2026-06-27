import React, { useState } from 'react';
import { 
  Settings, 
  History, 
  Wallet, 
  Users, 
  Send, 
  ShieldAlert,
  ChevronRight,
  FileText,
  MessageCircle,
  X,
  CreditCard,
  RefreshCw
} from 'lucide-react';
import { getCategoryConfig } from './Dashboard';

function Profile({ 
  tgUser, 
  settings, 
  t, 
  lang, 
  setLang,
  vaultBalance,
  onOpenVault,
  isAdmin,
  adminUsers,
  adminBroadcastMsg,
  setAdminBroadcastMsg,
  handleSendBroadcast,
  handleToggleBlock,
  formatAmount,
  onReset
}) {
  const [showSettings, setShowSettings] = useState(false);

  const isPro = true; // Hardcoded for display as requested in image (Silver/Faol)
  
  return (
    <div style={{ paddingBottom: '30px', animation: 'fadeIn 0.3s ease-out' }}>
      
      {/* Header Profile Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--button-color), #0d9488)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: '800', fontSize: '18px'
          }}>
            {tgUser?.first_name?.charAt(0) || 'U'}
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: 'var(--text-color)' }}>
              {tgUser?.first_name} {tgUser?.last_name || ''}
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--button-color)', margin: 0 }}>
              @{tgUser?.username || 'user'}
            </p>
          </div>
        </div>
        <button 
          onClick={() => setShowSettings(true)}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-color)', cursor: 'pointer' }}
        >
          <Settings size={24} />
        </button>
      </div>

      {/* Subscription Card */}
      <div style={{
        background: 'var(--secondary-bg-color)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
        border: '1px solid var(--card-border)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--income-color)' }}></div>
            <span style={{ fontSize: '12px', fontWeight: '600' }}>Faol</span>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--income-color)', background: 'var(--income-bg)', padding: '2px 8px', borderRadius: '12px' }}>
            01.07.2026 gacha
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
          <h1 style={{ fontSize: '24px', margin: 0, fontWeight: '800' }}>SILVER</h1>
          <span style={{ fontSize: '16px', fontWeight: '700' }}>15 000<span style={{ fontSize: '12px', color: 'var(--hint-color)' }}>.00 UZS</span></span>
        </div>
        
        <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden', marginBottom: '8px' }}>
          <div style={{ width: '70%', height: '100%', background: 'var(--button-color)' }}></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--hint-color)' }}>
          <span>347 ta / 500 ta xabarnoma</span>
          <span>153 ta qoldi</span>
        </div>
      </div>

      {/* 2x2 Grid Options */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
        
        {/* Xazna (Vault) */}
        <div onClick={onOpenVault} style={{
          background: 'var(--secondary-bg-color)', borderRadius: '16px', padding: '16px', cursor: 'pointer', border: '1px solid var(--card-border)'
        }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <Wallet size={16} />
          </div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--hint-color)' }}>{t.vault}</div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-color)', marginTop: '4px' }}>
            {formatAmount(vaultBalance)}
          </div>
        </div>

        {/* History placeholder (could just be text as requested in image, but we link it or show it) */}
        <div style={{
          background: 'var(--secondary-bg-color)', borderRadius: '16px', padding: '16px', cursor: 'pointer', border: '1px solid var(--card-border)'
        }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.1)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <History size={16} />
          </div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--hint-color)' }}>{t.history}</div>
        </div>

        <div style={{
          background: 'var(--secondary-bg-color)', borderRadius: '16px', padding: '16px', cursor: 'pointer', border: '1px solid var(--card-border)'
        }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.1)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <FileText size={16} />
          </div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--hint-color)' }}>Kvitansiyalar</div>
        </div>

        <div style={{
          background: 'var(--secondary-bg-color)', borderRadius: '16px', padding: '16px', cursor: 'pointer', border: '1px solid var(--card-border)'
        }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.1)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <RefreshCw size={16} />
          </div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--hint-color)' }}>Valyuta kursi</div>
        </div>

      </div>

      {/* Qo'shimcha Menu */}
      <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px' }}>Qo'shimcha:</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
        {[
          { icon: History, text: 'Faol sessiyalar' },
          { icon: FileText, text: 'Hujjatlar' },
          { icon: MessageCircle, text: 'Biz bilan bog\'lanish' }
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--secondary-bg-color)', padding: '16px', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <item.icon size={18} color="var(--text-color)" />
              <span style={{ fontSize: '14px', fontWeight: '600' }}>{item.text}</span>
            </div>
            <ChevronRight size={18} color="var(--hint-color)" />
          </div>
        ))}
      </div>

      {/* Admin Panel if Admin */}
      {isAdmin && (
        <div style={{ background: 'var(--secondary-bg-color)', borderRadius: '16px', padding: '16px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px', color: 'var(--expense-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldAlert size={16} /> {t.adminPanel}
          </h3>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: 'var(--hint-color)', marginBottom: '8px', display: 'block' }}>{t.broadcastLabel}</label>
            <textarea
              rows="3"
              placeholder={t.broadcastPlaceholder}
              value={adminBroadcastMsg}
              onChange={(e) => setAdminBroadcastMsg(e.target.value)}
              style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--card-border)', borderRadius: '8px', padding: '10px', color: 'white', resize: 'none' }}
            />
            <button
              onClick={handleSendBroadcast}
              disabled={!adminBroadcastMsg.trim()}
              style={{ width: '100%', padding: '10px', background: 'var(--button-color)', color: 'white', border: 'none', borderRadius: '8px', marginTop: '8px', fontWeight: '600' }}
            >
              <Send size={14} style={{ marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }} />
              {t.broadcastBtn}
            </button>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--hint-color)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={14} /> {t.usersList} ({adminUsers.length})
            </label>
            <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {adminUsers.map(user => {
                const isSelf = String(user.user_id) === String(tgUser.id);
                return (
                  <div key={user.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {user.first_name || 'Noma\'lum'} {isSelf ? '(Siz)' : ''}
                      <div style={{ fontSize: '10px', color: 'var(--hint-color)', fontWeight: '400' }}>ID: {user.user_id}</div>
                    </div>
                    <button
                      disabled={isSelf}
                      onClick={() => handleToggleBlock(user.user_id, user.is_blocked)}
                      style={{
                        padding: '6px 12px', borderRadius: '12px', border: 'none', fontSize: '11px', fontWeight: '700',
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
      )}

      {/* Settings Modal overlay */}
      {showSettings && (
        <div className="settings-modal">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Umumiy sozlamalar</h2>
            <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', color: 'var(--text-color)' }}>
              <X size={24} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Tillar */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px', display: 'block' }}>Interfeys tili:</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                {[{id: 'ru', label: 'Русский', icon: '🇷🇺'}, {id: 'en', label: 'English', icon: '🇬🇧'}, {id: 'uz', label: 'O\'zbek', icon: '🇺🇿'}].map(l => (
                  <div key={l.id} onClick={() => setLang(l.id)} style={{
                    flex: 1, background: 'var(--secondary-bg-color)', borderRadius: '12px', padding: '12px 0', textAlign: 'center',
                    border: lang === l.id ? '1px solid var(--button-color)' : '1px solid var(--card-border)',
                    cursor: 'pointer', position: 'relative'
                  }}>
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>{l.icon}</div>
                    <div style={{ fontSize: '12px', fontWeight: '600' }}>{l.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reset */}
            <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '20px' }}>
              <button onClick={() => { setShowSettings(false); onReset(); }} style={{
                width: '100%', padding: '16px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--expense-color)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', fontWeight: '700'
              }}>
                {t.deleteAll}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
