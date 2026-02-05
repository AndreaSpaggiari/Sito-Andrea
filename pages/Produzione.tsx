
// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  Lavorazione, 
  Macchina, 
  FaseLavorazione, 
  Stati,
  UserProfile,
  AccessLevel
} from '../types';
import Chat from '../components/Chat';
import { 
  ArrowLeft, RefreshCw, CheckCircle2, X, 
  Activity, Plus, Settings2, Calendar, Inbox, 
  ChevronLeft, ChevronRight, PlayCircle, Layers, Box, Eye, ShieldAlert
} from 'lucide-react';

interface Props {
  profile: UserProfile | null;
}

const formatDateForDisplay = (dateStr: string | null) => {
  if (!dateStr) return 'N/D';
  try {
    const date = new Date(dateStr);
    const months = ['GEN', 'FEB', 'MAR', 'APR', 'MAG', 'GIU', 'LUG', 'AGO', 'SET', 'OTT', 'NOV', 'DIC'];
    return `${date.getDate().toString().padStart(2, '0')} ${months[date.getMonth()]}`;
  } catch (e) { return dateStr; }
};

const formatDate = (date: Date) => date.toISOString().split('T')[0];

const Produzione: React.FC<Props> = ({ profile }) => {
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('VISUALIZZATORE');
  const [selectedMacchina, setSelectedMacchina] = useState<string | null>(() => {
    const saved = localStorage.getItem('kme_selected_macchina');
    return (saved && saved !== 'null') ? saved : null;
  });
  
  const [macchine, setMacchine] = useState<Macchina[]>([]);
  const [fasi, setFasi] = useState<FaseLavorazione[]>([]);
  const [lavorazioni, setLavorazioni] = useState<Lavorazione[]>([]);
  const [magazzino, setMagazzino] = useState<Lavorazione[]>([]);
  const [filterDate, setFilterDate] = useState(formatDate(new Date()));
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('SYNC...');
  const [showMacchinaPicker, setShowMacchinaPicker] = useState(false);
  const [showMagazzinoPicker, setShowMagazzinoPicker] = useState(false);
  const [showFasePicker, setShowFasePicker] = useState<{ id: string } | null>(null);
  const [showTerminaPicker, setShowTerminaPicker] = useState<Lavorazione | null>(null);
  const [sortCriteria, setSortCriteria] = useState<'scheda' | 'cliente' | 'data' | 'misura'>('scheda');

  const isOperator = profile?.role === 'ADMIN' || accessLevel === 'OPERATORE';

  const fetchAccess = useCallback(async () => {
    if (profile?.role === 'ADMIN') {
      setAccessLevel('OPERATORE');
      return;
    }
    const { data } = await supabase
      .from('l_permessi')
      .select('livello')
      .eq('user_id', profile?.id)
      .eq('sezione', 'LAVORO')
      .eq('sottosezione', 'PRODUZIONE')
      .maybeSingle();
    if (data) setAccessLevel(data.livello as AccessLevel);
  }, [profile]);

  const fetchMeta = useCallback(async () => {
    const { data: m } = await supabase.from('l_macchine').select('*').order('macchina');
    const { data: f } = await supabase.from('l_fasi_di_lavorazione').select('*').order('fase_di_lavorazione');
    const escluse = ['CASSONE', 'UFFICIO', 'MAGAZZINO', 'IMBALLAGGIO'];
    setMacchine((m || []).filter(item => !escluse.includes(item.macchina.toUpperCase())));
    if (f) setFasi(f);
  }, []);

  const fetchMagazzino = useCallback(async () => {
    const { data } = await supabase.from('l_lavorazioni').select(`*, l_clienti:id_cliente (*)`).eq('id_macchina', 'MAG').eq('id_stato', 'ATT');
    if (data) setMagazzino(data);
  }, []);

  const fetchLavorazioni = useCallback(async (showLoader = true) => {
    if (!selectedMacchina) return;
    if (showLoader) { setLoading(true); setLoadingMsg('Sincronizzazione Unità...'); }
    const { data } = await supabase.from('l_lavorazioni').select(`*, l_clienti:id_cliente (*), l_macchine:id_macchina (*), l_fasi_di_lavorazione:id_fase (*)`).eq('id_macchina', selectedMacchina);
    if (data) setLavorazioni(data);
    setLoading(false);
  }, [selectedMacchina]);

  useEffect(() => { fetchAccess(); fetchMeta(); fetchMagazzino(); }, [fetchAccess, fetchMeta, fetchMagazzino]);
  useEffect(() => { if (!selectedMacchina) setShowMacchinaPicker(true); }, [selectedMacchina]);
  useEffect(() => { fetchLavorazioni(); }, [fetchLavorazioni]);

  const updateStato = async (id: string, nuovoStato: Stati) => {
    if (!isOperator) return;
    setLoading(true);
    await supabase.from('l_lavorazioni').update({ id_stato: nuovoStato }).eq('id_lavorazione', id);
    await fetchLavorazioni(false);
  };

  const assegnaMacchina = async (scheda: Lavorazione) => {
    if (!selectedMacchina || !isOperator) return;
    setLoading(true);
    await supabase.from('l_lavorazioni').update({ id_macchina: selectedMacchina }).eq('id_lavorazione', scheda.id_lavorazione);
    setShowMagazzinoPicker(false);
    fetchMagazzino();
    fetchLavorazioni(false);
  };

  const startLavorazione = async (id: string, faseId: string) => {
    if (!isOperator) return;
    setLoading(true);
    await supabase.from('l_lavorazioni').update({ id_fase: faseId, id_stato: Stati.PRO, inizio_lavorazione: new Date().toISOString() }).eq('id_lavorazione', id);
    setShowFasePicker(null);
    fetchLavorazioni(false);
  };

  const finishLavorazione = async (l: Lavorazione, kg: number, metri: number, nastri: number, pezzi: number) => {
    if (!isOperator) return;
    setLoading(true);
    await supabase.from('l_lavorazioni').update({ id_stato: Stati.TER, fine_lavorazione: new Date().toISOString(), ordine_kg_lavorato: kg, metri_avvolti: metri, numero_passate: nastri, numero_pezzi: pezzi }).eq('id_lavorazione', l.id_lavorazione);
    setShowTerminaPicker(null);
    fetchLavorazioni(false);
  };

  const proItems = useMemo(() => {
    const orderMap: Record<string, number> = { [Stati.PRE]: 1, [Stati.PRO]: 2, [Stati.TER]: 3 };
    return lavorazioni
      .filter(l => l.id_stato === Stati.PRE || l.id_stato === Stati.PRO || (l.id_stato === Stati.TER && l.fine_lavorazione?.startsWith(filterDate)))
      .sort((a, b) => (orderMap[a.id_stato] || 99) - (orderMap[b.id_stato] || 99));
  }, [lavorazioni, filterDate]);

  const attItems = useMemo(() => {
    return lavorazioni
      .filter(l => l.id_stato === Stati.ATT)
      .sort((a, b) => {
        if (sortCriteria === 'scheda') return a.scheda - b.scheda;
        if (sortCriteria === 'cliente') return (a.l_clienti?.cliente || '').localeCompare(b.l_clienti?.cliente || '');
        if (sortCriteria === 'misura') return a.misura - b.misura;
        if (sortCriteria === 'data') return (a.data_consegna || '9999-12-31').localeCompare(b.data_consegna || '9999-12-31');
        return 0;
      });
  }, [lavorazioni, sortCriteria]);

  const currentMacchinaName = useMemo(() => macchine.find(m => m.id_macchina === selectedMacchina)?.macchina || 'POSTAZIONE', [macchine, selectedMacchina]);

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-slate-100 flex flex-col pb-10">
      
      {!isOperator && (
        <div className="bg-amber-600 p-2 text-center text-slate-950 font-black text-[9px] uppercase tracking-[0.4em] flex items-center justify-center gap-4">
           <Eye size={12} /> MODALITÀ SOLA LETTURA - FUNZIONI OPERATIVE DISABILITATE <Eye size={12} />
        </div>
      )}

      <div className="w-full max-w-[1900px] mx-auto p-4 flex flex-col gap-6">
        
        <div className="sticky top-[73px] z-40 py-2">
          <div className="bg-white/5 backdrop-blur-2xl p-6 rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col lg:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-6">
              <Link to="/lavoro" className="p-3 bg-white/5 rounded-2xl text-white/40 hover:text-white transition-all border border-white/5 hover:border-white/20 shadow-xl"><ArrowLeft size={22} /></Link>
              <div>
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em] block mb-1">UNITÀ OPERATIVA</span>
                <div className="flex items-center gap-4">
                  <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none">{currentMacchinaName}</h1>
                  <button onClick={() => setShowMacchinaPicker(true)} className="p-2.5 bg-white/5 text-blue-400 rounded-xl hover:bg-white/10 transition-all border border-blue-500/20 shadow-lg"><Settings2 size={18} /></button>
                </div>
              </div>
            </div>

            <div className="flex items-center bg-black/40 p-2 rounded-3xl border border-white/5">
               <button onClick={() => { let d = new Date(filterDate); d.setDate(d.getDate()-1); setFilterDate(formatDate(d)); }} className="p-2.5 text-white/20 hover:text-white transition-colors"><ChevronLeft size={24} /></button>
               <div className="px-6 flex items-center gap-3">
                  <Calendar size={18} className="text-amber-500" />
                  <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="bg-transparent text-white font-bold uppercase tracking-widest outline-none text-xs" />
               </div>
               <button onClick={() => { let d = new Date(filterDate); d.setDate(d.getDate()+1); setFilterDate(formatDate(d)); }} className="p-2.5 text-white/20 hover:text-white transition-colors"><ChevronRight size={24} /></button>
            </div>

            <div className="flex gap-3">
               {isOperator && (
                 <button onClick={() => { fetchMagazzino(); setShowMagazzinoPicker(true); }} className="px-8 py-5 bg-white text-slate-950 rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-2xl flex items-center gap-3 active:scale-95 transition-all"><Inbox size={20} /> PRELEVA</button>
               )}
               <button onClick={() => fetchLavorazioni(true)} className="p-5 bg-white/5 text-white/60 hover:text-white rounded-[1.5rem] shadow-xl border border-white/10 active:scale-90 transition-all"><RefreshCw size={22} className={loading ? 'animate-spin' : ''} /></button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          <div className="bg-white/[0.02] backdrop-blur-xl rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden min-h-[850px] flex flex-col">
            <div className="px-10 py-8 flex justify-between items-center border-b border-white/5">
               <div className="flex items-center gap-4 text-white">
                  <Activity size={22} className="text-blue-500" />
                  <h2 className="font-black uppercase italic tracking-widest text-base">ATTIVITÀ POSTAZIONE</h2>
               </div>
               <span className="bg-blue-600/20 text-blue-400 px-5 py-2 rounded-2xl text-xs font-black border border-blue-500/20 shadow-lg">{proItems.length} SCHEDE</span>
            </div>
            
            <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
               {proItems.map(l => {
                 const isPro = l.id_stato === Stati.PRO;
                 const isPre = l.id_stato === Stati.PRE;
                 const isTer = l.id_stato === Stati.TER;
                 
                 const cardBg = isPro ? 'bg-sky-400/20 border-sky-400/30 shadow-[0_0_20px_rgba(56,189,248,0.1)]' : 
                               isPre ? 'bg-slate-400/20 border-slate-400/30' : 
                               'bg-emerald-400/20 border-emerald-400/30';

                 return (
                   <div key={l.id_lavorazione} className={`p-8 rounded-[2.5rem] border transition-all relative overflow-hidden group ${cardBg}`}>
                      {isPro && <div className="absolute top-0 left-0 w-1.5 h-full bg-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.6)]"></div>}
                      
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
                        <div className="flex flex-col gap-3 flex-1">
                          <div className="flex items-center gap-4">
                             <span className="text-4xl font-black text-white italic tracking-tighter leading-none">{l.scheda}</span>
                             <div className="flex gap-2">
                                <span className="bg-white/10 px-2.5 py-1 rounded-lg text-[9px] font-bold text-white uppercase border border-white/20">
                                  {l.mcoil_lega} <span className="opacity-60 ml-1">{l.mcoil_stato_fisico}</span>
                                </span>
                             </div>
                          </div>
                          <div>
                            <h4 className="text-2xl font-bold text-white uppercase tracking-tight leading-none truncate max-w-[280px]">{l.l_clienti?.cliente}</h4>
                            <div className="flex items-center gap-2 mt-2">
                               <div className={`w-1.5 h-1.5 rounded-full ${isPro ? 'bg-sky-400 animate-pulse' : isPre ? 'bg-slate-400' : 'bg-emerald-400'}`}></div>
                               <p className="text-[9px] font-black text-white/60 uppercase tracking-widest">{l.l_fasi_di_lavorazione?.fase_di_lavorazione || 'ATTESA SETUP'}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-10">
                           <div className="grid grid-cols-3 gap-x-6 gap-y-4">
                              <div className="text-center">
                                 <span className="text-[9px] font-bold text-white/40 uppercase block mb-1">ORDINATO KG</span>
                                 <span className="text-xl font-black text-white italic">{l.ordine_kg_richiesto?.toLocaleString() || '--'}</span>
                              </div>
                              <div className="text-center">
                                 <span className="text-[9px] font-bold text-sky-400/60 uppercase block mb-1">SPESSORE</span>
                                 <span className="text-xl font-black text-sky-400 italic">{l.spessore} <span className="text-[10px] opacity-40 not-italic">MM</span></span>
                              </div>
                              <div className="text-center">
                                 <span className="text-[9px] font-bold text-white/40 uppercase block mb-1">MISURA</span>
                                 <span className="text-xl font-black text-amber-400 italic">{l.misura} <span className="text-[10px] opacity-30 not-italic">MM</span></span>
                              </div>
                           </div>
                           
                           <div className="flex min-w-[140px] justify-end">
                             {isOperator && isPre && (
                               <button onClick={() => setShowFasePicker({ id: l.id_lavorazione })} className="w-14 h-14 bg-slate-700 text-white rounded-2xl flex items-center justify-center shadow-2xl hover:bg-slate-600 transition-all active:scale-95 border border-white/20"><PlayCircle size={28} fill="white"/></button>
                             )}
                             {isOperator && isPro && (
                               <button onClick={() => setShowTerminaPicker(l)} className="px-6 py-4 bg-sky-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl active:scale-95 transition-all border border-sky-400/40">CHIUDI</button>
                             )}
                             {!isOperator && (isPre || isPro) && (
                               <div className="w-14 h-14 bg-white/5 text-white/10 rounded-2xl flex items-center justify-center border border-dashed border-white/10"><Eye size={20} /></div>
                             )}
                             {isTer && (
                               <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-400/30 shadow-inner"><CheckCircle2 size={24} /></div>
                             )}
                           </div>
                        </div>
                      </div>
                   </div>
                 );
               })}
            </div>
          </div>

          <div className="bg-white/[0.02] backdrop-blur-xl rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden min-h-[850px] flex flex-col">
             <div className="px-10 py-8 flex justify-between items-center border-b border-white/5 bg-amber-600/[0.03]">
                <div className="flex items-center gap-4 text-white">
                   <Layers size={22} className="text-amber-500" />
                   <h2 className="font-black uppercase italic tracking-widest text-base">CODA ATTESA</h2>
                </div>
                <div className="flex gap-2">
                   {['SCHEDA', 'CLIENTE', 'MISURA', 'DATA'].map(c => (
                     <button key={c} onClick={() => setSortCriteria(c.toLowerCase() as any)} className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all ${sortCriteria === c.toLowerCase() ? 'bg-amber-600 text-slate-950' : 'bg-white/5 text-white/40 hover:text-white'}`}>{c}</button>
                   ))}
                </div>
             </div>

             <div className="p-8 space-y-4 overflow-y-auto custom-scrollbar">
                {attItems.map(l => (
                  <div key={l.id_lavorazione} className="bg-amber-400/20 border border-amber-400/30 p-8 rounded-[2.5rem] shadow-xl flex items-center justify-between group hover:bg-amber-400/30 transition-all relative">
                     <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-4">
                           <span className="text-3xl font-black text-white italic leading-none">{l.scheda}</span>
                           <div className="flex gap-2">
                             <span className="bg-amber-600/20 px-2 py-0.5 rounded text-[8px] font-black text-amber-100 uppercase border border-amber-600/30">{l.mcoil_lega} <span className="opacity-50">{l.mcoil_stato_fisico}</span></span>
                           </div>
                        </div>
                        <h4 className="text-xl font-bold text-white uppercase leading-tight truncate max-w-[200px]">{l.l_clienti?.cliente}</h4>
                        {l.data_consegna && (
                          <div className="flex items-center gap-1.5">
                            <Calendar size={10} className="text-amber-500" />
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">D.Cli: {formatDateForDisplay(l.data_consegna)}</span>
                          </div>
                        )}
                     </div>

                     <div className="flex items-center gap-10">
                        <div className="flex gap-10 text-right items-center">
                           <div className="text-center">
                              <span className="text-[9px] font-bold text-white/40 uppercase block mb-1">ORDINATO KG</span>
                              <span className="text-base font-black text-white italic whitespace-nowrap">{l.ordine_kg_richiesto?.toLocaleString() || '--'}</span>
                           </div>
                           <div className="text-center">
                              <span className="text-[9px] font-bold text-sky-400/60 uppercase block mb-1">SPESSORE</span>
                              <span className="text-base font-black text-sky-400 italic tabular-nums">{l.spessore}</span>
                           </div>
                           <div className="text-center">
                              <span className="text-[9px] font-bold text-white/40 uppercase block mb-1">MISURA</span>
                              <span className="text-2xl font-black text-amber-400 italic tabular-nums">{l.misura}</span>
                           </div>
                        </div>
                        {isOperator ? (
                          <button onClick={() => updateStato(l.id_lavorazione, Stati.PRE)} className="w-12 h-12 bg-amber-500 text-slate-900 rounded-xl flex items-center justify-center shadow-xl active:scale-95 hover:bg-amber-400 transition-all group-hover:shadow-amber-500/40">
                             <Plus size={24} />
                          </button>
                        ) : (
                          <div className="w-12 h-12 bg-white/5 text-white/10 rounded-xl flex items-center justify-center border border-dashed border-white/10">
                             <Eye size={18} />
                          </div>
                        )}
                     </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>

      {showMacchinaPicker && (
        <div className="fixed inset-0 bg-[#0a0f1a]/95 backdrop-blur-2xl flex items-center justify-center p-4 z-[1000] animate-in fade-in duration-300">
          <div className="bg-white/[0.02] rounded-[3rem] w-full max-w-lg shadow-[0_0_100px_rgba(0,0,0,0.5)] p-12 border border-white/10 flex flex-col text-center">
            <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto mb-8 flex items-center justify-center shadow-2xl shadow-blue-500/20">
               <Settings2 size={40} className="text-white" />
            </div>
            <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-10">Sincronizzazione Unità</h3>
            <div className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[50vh] pr-2 custom-scrollbar">
              {macchine.map(m => (
                <button 
                  key={m.id_macchina} 
                  onClick={() => { setSelectedMacchina(m.id_macchina); localStorage.setItem('kme_selected_macchina', m.id_macchina); setShowMacchinaPicker(false); }} 
                  className={`p-6 border-2 rounded-3xl font-black uppercase italic transition-all active:scale-95 ${
                    selectedMacchina === m.id_macchina 
                      ? 'bg-blue-600 border-blue-600 text-white shadow-2xl' 
                      : 'bg-white/5 border-white/5 text-white/40 hover:border-blue-500 hover:text-blue-500 hover:bg-blue-500/5'
                  }`}
                >
                  {m.macchina}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showMagazzinoPicker && isOperator && (
        <div className="fixed inset-0 bg-[#0a0f1a]/95 backdrop-blur-2xl flex items-center justify-center p-6 z-[200] animate-in zoom-in-95 duration-300">
          <div className="bg-white/[0.02] border border-white/10 rounded-[4rem] w-full max-w-4xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="p-10 flex justify-between items-center border-b border-white/5">
              <div className="flex items-center gap-4">
                 <Box size={28} className="text-amber-500" />
                 <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white">Master List Magazzino</h3>
              </div>
              <button onClick={() => setShowMagazzinoPicker(false)} className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center text-white/40 hover:text-white transition-all"><X size={28} /></button>
            </div>
            <div className="p-8 overflow-y-auto space-y-4 bg-black/20">
              {magazzino.length === 0 ? <p className="text-center py-32 text-white/10 font-black uppercase tracking-[0.5em]">Zero Unità Disponibili</p> : magazzino.map(s => (
                <button key={s.id_lavorazione} onClick={() => assegnaMacchina(s)} className="w-full bg-white/[0.03] border border-white/5 rounded-[2.5rem] p-8 flex items-center justify-between hover:bg-white/[0.06] hover:border-white/10 transition-all group">
                   <div className="flex flex-col text-left gap-1">
                     <span className="text-4xl font-black text-white italic leading-none">{s.scheda}</span>
                     <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{s.l_clienti?.cliente}</span>
                   </div>
                   <div className="flex items-center gap-12">
                     <div className="text-right">
                        <span className="text-[9px] font-bold text-white/20 block mb-1 uppercase tracking-widest">ORDER KG</span>
                        <span className="text-2xl font-black text-amber-500 italic tabular-nums">{s.ordine_kg_richiesto}</span>
                     </div>
                     <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-amber-600 group-hover:text-slate-950 transition-all border border-white/5 shadow-xl"><Plus size={32} /></div>
                   </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showFasePicker && isOperator && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-[1500] p-4">
          <div className="bg-white/[0.02] border border-white/10 rounded-[3rem] p-10 w-full max-w-sm shadow-2xl text-center flex flex-col gap-10">
            <div>
               <h3 className="text-xs font-black uppercase tracking-[0.4em] text-white/30 italic mb-2">SETUP PROCESSO</h3>
               <p className="text-xl font-bold text-white">Scegli Tipo Lavorazione</p>
            </div>
            <div className="flex flex-col gap-4">
              {fasi.filter(f => f.id_fase !== 'ATT').map(f => (
                <button key={f.id_fase} onClick={() => startLavorazione(showFasePicker.id, f.id_fase)} className="p-8 bg-white/5 hover:bg-sky-500 hover:text-white rounded-3xl font-black text-xs uppercase tracking-widest transition-all border border-white/5 shadow-xl active:scale-95">{f.fase_di_lavorazione}</button>
              ))}
            </div>
            <button onClick={() => setShowFasePicker(null)} className="text-[10px] font-black text-white/20 hover:text-white uppercase tracking-widest transition-colors">Torna Indietro</button>
          </div>
        </div>
      )}

      {showTerminaPicker && isOperator && (
        <TerminaModal lavorazione={showTerminaPicker} onClose={() => setShowTerminaPicker(null)} onConfirm={finishLavorazione} />
      )}

      {loading && (
        <div className="fixed inset-0 bg-[#0a0f1a]/95 backdrop-blur-3xl flex flex-col items-center justify-center z-[9999]">
          <div className="w-20 h-20 border-4 border-white/5 border-t-blue-600 rounded-full animate-spin mb-8 shadow-[0_0_30px_rgba(59,130,246,0.2)]" />
          <p className="text-sm font-black text-white/60 uppercase tracking-[0.6em] italic animate-pulse">{loadingMsg}</p>
        </div>
      )}
      
      <Chat />
    </div>
  );
};

const TerminaModal: React.FC<any> = ({ lavorazione, onClose, onConfirm }) => {
  const [kgInput, setKgInput] = useState<string>(String(lavorazione.ordine_kg_lavorato || ''));
  const [nastri, setNastri] = useState<number>(lavorazione.numero_passate || 1);
  const [pezzi, setPezzi] = useState<number>(lavorazione.numero_pezzi || 1);
  const [spessoreInput, setSpessoreInput] = useState<string>(String(lavorazione.spessore || ''));
  const [misuraInput, setMisuraInput] = useState<string>(String(lavorazione.misura || ''));

  const parseNum = (val: any) => {
    if (!val) return 0;
    let s = String(val).trim().replace(',', '.');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  };

  const metri = useMemo(() => {
    const p = parseNum(kgInput);
    const sp = parseNum(spessoreInput);
    const mi = parseNum(misuraInput);
    const n = parseNum(nastri);
    const pz = parseNum(pezzi);
    if (p <= 0 || sp <= 0 || mi <= 0) return 0;
    const rho = (lavorazione.mcoil_lega || '').toUpperCase().includes('OT') ? 8.50 : 8.96;
    const metriPerPezzo = (p * 1000) / (rho * sp * mi * pz);
    const metriTotali = metriPerPezzo * n;
    return isFinite(metriTotali) ? Math.round(metriTotali) : 0;
  }, [kgInput, spessoreInput, misuraInput, lavorazione.mcoil_lega, nastri, pezzi]);

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl flex items-center justify-center p-6 z-[9999] animate-in zoom-in duration-300">
      <div className="bg-white/[0.02] border border-white/10 rounded-[4rem] w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col p-12">
        <button onClick={onClose} className="absolute top-10 right-10 text-white/20 hover:text-white transition-colors z-20"><X size={32} /></button>
        <div className="space-y-12">
          <div className="text-center">
             <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-1">Dati Produzione</h3>
             <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] italic leading-none">TERMINA SCHEDA {lavorazione.scheda}</p>
          </div>
          <div className="bg-white/5 p-10 rounded-[3rem] border border-white/5 flex flex-col items-center shadow-inner relative group">
            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] mb-4">PESO EFFETTIVO KG</label>
            <input type="text" inputMode="decimal" value={kgInput} autoFocus onChange={(e) => setKgInput(e.target.value)} className="w-full bg-transparent font-black text-8xl text-center text-sky-400 outline-none tabular-nums placeholder-white/5" placeholder="00.0" />
          </div>
          <div className="grid grid-cols-2 gap-6">
             <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 text-center">
                <span className="text-[9px] font-bold text-white/40 uppercase block mb-2">NASTRI</span>
                <input type="number" value={nastri} onChange={e => setNastri(Number(e.target.value))} className="w-full bg-transparent font-black text-3xl text-center outline-none text-white tabular-nums" />
             </div>
             <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 text-center">
                <span className="text-[9px] font-bold text-white/40 uppercase block mb-2">PEZZI</span>
                <input type="number" value={pezzi} onChange={e => setPezzi(Number(e.target.value))} className="w-full bg-transparent font-black text-3xl text-center outline-none text-white tabular-nums" />
             </div>
          </div>
          <div className="bg-sky-500/80 p-10 rounded-[3rem] flex flex-col items-center justify-center gap-1 shadow-[0_0_50px_rgba(56,189,248,0.3)]">
            <span className="text-sm font-black text-white/50 uppercase tracking-[0.4em] italic mb-1">SVILUPPO CALCOLATO</span>
            <span className="text-6xl font-black text-white italic tracking-tighter tabular-nums">{metri} <span className="text-2xl not-italic opacity-40">MT</span></span>
          </div>
          <button onClick={() => onConfirm(lavorazione, parseNum(kgInput), metri, nastri, pezzi)} className="w-full bg-white py-6 rounded-[2rem] flex items-center justify-center gap-4 active:scale-95 shadow-2xl transition-all group border border-white">
            <CheckCircle2 size={32} className="text-sky-500 group-hover:scale-110" />
            <span className="text-sm font-black text-slate-900 uppercase tracking-[0.4em]">REGISTRA DATI</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Produzione;
