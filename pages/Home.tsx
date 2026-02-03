
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Briefcase, User, RefreshCw, ShieldCheck, Search, Home as HomeIcon, Eye, UserCircle, Settings, Inbox } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { UserProfile, AccessLevel, SectionType } from '../types';

interface PendingRequest {
  id: string;
  sezione: SectionType;
  stato: string;
  livello_accesso: AccessLevel;
  user_id: string;
  created_at: string;
  nome?: string;
  cognome?: string;
  motivo?: string;
  profiles?: {
    username: string;
    email: string;
  };
}

const Home: React.FC<{ profile?: UserProfile | null }> = ({ profile }) => {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [activeAdminTab, setActiveAdminTab] = useState<'PENDING' | 'USERS'>('PENDING');
  const [searchTerm, setSearchTerm] = useState('');
  
  const fetchAdminData = useCallback(async () => {
    if (profile?.role !== 'ADMIN') return;
    try {
      const { data: permessi } = await supabase.from('l_permessi').select('*').order('created_at', { ascending: false });
      const { data: profili } = await supabase.from('profiles').select('*').order('username');
      if (profili) setAllProfiles(profili as UserProfile[]);
      if (permessi && profili) {
        const combined = permessi.map(p => ({ ...p, profiles: profili.find(pr => pr.id === p.user_id) }));
        setRequests(combined as any[]);
      }
    } catch (e: any) { console.error(e); }
  }, [profile]);

  useEffect(() => { fetchAdminData(); }, [fetchAdminData]);

  const handleUpdatePermission = async (id: string, newState: string) => {
    await supabase.from('l_permessi').update({ stato: newState }).eq('id', id);
    fetchAdminData();
  };

  const grantManualAccess = async (userId: string, sezione: SectionType, level: AccessLevel = 'OPERATORE') => {
    await supabase.from('l_permessi').upsert({
      user_id: userId, sezione, stato: 'AUTORIZZATO', livello_accesso: level,
      nome: 'ADMIN', cognome: 'GRANT', chat_username: 'ADMIN', motivo: 'Abilitato manualmente'
    }, { onConflict: 'user_id,sezione' });
    alert("Abilitazione concessa.");
    fetchAdminData();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      <div className="bg-slate-900 pt-24 pb-32 px-6 text-center relative overflow-hidden">
        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 px-4 py-1.5 rounded-full border border-blue-500/20 text-[10px] font-black uppercase tracking-[0.2em] mb-8 italic">
            <HomeIcon size={12} /> Andrea Portal v4.0
          </div>
          <h1 className="text-4xl md:text-8xl font-black uppercase tracking-tighter italic mb-4 text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500">
            DASHBOARD <span className="text-blue-500">ADMIN</span>
          </h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-16 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          <Link to="/pallamano" className="bg-slate-900 rounded-[3rem] p-10 border border-white/5 shadow-2xl hover:-translate-y-1 transition-all">
             <Trophy size={40} className="text-blue-500 mb-6" />
             <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">PALLAMANO</h2>
          </Link>
          <Link to="/lavoro" className="bg-slate-900 rounded-[3rem] p-10 border border-white/5 shadow-2xl hover:-translate-y-1 transition-all">
             <Briefcase size={40} className="text-[#e67e22] mb-6" />
             <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">LAVORO</h2>
          </Link>
          <Link to="/personale" className="bg-slate-900 rounded-[3rem] p-10 border border-white/5 shadow-2xl hover:-translate-y-1 transition-all">
             <User size={40} className="text-emerald-500 mb-6" />
             <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">PERSONALE</h2>
          </Link>
        </div>

        {profile?.role === 'ADMIN' && (
          <div className="bg-slate-900/40 rounded-[3rem] border border-white/5 p-12 shadow-2xl">
            <div className="flex justify-between items-center mb-12">
              <div className="flex gap-2">
                <button onClick={() => setActiveAdminTab('PENDING')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest ${activeAdminTab === 'PENDING' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Richieste</button>
                <button onClick={() => setActiveAdminTab('USERS')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest ${activeAdminTab === 'USERS' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Utenti</button>
              </div>
              <div className="relative w-64">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="text" placeholder="Cerca..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-12 pr-4 py-3 bg-slate-950 border border-white/5 rounded-2xl text-xs w-full text-white" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeAdminTab === 'PENDING' ? (
                requests.filter(r => r.stato === 'RICHIESTO').map(req => (
                  <div key={req.id} className="bg-slate-950 p-8 rounded-[2.5rem] border border-white/5 group hover:border-blue-500/30 transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest italic">{req.sezione.replace('LAVORO_', '')}</span>
                      <span className="text-[9px] font-black uppercase text-slate-500">{req.livello_accesso}</span>
                    </div>
                    <h4 className="text-2xl font-black text-white italic uppercase">{req.nome} {req.cognome}</h4>
                    <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase italic italic">"{req.motivo}"</p>
                    <div className="flex gap-2 mt-8">
                      <button onClick={() => handleUpdatePermission(req.id, 'AUTORIZZATO')} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase active:scale-95 transition-all">Approva</button>
                      <button onClick={() => handleUpdatePermission(req.id, 'NEGATO')} className="flex-1 py-4 bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase active:scale-95 transition-all">Rifiuta</button>
                    </div>
                  </div>
                ))
              ) : (
                allProfiles.map(u => (
                  <div key={u.id} className="bg-slate-950 p-6 rounded-[2rem] flex flex-col gap-4 border border-white/5">
                    <div className="flex items-center gap-4">
                      <UserCircle size={32} className="text-slate-500" />
                      <div><h4 className="font-black text-white uppercase italic text-xs">{u.username}</h4><p className="text-[9px] text-slate-500">{u.email}</p></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                       <button onClick={() => grantManualAccess(u.id, 'PERSONALE')} className="py-3 bg-emerald-600/10 text-emerald-500 rounded-xl text-[9px] font-black uppercase italic border border-emerald-500/20">Abilita Personale</button>
                       <button onClick={() => grantManualAccess(u.id, 'LAVORO_PRODUZIONE')} className="py-3 bg-blue-600/10 text-blue-500 rounded-xl text-[9px] font-black uppercase italic border border-blue-500/20">Abilita Produzione</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
