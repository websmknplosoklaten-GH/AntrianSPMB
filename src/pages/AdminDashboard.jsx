import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { Scanner } from '@yudiel/react-qr-scanner';

export function AdminDashboard() {
  const { user } = useAuth();
  const isAdmin = user?.profile?.role === 'admin';
  const [activeTab, setActiveTab] = useState('LOKET');

  if (!isAdmin) {
    return (
      <div style={{ textAlign: 'center', marginTop: '5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h1 style={{ color: 'hsl(var(--accent))', fontSize: '2.5rem' }}>Akses Ditolak</h1>
        <p style={{ color: 'hsl(var(--text-muted))', fontSize: '1.125rem' }}>
          Halaman ini eksklusif untuk otorisasi kepanitiaan SPMB (Role: Admin).
        </p>
      </div>
    );
  }

  return (
    <div className="animate-slide-up" style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid hsla(var(--border))', paddingBottom: '1rem' }}>
        <button 
          className={activeTab === 'LOKET' ? 'btn btn-primary' : 'btn btn-outline'} 
          onClick={() => setActiveTab('LOKET')}
          style={{ padding: '0.75rem 2rem' }}
        >
           Loket Pelayanan & Scanner
        </button>
        <button 
          className={activeTab === 'JADWAL' ? 'btn btn-primary' : 'btn btn-outline'} 
          onClick={() => setActiveTab('JADWAL')}
          style={{ padding: '0.75rem 2rem' }}
        >
           Manajemen Kuota Jadwal
        </button>
      </div>

      {activeTab === 'LOKET' ? <AdminLoket /> : <AdminJadwal />}
    </div>
  );
}

function AdminLoket() {
  const [loketNo, setLoketNo] = useState(1);
  const [activeScheduleId, setActiveScheduleId] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentTicket, setCurrentTicket] = useState(null);
  const [manualTicketId, setManualTicketId] = useState('');
  
  useEffect(() => {
    supabase.from('daily_schedules').select('*').eq('is_active', true)
      .eq('queue_date', new Date().toISOString().split('T')[0])
      .then(({data}) => {
         if(data && data.length > 0) setActiveScheduleId(data[0].id);
      });
  }, []);

  const handleCallNext = async () => {
    if (!activeScheduleId) return alert('Tidak ada jadwal aktif untuk hari ini.');
    setLoading(true);
    
    // Cari status waiting dengan nomor paling kecil (paling awal datang)
    const { data: tickets } = await supabase.from('tickets')
      .select('*, profiles(full_name)')
      .eq('schedule_id', activeScheduleId)
      .eq('status', 'waiting')
      .order('queue_number', { ascending: true })
      .limit(1);

    if (tickets && tickets.length > 0) {
      const t = tickets[0];
      const { data: updated } = await supabase.from('tickets')
        .update({ status: 'called', called_at: new Date().toISOString() })
        .eq('id', t.id).eq('status', 'waiting')
        .select();

      if (updated && updated.length > 0) {
        await supabase.from('live_counters').update({ current_ticket_id: t.id, updated_at: new Date().toISOString() }).eq('counter_no', loketNo);
        setCurrentTicket({ ...t, full_name: t.profiles?.full_name });
      } else {
        alert('Gagal mengambil tiket, ada kemungkinan loket lain memanggilnya secara bersamaan.');
      }
    } else {
      alert('TIDAK ADA ANTREAN MENUNGGU SAAT INI');
    }
    setLoading(false);
  };

  const handleVerifikasi = async (ticketIdToVerify) => {
    const rawId = ticketIdToVerify?.[0]?.rawValue || ticketIdToVerify;
    if (!rawId) return;
    setLoading(true);
    const { data } = await supabase.from('tickets').update({ status: 'completed' })
        .eq('id', rawId).in('status', ['called', 'waiting'])
        .select().maybeSingle();
    
    if (data) {
      alert(`[SUKSES BERHASIL]\nTiket Nomor: ${data.queue_number}\nStatus diselesaikan!`);
      if (currentTicket?.id === data.id) setCurrentTicket(null);
      setManualTicketId('');
    } else {
      alert('Tiket Tidak Valid / Sudah Kadaluarsa / Sudah Diproses Sebelumnya.');
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <h2>Tugas Pemanggilan</h2>
        
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Posisi Loket Anda:</label>
          <select value={loketNo} onChange={(e) => setLoketNo(Number(e.target.value))} style={{ padding: '0.75rem', width: '100%', borderRadius: 'var(--radius-sm)', border: '1px solid hsla(var(--border))' }}>
             <option value={1}>LOKET 1</option>
             <option value={2}>LOKET 2</option>
             <option value={3}>LOKET 3</option>
             <option value={4}>LOKET 4</option>
             <option value={5}>LOKET 5</option>
          </select>
        </div>
        
        {currentTicket ? (
          <div style={{ background: 'hsla(var(--primary)/0.1)', padding: '2rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
            <p style={{ color: 'hsl(var(--text-muted))', fontWeight: 600 }}>Sedang Berlangsung:</p>
            <h1 style={{ color: 'hsl(var(--primary))', fontSize: '4.5rem', lineHeight: 1, margin: '1rem 0' }}>{currentTicket.queue_number}</h1>
            <p style={{ fontSize: '1.125rem', fontWeight: 600 }}>{currentTicket.full_name}</p>
          </div>
        ) : (
           <div style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--text-muted))' }}>
             Belum ada yang dipanggil.
           </div>
        )}

        <button onClick={handleCallNext} disabled={loading} className="btn btn-primary" style={{ padding: '1.25rem', fontSize: '1.125rem', background: 'hsl(var(--accent))', fontWeight: 700 }}>
           PANGGIL ANTRIAN SELANJUTNYA
        </button>
      </div>

      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <h2>Verifikasi Tiket Kedatangan</h2>
        
        <div style={{ height: '300px', background: '#0a0a0a', borderRadius: 'var(--radius-md)', overflow: 'hidden', position: 'relative' }}>
          <Scanner 
             onScan={(result) => handleVerifikasi(result)} 
             onError={(error) => console.log('Scan error:', error)}
             components={{ audio: false, finder: true }}
          />
        </div>
        <p style={{ fontSize: '0.875rem', color: 'hsl(var(--text-muted))', textAlign: 'center' }}>
           Arahkan kamera ke QR Code yang ada di smartphone peserta.
        </p>

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <input 
             type="text" 
             placeholder="Atau masukkan manual UUID..." 
             value={manualTicketId}
             onChange={(e) => setManualTicketId(e.target.value)}
             style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid hsla(var(--border))' }}
          />
          <button onClick={() => handleVerifikasi(manualTicketId)} className="btn btn-outline" disabled={loading}>Validasi</button>
        </div>
      </div>
    </div>
  );
}

function AdminJadwal() {
  const [schedules, setSchedules] = useState([]);
  
  // Create form states
  const [name, setName] = useState('Pengambilan PIN Gelombang 1');
  const [date, setDate] = useState('');
  const [quota, setQuota] = useState(100);

  // Edit states
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: '', quota: 100 });

  useEffect(() => { loadSchedules() }, []);

  const loadSchedules = async () => {
    const { data } = await supabase.from('daily_schedules').select('*').order('queue_date', { ascending: false }).limit(20);
    if(data) setSchedules(data);
  }

  const handleBuatJadwal = async () => {
    if(!date || !name) return alert('Tanggal dan Nama Jadwal wajib diisi');
    const { error } = await supabase.from('daily_schedules').insert([
       { schedule_name: name, queue_date: date, start_time: '07:00:00', end_time: '15:00:00', max_quota: quota }
    ]);
    if(error) alert('Gagal: ' + error.message);
    else { alert('Jadwal Berhasil Ditambahkan!'); loadSchedules(); setDate(''); }
  };

  const handleToggleState = async (id, currentState) => {
    await supabase.from('daily_schedules').update({ is_active: !currentState }).eq('id', id);
    loadSchedules();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Tindakan ini permanen!\nAnda yakin ingin menghapus jadwal ini? (Jadwal yang sudah memiliki pendaftar tiket tidak akan bisa Anda hapus secara sepihak).")) return;
    const { error } = await supabase.from('daily_schedules').delete().eq('id', id);
    if (error) {
       alert("Gagal menghapus! Kemungkinan sudah ada siswa yang memegang tiket untuk jadwal ini.\nSilakan tutup status pendafarannya saja.");
    } else {
       loadSchedules();
    }
  };

  const startEdit = (sch) => {
    setEditingId(sch.id);
    setEditFormData({ name: sch.schedule_name, quota: sch.max_quota });
  };

  const handleSaveEdit = async (id) => {
    if(!editFormData.name) return alert('Nama label tidak boleh kosong');
    const { error } = await supabase.from('daily_schedules')
       .update({ schedule_name: editFormData.name, max_quota: editFormData.quota })
       .eq('id', id);
    
    if(error) {
       alert("Gagal mengupdate: " + error.message);
    } else {
       setEditingId(null);
       loadSchedules();
    }
  };

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <h2 style={{ fontSize: '1.75rem' }}>Manajemen Kuota Jadwal</h2>
      
      <div style={{ background: 'hsla(var(--primary)/0.05)', padding: '1.5rem', borderRadius: 'var(--radius-md)', display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: 1.5, minWidth: '250px' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Nama Jadwal / Gelombang</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid hsla(var(--border))' }} placeholder="Misal: Pengambilan PIN Jalur Zonasi" />
        </div>
        <div style={{ flex: 1, minWidth: '150px' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Tanggal Buka</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid hsla(var(--border))' }} />
        </div>
        <div style={{ flex: 1, minWidth: '100px' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Batas Kuota</label>
          <input type="number" value={quota} onChange={(e) => setQuota(Number(e.target.value))} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid hsla(var(--border))' }} />
        </div>
        <button onClick={handleBuatJadwal} className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>
           Buka Layanan Baru
        </button>
      </div>

      <div style={{ marginTop: '1rem', overflowX: 'auto' }}>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid hsla(var(--border))' }}>
              <th style={{ padding: '1rem 0' }}>Label Jadwal</th>
              <th>Tanggal Slot</th>
              <th>Total Kuota</th>
              <th>Status Akses</th>
              <th>Manajemen</th>
            </tr>
          </thead>
          <tbody>
            {schedules.map(sch => {
              const isEditing = editingId === sch.id;

              return (
              <tr key={sch.id} style={{ borderBottom: '1px solid hsla(var(--border))' }}>
                
                {/* LABEL */}
                <td style={{ padding: '1rem 0', fontWeight: 600 }}>
                  {isEditing ? (
                    <input type="text" style={{ padding:'0.5rem', border:'1px solid #ccc', borderRadius:'4px' }}
                           value={editFormData.name} onChange={(e)=>setEditFormData({...editFormData, name: e.target.value})} />
                  ) : (
                    <span>{sch.schedule_name || '-'}</span>
                  )}
                </td>
                
                {/* TANGGAL */}
                <td>{format(parseISO(sch.queue_date), 'dd MMM yyyy', {locale: id})}</td>
                
                {/* KUOTA */}
                <td>
                  {isEditing ? (
                     <input type="number" style={{ padding:'0.5rem', width: '80px', border:'1px solid #ccc', borderRadius:'4px' }}
                           value={editFormData.quota} onChange={(e)=>setEditFormData({...editFormData, quota: Number(e.target.value)})} />
                  ) : (
                     <span className="badge">{sch.max_quota} Siswa</span>
                  )}
                </td>
                
                {/* STATUS PINTU */}
                <td>
                   {!isEditing && (
                     <span style={{ color: sch.is_active ? 'hsl(var(--primary))' : 'hsl(var(--accent))', fontWeight: 600 }}>
                       {sch.is_active ? '✅ Dibuka' : '❌ Ditutup'}
                     </span>
                   )}
                </td>
                
                {/* AKSI */}
                <td style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', margin: '0.5rem 0' }}>
                   {isEditing ? (
                     <>
                        <button onClick={() => handleSaveEdit(sch.id)} className="btn btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>Simpan</button>
                        <button onClick={() => setEditingId(null)} className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>Batal</button>
                     </>
                   ) : (
                     <>
                        <button onClick={() => handleToggleState(sch.id, sch.is_active)} className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>
                          {sch.is_active ? 'Tutup Pendaftaran' : 'Buka Pendaftaran'}
                        </button>
                        <button onClick={() => startEdit(sch)} className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>Edit</button>
                        <button onClick={() => handleDelete(sch.id)} className="btn" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', background: 'transparent', color: 'hsl(var(--accent))' }}>Hapus</button>
                     </>
                   )}
                </td>
              </tr>
            )})}
            {schedules.length === 0 && (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'hsl(var(--text-muted))' }}>Data jadwal belum ada.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
