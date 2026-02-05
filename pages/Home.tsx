
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  Trophy, Briefcase, User, RefreshCw, Users, Check, X, ShieldCheck, 
  AlertTriangle, Search, MailQuestion, Zap, ChevronRight, Activity, 
  Home as HomeIcon, Lock, Globe, MessageSquare, Info, Eye,
  Factory, Wrench, Inbox, Laptop, Scissors, ShieldX
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { UserProfile, AccessLevel } from '../types';

interface PendingRequest {
  id: string;
  sezione: string;
  sottosezione?: string;
  stato: string;
  livello: string;
  user_id: string;
  created_at: string;
  nome?: string;
  cognome?: string;
  chat_username?: string;
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

const SUBSECTIONS_LAVORO = [
  { id: 'PRODUZIONE', label: 'Produzione', icon: Factory },
  { id: 'MACCHINE', label: 'Macchine Mortara', icon: Wrench },
  { id: 'MAGAZZINO', label: 'Magazzino & Stock', icon: Inbox },
  { id: 'UFFICIO', label: 'Ufficio Hub', icon: Briefcase },
  { id: 'UTILITA', label: 'Utilità Varie', icon: Laptop },
  { id: 'SLITTER_PICCOLO', label: 'Slitter Piccolo', icon: Scissors },
  { id: 'SLITTER_LAME', label: 'Gestione Lame/Stampi', icon: Scissors }
];

const Home: React.FC<Props> = ({ profile, session, onRefresh }) => {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Stato per la configurazione dei permessi durante l'approvazione
  // Mappa user_id -> sottosezione -> livello
  const [adminConfig, setAdminConfig] = useState<Record<string, Record<string, AccessLevel | 'NONE'>>>({});

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

        // Inizializza adminConfig per le nuove richieste
        const initialConfig = { ...adminConfig };
        combined.forEach(req => {
          if (req.sezione === 'LAVORO' && !initialConfig[req.user_id]) {
            initialConfig[req.user_id] = SUBSECTIONS_LAVORO.reduce((acc, sub) => ({ ...acc, [sub.id]: 'NONE' }), {});
          }
        });
        setAdminConfig(initialConfig);
      } else {
        setRequests([]);
      }
    } catch (e: any) {
      console.error(e.message);
    } finally {
      setLoadingRequests(false);
    }
  }, [profile, showAll]);

  useEffect(() => {
    if (profile?.role !== 'ADMIN') return;
    fetchRequests();
  }, [profile, fetchRequests]);

  const handleUpdatePermission = async (req: PendingRequest, newState: 'AUTORIZZATO' | 'NEGATO') => {
    if (newState === 'NEGATO') {
      const { error } = await supabase.from('l_permessi').update({ stato: newState }).eq('id', req.id);
      if (!error) fetchRequests();
      return;
    }

    // Se stiamo autorizzando LAVORO, creiamo i permessi granulari configurati
    if (req.sezione === 'LAVORO' && newState === 'AUTORIZZATO') {
      const config = adminConfig[req.user_id];
      if (!config) return;

      const rowsToInsert = SUBSECTIONS_LAVORO
        .filter(sub => config[sub.id] !== 'NONE')
        .map(sub => ({
          user_id: req.user_id,
          sezione: 'LAVORO',
          sottosezione: sub.id,
          stato: 'AUTORIZZATO',
          livello: config[sub.id] as AccessLevel,
          nome: req.nome,
          cognome: req.cognome,
          chat_username: req.chat_username,
          motivo: req.motivo
        }));

      // Aggiungiamo anche il record master per sbloccare l'hub
      rowsToInsert.push({
        user_id: req.user_id,
        sezione: 'LAVORO',
        sottosezione: null,
        stato: 'AUTORIZZATO',
        livello: 'VISUALIZZATORE',
        nome: req.nome,
        cognome: req.cognome,
        chat_username: req.chat_username,
        motivo: req.motivo
      } as any);

      const { error: batchError } = await supabase.from('l_permessi').upsert(rowsToInsert, { onConflict: 'user_id,sezione,sottosezione' });
      if (batchError) {
        alert("Errore salvataggio permessi granulari: " + batchError.message);
        return;
      }
      
      // Eliminiamo eventuali altre richieste pendenti master dello stesso utente se presenti (o le aggiorniamo)
      await supabase.from('l_permessi').update({ stato: 'AUTORIZZATO' }).eq('id', req.id);
      fetchRequests();
    } else {
      // Autorizzazione standard per altre sezioni
      const { error } = await supabase.from('l_permessi').update({ stato: newState }).eq('id', req.id);
      if (!error) fetchRequests();
    }
  };

  const updateAdminChoice = (userId: string, subId: string, level: AccessLevel | 'NONE') => {
    setAdminConfig(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [subId]: level
      }
    }));
  };

  const filteredRequests = requests.filter(r => 
    r.profiles?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.sezione.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.sottosezione && r.sottosezione.toLowerCase().includes(searchTerm.toLowerCase())) ||
    r.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.cognome?.toLowerCase().includes(searchTerm.toLowerCase())
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
            <HomeIcon size={12} /> Andrea v3.1
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-7xl lg:text-9xl font-black uppercase tracking-tighter italic mb-4 leading-none text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500 whitespace-nowrap">
            ANDREA <span className="text-blue-500">SPAGGIARI</span>
          </h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[10px] sm:text-xs">Sito personale - In continuo aggiornamento</p>
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
              <div className={`w-16 h-16 bg-slate-800 rounded-[1.5rem] flex items-center justify-center mb-8 shadow-inner group-hover:bg-${item.color === 'blue' ? 'blue' : item.color === 'amber' ? 'amber' : 'emerald'}-600 transition-all mt-6`}>
                <item.icon size={28} className={`text-slate-400 group-hover:text-white transition-colors`} />
              </div>
              <h2 className="text-3xl font-black text-white mb-2 uppercase italic tracking-tighter leading-none">{item.label}</h2>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">{item.desc}</p>
              <div className="mt-8 flex items-center gap-2 text-slate-500 group-hover:text-white transition-colors">
                <span className="text-[10px] font-black uppercase tracking-widest">Esplora</span>
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>

        {/* Admin Console */}
        {profile?.role === 'ADMIN' && (
          <div className="bg-slate-900/40 backdrop-blur-sm rounded-[3rem] border border-white/5 p-8 md:p-12 shadow-2xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
              <div>
                <h3 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none">Gestione <span className="text-blue-500">Accessi</span></h3>
                <div className="flex gap-4 mt-6">
                  <button onClick={() => setShowAll(false)} className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${!showAll ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-800 text-slate-500 hover:text-slate-300'}`}>
                    Richieste Pendenti
                  </button>
                  <button onClick={() => setShowAll(true)} className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${showAll ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-500 hover:text-slate-300'}`}>
                    Cronologia
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

            <div className="space-y-6">
              {filteredRequests.map((req) => (
                <div key={req.id} className="bg-slate-950/50 border border-white/5 rounded-[2.5rem] p-8 transition-all hover:bg-slate-900 group">
                  <div className="flex flex-col lg:flex-row gap-10">
                    
                    {/* Colonna Sinistra: Dati Utente */}
                    <div className="lg:w-1/3 shrink-0">
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-blue-400">
                          <User size={24} />
                        </div>
                        <span className={`text-[8px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest ${
                          req.stato === 'RICHIESTO' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 
                          req.stato === 'AUTORIZZATO' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                        }`}>
                          {req.stato}
                        </span>
                      </div>
                      
                      <div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Dati Richiedente</p>
                        <p className="text-2xl font-black text-white uppercase italic tracking-tight leading-none">
                          {req.nome || '-'} {req.cognome || '-'}
                        </p>
                        <p className="text-[10px] text-slate-500 font-bold mt-1 lowercase truncate">{req.profiles?.email}</p>
                        <div className="mt-4 flex flex-col gap-2">
                           <div className="flex items-center gap-2">
                             <MessageSquare size={12} className="text-blue-500" />
                             <span className="text-[10px] font-black text-slate-300 uppercase italic">Chat: {req.chat_username || 'n/d'}</span>
                           </div>
                           <div className="p-3 bg-slate-900 rounded-xl border border-white/5">
                             <p className="text-[10px] text-slate-400 font-medium leading-relaxed italic">"{req.motivo || 'Nessuna nota aggiuntiva'}"</p>
                           </div>
                        </div>
                      </div>
                    </div>

                    {/* Colonna Centrale: Configuratore Permessi (Solo per LAVORO) */}
                    <div className="flex-grow">
                      {req.sezione === 'LAVORO' && req.stato === 'RICHIESTO' ? (
                        <div className="space-y-4">
                           <div className="flex items-center gap-3 mb-2">
                              <ShieldCheck size={18} className="text-amber-500" />
                              <h4 className="text-xs font-black text-white uppercase tracking-[0.2em]">Configurazione Permessi Granulari</h4>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                              {SUBSECTIONS_LAVORO.map(sub => {
                                const currentLevel = adminConfig[req.user_id]?.[sub.id] || 'NONE';
                                return (
                                  <div key={sub.id} className="bg-white/5 border border-white/5 p-4 rounded-2xl flex items-center justify-between group/sub">
                                     <div className="flex items-center gap-3">
                                        <sub.icon size={16} className="text-slate-500 group-hover/sub:text-amber-500 transition-colors" />
                                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">{sub.label}</span>
                                     </div>
                                     <div className="flex gap-1">
                                        {[
                                          { level: 'NONE', icon: ShieldX, color: 'hover:bg-slate-700' },
                                          { level: 'VISUALIZZATORE', icon: Eye, color: 'hover:bg-indigo-600' },
                                          { level: 'OPERATORE', icon: Zap, color: 'hover:bg-amber-600' }
                                        ].map(btn => (
                                          <button 
                                            key={btn.level}
                                            onClick={() => updateAdminChoice(req.user_id, sub.id, btn.level as any)}
                                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${currentLevel === btn.level ? 'bg-white text-slate-900 shadow-lg' : `bg-white/5 text-slate-500 ${btn.color} hover:text-white`}`}
                                            title={btn.level}
                                          >
                                            <btn.icon size={14} />
                                          </button>
                                        ))}
                                     </div>
                                  </div>
                                );
                              })}
                           </div>
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center bg-white/5 rounded-3xl border border-dashed border-white/10 p-10">
                           <div className="text-center">
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Sezione: {req.sezione}</p>
                              <p className="text-lg font-black text-indigo-400 italic uppercase">Accesso Standard {req.livello}</p>
                           </div>
                        </div>
                      )}
                    </div>

                    {/* Colonna Destra: Azioni Finali */}
                    <div className="lg:w-48 flex flex-col gap-3 justify-center">
                      {req.stato === 'RICHIESTO' && (
                        <>
                          <button onClick={() => handleUpdatePermission(req, 'AUTORIZZATO')} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all active:scale-95">
                            <Check size={16} /> Approva
                          </button>
                          <button onClick={() => handleUpdatePermission(req, 'NEGATO')} className="w-full py-5 bg-slate-800 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-rose-600 hover:text-white transition-all active:scale-95">
                            <X size={16} /> Nega
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredRequests.length === 0 && (
                <div className="py-32 bg-slate-900/20 rounded-[3rem] border border-dashed border-white/5 flex flex-col items-center justify-center text-slate-600">
                  <Activity size={48} className="opacity-10 mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-[0.4em]">Zero attività pendenti</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default Home;
