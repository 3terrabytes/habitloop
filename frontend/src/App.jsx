import { BrowserRouter, Routes, Route, Navigate, NavLink, Link } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { applyTheme } from './utils/themes';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import FriendsPage from './pages/FriendsPage';
import AvatarPage from './pages/AvatarPage';
import SuggestionsPage from './pages/SuggestionsPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import TermsPage from './pages/TermsPage';
import AchievementsPage from './pages/AchievementsPage';
import StatsPage from './pages/StatsPage';
import AdminPage from './pages/AdminPage';
import DungeonPage from './pages/DungeonPage';
import LeaderboardPage from './pages/LeaderboardPage';
import PartyPage from './pages/PartyPage';
import ShopPage from './pages/ShopPage';
import TavernPage from './pages/TavernPage';
import UpdateModal from './components/UpdateModal';
import FeaturesDebreifModal from './components/FeaturesDebreifModal';
import SuspensionWarning from './components/SuspensionWarning';
import BanScreen from './components/BanScreen';
import './index.css';

function Layout({ children }) {
  const { user, logout } = useAuth();

  // Apply saved theme on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('tickd_theme') || 'default';
    applyTheme(savedTheme);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          {/* Settings cog - top left */}
          <Link to="/settings" style={styles.cogLink} title="Settings">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </Link>

          <div style={styles.brand}>
            <span style={styles.brandIcon}>⚔️</span>
            <span style={styles.brandName}>Tickd</span>
          </div>

          <nav style={styles.nav}>
            <NavLink to="/" end style={({ isActive }) => ({ ...styles.navLink, ...(isActive ? styles.navLinkActive : {}) })}>
              Home
            </NavLink>
            <NavLink to="/dungeon" style={({ isActive }) => ({ ...styles.navLink, ...(isActive ? styles.navLinkActive : {}) })}>
              Dungeon
            </NavLink>
            <NavLink to="/party" style={({ isActive }) => ({ ...styles.navLink, ...(isActive ? styles.navLinkActive : {}) })}>
              Raid
            </NavLink>
            <NavLink to="/avatar" style={({ isActive }) => ({ ...styles.navLink, ...(isActive ? styles.navLinkActive : {}) })}>
              Avatar
            </NavLink>
            <NavLink to="/shop" style={({ isActive }) => ({ ...styles.navLink, ...(isActive ? styles.navLinkActive : {}) })}>
              Shop
            </NavLink>
            <NavLink to="/tavern" style={({ isActive }) => ({ ...styles.navLink, ...(isActive ? styles.navLinkActive : {}) })}>
              Tavern
            </NavLink>
            <NavLink to="/guild" style={({ isActive }) => ({ ...styles.navLink, ...(isActive ? styles.navLinkActive : {}) })}>
              Friends
            </NavLink>
            <NavLink to="/leaderboard" style={({ isActive }) => ({ ...styles.navLink, ...(isActive ? styles.navLinkActive : {}) })}>
              Board
            </NavLink>
            <NavLink to="/suggestions" style={({ isActive }) => ({ ...styles.navLink, ...(isActive ? styles.navLinkActive : {}) })}>
              Suggest
            </NavLink>
            {isAdminUser(user) && (
              <NavLink to="/admin" style={({ isActive }) => ({ ...styles.navLink, ...(isActive ? styles.navLinkActive : {}), color: 'var(--gold)' })}>
                ⚡ Admin
              </NavLink>
            )}
          </nav>

          <button className="btn btn-ghost" style={{ padding: '8px 14px', fontSize: 13 }} onClick={logout}>
            Sign Out
          </button>
        </div>
      </header>
      <main style={styles.main}>{children}</main>
      <Footer />
      <UpdateModal />
      <FeaturesDebreifModal />
      <SuspensionWarning />
      <BanScreen />
    </div>
  );
}

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--text-muted)', fontFamily: 'Cinzel, serif' }}>Loading...</div>
    </div>
  );
  return user ? children : <Navigate to="/auth" replace />;
}

// Admins are users with the is_admin flag, plus the bootstrap "thedevs" account.
// Any tier of admin (full, master, or half with at least one perm) gets the
// Admin tab. Per-action gating happens on the backend.
const isAdminUser = (u) => {
  if (!u) return false;
  if (u.is_master_admin) return true;
  if (u.is_admin) return true;
  if (Array.isArray(u.admin_perms) && u.admin_perms.length > 0) return true;
  return (u.username || '').toLowerCase() === 'thedevs';
};

function AdminGuard({ children }) {
  const { user } = useAuth();
  if (!isAdminUser(user)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/" element={<Protected><Layout><Dashboard /></Layout></Protected>} />
          <Route path="/guild" element={<Protected><Layout><FriendsPage /></Layout></Protected>} />
          <Route path="/avatar" element={<Protected><Layout><AvatarPage /></Layout></Protected>} />
          <Route path="/stats" element={<Protected><Layout><StatsPage /></Layout></Protected>} />
          <Route path="/achievements" element={<Protected><Layout><AchievementsPage /></Layout></Protected>} />
          <Route path="/suggestions" element={<Protected><Layout><SuggestionsPage /></Layout></Protected>} />
          <Route path="/settings" element={<Protected><Layout><SettingsPage /></Layout></Protected>} />
          <Route path="/admin" element={<Protected><AdminGuard><Layout><AdminPage /></Layout></AdminGuard></Protected>} />
          <Route path="/dungeon" element={<Protected><Layout><DungeonPage /></Layout></Protected>} />
          <Route path="/party" element={<Protected><Layout><PartyPage /></Layout></Protected>} />
          <Route path="/shop" element={<Protected><Layout><ShopPage /></Layout></Protected>} />
          <Route path="/tavern" element={<Protected><Layout><TavernPage /></Layout></Protected>} />
          <Route path="/tavern/:username" element={<Protected><Layout><TavernPage /></Layout></Protected>} />
          <Route path="/leaderboard" element={<Protected><Layout><LeaderboardPage /></Layout></Protected>} />
          <Route path="/users/:username" element={<ProfilePage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

const styles = {
  header: {
    background: 'var(--bg2)', borderBottom: '1px solid var(--border)',
    position: 'sticky', top: 0, zIndex: 50
  },
  headerInner: {
    maxWidth: 820, margin: '0 auto', padding: '0 16px',
    height: 58, display: 'flex', alignItems: 'center', gap: 12
  },
  cogLink: {
    color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
    padding: 6, borderRadius: 8, textDecoration: 'none', transition: 'color 0.15s',
    flexShrink: 0,
  },
  brand: { display: 'flex', alignItems: 'center', gap: 6 },
  brandIcon: { fontSize: 18 },
  brandName: { fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: 16, color: 'var(--gold)' },
  nav: { display: 'flex', gap: 2, marginLeft: 'auto' },
  navLink: {
    padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500,
    color: 'var(--text-muted)', textDecoration: 'none', transition: 'all 0.15s'
  },
  navLinkActive: { background: 'var(--bg3)', color: 'var(--text)' },
  main: { maxWidth: 820, margin: '0 auto', padding: '24px 20px' }
};

function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--border)', marginTop: 40, padding: '20px', textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20 }}>
      <a href="https://github.com/3terrabytes/tickd" target="_blank" rel="noopener noreferrer"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none' }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
        </svg>
        3terrabytes/tickd
      </a>
      <span style={{ color: 'var(--border)', fontSize: 13 }}>·</span>
      <Link to="/terms"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 13, textDecoration: 'none' }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
        Terms &amp; Conditions
      </Link>
    </footer>
  );
}
