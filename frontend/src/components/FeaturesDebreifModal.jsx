import { useState, useEffect } from 'react';

const DEBRIEF_VERSION = 'features-1';
const FEATURES = [
  { icon: '🐱', title: 'Animated Companions', desc: 'Your pets now sway, bounce, bob, and hover with idle animations. They cheer when you slay a foe!' },
  { icon: '👗', title: 'Try On Items',        desc: 'Preview how weapons, armor, banners, and more look on your avatar before buying or equipping.' },
  { icon: '🏆', title: 'Achievements',        desc: 'Unlock trophies across dungeon ascensions, survival waves, levels, wealth, and social milestones.' },
  { icon: '📊', title: 'Stats Page',          desc: 'Track your progression, dungeon ascension, best wave, and collection completion.' },
];

export default function FeaturesDebreifModal() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(`tickd_debrief_${DEBRIEF_VERSION}`);
    if (seen !== 'true') setShow(true);
  }, []);

  const dismiss = async () => {
    localStorage.setItem(`tickd_debrief_${DEBRIEF_VERSION}`, 'true');
    // Persist to backend
    try {
      await fetch('/api/auth/debrief-seen', { method: 'PATCH' });
    } catch (e) {
      console.error('Failed to mark debrief as seen:', e);
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:1000,
      display:'flex', alignItems:'center', justifyContent:'center', padding:20
    }}>
      <div style={{
        background:'var(--bg2)', border:'1px solid var(--border-bright)',
        borderRadius:16, padding:28, maxWidth:480, width:'100%',
        boxShadow:'0 24px 60px rgba(0,0,0,0.6)', maxHeight:'90vh', overflowY:'auto'
      }} className="animate-fade">
        <div style={{ textAlign:'center', marginBottom:20 }}>
          <div style={{ fontSize:40, marginBottom:8 }}>✨</div>
          <h2 style={{ fontFamily:'Cinzel,serif', fontSize:22, color:'var(--gold)', marginBottom:4 }}>New Features</h2>
          <p style={{ color:'var(--text-muted)', fontSize:13 }}>Explore what's just been added to Tickd</p>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{ display:'flex', gap:12, alignItems:'flex-start', padding:'10px 14px', background:'var(--bg3)', borderRadius:10, border:'1px solid var(--border)' }}>
              <span style={{ fontSize:22, flexShrink:0 }}>{f.icon}</span>
              <div>
                <div style={{ fontWeight:600, fontSize:14, marginBottom:2 }}>{f.title}</div>
                <div style={{ color:'var(--text-muted)', fontSize:12 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <button className="btn btn-gold" style={{ width:'100%', padding:14, fontSize:15 }} onClick={dismiss}>
          Check Them Out 🎉
        </button>
      </div>
    </div>
  );
}
