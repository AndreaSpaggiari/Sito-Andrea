
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Lavorazione, Macchina, FaseLavorazione, Stati, UserProfile, AccessLevel } from '../types';
import Chat from '../components/Chat';
import { ArrowLeft, RefreshCw, X, Activity, Plus, Settings2, ArrowRight, Eye, ShieldCheck, Lock, Inbox, History } from 'lucide-react';

const Produzione: React.FC<{ profile: UserProfile | null }> = ({ profile }) => {
  const [selectedMacchina, setSelectedMacchina] = useState<string | null>(() => localStorage.getItem('kme_selected_macchina') || 'SLP');
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('VISUALIZZATORE');
  const [macchine, setMacchine] = useState<Macchina[]>([]);
  const [fasi, setFasi] = useState<FaseLavorazione[]>([]);
  const [lavorazioni, setLavorazioni] = useState<Lavorazione[]>([]);
  const [magazzino, setMagazzino] = useState<Lavorazione[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [showMacchinaPicker, setShowMacchinaPicker] = useState(false);
  const [showMagazzinoPicker, setShowMagazzinoPicker] = useState(false);
  const [showFasePicker, setShowFasePicker] = useState<{ id: string } | null>(null);

  const checkPrivileges = useCallback(async () => {
    if (!profile) return;
    if (profile.role === 'ADMIN') { setAccessLevel('OPERATORE'); return; }
    const { data } = await supabase.from('l_permessi').select('livello_accesso').eq('user_id', profile.id).eq('sezione', 'LAVORO_PRODUZIONE').maybeSingle();
    if (data) setAccessLevel(data.livello_accesso as AccessLevel);
  }, [profile]);

  const fetchLavorazioni = useCallback(async (showLoader = true) => {
    if (!selectedMacchina) return;
    if (showLoader) setLoading(true);
    try {
      const { data } = await supabase.from('l_lavorazioni').select(`*, l_clienti:id_cliente (*), l_macchine:id_macchina (*), l_fasi_di_lavorazione:id_fase (*)`).eq('id_macchina', selectedMacchina);
      if (data) setLavorazioni(data as any);
    } catch (e) { console.error(e); } finally { if (showLoader) setLoading(false); }
  }, [selectedMacchina]);

  const fetchMagazzino = useCallback(async () => {
    const { data } = await supabase.from('l_lavorazioni').select(`*, l_clienti:id_cliente (*)`).eq('id_macchina', 'MAG').eq('id_fase', 'ATT').eq('id_stato', 'ATT');
    if (data) setMagazzino(data as any);
  }, []);

  useEffect(() => { 
    checkPrivileges(); 
    supabase.from('l_macchine').select('*').order('macchina').then(({data}) => setMacchine(data || []));
    supabase.from('l_fasi_di_lavorazione').select('*').order('fase_di_lavorazione').then(({data}) => setFasi(data || []));
    fetchMagazzino();
    fetchLavorazioni();
  }, [checkPrivileges, fetchLavorazioni, fetchMagazzino]);

  const isOperatore = accessLevel === 'OPERATORE';

  const updateStatoLavorazione = async (id: string, nuovoStato: Stati) => {
    if (!isOperatore) return;
    setLoading(true);
    await supabase.from('l_lavorazioni').update({ id_stato: nuovoStato, ultimo_utente_id: profile?.id }).eq('id_lavorazione', id);
    await fetchLavorazioni(false);
  };

  const startLavorazione = async (id: string, faseId: string) => {
    if (!isOperatore) return;
    setLoading(true);
    await supabase.from('l_lavorazioni').update({ 
      id_fase: faseId, id_stato: Stati.PRO, inizio_lavorazione: new Date().toISOString(), ultimo_utente_id: profile?.id 
    }).eq('id_lavorazione', id);
    setShowFasePicker(null);
    await fetchLavorazioni(false);
  };

  const currentMacchina = macchine.find(m => m.id_macchina === selectedMacchina);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col pb-20 overflow-x-hidden">
      <div className="w-full max-w-6xl mx-auto p-4 flex flex-col gap-6">
        
        {/* Barra superiore bianca come da screenshot */}
        <div className="bg-white p-4 rounded-[2rem] shadow-sm flex justify-between items-center gap-4">
          <div className="flex items-center gap-4">
             <Link to="/lavoro" className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-slate-300"><ArrowLeft size={18} /></Link>
             <div className="flex flex-col">
                <div className="flex items-center gap-3">
                   <div className="flex bg-blue-600 text-white text-[9px] font-black px-3 py-1.5 rounded-lg items-center gap-2">
                      <Eye size={12} /> {accessLevel === 'OPERATORE' ? 'OPERATIVO' : 'VISUALIZZATORE'}
                   </div>
                   <button onClick={() => setShowMacchinaPicker(true)} className="p-1.5 bg-slate-50 rounded-lg text-slate-300"><Settings2 size={14} /></button>
                </div>
             </div>
          </div>
          <div className="flex gap-3">
             <button 
                onClick={() => isOperatore && setShowMagazzinoPicker(true)} 
                className={`px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 transition-all ${isOperatore ? 'bg-slate-50 text-slate-300' : 'bg-slate-50 text-slate-200 cursor-not-allowed opacity-50'}`}
             >
               <Plus size={16}/> PRELEVA
             </button>
             <button onClick={() => fetchLavorazioni(true)} className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20 active:scale-90 transition-all">
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
             </button>
          </div>
        </div>

        {/* Contenitore Blu Scuro */}
        <div className="bg-[#1e293b] rounded-[2.5rem] shadow-2xl p-8 space-y-6">
           <div className="flex justify-between items-center px-2">
              <h3 className="text-white font-black uppercase tracking-widest text-[11px] flex items-center gap-3 italic">
                 <Activity size={18} className="text-white" /> ATTIVITÀ {currentMacchina?.id_macchina}
              </h3>
              <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase italic tracking-widest">
                 <History size={12}/> AUDIT ACTIVE
              </div>
           </div>

           {/* Lista Lavorazioni Stile Screenshot */}
           <div className="space-y-4">
             {lavorazioni.filter(l => l.id_stato === Stati.PRO).map(l => (
                <div key={l.id_lavorazione} className="bg-[#0ea5e9] p-8 rounded-[2.5rem] flex items-center justify-between shadow-xl relative overflow-hidden group">
                   <div className="relative z-10 flex flex-col gap-1">
                      <div className="flex items-baseline gap-3">
                         <h4 className="font-black text-6xl text-white italic tracking-tighter leading-none">{l.scheda}</h4>
                         <span className="bg-white/20 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase">PROD</span>
                      </div>
                      <p className="text-white font-black uppercase text-sm italic tracking-tight opacity-90">{l.l_clienti?.cliente}</p>
                   </div>
                   
                   <div className="relative z-10 flex items-center gap-10">
                      <div className="flex flex-col items-end">
                         <span className="text-white/60 text-[10px] font-black uppercase italic">MISURA</span>
                         <span className="text-white font-black text-4xl italic leading-none">{l.misura}</span>
                      </div>
                      
                      <div className="bg-white p-4 rounded-3xl shadow-lg w-16 h-16 flex items-center justify-center">
                         {!isOperatore ? (
                           <Lock size={28} className="text-slate-200" />
                         ) : (
                           <button onClick={() => updateStatoLavorazione(l.id_lavorazione, Stati.TER)} className="text-blue-600 hover:scale-110 transition-transform">
                              <ShieldCheck size={28} />
                           </button>
                         )}
                      </div>
                   </div>
                </div>
             ))}
             {lavorazioni.filter(l => l.id_stato === Stati.PRO).length === 0 && (
               <div className="py-12 text-center text-slate-500 font-black uppercase text-[10px] italic tracking-[0.3em]">Nessuna lavorazione attiva</div>
             )}
           </div>
        </div>
      </div>

      <Chat />
      {showMacchinaPicker && (
        <div className="fixed inset-0 bg-slate-950/95 flex items-center justify-center p-4 z-[2000] backdrop-blur-xl">
           <div className="bg-white rounded-[3rem] p-12 w-full max-w-sm shadow-2xl text-center">
              <h3 className="font-black uppercase italic tracking-tighter text-2xl mb-8">Unità Operativa</h3>
              <div className="grid grid-cols-2 gap-3 mb-10">
                 {macchine.map(m => (
                    <button key={m.id_macchina} onClick={() => { setSelectedMacchina(m.id_macchina); localStorage.setItem('kme_selected_macchina', m.id_macchina); setShowMacchinaPicker(false); fetchLavorazioni(true); }} className={`p-6 rounded-3xl border-2 font-black text-[10px] uppercase transition-all ${selectedMacchina === m.id_macchina ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>{m.macchina}</button>
                 ))}
              </div>
              <button onClick={() => setShowMacchinaPicker(false)} className="text-[10px] font-black uppercase text-slate-400">Chiudi</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default Produzione;
