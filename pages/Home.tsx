
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Briefcase, User, RefreshCw, Users, Check, X, Search, Zap, ChevronRight, Activity, Home as HomeIcon, Lock, Globe } from 'lucide-react';
import { supabase } from '../supabaseClient.ts';
import { UserProfile } from '../types.ts';

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
  const [searchTerm, setSearchTerm] = useState('');
  
  const fetchRequests = useCallback(async () => {
    if (profile?.role !== 'ADMIN') return;
    setLoadingRequests(true);
    try {
      const { data: permessi, error: permError } = await supabase
        .from('l_permessi')
        .select('*')
        .eq('stato', 'RICHIESTO')
        .order('created_at', { ascending: false });
      
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
      console.error(e.message);
    } finally {
      setLoadingRequests(false);
    }
  }, [profile]);

  useEffect(() => {
    if (profile?.role !== 'ADMIN') return;
    fetchRequests();
  }, [profile, fetchRequests]);

  const handleUpdatePermission = async (id: string, newState: 'AUTORIZZATO' | 'NEGATO') => {
    const { error } = await supabase.from('l_permessi').update({ stato: newState }).eq('id', id);
    if (!error) fetchRequests();
  };

  const isGuest = !session;

  const sections = [
    { 
      to: "/pallamano", 
      color: "blue", 
      icon: Trophy, 
      label: "PALLAMANO", 
      desc: "Vigevano U14M & Stats", 
      img: "https://images.unsplash.com/photo-1562911791-c7a97b729ac5?auto=format&fit=crop&q=80&w=1200",
      public: true 
    },
    { 
      to: "/lavoro", 
      color: "amber", 
      icon: Briefcase, 
      label: "LAVORO", 
      desc: "KME Produzione & Hub", 
      img: "https://images.unsplash.com/photo-1565106430482-8f6e74349ca1?auto=format&fit=crop&q=80&w=1200",
      public: false 
    },
    { 
      to: "/personale", 
      color: "emerald", 
      icon: User, 
      label: "PERSONALE", 
      desc: "Archivio Appunti Privati", 
      img: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=1200",
      public: false 
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      {/* Hero Section */}
      <div className="relative pt-32 pb-48 px-6 text-center overflow-hidden">
        {/* Immagine di sfondo Hero */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=2000" 
            alt="Hero Background" 
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/80 to-slate-950"></div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 px-4 py-1.5 rounded-full border border-blue-500/20 text-[10px] font-black uppercase tracking-[0.2em] mb-8">
            <Zap size={12} className="animate-pulse" /> SITO PERSONALE v3.5
          </div>
          <h1 className="text-5xl sm:text-7xl lg:text-9xl font-black uppercase tracking-tighter italic mb-4 leading-none text-white">
            ANDREA <span className="text-blue-500">SPAGGIARI</span>
          </h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.4em] text-xs">Innovation & Performance Hub</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-32 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          {sections.map((item, i) => (
            <Link key={i} to={item.to} className="group relative h-[450px] rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl transition-all duration-500 hover:scale-[1.02]">
              {/* Background Image */}
              <img src={item.img} alt={item.label} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity"></div>
              
              {/* Content */}
              <div className="absolute inset-0 p-10 flex flex-col justify-end">
                <div className="mb-4">
                  {item.public ? (
                    <span className="bg-blue-500 text-white text-[8px] font-black px-2 py-1 rounded uppercase tracking-widest flex items-center gap-1 w-fit"><Globe size={10} /> Public</span>
                  ) : (
                    <span className="bg-slate-800 text-slate-400 text-[8px] font-black px-2 py-1 rounded uppercase tracking-widest flex items-center gap-1 w-fit"><Lock size={10} /> Private</span>
                  )}
                </div>
                
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-white/10 backdrop-blur-md border border-white/20 group-hover:bg-${item.color}-600 transition-colors`}>
                  <item.icon size={28} className="text-white" />
                </div>
                
                <h2 className="text-4xl font-black text-white uppercase italic tracking-tighter leading-none mb-2">{item.label}</h2>
                <p className="text-white/60 font-bold text-xs uppercase tracking-widest mb-6">{item.desc}</p>
                
                <div className="flex items-center gap-2 text-white/40 group-hover:text-white transition-colors">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Entra Ora</span>
                  <ChevronRight size={14} className="group-hover:translate-x-2 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {profile?.role === 'ADMIN' && requests.length > 0 && (
          <div className="bg-slate-900/40 backdrop-blur-xl rounded-[3rem] border border-white/10 p-10 shadow-2xl animate-in fade-in slide-in-from-bottom-10 duration-500">
            <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none mb-10 flex items-center gap-4">
              <Activity className="text-blue-500" /> Richieste <span className="text-blue-500">Accesso</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {requests.map((req) => (
                <div key={req.id} className="bg-slate-950/80 border border-white/5 rounded-3xl p-6 hover:border-blue-500/30 transition-all">
                  <p className="text-sm font-black text-white uppercase">{req.profiles?.username}</p>
                  <p className="text-[10px] text-slate-500 mb-4">{req.profiles?.email}</p>
                  <div className="flex gap-2 mb-6">
                    <span className="px-2 py-1 bg-blue-600 text-[8px] font-black rounded uppercase text-white">{req.sezione}</span>
                    <span className="px-2 py-1 bg-amber-500/20 text-amber-500 border border-amber-500/20 text-[8px] font-black rounded uppercase">PENDENTE</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleUpdatePermission(req.id, 'AUTORIZZATO')} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black text-[9px] uppercase hover:bg-blue-500 transition-colors">Abilita</button>
                    <button onClick={() => handleUpdatePermission(req.id, 'NEGATO')} className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-xl font-black text-[9px] uppercase hover:bg-rose-600 hover:text-white transition-colors">Nega</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
