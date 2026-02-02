
import React, { useEffect, useState, useCallback } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient.ts';
import { UserProfile, SectionType, PermissionStatus } from '../types.ts';
import { Lock, Clock, RefreshCw, AlertCircle } from 'lucide-react';

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

  if (section && permission !== 'AUTORIZZATO' && profile?.role !== 'ADMIN') {
    return <AccessDeniedScreen section={section} status={permission} userId={session.user.id} onRefresh={checkPermission} />;
  }

  return <>{children}</>;
};

const AccessDeniedScreen = ({ section, status, userId, onRefresh }: { section: SectionType, status: PermissionStatus | null, userId: string, onRefresh: () => void }) => {
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(status === 'RICHIESTO');

  const requestAccess = async () => {
    setRequesting(true);
    setError(null);
    try {
      const { error: upsertError } = await supabase
        .from('l_permessi')
        .upsert({ user_id: userId, sezione: section, stato: 'RICHIESTO' }, { onConflict: 'user_id,sezione' });
      
      if (upsertError) throw upsertError;
      setDone(true);
    } catch (e: any) {
      console.error("Errore invio richiesta:", e);
      setError(e.message || "Errore sconosciuto durante l'invio");
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center border-t-8 border-slate-900 animate-in fade-in zoom-in duration-300">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock size={40} className="text-slate-400" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tighter">Accesso Limitato</h2>
        <p className="text-gray-500 text-sm mb-6 leading-relaxed">
          La sezione <span className={`font-black px-2 py-0.5 rounded ${colors[section]}`}>{section}</span> è riservata.<br/>
          Richiedi l'abilitazione ad Andrea per procedere.
        </p>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-2 text-red-600 text-[10px] font-black uppercase text-left">
            <AlertCircle size={14} className="shrink-0" />
            <span>Errore: {error}</span>
          </div>
        )}
        
        {done ? (
          <div className="p-5 bg-yellow-50 border border-yellow-200 rounded-2xl flex flex-col items-center gap-2">
            <Clock className="text-yellow-600 animate-pulse" />
            <p className="text-xs font-black text-yellow-800 uppercase tracking-tight">Richiesta inviata ad Andrea!</p>
            <button onClick={onRefresh} className="mt-2 text-[10px] font-bold text-yellow-600 underline uppercase hover:text-yellow-800 transition-colors">Controlla se approvato</button>
          </div>
        ) : (
          <button 
            onClick={requestAccess}
            disabled={requesting}
            className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-black transition shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
          >
            {requesting ? 'Invio in corso...' : 'INVIA RICHIESTA'}
          </button>
        )}
        
        <div className="mt-8 flex flex-col gap-2">
          <Link to="/" className="text-[10px] font-black text-slate-400 hover:text-slate-900 transition uppercase tracking-widest">Torna alla Home</Link>
        </div>
      </div>
    </div>
  );
};

export default ProtectedRoute;
