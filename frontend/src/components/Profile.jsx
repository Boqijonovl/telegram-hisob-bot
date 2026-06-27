import React, { useState } from 'react';
import { 
  Settings, 
  History, 
  Wallet, 
  CreditCard,
  ShieldAlert,
  Moon,
  Sun,
  X,
  Layers
} from 'lucide-react';

function Profile({ 
  tgUser, 
  settings, 
  t, 
  lang, 
  setLang,
  vaultBalance,
  onOpenVault,
  isAdmin,
  formatAmount,
  onReset,
  setActiveTab,
  theme,
  toggleTheme
}) {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div style={{ paddingBottom: '30px', animation: 'fadeIn 0.3s ease-out' }}>
      
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

        {/* History */}
        <div onClick={() => setActiveTab('history')} style={{
          background: 'var(--secondary-bg-color)', borderRadius: '16px', padding: '16px', cursor: 'pointer', border: '1px solid var(--card-border)'
        }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <History size={16} />
          </div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--hint-color)' }}>Barcha operatsiyalar</div>
          <div style={{ fontSize: '11px', fontWeight: '500', color: 'var(--hint-color)', marginTop: '4px' }}>Tarixni ko'rish</div>
        </div>

        {/* Obuna */}
        <div style={{
          background: 'var(--secondary-bg-color)', borderRadius: '16px', padding: '16px', cursor: 'pointer', border: '1px solid var(--card-border)'
        }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <CreditCard size={16} />
          </div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--hint-color)' }}>Obuna</div>
          <div style={{ fontSize: '11px', fontWeight: '500', color: 'var(--hint-color)', marginTop: '4px' }}>Status va tariflar</div>
        </div>

        {/* Sozlamalar */}
        <div onClick={() => setShowSettings(true)} style={{
          background: 'var(--secondary-bg-color)', borderRadius: '16px', padding: '16px', cursor: 'pointer', border: '1px solid var(--card-border)'
        }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <Settings size={16} />
          </div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--hint-color)' }}>{t.settings}</div>
          <div style={{ fontSize: '11px', fontWeight: '500', color: 'var(--hint-color)', marginTop: '4px' }}>Til va mavzu</div>
        </div>

        {/* Kategoriyalar */}
        <div onClick={() => setActiveTab('category-manager')} style={{
          background: 'var(--secondary-bg-color)', borderRadius: '16px', padding: '16px', cursor: 'pointer', border: '1px solid var(--card-border)'
        }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
            <Layers size={16} />
          </div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--hint-color)' }}>Kategoriyalar</div>
          <div style={{ fontSize: '11px', fontWeight: '500', color: 'var(--hint-color)', marginTop: '4px' }}>Qo'shish va o'zgartirish</div>
        </div>
        
        {/* Admin Panel if Admin */}
        {isAdmin && (
          <div onClick={() => setActiveTab('admin')} style={{
            background: 'var(--secondary-bg-color)', borderRadius: '16px', padding: '16px', cursor: 'pointer', border: '1px solid rgba(239, 68, 68, 0.3)'
          }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
              <ShieldAlert size={16} />
            </div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--expense-color)' }}>{t.adminPanel}</div>
            <div style={{ fontSize: '11px', fontWeight: '500', color: 'var(--hint-color)', marginTop: '4px' }}>Foydalanuvchilar boshqaruvi</div>
          </div>
        )}

      </div>

      {/* Settings Modal overlay */}
      {showSettings && (
        <div className="settings-modal" style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
          background: 'var(--bg-color)', zIndex: 1000, padding: '20px', 
          boxSizing: 'border-box', overflowY: 'auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Umumiy sozlamalar</h2>
            <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', color: 'var(--text-color)' }}>
              <X size={24} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Mavzu */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px', display: 'block' }}>Ilova mavzusi (Theme):</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => toggleTheme('light')} 
                  style={{
                    flex: 1, padding: '12px', borderRadius: '12px', background: 'var(--secondary-bg-color)',
                    border: theme === 'light' ? '1px solid var(--button-color)' : '1px solid var(--card-border)',
                    color: 'var(--text-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                  }}
                >
                  <Sun size={18} /> Yorug'
                </button>
                <button 
                  onClick={() => toggleTheme('dark')} 
                  style={{
                    flex: 1, padding: '12px', borderRadius: '12px', background: 'var(--secondary-bg-color)',
                    border: theme === 'dark' ? '1px solid var(--button-color)' : '1px solid var(--card-border)',
                    color: 'var(--text-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                  }}
                >
                  <Moon size={18} /> Qorong'i
                </button>
              </div>
            </div>

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
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-color)' }}>{l.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Reset */}
            <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '24px' }}>
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
