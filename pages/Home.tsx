
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Briefcase, User, RefreshCw, Users, Check, X, ShieldCheck, Search, Zap, Activity, Home as HomeIcon, Eye, Shield, UserCircle, Settings } from 'lucide-react';
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

interface Props {
  profile?: UserProfile | null;
  session?: any;
  onRefresh?: () => Promise<void>;
}

const Home: React.FC<Props> = ({ profile }) => {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState<'PENDING' | 'USERS'>('PENDING');
  const [searchTerm, setSearchTerm] = useState('');
  
  const fetchAdminData = useCallback(async () => {
    if (profile?.role !== 'ADMIN') return;
    setLoadingRequests(true);
    try {
      const { data: permessi } = await supabase.from('l_permessi').select('*').order('created_at', { ascending: false });
      const { data: profili } = await supabase.from('profiles').select('*');
      
      if (profili) setAllProfiles(profili);
      
      if (permessi && profili) {
        const combined = permessi.map(p => ({
          ...p,
          profiles: profili.find(pr => pr.id === p.user_id)
        }));
        setRequests(combined as any[]);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoadingRequests(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  const handleUpdatePermission = async (id: string, newState: string, level?: AccessLevel) => {
    const update: any = { stato: newState };
    if (level) update.livello_accesso = level;
    
    const { error } = await supabase.from('l_permessi').update(update).eq('id', id);
    if (!error) fetchAdminData();
  };

  const grantAccessManually = async (userId: string, email: string, sezione: SectionType, livello: AccessLevel = 'OPERATORE') => {
    const { error } = await supabase.from('l_permessi').upsert({
      user_id: userId,
      sezione: sezione,
      stato: 'AUTORIZZATO',
      livello_accesso: livello,
      nome: 'MANUALE',
      cognome: email.split('@')[0],
      chat_username: email.split('@')[0],
      motivo: 'Abilitato dall\'amministratore'
    }, { onConflict: 'user_id,sezione' });
    
    if (!error) {
      alert(`Permesso ${sezione} concesso.`);
      fetchAdminData();
    } else {
      alert("Errore: " + error.message);
    }
  };

  const filteredRequests = requests.filter(r => 
    (activeAdminTab === 'PENDING' ? r.stato === 'RICHIESTO' : true) &&
    (r.profiles?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 overflow-x-hidden">
      <div className="bg-slate-900 pt-24 pb-32 px-6 text-center relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-slate-900 to-slate-950"></div>
        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 px-4 py-1.5 rounded-full border border-blue-500/20 text-[10px] font-black uppercase tracking-[0.2em] mb-8">
            <HomeIcon size={12} /> ANDREA PORTAL v3.5
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-9xl font-black uppercase tracking-tighter italic mb-4 leading-none text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500">
            CONTROLLO <span className="text-blue-500">ACCESSI</span>
          </h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-xs">Gestione Sicurezza e Privilegi</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-16 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          <Link to="/pallamano" className="group relative bg-slate-900/80 backdrop-blur-xl rounded-[3rem] p-10 border border-white/5 shadow-2xl transition-all hover:scale-[1.02]">
             <Trophy size={40} className="text-slate-500 mb-6 group-hover:text-blue-500 transition-colors" />
             <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">PALLAMANO</h2>
             <p className="text-slate-500 text-xs font-bold uppercase mt-2">Accesso Pubblico</p>
          </Link>
          <Link to="/lavoro" className="group relative bg-slate-900/80 backdrop-blur-xl rounded-[3rem] p-10 border border-white/5 shadow-2xl transition-all hover:scale-[1.02]">
             <Briefcase size={40} className="text-slate-500 mb-6 group-hover:text-amber-500 transition-colors" />
             <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">LAVORO</h2>
             <p className="text-slate-500 text-xs font-bold uppercase mt-2">Permessi Granulari</p>
          </Link>
          <Link to="/personale" className="group relative bg-slate-900/80 backdrop-blur-xl rounded-[3rem] p-10 border border-white/5 shadow-2xl transition-all hover:scale-[1.02]">
             <User size={40} className="text-slate-500 mb-6 group-hover:text-emerald-500 transition-colors" />
             <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">PERSONALE</h2>
             <p className="text-slate-500 text-xs font-bold uppercase mt-2">Accesso Riservato</p>
          </Link>
        </div>

        {profile?.role === 'ADMIN' && (
          <div className="bg-slate-900/40 rounded-[3rem] border border-white/5 p-8 md:p-12 shadow-2xl">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
              <div className="flex gap-4">
                <button onClick={() => setActiveAdminTab('PENDING')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeAdminTab === 'PENDING' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'}`}>Pendenti</button>
                <button onClick={() => setActiveAdminTab('USERS')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeAdminTab === 'USERS' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'}`}>Tutti gli Utenti</button>
              </div>
              <div className="relative w-full md:w-64">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="text" placeholder="Cerca..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-12 pr-4 py-3 bg-slate-950/50 border border-white/5 rounded-2xl text-[11px] font-bold w-full outline-none text-white" />
              </div>
            </div>

            {activeAdminTab === 'PENDING' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredRequests.map(req => (
                  <div key={req.id} className="bg-slate-950/50 border border-white/5 rounded-[2.5rem] p-8 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between mb-4">
                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">{req.sezione.replace('LAVORO_', '')}</span>
                        <div className="flex items-center gap-2">
                           {req.livello_accesso === 'OPERATORE' ? <ShieldCheck size={14} className="text-emerald-500" /> : <Eye size={14} className="text-blue-500" />}
                           <span className="text-[9px] font-black uppercase text-slate-400">{req.livello_accesso}</span>
                        </div>
                      </div>
                      <h4 className="text-xl font-black text-white italic uppercase">{req.nome} {req.cognome}</h4>
                      <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase leading-relaxed">"{req.motivo}"</p>
                    </div>
                    <div className="flex gap-2 mt-8">
                      <button onClick={() => handleUpdatePermission(req.id, 'AUTORIZZATO')} className="flex-1 py-4 bg-emerald-600 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">Approva</button>
                      <button onClick={() => handleUpdatePermission(req.id, 'NEGATO')} className="flex-1 py-4 bg-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">Rifiuta</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allProfiles.filter(p => p.username.toLowerCase().includes(searchTerm.toLowerCase()) || p.email.toLowerCase().includes(searchTerm.toLowerCase())).map(u => (
                  <div key={u.id} className="bg-slate-950/50 border border-white/5 rounded-[2rem] p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <UserCircle size={32} className="text-slate-700" />
                      <div>
                        <h4 className="font-black text-white uppercase italic text-xs">{u.username}</h4>
                        <p className="text-[9px] text-slate-500 font-bold">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => grantAccessManually(u.id, u.email, 'PERSONALE')} className="p-3 bg-emerald-600/20 text-emerald-500 rounded-xl hover:bg-emerald-600 hover:text-white transition-all" title="Abilita Personale"><User size={14}/></button>
                       <button onClick={() => grantAccessManually(u.id, u.email, 'LAVORO_PRODUZIONE', 'OPERATORE')} className="p-3 bg-blue-600/20 text-blue-500 rounded-xl hover:bg-blue-600 hover:text-white transition-all" title="Abilita Produzione (Full)"><Settings size={14}/></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
