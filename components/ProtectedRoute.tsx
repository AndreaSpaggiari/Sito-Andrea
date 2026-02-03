
import React, { useEffect, useState, useCallback } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { UserProfile, SectionType, PermissionStatus, AccessLevel } from '../types';
import { Lock, Clock, RefreshCw, Eye, ShieldCheck, UserX, Send, AlertCircle, Info } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  session: any;
  section?: SectionType;
  profile: UserProfile | null;
}

const ProtectedRoute: React.FC<Props> = ({ children, session, section, profile }) => {
  const [permission, setPermission] = useState<{ stato: PermissionStatus, livello: AccessLevel } | null>(null);
  const [loading, setLoading] = useState(!!section);

  const checkPermission = useCallback(async () => {
    if (section === 'PALLAMANO' || !section) {
      setLoading(false);
      return;
    }

    if (!session || !profile) {
      setLoading(false);
      return;
    }
    
    if (profile.role === 'ADMIN') {
      setPermission({ stato: 'AUTORIZZATO', livello: 'OPERATORE' });
      setLoading(false);
      return;
    }

    try {
      const { data } = await supabase
        .from('l_permessi')
        .select('stato, livello_accesso')
        .eq('user_id', session.user.id)
        .eq('sezione', section)
        .maybeSingle();
      
      if (data) setPermission({ stato: data.stato as PermissionStatus, livello: data.livello_accesso as AccessLevel });
      else setPermission(null);
    } catch (e) {
      console.error("Errore verifica permessi:", e);
    } finally {
      setLoading(false);
    }
  }, [session, section, profile]);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  if (!session) return <Navigate to="/login" />;
  if (loading) return <LoadingScreen />;
  if (!section) return <>{children}</>;

  if (permission?.stato !== 'AUTORIZZATO' && profile?.role !== 'ADMIN') {
    return <AccessDeniedScreen section={section} permission={permission} userId={session.user.id} onRefresh={checkPermission} />;
  }

  return <>{children}</>;
};

const LoadingScreen = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900">
    <RefreshCw className="animate-spin text-blue-500 mb-2" size={32} />
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizzazione permessi...</p>
  </div>
);

const AccessDeniedScreen = ({ section, permission, userId, onRefresh }: { section: SectionType, permission: any, userId: string, onRefresh: () => void }) => {
  const [formData, setFormData] = useState({ nome: '', cognome: '', chat_username: '', motivo: '', livello: 'VISUALIZZATORE' as AccessLevel });
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = permission?.stato || null;
  const isPersonale = section === 'PERSONALE';

  const requestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPersonale) return;
    if (!formData.nome || !formData.cognome || !formData.motivo) {
      setError("Compila i campi obbligatori");
      return;
    }
    setRequesting(true);
    try {
      await supabase.from('l_permessi').upsert({ 
        user_id: userId, sezione: section, stato: 'RICHIESTO', livello_accesso: formData.livello,
        nome: formData.nome, cognome: formData.cognome, chat_username: formData.chat_username || 'Utente', motivo: formData.motivo
      }, { onConflict: 'user_id,sezione' });
      onRefresh();
    } catch (e: any) { setError(e.message); } finally { setRequesting(false); }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white rounded-[3rem] shadow-2xl overflow-hidden">
        <div className="bg-slate-900 p-8 text-white text-center">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            {isPersonale ? <UserX size={32} className="text-rose-500" /> : <Lock size={32} />}
          </div>
          <h2 className="text-2xl font-black uppercase italic tracking-tighter italic">Accesso Riservato</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Sezione: {section.replace('LAVORO_', '')}</p>
        </div>
        <div className="p-8">
          {status === 'RICHIESTO' ? (
            <div className="py-12 flex flex-col items-center text-center">
              <Clock size={48} className="text-amber-500 animate-pulse mb-6" />
              <p className="text-lg font-black text-slate-900 uppercase italic">Richiesta Pendente</p>
              <p className="text-slate-500 text-xs font-bold uppercase mt-2 mb-10 italic">L'amministratore valuterà la tua richiesta di tipo {permission.livello_accesso}.</p>
              <button onClick={onRefresh} className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl uppercase text-[10px] tracking-[0.2em] active:scale-95 transition-all">Aggiorna Stato</button>
            </div>
          ) : isPersonale ? (
            <div className="py-12 flex flex-col items-center text-center">
               <ShieldCheck size={48} className="text-rose-500 mb-6" />
               <p className="text-lg font-black text-slate-900 uppercase italic">Sezione Blindata</p>
               <p className="text-slate-500 text-xs font-bold uppercase mt-2 italic">Accesso disponibile solo su invito manuale dell'amministratore.</p>
               <Link to="/" className="mt-12 text-[10px] font-black text-blue-600 uppercase tracking-widest underline underline-offset-8 decoration-2 decoration-blue-200">Torna alla Dashboard</Link>
            </div>
          ) : (
            <form onSubmit={requestAccess} className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-start gap-3 mb-4">
                <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold text-blue-700 leading-relaxed uppercase">Specifica se desideri solo consultare i dati o operare attivamente (cambio stati, avviamento macchine).</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs" placeholder="Nome" />
                <input type="text" value={formData.cognome} onChange={e => setFormData({...formData, cognome: e.target.value})} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs" placeholder="Cognome" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setFormData({...formData, livello: 'VISUALIZZATORE'})} className={`p-4 rounded-2xl border flex items-center justify-center gap-2 font-black text-[10px] uppercase transition-all ${formData.livello === 'VISUALIZZATORE' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-400'}`}>
                  <Eye size={14} /> Solo Lettura
                </button>
                <button type="button" onClick={() => setFormData({...formData, livello: 'OPERATORE'})} className={`p-4 rounded-2xl border flex items-center justify-center gap-2 font-black text-[10px] uppercase transition-all ${formData.livello === 'OPERATORE' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                  <ShieldCheck size={14} /> Operativo
                </button>
              </div>
              <textarea value={formData.motivo} onChange={e => setFormData({...formData, motivo: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs resize-none" rows={3} placeholder="Motivazione richiesta..." />
              {error && <div className="p-3 bg-rose-50 text-rose-600 text-[10px] font-black uppercase rounded-xl">{error}</div>}
              <button type="submit" disabled={requesting} className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-xl flex items-center justify-center gap-3">
                {requesting ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />} Invia Richiesta
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProtectedRoute;
