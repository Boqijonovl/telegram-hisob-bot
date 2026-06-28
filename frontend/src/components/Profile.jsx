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
  Layers,
  Link,
  Copy,
  ChevronRight,
  TrendingDown,
  TrendingUp
} from 'lucide-react';
import { useQueryClient, useQuery } from '@tanstack/react-query';

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
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [partnerId, setPartnerId] = useState('');
  const queryClient = useQueryClient();

  const handleLinkAccount = async () => {
    try {
      await fetch(`${getApiUrl()}/api/settings/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-telegram-user-id': tgUser?.id || '123456' },
        body: JSON.stringify({ linked_to: partnerId || null })
      });
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      setShowLinkModal(false);
      queryClient.invalidateQueries({ queryKey: ['appData'] });
    } catch (e) { console.error(e); }
  };

  const getApiUrl = () => {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return 'http://localhost:5000';
    return 'https://hisob-bot.onrender.com';
  };

  const { data: debts = [] } = useQuery({
    queryKey: ['debts'],
    queryFn: async () => {
      const res = await fetch(`${getApiUrl()}/api/debts`, {
        headers: { 'x-telegram-user-id': tgUser?.id || '123456' }
      });
      return res.json();
    }
  });

  const debtsArray = Array.isArray(debts) ? debts : [];
  const totalGiven = debtsArray.filter(d => d.type === 'given').reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
  const totalTaken = debtsArray.filter(d => d.type === 'taken').reduce((acc, curr) => acc + parseFloat(curr.amount), 0);

  return (
    <div style={{ paddingBottom: '30px', animation: 'fadeIn 0.3s ease-out' }}>
      
      {/* User Header Info */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--button-color), #0d9488)', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', color: 'white', fontWeight: 'bold' }}>
          {tgUser?.first_name?.charAt(0) || '?'}
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '4px' }}>{tgUser?.first_name || 'Foydalanuvchi'}</h2>
        <div style={{ fontSize: '13px', color: 'var(--hint-color)' }}>ID: {tgUser?.id}</div>
      </div>

      {/* Qarzlar Hisoboti */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <div style={{ flex: 1, background: 'var(--secondary-bg-color)', borderRadius: '16px', padding: '16px', border: '1px solid var(--card-border)' }}>
          <div style={{ fontSize: '12px', color: 'var(--hint-color)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TrendingUp size={14} color="var(--expense-color)" /> Sizdagi qarzlar
          </div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--expense-color)' }}>{formatAmount(totalTaken)}</div>
        </div>
        <div style={{ flex: 1, background: 'var(--secondary-bg-color)', borderRadius: '16px', padding: '16px', border: '1px solid var(--card-border)' }}>
          <div style={{ fontSize: '12px', color: 'var(--hint-color)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TrendingDown size={14} color="var(--income-color)" /> Siz bergan qarz
          </div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--income-color)' }}>{formatAmount(totalGiven)}</div>
        </div>
      </div>

      {/* iOS Style List Group 1: Moliyaviy */}
      <div style={{ background: 'var(--secondary-bg-color)', borderRadius: '16px', overflow: 'hidden', marginBottom: '24px', border: '1px solid var(--card-border)' }}>
        
        <div onClick={onOpenVault} style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--card-border)', cursor: 'pointer' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#8b5cf6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '16px' }}>
            <Wallet size={18} />
          </div>
          <div style={{ flex: 1, fontSize: '15px', fontWeight: '600' }}>Xazna (Vault)</div>
          <div style={{ fontSize: '15px', color: 'var(--hint-color)', marginRight: '8px' }}>{formatAmount(vaultBalance)}</div>
          <ChevronRight size={18} color="var(--hint-color)" />
        </div>

        <div onClick={() => setActiveTab('history')} style={{ display: 'flex', alignItems: 'center', padding: '16px', cursor: 'pointer' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '16px' }}>
            <History size={18} />
          </div>
          <div style={{ flex: 1, fontSize: '15px', fontWeight: '600' }}>Barcha operatsiyalar</div>
          <ChevronRight size={18} color="var(--hint-color)" />
        </div>
      </div>

      {/* iOS Style List Group 2: Sozlamalar */}
      <div style={{ background: 'var(--secondary-bg-color)', borderRadius: '16px', overflow: 'hidden', marginBottom: '24px', border: '1px solid var(--card-border)' }}>
        
        <div onClick={() => setActiveTab('category-manager')} style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--card-border)', cursor: 'pointer' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f59e0b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '16px' }}>
            <Layers size={18} />
          </div>
          <div style={{ flex: 1, fontSize: '15px', fontWeight: '600' }}>Kategoriyalar</div>
          <ChevronRight size={18} color="var(--hint-color)" />
        </div>

        <div onClick={() => setShowLinkModal(true)} style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--card-border)', cursor: 'pointer' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '16px' }}>
            <Link size={18} />
          </div>
          <div style={{ flex: 1, fontSize: '15px', fontWeight: '600' }}>Umumiy Hisob</div>
          <div style={{ fontSize: '14px', color: settings?.my_linked_to ? 'var(--income-color)' : 'var(--hint-color)', marginRight: '8px' }}>
            {settings?.my_linked_to ? 'Ulangan' : 'Ulanmagan'}
          </div>
          <ChevronRight size={18} color="var(--hint-color)" />
        </div>

        <div onClick={() => setShowSettings(true)} style={{ display: 'flex', alignItems: 'center', padding: '16px', cursor: 'pointer' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ec4899', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '16px' }}>
            <Settings size={18} />
          </div>
          <div style={{ flex: 1, fontSize: '15px', fontWeight: '600' }}>Umumiy sozlamalar</div>
          <ChevronRight size={18} color="var(--hint-color)" />
        </div>
      </div>

      {/* Admin Panel Group */}
      {isAdmin && (
        <div style={{ background: 'var(--secondary-bg-color)', borderRadius: '16px', overflow: 'hidden', marginBottom: '24px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <div onClick={() => setActiveTab('admin')} style={{ display: 'flex', alignItems: 'center', padding: '16px', cursor: 'pointer' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ef4444', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '16px' }}>
              <ShieldAlert size={18} />
            </div>
            <div style={{ flex: 1, fontSize: '15px', fontWeight: '600', color: 'var(--expense-color)' }}>{t.adminPanel}</div>
            <ChevronRight size={18} color="var(--hint-color)" />
          </div>
        </div>
      )}

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
      {/* Link Account Modal */}
      {showLinkModal && (
        <div className="settings-modal" style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', 
          background: 'var(--bg-color)', zIndex: 1000, padding: '20px', 
          boxSizing: 'border-box'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Umumiy Hisob</h2>
            <button onClick={() => setShowLinkModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-color)' }}>
              <X size={24} />
            </button>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--hint-color)', marginBottom: '20px', lineHeight: '1.5' }}>
            Oila a'zolaringiz yoki sherigingiz bilan bitta hisobni yuritish uchun ularning <b>Telegram ID</b> raqamini kiriting. Yoki o'z ID raqamingizni ularga bering.
          </p>

          <div style={{ background: 'var(--secondary-bg-color)', borderRadius: '12px', padding: '16px', marginBottom: '20px', border: '1px dashed var(--card-border)' }}>
            <div style={{ fontSize: '12px', color: 'var(--hint-color)', marginBottom: '8px' }}>Sizning Telegram ID raqamingiz:</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '18px', fontWeight: 'bold', fontFamily: 'monospace', color: 'var(--button-color)' }}>
                {tgUser?.id || '123456'}
              </span>
              <button 
                onClick={() => { navigator.clipboard.writeText(tgUser?.id || '123456'); window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light'); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-color)', cursor: 'pointer' }}
              >
                <Copy size={20} />
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', display: 'block' }}>Sherikning ID raqamini kiriting:</label>
            <input 
              type="text" 
              placeholder="Masalan: 987654321" 
              value={partnerId}
              onChange={e => setPartnerId(e.target.value)}
              style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--secondary-bg-color)', border: '1px solid var(--card-border)', color: 'var(--text-color)', boxSizing: 'border-box' }}
            />
          </div>

          {settings?.my_linked_to ? (
            <button onClick={() => { setPartnerId(''); handleLinkAccount(); }} style={{ width: '100%', padding: '16px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--expense-color)', border: 'none', fontWeight: '700' }}>
              Hisobni uzish (Unlink)
            </button>
          ) : (
            <button onClick={handleLinkAccount} disabled={!partnerId} style={{ width: '100%', padding: '16px', borderRadius: '12px', background: 'var(--button-color)', color: 'white', border: 'none', fontWeight: '700', opacity: !partnerId ? 0.5 : 1 }}>
              Hisobni ulash
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default Profile;
