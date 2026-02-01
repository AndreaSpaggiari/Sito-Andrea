
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Briefcase, User, RefreshCw, Users, Check, X, ShieldCheck, AlertTriangle, Search, MailQuestion, Zap, ChevronRight, Activity, Home as HomeIcon, Lock, Globe } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { UserProfile } from '../types';

interface PendingRequest {
  id: string;
  sezione: string;
  stato: string;
  user_id: string;
  created_at: string;
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

const Home: React.FC<Props> = ({ profile, session, onRefresh }) => {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const fetchRequests = useCallback(async () => {
    if (profile?.role !== 'ADMIN') return;
    setLoadingRequests(true);
    try {
      let query = supabase.from('l_permessi').select('*');
      if (!showAll) query = query.eq('stato', 'RICHIESTO');
      const { data: permessi, error: permError } = await query.order('created_at', { ascending: false });
      if (permError) throw permError;
      if (permessi && permessi.length > 0) {
        const userIds = [...new Set(permessi.map(p => p.user_id))];
        const { data: profili } = await supabase.from('profiles').select('id, username, email').in('id', userIds);
        const combined = permessi.map(p => ({
          ...p,
          profiles: profili?.find(pr => pr.id === p.user_id)
        }));
        setRequests(combined as any[]);
      } else {
        setRequests([]);
      }
    } catch (e: any) {
      setDebugInfo(e.message);
    } finally {
      setLoadingRequests(false);
    }
  }, [profile, showAll]);

  useEffect(() => {
    if (profile?.role !== 'ADMIN') return;
    fetchRequests();
  }, [profile, fetchRequests]);

  const handleUpdatePermission = async (id: string, newState: 'AUTORIZZATO' | 'NEGATO') => {
    const { error } = await supabase.from('l_permessi').update({ stato: newState }).eq('id', id);
    if (!error) fetchRequests();
  };

  const filteredRequests = requests.filter(r => 
    r.profiles?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.sezione.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isGuest = !session;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 overflow-x-hidden">
      {/* Hero Section */}
      <div className="bg-slate-900 pt-24 pb-32 px-6 text-center relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-slate-900 to-slate-950"></div>
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 px-4 py-1.5 rounded-full border border-blue-500/20 text-[10px] font-black uppercase tracking-[0.2em] mb-8 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
            <HomeIcon size={12} /> Andrea v3.0
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-7xl lg:text-9xl font-black uppercase tracking-tighter italic mb-4 leading-none text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500 whitespace-nowrap">
            ANDREA <span className="text-blue-500">SPAGGIARI</span>
          </h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[10px] sm:text-xs">Sito personale - In continuo aggiornamento</p>
          
          {isGuest && (
            <div className="mt-12 max-w-lg mx-auto bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Benvenuto Visitatore</p>
              <p className="text-slate-300 text-xs font-medium leading-relaxed uppercase">
                Puoi consultare liberamente la sezione <span className="text-white font-black underline decoration-blue-500 underline-offset-4">Pallamano</span>. 
                Le aree professionali e private sono protette da sistemi di sicurezza crittografati.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-16 relative z-20">
        {/* Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          {[
            { to: "/pallamano", color: "blue", icon: Trophy, label: "PALLAMANO", desc: "Classifiche & Rosa U14M", num: "01", public: true },
            { to: "/lavoro", color: "amber", icon: Briefcase, label: "LAVORO", desc: "KME Hub & Produzione", num: "02", public: false },
            { to: "/personale", color: "emerald", icon: User, label: "PERSONALE", desc: "Archivio Appunti Privati", num: "03", public: false }
          ].map((item, i) => (
            <Link key={i} to={item.to} className="group relative bg-slate-900/80 backdrop-blur-xl rounded-[3rem] p-10 border border-white/5 shadow-2xl transition-all duration-500 hover:scale-[1.02] hover:bg-slate-800 overflow-hidden">
              {/* Badge Pubblico/Privato */}
              <div className="absolute top-8 left-10 z-30">
                {item.public ? (
                  <div className="flex items-center gap-1.5 bg-blue-500/20 text-blue-400 px-2.5 py-1 rounded-lg border border-blue-500/30 text-[8px] font-black uppercase tracking-widest shadow-lg">
                    <Globe size={10} /> Free Access
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 bg-slate-800 text-slate-400 px-2.5 py-1 rounded-lg border border-white/5 text-[8px] font-black uppercase tracking-widest">
                    <Lock size={10} /> Private Area
                  </div>
                )}
              </div>

              <div className="absolute top-6 right-10 text-7xl font-black text-white/[0.03] group-hover:text-white/[0.07] transition-colors">{item.num}</div>
              <div className={`w-16 h-16 bg-slate-800 rounded-[1.5rem] flex items-center justify-center mb-8 shadow-inner group-hover:bg-${item.color}-600 transition-all mt-6`}>
                <item.icon size={28} className={`text-slate-400 group-hover:text-white transition-colors`} />
              </div>
              <h2 className="text-3xl font-black text-white mb-2 uppercase italic tracking-tighter leading-none">{item.label}</h2>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">{item.desc}</p>
              
              <div className="mt-8 flex items-center gap-2 text-slate-500 group-hover:text-white transition-colors">
                <span className="text-[10px] font-black uppercase tracking-widest">Esplora</span>
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>

              <div className={`absolute bottom-0 left-0 h-1 bg-${item.color}-500 w-full opacity-0 group-hover:opacity-100 transition-opacity duration-700`}></div>
            </Link>
          ))}
        </div>

        {/* Admin Console */}
        {profile?.role === 'ADMIN' && (
          <div className="bg-slate-900/40 backdrop-blur-sm rounded-[3rem] border border-white/5 p-8 md:p-12 shadow-2xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
              <div>
                <h3 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none">Console <span className="text-blue-500">Admin</span></h3>
                <div className="flex gap-4 mt-6">
                  <button onClick={() => setShowAll(false)} className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${!showAll ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-800 text-slate-500 hover:text-slate-300'}`}>
                    Richieste Pendenti
                  </button>
                  <button onClick={() => setShowAll(true)} className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${showAll ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-500 hover:text-slate-300'}`}>
                    Tutti i Permessi
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:flex-none">
                  <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input type="text" placeholder="Cerca Utente..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-12 pr-4 py-3 bg-slate-950/50 border border-white/5 rounded-2xl text-[11px] font-bold outline-none w-full md:w-64 focus:border-blue-500/50 transition-all text-white" />
                </div>
                <button onClick={fetchRequests} className="p-3.5 bg-slate-800 text-slate-400 hover:text-blue-500 rounded-2xl transition-all active:scale-90 border border-white/5">
                  <RefreshCw size={16} className={loadingRequests ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRequests.map((req) => (
                <div key={req.id} className="bg-slate-950/50 border border-white/5 rounded-[2.5rem] p-8 transition-all hover:bg-slate-900 group">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500 group-hover:text-blue-400 transition-colors">
                      <Users size={24} />
                    </div>
                    <span className={`text-[8px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest ${
                      req.stato === 'RICHIESTO' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 
                      req.stato === 'AUTORIZZATO' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                    }`}>
                      {req.stato}
                    </span>
                  </div>
                  
                  <div className="mb-8">
                    <p className="text-sm font-black text-white uppercase truncate tracking-tight">{req.profiles?.username || 'Utente Ignoto'}</p>
                    <p className="text-[10px] text-slate-500 font-bold mt-1 truncate lowercase">{req.profiles?.email}</p>
                    <div className="mt-4 flex items-center gap-2">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Sezione:</span>
                      <span className={`px-2 py-0.5 text-white text-[8px] font-black rounded uppercase ${
                        req.sezione === 'LAVORO' ? 'bg-amber-600' : req.sezione === 'PALLAMANO' ? 'bg-blue-600' : 'bg-emerald-600'
                      }`}>
                        {req.sezione}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => handleUpdatePermission(req.id, 'AUTORIZZATO')} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all active:scale-95">
                      <Check size={14} /> Abilita
                    </button>
                    <button onClick={() => handleUpdatePermission(req.id, 'NEGATO')} className="flex-1 py-4 bg-slate-800 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-rose-600 hover:text-white transition-all active:scale-95">
                      <X size={14} /> Nega
                    </button>
                  </div>
                </div>
              ))}
              
              {filteredRequests.length === 0 && (
                <div className="col-span-full py-24 bg-slate-900/20 rounded-[3rem] border border-dashed border-white/5 flex flex-col items-center justify-center text-slate-600">
                  <Activity size={48} className="opacity-10 mb-4 animate-pulse" />
                  <p className="text-[10px] font-black uppercase tracking-[0.4em]">Zero attività pendenti</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
