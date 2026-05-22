import { useState, useEffect } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { THEMES, applyTheme } from '../utils/themes';

const PRIVACY_OPTIONS = [
  { value: 'all',     label: 'Everyone',     icon: '🌍' },
  { value: 'friends', label: 'Friends Only', icon: '👥' },
  { value: 'private', label: 'Private',      icon: '🔒' },
];

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [settings, setSettings] = useState({
    privacy_xp: 'all',
    notif_enabled: false, notif_time: '20:00', theme: 'default',
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast]   = useState(null);
  const [notifSupported, setNotifSupported] = useState(false);

  const showToast = (msg, type='success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    setNotifSupported('Notification' in window && 'serviceWorker' in navigator);
    api.settings.get().then(s => {
      if (s) setSettings(prev => ({ ...prev, ...s }));
    });
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.settings.save(settings);
      applyTheme(settings.theme);
      localStorage.setItem('tickd_theme', settings.theme);
      await refreshUser();
      showToast('Settings saved!');

      // Register / unregister push notifications
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.register('/sw.js');
        if (settings.notif_enabled) {
          const perm = await Notification.requestPermission();
          if (perm === 'granted') {
            scheduleNotification(settings.notif_time);
          }
        } else {
          localStorage.removeItem('tickd_notif_time');
          localStorage.setItem('tickd_notif_enabled', 'false');
        }
      }
    } catch (err) { showToast(err.message, 'error'); }
    setSaving(false);
  };

  const scheduleNotification = (time) => {
    // Store reminder time in localStorage for the SW scheduler
    localStorage.setItem('tickd_notif_time', time);
    localStorage.setItem('tickd_notif_enabled', 'true');
  };

  const set = (key, val) => setSettings(s => ({ ...s, [key]: val }));

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20, paddingBottom:40, maxWidth:600 }}>

      {toast && (
        <div style={{
          position:'fixed', top:20, left:'50%', transform:'translateX(-50%)', zIndex:200,
          background: toast.type==='error' ? '#7f1d1d':'#064e3b',
          border:`1px solid ${toast.type==='error' ? '#ef444455':'#10b98155'}`,
          color: toast.type==='error' ? '#fca5a5':'#6ee7b7',
          padding:'10px 20px', borderRadius:10, fontWeight:500, fontSize:14,
          whiteSpace:'nowrap', boxShadow:'0 4px 20px rgba(0,0,0,0.5)'
        }}>{toast.msg}</div>
      )}

      <div>
        <h2 style={{ fontFamily:'Cinzel,serif', fontSize:22, marginBottom:4 }}>Settings</h2>
        <p style={{ color:'var(--text-muted)', fontSize:13 }}>Manage your privacy, notifications and appearance.</p>
      </div>

      {/* THEME */}
      <Section title="🎨 Colour Theme">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))', gap:10 }}>
          {Object.entries(THEMES).map(([key, t]) => (
            <button key={key} type="button"
              onClick={() => { set('theme', key); applyTheme(key); }}
              style={{
                borderRadius:10, border:`2px solid ${settings.theme===key ? 'var(--accent)':'var(--border)'}`,
                background:'var(--bg3)', padding:'10px 8px', cursor:'pointer',
                display:'flex', flexDirection:'column', alignItems:'center', gap:8
              }}>
              <div style={{ display:'flex', gap:4 }}>
                {t.preview.map((c,i) => (
                  <div key={i} style={{ width:18, height:18, borderRadius:'50%', background:c }}/>
                ))}
              </div>
              <span style={{ fontSize:12, color: settings.theme===key ? 'var(--accent2)':'var(--text-muted)', fontWeight:500 }}>{t.label}</span>
            </button>
          ))}
        </div>
      </Section>

      {/* PRIVACY */}
      <Section title="🔒 Privacy">
        <p style={{ color:'var(--text-muted)', fontSize:13, marginBottom:14 }}>Control what others can see on your public profile.</p>
        {[
          { key:'privacy_xp', label:'XP & Level' },
        ].map(({ key, label }) => (
          <div key={key} style={{ marginBottom:14 }}>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:6 }}>{label}</div>
            <div style={{ display:'flex', gap:8 }}>
              {PRIVACY_OPTIONS.map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => set(key, opt.value)}
                  style={{
                    flex:1, padding:'8px 6px', borderRadius:8, border:'1px solid',
                    borderColor: settings[key]===opt.value ? 'var(--accent)':'var(--border)',
                    background: settings[key]===opt.value ? 'rgba(99,102,241,0.15)':'var(--bg3)',
                    color: settings[key]===opt.value ? 'var(--accent2)':'var(--text-muted)',
                    fontSize:12, cursor:'pointer'
                  }}>
                  <div style={{ fontSize:16, marginBottom:2 }}>{opt.icon}</div>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </Section>

      {/* NOTIFICATIONS */}
      <Section title="🔔 Notifications">
        {!notifSupported && (
          <p style={{ color:'var(--text-muted)', fontSize:13 }}>Push notifications are not supported in this browser.</p>
        )}
        {notifSupported && (
          <>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:600, marginBottom:2 }}>Daily Dungeon Reminder</div>
                <div style={{ fontSize:12, color:'var(--text-muted)' }}>Get a push notification reminding you to descend into the dungeon</div>
              </div>
              <Toggle value={settings.notif_enabled} onChange={v => set('notif_enabled', v)}/>
            </div>
            {settings.notif_enabled && (
              <div>
                <div style={{ fontSize:13, fontWeight:600, marginBottom:6 }}>Reminder Time</div>
                <input
                  type="time" value={settings.notif_time}
                  onChange={e => set('notif_time', e.target.value)}
                  style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 14px', color:'var(--text)', fontSize:14, outline:'none' }}
                />
                <p style={{ color:'var(--text-muted)', fontSize:12, marginTop:6 }}>
                  A reminder will appear daily at this time to keep your runs going.
                </p>
              </div>
            )}
          </>
        )}
      </Section>

      {/* PROFILE LINK */}
      <Section title="🔗 Your Public Profile">
        <p style={{ color:'var(--text-muted)', fontSize:13, marginBottom:10 }}>Share your profile with anyone — privacy settings above apply.</p>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <div style={{ flex:1, background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 14px', fontSize:13, color:'var(--text-muted)', wordBreak:'break-all' }}>
            {window.location.origin}/users/{user?.username}
          </div>
          <button className="btn btn-ghost" style={{ flexShrink:0 }}
            onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/users/${user?.username}`); showToast('Copied!'); }}>
            Copy
          </button>
        </div>
      </Section>

      {/* ACCOUNT — change username & password */}
      <Section title="👤 Account">
        <p style={{ color:'var(--text-muted)', fontSize:13, marginBottom:14 }}>
          Update your sign-in details. Both changes require your current password.
        </p>
        <UsernameForm
          currentUsername={user?.username}
          onSuccess={(msg) => { showToast(msg); refreshUser(); }}
          onError={(msg) => showToast(msg, 'error')}
        />
        <div style={{ height: 1, background: 'var(--border)', margin: '18px 0' }} />
        <PasswordForm
          onSuccess={(msg) => showToast(msg)}
          onError={(msg) => showToast(msg, 'error')}
        />
      </Section>

      {/* REBIRTH — permanent earnings multiplier, wipes most progress. */}
      <Section title="♾ Rebirth">
        <RebirthCard
          user={user}
          refreshUser={refreshUser}
          onToast={(m, t) => showToast(m, t)}
        />
      </Section>

      <button className="btn btn-primary" style={{ padding:'14px', fontSize:15 }} onClick={save} disabled={saving}>
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="card" style={{ padding:20 }}>
      <h3 style={{ fontFamily:'Cinzel,serif', fontSize:15, marginBottom:16 }}>{title}</h3>
      {children}
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      style={{
        width:48, height:26, borderRadius:99, border:'none', cursor:'pointer',
        background: value ? 'var(--accent)':'var(--border)',
        position:'relative', transition:'background 0.2s', flexShrink:0
      }}>
      <div style={{
        width:20, height:20, borderRadius:'50%', background:'white',
        position:'absolute', top:3, transition:'left 0.2s',
        left: value ? 24:3,
      }}/>
    </button>
  );
}

// ── Username change form ──────────────────────────────────────────────────
function UsernameForm({ currentUsername, onSuccess, onError }) {
  const [newName, setNewName] = useState('');
  const [pwd, setPwd]         = useState('');
  const [busy, setBusy]       = useState(false);

  const submit = async () => {
    if (!newName.trim() || !pwd) {
      onError('Enter a new username and your current password');
      return;
    }
    if (newName.trim() === currentUsername) {
      onError('That is already your username');
      return;
    }
    setBusy(true);
    try {
      await api.auth.changeUsername({ username: newName.trim(), password: pwd });
      setNewName(''); setPwd('');
      onSuccess('Username updated!');
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Change Username</div>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
        Currently: <strong style={{ color: 'var(--text)' }}>{currentUsername}</strong>
      </p>
      <input
        type="text"
        value={newName}
        onChange={e => setNewName(e.target.value)}
        placeholder="New username"
        autoComplete="username"
        style={fieldStyle}
      />
      <input
        type="password"
        value={pwd}
        onChange={e => setPwd(e.target.value)}
        placeholder="Current password"
        autoComplete="current-password"
        style={{ ...fieldStyle, marginTop: 8 }}
      />
      <button
        className="btn btn-primary"
        style={{ marginTop: 10, padding: '10px 16px', fontSize: 13 }}
        onClick={submit}
        disabled={busy}
      >
        {busy ? 'Updating...' : 'Update Username'}
      </button>
    </div>
  );
}

// ── Password change form ──────────────────────────────────────────────────
function PasswordForm({ onSuccess, onError }) {
  const [current, setCurrent] = useState('');
  const [next, setNext]       = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy]       = useState(false);

  const submit = async () => {
    if (!current || !next || !confirm) {
      onError('Fill in all password fields');
      return;
    }
    if (next.length < 6) {
      onError('New password must be at least 6 characters');
      return;
    }
    if (next !== confirm) {
      onError('New passwords do not match');
      return;
    }
    setBusy(true);
    try {
      await api.auth.changePassword({ current_password: current, new_password: next });
      setCurrent(''); setNext(''); setConfirm('');
      onSuccess('Password updated!');
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Change Password</div>
      <input
        type="password"
        value={current}
        onChange={e => setCurrent(e.target.value)}
        placeholder="Current password"
        autoComplete="current-password"
        style={fieldStyle}
      />
      <input
        type="password"
        value={next}
        onChange={e => setNext(e.target.value)}
        placeholder="New password (min 6 chars)"
        autoComplete="new-password"
        style={{ ...fieldStyle, marginTop: 8 }}
      />
      <input
        type="password"
        value={confirm}
        onChange={e => setConfirm(e.target.value)}
        placeholder="Confirm new password"
        autoComplete="new-password"
        style={{ ...fieldStyle, marginTop: 8 }}
      />
      <button
        className="btn btn-primary"
        style={{ marginTop: 10, padding: '10px 16px', fontSize: 13 }}
        onClick={submit}
        disabled={busy}
      >
        {busy ? 'Updating...' : 'Update Password'}
      </button>
    </div>
  );
}

const fieldStyle = {
  width: '100%',
  background: 'var(--bg3)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  padding: '10px 14px',
  color: 'var(--text)',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
};


// -- Rebirth � Level 30 gate, wipes XP/level/gold/inventory/dungeon-state --
function RebirthCard({ user, refreshUser, onToast }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy]             = useState(false);
  const level   = user?.level || 1;
  const count   = user?.rebirth_count || 0;
  const curMult = 1 + 0.5 * count;
  const nextMult = curMult + 0.5;
  const canRebirth = level >= 30;

  const doRebirth = async () => {
    setBusy(true);
    try {
      const res = await api.auth.rebirth();
      onToast(res.message || 'Reborn.');
      setConfirming(false);
      await refreshUser();
    } catch (err) {
      onToast(err.message || 'Rebirth failed', 'error');
    }
    setBusy(false);
  };

  return (
    <div>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14,
      }}>
        <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: '10px 12px' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', fontWeight: 600 }}>REBIRTHS</div>
          <div style={{ fontFamily: 'Cinzel,serif', fontSize: 22, color: '#a78bfa' }}>{count}</div>
        </div>
        <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: '10px 12px' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', fontWeight: 600 }}>CURRENT MULTIPLIER</div>
          <div style={{ fontFamily: 'Cinzel,serif', fontSize: 22, color: '#fde047' }}>{curMult.toFixed(1)}� XP &amp; Gold</div>
        </div>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 8 }}>
        Rebirth at <strong style={{ color: 'var(--text)' }}>Level 30</strong> to wipe your XP, level,
        gold, inventory, and dungeon progress in exchange for a permanent <strong style={{ color: '#fde047' }}>
        +0.5× earnings multiplier</strong>. Friends and achievements survive.
      </p>
      <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 14 }}>
        Next rebirth would give you <strong style={{ color: '#fde047' }}>{nextMult.toFixed(1)}� XP &amp; gold</strong>.
      </p>

      {!confirming ? (
        <button onClick={() => setConfirming(true)}
          disabled={!canRebirth}
          className="btn btn-primary"
          style={{
            padding: '10px 22px', fontSize: 14,
            background: canRebirth
              ? 'linear-gradient(90deg, #7c3aed, #ec4899)'
              : 'var(--bg3)',
            borderColor: canRebirth ? '#a78bfa' : 'var(--border)',
            opacity: canRebirth ? 1 : 0.55,
          }}>
          {canRebirth
            ? `? Rebirth (gain ${nextMult.toFixed(1)}� earnings)`
            : `?? Reach Level 30 (${30 - level} to go)`}
        </button>
      ) : (
        <div style={{
          padding: 14, borderRadius: 10,
          background: 'rgba(127,29,29,0.18)',
          border: '1px solid #ef444466',
        }}>
          <div style={{ fontFamily: 'Cinzel,serif', fontSize: 15, color: '#fca5a5', marginBottom: 6 }}>
            ? This will wipe a LOT of progress.
          </div>
          <ul style={{ margin: '4px 0 12px 18px', padding: 0, color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.5 }}>
            <li>Resets XP to 0, level to 1, gold to 0.</li>
            <li>Deletes every item in your inventory and unequips everything.</li>
            <li>Resets dungeon ascension and best survival wave.</li>
            <li>Friends and achievements <strong>stay</strong>.</li>
            <li>Earnings multiplier becomes <strong style={{ color: '#fde047' }}>{nextMult.toFixed(1)}�</strong> permanently.</li>
          </ul>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => setConfirming(false)}
              style={{ padding: '8px 16px', fontSize: 13 }}>
              Cancel
            </button>
            <button onClick={doRebirth} disabled={busy}
              className="btn btn-primary"
              style={{ padding: '8px 18px', fontSize: 13, background: '#7f1d1d', borderColor: '#ef4444' }}>
              {busy ? 'Reborn�' : 'Yes, REBIRTH'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
