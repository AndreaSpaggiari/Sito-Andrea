
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Lavorazione, Macchina, FaseLavorazione, Stati, UserProfile, AccessLevel } from '../types';
import Chat from '../components/Chat';
import { ArrowLeft, RefreshCw, X, Laptop, ClipboardList, Activity, Plus, Settings2, ArrowRight, Eye, ShieldCheck, Lock, Inbox, PlayCircle, History } from 'lucide-react';

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
    // Verifica il permesso granulare per questa sottosezione
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
    // Audit Trail: salviamo chi ha fatto l'ultima modifica
    await supabase.from('l_lavorazioni').update({ 
      id_stato: nuovoStato, 
      ultimo_utente_id: profile?.id 
    }).eq('id_lavorazione', id);
    await fetchLavorazioni(false);
  };

  const startLavorazione = async (id: string, faseId: string) => {
    if (!isOperatore) return;
    setLoading(true);
    // Audit Trail e timestamp inizio
    await supabase.from('l_lavorazioni').update({ 
      id_fase: faseId, 
      id_stato: Stati.PRO, 
      inizio_lavorazione: new Date().toISOString(), 
      ultimo_utente_id: profile?.id 
    }).eq('id_lavorazione', id);
    setShowFasePicker(null);
    await fetchLavorazioni(false);
  };

  const prelevaDalMagazzino = async (lavorazioneId: string) => {
    if (!isOperatore) return;
    setLoading(true);
    await supabase.from('l_lavorazioni').update({ 
      id_macchina: selectedMacchina, 
      ultimo_utente_id: profile?.id 
    }).eq('id_lavorazione', lavorazioneId);
    setShowMagazzinoPicker(false); 
    fetchLavorazioni(false); 
    fetchMagazzino();
  };

  // Layout Screenshot: "Attività" contiene i "PREP" (PRE) e i "PROD" (PRO)
  const proItems = useMemo(() => lavorazioni.filter(l => l.id_stato === Stati.PRE || l.id_stato === Stati.PRO).sort((a,b) => (a.id_stato === Stati.PRO ? -1 : 1)), [lavorazioni]);
  
  // Layout Screenshot: "Coda Attesa" contiene gli "ATT"
  const attItems = useMemo(() => lavorazioni.filter(l => l.id_stato === Stati.ATT).sort((a,b) => a.scheda - b.scheda), [lavorazioni]);

  const currentMacchina = macchine.find(m => m.id_macchina === selectedMacchina);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col pb-20 overflow-x-hidden">
      <div className="w-full max-w-[1700px] mx-auto p-4 flex flex-col gap-6">
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
             <Link to="/lavoro" className="p-2 bg-slate-100 rounded-lg"><ArrowLeft size={20} /></Link>
             <div>
                <h1 className="text-xl font-black italic uppercase leading-none">{currentMacchina?.macchina || 'UNITÀ NON SCELTA'}</h1>
                <div className="flex items-center gap-2 mt-1">
                   {isOperatore ? (
                     <span className="bg-emerald-600 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase flex items-center gap-1 shadow-md shadow-emerald-500/20"><ShieldCheck size={8} /> OPERATORE</span>
                   ) : (
                     <span className="bg-blue-600 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase flex items-center gap-1 shadow-md shadow-blue-500/20"><Eye size={8} /> VISUALIZZATORE</span>
                   )}
                   <button onClick={() => setShowMacchinaPicker(true)} className="p-1 bg-slate-100 rounded hover:bg-slate-200 transition-colors"><Settings2 size={12} /></button>
                </div>
             </div>
          </div>
          <div className="flex gap-2">
             <button 
               onClick={() => isOperatore && setShowMagazzinoPicker(true)} 
               disabled={!isOperatore}
               className={`px-6 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 transition-all ${isOperatore ? 'bg-slate-950 text-white shadow-xl hover:scale-95' : 'bg-slate-200 text-slate-400 opacity-50 cursor-not-allowed'}`}
             >
               <Plus size={16}/> PRELEVA
             </button>
             <button onClick={() => fetchLavorazioni(true)} className="p-3 bg-blue-600 text-white rounded-xl shadow-lg active:scale-90 transition-all"><RefreshCw size={20} className={loading ? 'animate-spin' : ''} /></button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
          {/* COLONNA SINISTRA: ATTIVITÀ (PRE E PRO) */}
          <div className="bg-[#1e293b] rounded-[2.5rem] shadow-2xl p-6 space-y-4 min-h-[500px]">
             <h3 className="text-white font-black uppercase tracking-widest text-[10px] mb-4 flex justify-between items-center px-2">
                <div className="flex items-center gap-2"><Activity size={16} /> ATTIVITÀ {currentMacchina?.id_macchina}</div>
                <div className="flex items-center gap-1.5 opacity-40 italic"><History size={12}/> AUDIT ACTIVE</div>
             </h3>
             {proItems.length === 0 && <div className="py-20 text-center text-slate-600 font-black uppercase text-xs tracking-widest italic">Nessun lavoro in corso</div>}
             {proItems.map(l => (
                <div key={l.id_lavorazione} className={`p-6 rounded-[2rem] flex items-center justify-between border-l-[12px] shadow-xl transition-all ${l.id_stato === Stati.PRO ? 'bg-sky-500 border-sky-800' : 'bg-white border-slate-300'}`}>
                   <div>
                      <div className="flex items-center gap-3">
                         <h4 className={`font-black text-4xl italic leading-none ${l.id_stato === Stati.PRO ? 'text-white' : 'text-slate-900'}`}>{l.scheda}</h4>
                         <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${l.id_stato === Stati.PRO ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{l.id_stato === Stati.PRO ? 'PROD' : 'PREP'}</span>
                      </div>
                      <p className={`text-[12px] font-black uppercase mt-1 truncate max-w-[200px] leading-tight tracking-tight ${l.id_stato === Stati.PRO ? 'text-white' : 'text-slate-500'}`}>{l.l_clienti?.cliente}</p>
                   </div>
                   <div className="flex items-center gap-8">
                      <div className="text-right">
                         <span className={`text-[9px] font-black uppercase block ${l.id_stato === Stati.PRO ? 'text-white/60' : 'text-slate-400'}`}>Misura</span>
                         <span className={`text-2xl font-black italic ${l.id_stato === Stati.PRO ? 'text-white' : 'text-slate-900'}`}>{l.misura}</span>
                      </div>
                      <div className="flex gap-2">
                         {isOperatore ? (
                           <>
                             {l.id_stato === Stati.PRE && <button onClick={() => setShowFasePicker({ id: l.id_lavorazione })} className="px-6 py-4 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all">AVVIA</button>}
                             {l.id_stato === Stati.PRO && <button onClick={() => updateStatoLavorazione(l.id_lavorazione, Stati.TER)} className="px-6 py-4 bg-white text-blue-900 rounded-xl font-black text-[10px] uppercase border-2 border-blue-800 shadow-xl active:scale-95 transition-all">FINISH</button>}
                           </>
                         ) : <div className="p-4 bg-slate-100 text-slate-300 rounded-2xl border border-slate-200"><Lock size={18} /></div>}
                      </div>
                   </div>
                </div>
             ))}
          </div>

          {/* COLONNA DESTRA: CODA ATTESA (ATT) */}
          <div className="bg-[#f29f05] rounded-[2.5rem] shadow-2xl p-6 space-y-4 min-h-[500px]">
             <h3 className="text-white font-black uppercase tracking-widest text-[10px] mb-4 flex items-center gap-2"><ClipboardList size={16} /> CODA ATTESA</h3>
             {attItems.length === 0 && <div className="py-20 text-center text-amber-900/30 font-black uppercase text-xs tracking-widest italic">Coda vuota</div>}
             {attItems.map(l => (
                <div key={l.id_lavorazione} className="bg-[#ffa500] p-6 rounded-[2rem] border-l-[12px] border-[#cc8400] flex items-center justify-between shadow-xl">
                   <div>
                      <h4 className="font-black text-4xl italic leading-none text-slate-950">{l.scheda}</h4>
                      <p className="text-[12px] font-black uppercase mt-1 text-amber-950 truncate max-w-[200px]">{l.l_clienti?.cliente}</p>
                   </div>
                   <div className="flex items-center gap-8">
                      <div className="text-right">
                         <span className="text-[9px] font-black text-amber-900 uppercase block mb-0.5">Misura</span>
                         <span className="text-2xl font-black italic text-slate-950">{l.misura}</span>
                      </div>
                      {isOperatore ? (
                         <button onClick={() => updateStatoLavorazione(l.id_lavorazione, Stati.PRE)} className="p-5 bg-white text-amber-900 rounded-2xl shadow-xl active:scale-90 transition-all border-2 border-amber-700/20"><PlayCircle size={28} /></button>
                      ) : <div className="p-5 bg-amber-600/30 text-amber-900/40 rounded-2xl"><Eye size={24} /></div>}
                   </div>
                </div>
             ))}
          </div>
        </div>
      </div>

      {/* MODALI PICKER (MACCHINA, MAGAZZINO, FASE) */}
      {showMagazzinoPicker && isOperatore && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-[200]">
           <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-slate-200">
              <div className="bg-slate-950 p-8 text-white flex justify-between items-center">
                 <div className="flex items-center gap-4"><Inbox size={24}/><h3 className="font-black text-2xl uppercase italic tracking-tighter">Preleva da Magazzino</h3></div>
                 <button onClick={() => setShowMagazzinoPicker(false)} className="hover:rotate-90 transition-transform"><X size={32}/></button>
              </div>
              <div className="p-8 overflow-y-auto space-y-4 bg-slate-50 flex-grow custom-scrollbar">
                 {magazzino.length === 0 && <div className="py-20 text-center text-slate-400 font-black uppercase text-xs italic tracking-widest">Nessuna scheda disponibile in magazzino</div>}
                 {magazzino.map(s => (
                    <button key={s.id_lavorazione} onClick={() => prelevaDalMagazzino(s.id_lavorazione)} className="w-full bg-white border border-slate-200 p-6 rounded-[2rem] flex justify-between items-center hover:border-blue-500 hover:shadow-xl transition-all group">
                       <div className="text-left"><span className="text-[9px] font-black text-slate-400 uppercase block">SCHEDA</span><span className="text-3xl font-black italic text-slate-900">{s.scheda}</span></div>
                       <div className="p-4 bg-slate-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all"><Plus size={24} /></div>
                    </button>
                 ))}
              </div>
           </div>
        </div>
      )}

      {showFasePicker && isOperatore && (
         <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
            <div className="bg-white p-10 rounded-[2.5rem] w-full max-w-xs text-center shadow-2xl relative overflow-hidden">
               <h4 className="font-black uppercase tracking-widest text-[10px] text-slate-400 mb-8 italic">Tipo Lavorazione</h4>
               <div className="flex flex-col gap-3">
                  {fasi.filter(f => f.id_fase !== 'ATT').map(f => (
                     <button key={f.id_fase} onClick={() => startLavorazione(showFasePicker.id, f.id_fase)} className="p-5 bg-slate-50 border border-slate-100 rounded-2xl font-black uppercase text-[11px] hover:bg-blue-600 hover:text-white hover:shadow-xl transition-all flex justify-between items-center group">
                        <span>{f.fase_di_lavorazione}</span><ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                     </button>
                  ))}
               </div>
               <button onClick={() => setShowFasePicker(null)} className="mt-8 text-[9px] font-black text-slate-400 uppercase tracking-widest">Annulla</button>
            </div>
         </div>
      )}

      {showMacchinaPicker && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 z-[2000]">
           <div className="bg-white rounded-[3rem] p-10 w-full max-w-sm shadow-2xl text-center">
              <h3 className="font-black uppercase italic tracking-tighter text-2xl mb-8">Unità Operativa</h3>
              <div className="grid grid-cols-2 gap-3 mb-10">
                 {macchine.map(m => (
                    <button key={m.id_macchina} onClick={() => { setSelectedMacchina(m.id_macchina); localStorage.setItem('kme_selected_macchina', m.id_macchina); setShowMacchinaPicker(false); fetchLavorazioni(true); }} className={`p-6 rounded-3xl border-2 font-black text-[10px] uppercase transition-all ${selectedMacchina === m.id_macchina ? 'bg-blue-600 border-blue-600 text-white shadow-xl' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-blue-500'}`}>{m.macchina}</button>
                 ))}
              </div>
              <button onClick={() => setShowMacchinaPicker(false)} className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Chiudi</button>
           </div>
        </div>
      )}

      <Chat />
      {loading && <div className="fixed inset-0 bg-slate-950/90 flex flex-col items-center justify-center z-[9999]"><RefreshCw className="text-blue-600 animate-spin mb-4" size={48} /><p className="text-white text-[10px] font-black uppercase tracking-widest italic animate-pulse">Sincronizzazione Unità...</p></div>}
    </div>
  );
};

export default Produzione;
