import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { CheckCircle2, Navigation, AlertCircle, Clock } from 'lucide-react';

export function UserDashboard() {
  const { user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveCounters, setLiveCounters] = useState({});

  useEffect(() => {
    if (!user) return;
    loadData();

    // Subscribe to realtime counters changes
    const channel = supabase.channel('realtime_live_counters')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_counters' },
        (_payload) => {
          loadCounters();
          // Optionally reload ticket if we want to live-update status to "called" when it matches
          loadTicket();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    await loadTicket();
    await loadSchedules();
    await loadCounters();
    setLoading(false);
  };

  const loadTicket = async () => {
    const { data } = await supabase
      .from('tickets')
      .select('*, daily_schedules(*)')
      .eq('user_id', user.id)
      .in('status', ['waiting', 'called'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    setTicket(data);
  };

  const loadSchedules = async () => {
    // Hanya load jika belum / tidak ada tiket aktif
    const { data } = await supabase
      .from('daily_schedules')
      .select('*')
      .eq('is_active', true)
      .gte('queue_date', new Date().toISOString().split('T')[0])
      .order('queue_date', { ascending: true });

    if (data) setSchedules(data);
  };

  const loadCounters = async () => {
    const { data } = await supabase
      .from('live_counters')
      .select('*, tickets(queue_number)');

    const cMap = {};
    if (data) {
      data.forEach(c => {
        cMap[c.counter_no] = c.tickets?.queue_number || '-';
      });
    }
    setLiveCounters(cMap);
  };

  const handleAmbilAntrean = async (scheduleId) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('take_ticket', { p_schedule_id: scheduleId });

      if (error) throw error;

      if (data && data.success) {
        alert(`Berhasil! Nomor antrean Anda: ${data.queue_number}`);
        loadData(); // reload
      }
    } catch (err) {
      alert(err.message || 'Terjadi kesalahan saat mengambil antrean.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
        <p style={{ fontSize: '1.25rem', color: 'hsl(var(--text-muted))' }}>Memuat sistem antrean...</p>
      </div>
    );
  }

  return (
    <div className="animate-slide-up" style={{ marginTop: '2rem' }}>
      {ticket ? (
        <TicketView ticket={ticket} liveCounters={liveCounters} user={user} />
      ) : (
        <ScheduleSelection schedules={schedules} onSelect={handleAmbilAntrean} />
      )}
    </div>
  );
}

function TicketView({ ticket, liveCounters, user }) {
  if (!ticket) return null;
  const scheduleDate = ticket.daily_schedules?.queue_date
    ? parseISO(ticket.daily_schedules.queue_date)
    : new Date();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '3rem 2rem' }}>
        <div className="badge" style={{ marginBottom: '1rem', background: 'hsla(var(--secondary)/0.1)', color: 'hsl(var(--secondary))' }}>
          <CheckCircle2 size={16} style={{ marginRight: '0.4rem' }} /> Tiket Aktif
        </div>

        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'hsl(var(--text-muted))' }}>
          Jadwal Kedatangan Anda
        </h2>

        <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem' }} className="text-gradient">
          {format(scheduleDate, 'EEEE, dd MMMM yyyy', { locale: id })}
        </h1>

        <div style={{
          background: 'white',
          padding: '1.5rem',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-md)',
          marginBottom: '2rem'
        }}>
          <QRCodeSVG value={ticket.id} size={200} level="H" />
        </div>

        <p style={{ fontFamily: 'monospace', color: 'hsl(var(--text-muted))', fontSize: '0.9rem', marginBottom: '2rem' }}>
          ID: {ticket.id}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', color: 'hsl(var(--text-muted))' }}>Nomor Urut Antrian</h3>
          <div style={{
            fontSize: '5rem', fontWeight: 800, color: 'hsl(var(--primary))', lineHeight: 1
          }}>
            {ticket.queue_number}
          </div>
        </div>

        {ticket.status === 'called' && (
          <div style={{ marginTop: '2rem', padding: '1rem 2rem', background: 'hsl(var(--accent))', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: 600, animation: 'pulse-glow 2s infinite' }}>
            SEKARANG GILIRAN ANDA! SILAKAN MENUJU LOKET.
          </div>
        )}
      </div>

      <div style={{ marginTop: '2rem' }}>
        <h3 style={{ borderBottom: '1px solid hsla(var(--border))', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          Live Monitor Antrean Saat Ini
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
          {Object.keys(liveCounters).map((loket_no) => (
            <div key={loket_no} className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
              <p style={{ color: 'hsl(var(--text-muted))', fontWeight: 600, marginBottom: '0.5rem' }}>LOKET {loket_no}</p>
              <div style={{ fontSize: '3rem', fontWeight: 800, color: 'hsl(var(--text-main))' }}>
                {liveCounters[loket_no]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScheduleSelection({ schedules, onSelect }) {
  if (schedules.length === 0) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <AlertCircle size={48} color="hsl(var(--accent))" style={{ margin: '0 auto 1.5rem auto' }} />
        <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Belum Ada Jadwal</h2>
        <p style={{ color: 'hsl(var(--text-muted))', fontSize: '1.125rem' }}>
          Panitia sekolah belum membuka slot penjadwalan antrean untuk saat ini.<br />Silakan kembali lagi nanti.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Pilih <span className="text-gradient">Hari Kedatangan</span></h2>
        <p style={{ color: 'hsl(var(--text-muted))', fontSize: '1.125rem' }}>
          Sistem hanya melayani kedatangan sesuai kuota antrean yang Anda jadwalkan.<br /> Pelayanan dibuka 07:00 - 15:00 WIB.
        </p>
      </div>

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {schedules.map((sch) => {
          if (!sch || !sch.queue_date) return null;
          const dDate = parseISO(sch.queue_date);
          return (
            <div key={sch.id} className="glass-card" style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '2rem', transition: 'box-shadow 0.2s',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <h3 style={{ fontSize: '1.5rem', margin: 0, color: 'hsl(var(--primary))' }}>
                  {sch.schedule_name || 'Pembukaan Antrean'}
                </h3>
                <h4 style={{ fontSize: '1.25rem', margin: '0.5rem 0' }}>
                  {format(dDate, 'EEEE, dd MMMM yyyy', { locale: id })}
                </h4>
                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', color: 'hsl(var(--text-muted))' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem' }}>
                    <Clock size={16} /> 07:00 - 15:00
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem' }}>
                    <Navigation size={16} /> Kuota: {sch.max_quota} Siswa
                  </span>
                </div>
              </div>

              <button
                onClick={() => onSelect(sch.id)}
                className="btn btn-primary"
              >
                Ambil Antrean
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
