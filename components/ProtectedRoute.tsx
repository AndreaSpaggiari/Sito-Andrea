
import React, { useEffect, useState, useCallback } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { UserProfile, SectionType, PermissionStatus, AccessLevel } from '../types';
import { Lock, Clock, RefreshCw, Eye, ShieldCheck, UserX, Send, AlertCircle } from 'lucide-react';

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
    // Pallamano è sempre libera
    if (section === 'PALLAMANO' || !section) {
      setLoading(false);
      return;
    }

    if (!session || !profile) {
      setLoading(false);
      return;
    }
    
    // Admin ha accesso totale
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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900">
        <RefreshCw className="animate-spin text-blue-500 mb-2" size={32} />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizzazione permessi...</p>
      </div>
    );
  }

  if (!section) return <>{children}</>;

  // Se non autorizzato (e non è l'ingresso principale di LAVORO che ha la sua logica interna)
  if (section !== 'LAVORO' && permission?.stato !== 'AUTORIZZATO' && profile?.role !== 'ADMIN') {
    return <AccessDeniedScreen section={section} permission={permission} userId={session.user.id} onRefresh={checkPermission} />;
  }

  return <>{children}</>;
};

const AccessDeniedScreen = ({ section, permission, userId, onRefresh }: { section: SectionType, permission: any, userId: string, onRefresh: () => void }) => {
  const isPersonale = section === 'PERSONALE';

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white rounded-[3rem] shadow-2xl overflow-hidden">
        <div className="bg-slate-900 p-8 text-white text-center">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            {isPersonale ? <UserX size={32} className="text-rose-500" /> : <Lock size={32} />}
          </div>
          <h2 className="text-2xl font-black uppercase italic tracking-tighter">Accesso Riservato</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Sezione: {section.replace('LAVORO_', '')}</p>
        </div>

        <div className="p-12 text-center">
          {permission?.stato === 'RICHIESTO' ? (
            <>
              <Clock size={48} className="text-amber-500 mx-auto mb-6 animate-pulse" />
              <p className="text-lg font-black text-slate-900 uppercase italic">Richiesta Pendente</p>
              <p className="text-slate-500 text-xs font-bold uppercase mt-2 mb-10 italic">L'amministratore deve ancora approvare il tuo accesso di tipo {permission.livello_accesso}.</p>
              <button onClick={onRefresh} className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest active:scale-95 transition-all">Aggiorna Stato</button>
            </>
          ) : isPersonale ? (
            <>
              <ShieldCheck size={48} className="text-emerald-500 mx-auto mb-6" />
              <p className="text-lg font-black text-slate-900 uppercase italic">Area Blindata</p>
              <p className="text-slate-500 text-xs font-bold uppercase mt-2 italic">Questa sezione non accetta richieste pubbliche. Solo l'amministratore può abilitare il tuo account manualmente.</p>
              <Link to="/" className="inline-block mt-10 text-[10px] font-black text-blue-600 uppercase tracking-widest border-b-2 border-blue-600 pb-1">Torna alla Dashboard</Link>
            </>
          ) : (
            <>
              <AlertCircle size={48} className="text-slate-300 mx-auto mb-6" />
              <p className="text-lg font-black text-slate-900 uppercase italic">Nessun Permesso</p>
              <p className="text-slate-500 text-xs font-bold uppercase mt-2 mb-10 italic">Per accedere a questa sottosezione devi prima configurare le tue abilitazioni nella Dashboard Lavoro.</p>
              <Link to="/lavoro" className="w-full block py-5 bg-slate-900 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest active:scale-95 transition-all">Vai alla Dashboard Lavoro</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProtectedRoute;
