
import React, { useEffect, useState, useCallback } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { UserProfile, SectionType, PermissionStatus } from '../types';
import { Lock, Clock, RefreshCw, AlertCircle, User, Mail, MessageSquare, Send } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  session: any;
  section?: SectionType;
  profile: UserProfile | null;
}

const ProtectedRoute: React.FC<Props> = ({ children, session, section, profile }) => {
  const [permission, setPermission] = useState<PermissionStatus | null>(null);
  const [loading, setLoading] = useState(!!section);

  const checkPermission = useCallback(async () => {
    if (!session || !section || !profile) {
      setLoading(false);
      return;
    }
    
    // Gli admin hanno sempre accesso immediato
    if (profile.role === 'ADMIN') {
      setPermission('AUTORIZZATO');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('l_permessi')
        .select('stato')
        .eq('user_id', session.user.id)
        .eq('sezione', section)
        .maybeSingle();
      
      if (data) setPermission(data.stato as PermissionStatus);
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

  if (!session) {
    return <Navigate to="/login" />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <RefreshCw className="animate-spin text-blue-600 mb-2" size={32} />
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Verifica Accesso...</p>
      </div>
    );
  }

  // Se è richiesta una sezione specifica e l'utente non è autorizzato (e non è admin)
  if (section && permission !== 'AUTORIZZATO' && profile?.role !== 'ADMIN') {
    return <AccessDeniedScreen section={section} status={permission} userEmail={session.user.email} userId={session.user.id} onRefresh={checkPermission} />;
  }

  return <>{children}</>;
};

const AccessDeniedScreen = ({ section, status, userEmail, userId, onRefresh }: { section: SectionType, status: PermissionStatus | null, userEmail: string, userId: string, onRefresh: () => void }) => {
  const [formData, setFormData] = useState({
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
    if (!formData.nome || !formData.cognome || !formData.chat_username || !formData.motivo) {
      setError("Compila tutti i campi per inviare la richiesta");
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
          stato: 'RICHIESTO',
          nome: formData.nome,
          cognome: formData.cognome,
          chat_username: formData.chat_username,
          motivo: formData.motivo
        }, { onConflict: 'user_id,sezione' });
      
      if (upsertError) throw upsertError;
      setDone(true);
    } catch (e: any) {
      console.error("Errore invio richiesta:", e);
      setError(e.message || "Errore durante l'invio");
    } finally {
      setRequesting(false);
    }
  };

  const colors = {
    PALLAMANO: 'text-blue-600 bg-blue-50 border-blue-200',
    LAVORO: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    PERSONALE: 'text-green-600 bg-green-50 border-green-200',
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-300">
        <div className="bg-slate-900 p-8 text-white text-center">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10">
            <Lock size={32} />
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tighter italic">Accesso Riservato</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Sezione {section}</p>
        </div>

        <div className="p-8 sm:p-10">
          {done ? (
            <div className="py-12 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-6 border border-emerald-100 shadow-inner">
                <Clock size={40} className="animate-pulse" />
              </div>
              <p className="text-lg font-black text-slate-900 uppercase italic tracking-tighter mb-2">Richiesta in attesa</p>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-tight max-w-xs leading-relaxed mb-8">
                La tua richiesta è stata notificata ad Andrea. Riceverai l'accesso non appena verrà autorizzata.
              </p>
              <div className="flex flex-col gap-4 w-full">
                <button onClick={onRefresh} className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all">
                  Verifica Stato
                </button>
                <Link to="/" className="text-[10px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest transition-colors">Torna alla Home</Link>
              </div>
            </div>
          ) : (
            <form onSubmit={requestAccess} className="space-y-5">
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
                <Mail className="text-slate-400" size={18} />
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Email (Automatica)</p>
                  <p className="text-xs font-black text-slate-600">{userEmail}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Nome</label>
                  <input 
                    type="text" 
                    value={formData.nome} 
                    onChange={e => setFormData({...formData, nome: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs text-slate-900 outline-none focus:border-blue-500 transition-all"
                    placeholder="Mario"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Cognome</label>
                  <input 
                    type="text" 
                    value={formData.cognome} 
                    onChange={e => setFormData({...formData, cognome: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs text-slate-900 outline-none focus:border-blue-500 transition-all"
                    placeholder="Rossi"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase ml-2 italic">Nome Visualizzato in Chat</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={formData.chat_username} 
                    onChange={e => setFormData({...formData, chat_username: e.target.value})}
                    className="w-full p-4 pl-12 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs text-slate-900 outline-none focus:border-blue-500 transition-all"
                    placeholder="Il tuo nickname..."
                  />
                  <MessageSquare size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase ml-2">Motivo della Richiesta</label>
                <textarea 
                  value={formData.motivo} 
                  onChange={e => setFormData({...formData, motivo: e.target.value})}
                  rows={3}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs text-slate-900 outline-none focus:border-blue-500 transition-all resize-none"
                  placeholder="Esempio: Operatore di macchina turno A..."
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-[10px] font-black uppercase">
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              <button 
                type="submit"
                disabled={requesting}
                className="w-full py-5 bg-slate-950 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 transition-all mt-4"
              >
                {requesting ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
                {requesting ? 'Invio in corso...' : 'Invia Richiesta di Accesso'}
              </button>
              
              <div className="text-center pt-2">
                 <Link to="/" className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors">Annulla e Torna Indietro</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProtectedRoute;
