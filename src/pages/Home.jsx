import { ArrowRight, CalendarDays, Clock, QrCode } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function Home() {
  const { signInWithGoogle } = useAuth();

  return (
    <div className="animate-slide-up" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginTop: '4rem', gap: '2rem'
    }}>
      <div className="badge animate-float">Sistem Antrean Offline SPMB 2026</div>

      <h1 style={{ fontSize: '4rem', maxWidth: '900px', lineHeight: 1.1, letterSpacing: '-0.03em' }}>
        Antrian Pengambilan PIN SPMB <br />
        <span className="text-gradient">SMKN 1 PLOSOKLATEN</span>
      </h1>

      <p style={{ color: 'hsl(var(--text-muted))', fontSize: '1.25rem', maxWidth: '650px', marginTop: '1rem' }}>
        Pengambilan Tiket Antrian secara Online untuk pelayanan pengambilan PIN di SMKN 1 Plosoklaten
      </p>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', justifyContent: 'center' }}>
        <button onClick={signInWithGoogle} className="btn btn-primary" style={{ fontSize: '1.125rem', padding: '1rem 2rem' }}>
          Ambil Antrean
          <ArrowRight size={20} />
        </button>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', width: '100%', marginTop: '6rem'
      }}>
        <FeatureCard
          icon={<CalendarDays size={36} color="hsl(var(--primary))" />}
          title="Pilih Hari Pengambilan PIN"
          desc="Anda bebas menentukan hari kedatangan selama kuota batas 07:00 – 15:00 belum penuh."
        />
        <FeatureCard
          icon={<Clock size={36} color="hsl(var(--primary))" />}
          title="Live Monitor"
          desc="Sistem terhubung real-time. Hitung estimasi waktu tempuh Anda dengan memantau pergerakan antrean loket."
        />
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1.5rem' }}>
      <div style={{
        background: 'hsla(var(--primary)/0.1)',
        padding: '1.25rem',
        borderRadius: 'var(--radius-xl)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: 'inset 0 0 20px hsla(var(--primary)/0.05)'
      }}>
        {icon}
      </div>
      <h3 style={{ margin: 0, fontSize: '1.5rem' }}>{title}</h3>
      <p style={{ color: 'hsl(var(--text-muted))', margin: 0, fontSize: '1.05rem', lineHeight: 1.6 }}>{desc}</p>
    </div>
  );
}
