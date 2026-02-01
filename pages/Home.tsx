
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Briefcase, User, RefreshCw, Users, Check, X, ShieldCheck, AlertTriangle, Search, MailQuestion } from 'lucide-react';
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
        const { data: profili, error: profError } = await supabase
          .from('profiles')
          .select('id, username, email')
          .in('id', userIds);
          
        if (profError) {
          console.warn("Errore profili (Policy):", profError);
          setDebugInfo("Controlla le Policy di Supabase per la tabella Profiles.");
        }

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

    const channel = supabase
      .channel('home-admin-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'l_permessi' }, () => fetchRequests())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => fetchRequests())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, fetchRequests]);

  const handleUpdatePermission = async (id: string, newState: 'AUTORIZZATO' | 'NEGATO') => {
    const { error } = await supabase.from('l_permessi').update({ stato: newState }).eq('id', id);
    if (!error) fetchRequests();
    else alert("Errore: " + error.message);
  };

  const filteredRequests = requests.filter(r => 
    r.profiles?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.sezione.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.user_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-6 pt-12 pb-24">
      <div className="text-center mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
        <h1 className="text-4xl md:text-6xl font-black text-gray-900 mb-4 tracking-tight uppercase">
          PORTALE <span className="text-blue-600">ANDREA</span> <span className="text-yellow-600">SPAGGIARI</span>
        </h1>
        <p className="text-xl text-gray-600 italic">Gestione contenuti e permessi real-time.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl mb-16">
        {[
          { to: "/pallamano", color: "blue", icon: Trophy, label: "PALLAMANO", desc: "Risultati e Under 14" },
          { to: "/lavoro", color: "yellow", icon: Briefcase, label: "LAVORO", desc: "Produzione e KME" },
          { to: "/personale", color: "green", icon: User, label: "PERSONALE", desc: "Appunti e Casa" }
        ].map((item, i) => (
          <Link key={i} to={item.to} className="group relative overflow-hidden bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
            <div className={`p-8 flex flex-col items-center text-center`}>
              <div className={`w-20 h-20 bg-${item.color}-100 rounded-2xl flex items-center justify-center text-${item.color}-600 mb-6 group-hover:scale-110 transition-transform shadow-inner`}>
                <item.icon size={40} />
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tighter">{item.label}</h2>
              <p className="text-gray-500 text-sm">{item.desc}</p>
            </div>
            <div className={`h-2 bg-${item.color}-500 w-0 group-hover:w-full transition-all duration-500`}></div>
          </Link>
        ))}
      </div>

      {profile?.role === 'ADMIN' && (
        <div className="w-full max-w-6xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck className="text-blue-600" /> Gestione Permessi
              </h3>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowAll(false)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${!showAll ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>
                  Da Approvare
                </button>
                <button onClick={() => setShowAll(true)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${showAll ? 'bg-slate-800 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}>
                  Storico ({requests.length})
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Cerca..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none w-48 sm:w-64" />
              </div>
              <button onClick={fetchRequests} className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 rounded-2xl transition-all active:scale-90 shadow-sm">
                <RefreshCw size={18} className={loadingRequests ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {debugInfo && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-[10px] font-black uppercase mb-4 flex items-center gap-2">
              <AlertTriangle size={14} /> {debugInfo}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRequests.map((req) => (
              <div key={req.id} className="bg-white border-2 border-slate-100 rounded-[2rem] p-6 shadow-lg hover:border-blue-200 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-12 h-12 ${!req.profiles ? 'bg-red-50 text-red-400' : 'bg-slate-50 text-slate-400'} rounded-2xl flex items-center justify-center`}>
                    {!req.profiles ? <MailQuestion size={24} /> : <Users size={24} />}
                  </div>
                  <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${
                    req.stato === 'RICHIESTO' ? 'bg-yellow-100 text-yellow-700' : 
                    req.stato === 'AUTORIZZATO' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {req.stato}
                  </span>
                </div>
                
                <div className="mb-6">
                  {req.profiles ? (
                    <>
                      <p className="text-sm font-black text-slate-900 uppercase truncate">{req.profiles.username}</p>
                      <p className="text-[10px] text-slate-400 font-bold mb-3 truncate">{req.profiles.email}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-black text-red-600 uppercase">Profilo non leggibile</p>
                      <p className="text-[9px] text-slate-400 font-bold mb-3 truncate">ID: {req.user_id}</p>
                    </>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Richiesta per:</span>
                    <span className={`px-2 py-0.5 text-white text-[9px] font-black rounded uppercase ${
                      req.sezione === 'LAVORO' ? 'bg-yellow-600' : req.sezione === 'PALLAMANO' ? 'bg-blue-600' : 'bg-green-600'
                    }`}>
                      {req.sezione}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => handleUpdatePermission(req.id, 'AUTORIZZATO')} className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 ${req.stato === 'AUTORIZZATO' ? 'bg-slate-100 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                    <Check size={14} /> {req.stato === 'AUTORIZZATO' ? 'Autorizzato' : 'Abilita'}
                  </button>
                  <button onClick={() => handleUpdatePermission(req.id, 'NEGATO')} className={`flex-1 py-3 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 transition-all active:scale-95 ${req.stato === 'NEGATO' ? 'bg-slate-100 text-slate-400' : 'bg-white border border-slate-100 text-slate-400 hover:text-red-500 hover:border-red-100'}`}>
                    <X size={14} /> Nega
                  </button>
                </div>
              </div>
            ))}
            {filteredRequests.length === 0 && (
              <div className="col-span-full py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                <ShieldCheck size={48} className="opacity-10 mb-4" />
                <p className="text-sm font-bold uppercase tracking-widest">Nessuna richiesta da gestire</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
