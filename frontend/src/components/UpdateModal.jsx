import { useState, useEffect } from 'react';

const VERSION = 'v3.4';
const UPDATES = [
  { icon: '⚔️', title: 'Dungeon-Only',         desc: 'Habits and quests are gone — Tickd is now a pure dungeon-crawler. All XP and gold come from the dungeon.' },
  { icon: '🏠', title: 'New Avatar Home',      desc: 'Your homepage is now a large showcase of your character with all equipped items on display.' },
  { icon: '🏆', title: 'Leaderboard Page',     desc: 'The leaderboard has its own dedicated page — accessible from the top nav.' },
  { icon: '🏅', title: 'Dungeon Achievements', desc: 'New achievements for ascension milestones and survival waves replace the old habit ones.' },
  { icon: '🎁', title: 'Item Bundles',         desc: 'Buy whole themed sets at a discount — up to 25% off vs grabbing items individually.' },
  { icon: '🔎', title: 'Shop Search & Sort',   desc: 'Search by name, sort by price / rarity / magic / name, filter by rarity, hide-owned, affordable-only.' },
  { icon: '🎨', title: 'Colour Themes',        desc: '7 colour themes to personalise your experience. Find them in ⚙️ Settings.' },
  { icon: '🔔', title: 'Push Notifications',   desc: 'Set a daily dungeon reminder time — fully customisable.' },
];

export default function UpdateModal() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('tickd_update_seen');
    if (seen !== VERSION) setShow(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem('tickd_update_seen', VERSION);
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
          <div style={{ fontSize:40, marginBottom:8 }}>⚔️</div>
          <h2 style={{ fontFamily:'Cinzel,serif', fontSize:22, color:'var(--gold)', marginBottom:4 }}>Tickd {VERSION}</h2>
          <p style={{ color:'var(--text-muted)', fontSize:13 }}>Here's what's new in this update</p>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
          {UPDATES.map((u, i) => (
            <div key={i} style={{ display:'flex', gap:12, alignItems:'flex-start', padding:'10px 14px', background:'var(--bg3)', borderRadius:10, border:'1px solid var(--border)' }}>
              <span style={{ fontSize:22, flexShrink:0 }}>{u.icon}</span>
              <div>
                <div style={{ fontWeight:600, fontSize:14, marginBottom:2 }}>{u.title}</div>
                <div style={{ color:'var(--text-muted)', fontSize:12 }}>{u.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <button className="btn btn-gold" style={{ width:'100%', padding:14, fontSize:15 }} onClick={dismiss}>
          Let's Go! 🚀
        </button>
      </div>
    </div>
  );
}
