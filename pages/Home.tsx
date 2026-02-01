
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Briefcase, User, CheckCircle2, RefreshCw, Users, Check, X, ShieldCheck } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { UserProfile } from '../types';

interface PendingRequest {
  id: string;
  sezione: string;
  stato: string;
  profiles: {
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
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  
  const fetchRequests = useCallback(async () => {
    if (profile?.role !== 'ADMIN') return;
    setLoadingRequests(true);
    try {
      const { data, error } = await supabase
        .from('l_permessi')
        .select(`
          id,
          sezione,
          stato,
          profiles:user_id (username, email)
        `)
        .eq('stato', 'RICHIESTO');
      
      if (data) setPendingRequests(data as any);
    } catch (e) {
      console.error("Errore recupero richieste:", e);
    } finally {
      setLoadingRequests(false);
    }
  }, [profile]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleUpdatePermission = async (id: string, newState: 'AUTORIZZATO' | 'NEGATO') => {
    try {
      const { error } = await supabase
        .from('l_permessi')
        .update({ stato: newState })
        .eq('id', id);
      
      if (!error) {
        setPendingRequests(prev => prev.filter(req => req.id !== id));
      }
    } catch (e) {
      alert("Errore durante l'aggiornamento");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-6 pt-12 pb-24">
      <div className="text-center mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
        <h1 className="text-4xl md:text-6xl font-black text-gray-900 mb-4 tracking-tight uppercase">
          PORTALE <span className="text-blue-600">ANDREA</span> <span className="text-yellow-600">SPAGGIARI</span>
        </h1>
        <p className="text-xl text-gray-600">Benvenuto. Gestisci le tue attività e i tuoi contenuti da un'unica dashboard.</p>
      </div>

      {/* Grid Sezioni */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl mb-16">
        <Link to="/pallamano" className="group relative overflow-hidden bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
          <div className="absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-10 transition-opacity"></div>
          <div className="p-8 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform shadow-inner">
              <Trophy size={40} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tighter">PALLAMANO</h2>
            <p className="text-gray-500 text-sm">Under 14, Risultati, Classifiche e Pallamano Vigevano.</p>
          </div>
          <div className="h-2 bg-blue-500 w-0 group-hover:w-full transition-all duration-500"></div>
        </Link>

        <Link to="/lavoro" className="group relative overflow-hidden bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
          <div className="absolute inset-0 bg-yellow-500 opacity-0 group-hover:opacity-10 transition-opacity"></div>
          <div className="p-8 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-yellow-100 rounded-2xl flex items-center justify-center text-yellow-600 mb-6 group-hover:scale-110 transition-transform shadow-inner">
              <Briefcase size={40} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tighter">LAVORO</h2>
            <p className="text-gray-500 text-sm">Produzione, Utilità, Chat e Strumenti di Lavoro.</p>
          </div>
          <div className="h-2 bg-yellow-500 w-0 group-hover:w-full transition-all duration-500"></div>
        </Link>

        <Link to="/personale" className="group relative overflow-hidden bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
          <div className="absolute inset-0 bg-green-500 opacity-0 group-hover:opacity-10 transition-opacity"></div>
          <div className="p-8 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center text-green-600 mb-6 group-hover:scale-110 transition-transform shadow-inner">
              <User size={40} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tighter">PERSONALE</h2>
            <p className="text-gray-500 text-sm">Casa, Hobby e contenuti personali vari.</p>
          </div>
          <div className="h-2 bg-green-500 w-0 group-hover:w-full transition-all duration-500"></div>
        </Link>
      </div>

      {/* Admin Panel: Gestione Richieste */}
      {profile?.role === 'ADMIN' && (
        <div className="w-full max-w-6xl space-y-6 animate-in fade-in duration-1000">
          <div className="flex items-center justify-between px-4">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck className="text-blue-600" /> Gestione Richieste Accesso
            </h3>
            <button 
              onClick={fetchRequests} 
              className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
              title="Aggiorna richieste"
            >
              <RefreshCw size={20} className={loadingRequests ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingRequests.length > 0 ? (
              pendingRequests.map((req) => (
                <div key={req.id} className="bg-white border-2 border-slate-100 rounded-[2rem] p-6 shadow-lg hover:border-blue-100 transition-all group animate-in slide-in-from-bottom-2">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                      <Users size={24} />
                    </div>
                    <span className="text-[10px] font-black px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full uppercase tracking-widest">
                      Richiesto
                    </span>
                  </div>
                  
                  <div className="mb-6">
                    <p className="text-sm font-black text-slate-900 uppercase truncate">{req.profiles?.username || 'Senza Nome'}</p>
                    <p className="text-[10px] text-slate-400 font-bold mb-3">{req.profiles?.email}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase">Sezione:</span>
                      <span className="px-2 py-0.5 bg-slate-900 text-white text-[9px] font-black rounded uppercase">
                        {req.sezione}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleUpdatePermission(req.id, 'AUTORIZZATO')}
                      className="flex-1 py-3 bg-green-500 text-white rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-green-600 shadow-md active:scale-95 transition-all"
                    >
                      <Check size={14} /> Approva
                    </button>
                    <button 
                      onClick={() => handleUpdatePermission(req.id, 'NEGATO')}
                      className="flex-1 py-3 bg-red-50 text-red-500 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-red-100 active:scale-95 transition-all"
                    >
                      <X size={14} /> Rifiuta
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                <ShieldCheck size={48} className="opacity-10 mb-4" />
                <p className="text-sm font-bold uppercase tracking-widest">Nessuna richiesta in sospeso</p>
                <p className="text-[10px] mt-1 italic">I permessi sono aggiornati.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {profile?.role === 'ADMIN' && (
        <div className="mt-12 flex items-center gap-3 px-8 py-4 bg-green-50 border-2 border-green-200 rounded-full text-green-700 shadow-md animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="w-8 h-8 bg-green-200 rounded-full flex items-center justify-center">
            <CheckCircle2 size={20} />
          </div>
          <span className="text-sm font-black uppercase tracking-widest">Sessione Amministratore Attiva</span>
        </div>
      )}
    </div>
  );
};

export default Home;
