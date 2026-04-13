import { Outlet, useNavigate } from 'react-router-dom';
import { Ticket, LogIn, LogOut, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function Layout() {
  const { user, signInWithGoogle, signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <>
      <header className="glass" style={{ position: 'sticky', top: 0, zIndex: 50 }}>
        <div className="layout-container header-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div>
              <img src="public/logo.png" alt="Logo SMKN 1 Plosoklaten" style={{ height: '40px', width: 'auto' }} />
            </div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
              Antrian Online<span className="text-gradient"> SPMB</span>
            </h2>
          </div>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {user ? (
              <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.875rem', fontWeight: 600 }}>
                  {user.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt="avatar" style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid hsla(var(--border))' }} />
                  ) : (
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'hsla(var(--primary)/0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={18} color="hsl(var(--primary))" />
                    </div>
                  )}
                  <span style={{ display: 'none' }} className="user-name-display">{user.user_metadata?.full_name || user.email}</span>
                </div>

                {user.profile?.role === 'admin' && (
                  <button onClick={() => navigate('/admin')} className="badge" style={{ cursor: 'pointer', border: '1px solid hsla(var(--primary))', background: 'hsla(var(--primary)/0.1)', color: 'hsl(var(--primary))' }}>
                    Admin Panel
                  </button>
                )}

                <button onClick={signOut} className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.875rem', borderColor: 'hsla(var(--accent)/0.5)', color: 'hsl(var(--accent))' }}>
                  <LogOut size={16} />
                  Keluar
                </button>
              </div>
            ) : (
              <button onClick={signInWithGoogle} className="btn btn-outline" style={{ padding: '0.6rem 1.25rem', fontSize: '0.875rem' }}>
                <LogIn size={18} />
                Login
              </button>
            )}
          </nav>
        </div>
      </header>
      <main className="layout-container" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>
      <footer style={{ textAlign: 'center', padding: '3rem 2rem', color: 'hsl(var(--text-muted))', fontSize: '0.875rem' }}>
        <p>&copy; {new Date().getFullYear()} IT SMKN 1 Plosoklaten.</p>
        <p style={{ marginTop: '0.5rem', opacity: 0.7 }}>Sistem Antrean Real-time</p>
      </footer>
    </>
  );
}
