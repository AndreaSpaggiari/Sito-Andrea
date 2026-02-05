
import React, { useEffect, useState, useCallback } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { UserProfile, SectionType, PermissionStatus, AccessLevel } from '../types';
import { 
  Lock, Clock, RefreshCw, AlertCircle, MessageSquare, Send, 
  Eye, ShieldAlert, Zap, Factory, CheckCircle2, UserCheck, Briefcase
} from 'lucide-react';

interface Props {
  children: React.ReactNode;
  session: any;
  section: SectionType;
  subsection?: string;
  profile: UserProfile | null;
}

const ProtectedRoute: React.FC<Props> = ({ children, session, section, subsection, profile }) => {
  const [permInfo, setPermInfo] = useState<{ stato: PermissionStatus, livello: AccessLevel } | null>(null);
  const [loading, setLoading] = useState(true);

  const checkPermission = useCallback(async () => {
    if (!session || !profile) {
      setLoading(false);
      return;
    }
    
    if (profile.role === 'ADMIN') {
      setPermInfo({ stato: 'AUTORIZZATO', livello: 'OPERATORE' });
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('l_permessi')
        .select('stato, livello')
        .eq('user_id', session.user.id)
        .eq('sezione', section);
      
      if (subsection) {
        query = query.eq('sottosezione', subsection);
      } else {
        query = query.is('sottosezione', null);
      }

      const { data } = await query.maybeSingle();
      
      if (data) setPermInfo(data as { stato: PermissionStatus, livello: AccessLevel });
      else setPermInfo(null);
    } catch (e) {
      console.error("Errore verifica permessi:", e);
    } finally {
      setLoading(false);
    }
  }, [session, section, subsection, profile]);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  if (!session) return <Navigate to="/login" />;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#060a14]">
        <RefreshCw className="animate-spin text-blue-500 mb-4" size={40} />
        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">Sincronizzazione Credenziali...</p>
      </div>
    );
  }

  if (profile?.role !== 'ADMIN' && (!permInfo || permInfo.stato !== 'AUTORIZZATO')) {
    return (
      <AccessDeniedScreen 
        section={section} 
        subsection={subsection}
        status={permInfo?.stato || null} 
        userEmail={session.user.email} 
        userId={session.user.id} 
        onRefresh={checkPermission} 
      />
    );
  }

  return <>{children}</>;
};

const AccessDeniedScreen = ({ section, subsection, status, userEmail, userId, onRefresh }: { section: SectionType, subsection?: string, status: PermissionStatus | null, userEmail: string, userId: string, onRefresh: () => void }) => {
  const [personalData, setPersonalData] = useState({
    nome: '',
    cognome: '',
    chat_username: '',
    motivo: ''
  });
  
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(status === 'RICHIESTO');

  const requestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personalData.nome || !personalData.cognome || !personalData.chat_username) {
      setError("Inserisci i tuoi dati identificativi per la richiesta");
      return;
    }

    setRequesting(true);
    setError(null);
    try {
      const { error: upsertError } = await supabase
        .from('l_permessi')
        .upsert({ 
          user_id: userId, 
          sezione: section, 
          sottosezione: null,
          stato: 'RICHIESTO',
          livello: 'VISUALIZZATORE',
          ...personalData
        }, { onConflict: 'user_id,sezione,sottosezione' });
      
      if (upsertError) {
        // Messaggio specifico per l'errore di vincolo mancante
        if (upsertError.message.includes('unique_user_section_sub') || upsertError.message.includes('ON CONFLICT')) {
           throw new Error("Errore Database: Manca il vincolo di unicità. Esegui lo script SQL aggiornato nel pannello Supabase.");
        }
        throw upsertError;
      }
      setDone(true);
    } catch (e: any) {
      setError(e.message || "Errore durante l'invio della richiesta");
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060a14] flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-[#0f172a] rounded-[3rem] shadow-2xl overflow-hidden border border-white/5 animate-in fade-in zoom-in duration-300">
        <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 p-10 text-white text-center border-b border-white/5 relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-indigo-500 rounded-b-full"></div>
          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/10 shadow-xl">
            <Lock size={32} className="text-indigo-400" />
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tighter italic">Richiesta <span className="text-indigo-500">Accesso</span></h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2">
            Piattaforma: {section}
          </p>
        </div>

        <div className="p-8 sm:p-12">
          {done ? (
            <div className="py-8 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-6 border border-emerald-500/20 shadow-inner">
                <Clock size={40} className="animate-pulse" />
              </div>
              <p className="text-xl font-black text-white uppercase italic tracking-tighter mb-4">Richiesta Ricevuta</p>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest max-w-xs leading-relaxed mb-10">
                Andrea ha ricevuto la tua richiesta per la sezione <span className="text-indigo-400">{section}</span>. <br/>Verrai abilitato alle aree di competenza a breve.
              </p>
              <div className="flex flex-col gap-4 w-full">
                <button onClick={onRefresh} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">
                  Controlla Stato Attivazione
                </button>
                <Link to="/" className="text-[10px] font-black text-white/20 hover:text-white uppercase tracking-[0.3em] transition-colors mt-2">Torna alla Home</Link>
              </div>
            </div>
          ) : (
            <form onSubmit={requestAccess} className="space-y-8">
              
              <div className="bg-white/5 p-6 rounded-3xl border border-white/5 flex items-center gap-4">
                 <Briefcase className="text-amber-500" size={24} />
                 <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-relaxed">
                   Stai richiedendo l'accesso alla sezione <span className="text-white">LAVORO</span>. Andrea configurerà i tuoi permessi operativi dopo la verifica.
                 </p>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Nome</label>
                    <input type="text" required value={personalData.nome} onChange={e => setPersonalData({...personalData, nome: e.target.value})} className="w-full p-4 bg-slate-900 border border-white/5 rounded-2xl font-bold text-xs text-white outline-none focus:border-indigo-500 transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Cognome</label>
                    <input type="text" required value={personalData.cognome} onChange={e => setPersonalData({...personalData, cognome: e.target.value})} className="w-full p-4 bg-slate-900 border border-white/5 rounded-2xl font-bold text-xs text-white outline-none focus:border-indigo-500 transition-all" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Username Chat / Identificativo</label>
                  <input type="text" required value={personalData.chat_username} onChange={e => setPersonalData({...personalData, chat_username: e.target.value})} className="w-full p-4 bg-slate-900 border border-white/5 rounded-2xl font-bold text-xs text-white outline-none focus:border-indigo-500 transition-all" placeholder="Es: Andrea75" />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest">Messaggio (Opzionale)</label>
                  <textarea value={personalData.motivo} onChange={e => setPersonalData({...personalData, motivo: e.target.value})} rows={2} className="w-full p-4 bg-slate-900 border border-white/5 rounded-2xl font-bold text-xs text-white outline-none focus:border-indigo-500 transition-all resize-none" placeholder="Esempio: Turnista Reparto Taglio..." />
                </div>
              </div>

              {error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-500 text-[10px] font-black uppercase">
                  <AlertCircle size={16} /> {error}
                </div>
              )}

              <button 
                type="submit"
                disabled={requesting}
                className="w-full py-6 bg-indigo-600 text-white font-black rounded-[2rem] uppercase text-[11px] tracking-[0.2em] shadow-2xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4 transition-all hover:bg-indigo-500"
              >
                {requesting ? <RefreshCw size={20} className="animate-spin" /> : <Send size={20} />}
                Invia Richiesta Attivazione
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProtectedRoute;
