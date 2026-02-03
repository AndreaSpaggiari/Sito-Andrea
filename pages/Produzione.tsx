
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { 
  Lavorazione, 
  Macchina, 
  FaseLavorazione, 
  Stati
} from '../types';
import Chat from '../components/Chat';
import { 
  ArrowLeft, RefreshCw, CheckCircle2, PlayCircle, X, 
  Laptop, ClipboardList, Ruler, Activity, Plus, Layers, Hash, Settings2,
  CheckCircle, Scale, Weight, Inbox, Calendar, Tag, Info, ChevronLeft, ChevronRight,
  RotateCcw, Play, ArrowRight, Boxes
} from 'lucide-react';

const formatDateForDisplay = (dateStr: string | null) => {
  if (!dateStr) return 'N/D';
  try {
    const date = new Date(dateStr);
    const months = ['GEN', 'FEB', 'MAR', 'APR', 'MAG', 'GIU', 'LUG', 'AGO', 'SET', 'OTT', 'NOV', 'DIC'];
    const day = date.getDate().toString().padStart(2, '0');
    const month = months[date.getMonth()];
    return `${day} ${month}`;
  } catch (e) {
    return dateStr;
  }
};

const formatDate = (date: Date) => date.toISOString().split('T')[0];

const Produzione: React.FC = () => {
  const [selectedMacchina, setSelectedMacchina] = useState<string | null>(() => {
    const saved = localStorage.getItem('kme_selected_macchina');
    return (saved && saved !== 'null' && saved !== 'undefined') ? saved : null;
  });
  
  const [macchine, setMacchine] = useState<Macchina[]>([]);
  const [fasi, setFasi] = useState<FaseLavorazione[]>([]);
  const [lavorazioni, setLavorazioni] = useState<Lavorazione[]>([]);
  const [magazzino, setMagazzino] = useState<Lavorazione[]>([]);
  
  // Filtro Data
  const [filterDate, setFilterDate] = useState(formatDate(new Date()));

  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('CARICAMENTO...');
  const [metaLoaded, setMetaLoaded] = useState(false);
  
  const [showMacchinaPicker, setShowMacchinaPicker] = useState(false);
  const [showMagazzinoPicker, setShowMagazzinoPicker] = useState(false);
  const [showFasePicker, setShowFasePicker] = useState<{ id: string } | null>(null);
  const [showTerminaPicker, setShowTerminaPicker] = useState<Lavorazione | null>(null);
  const [sortCriteria, setSortCriteria] = useState<'scheda' | 'cliente' | 'data' | 'misura'>('scheda');

  const fetchMeta = useCallback(async () => {
    try {
      const { data: m } = await supabase.from('l_macchine').select('*').order('macchina');
      const { data: f } = await supabase.from('l_fasi_di_lavorazione').select('*').order('fase_di_lavorazione');
      
      const escluse = ['CASSONE', 'UFFICIO', 'MAGAZZINO', 'IMBALLAGGIO'];
      const filtrate = (m || []).filter(item => 
        !escluse.includes(item.macchina.toUpperCase()) && 
        !escluse.includes(item.id_macchina.toUpperCase())
      );

      setMacchine(filtrate);
      if (f) setFasi(f);
      setMetaLoaded(true);
    } catch (e) { console.error(e); }
  }, []);

  const fetchMagazzino = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('l_lavorazioni')
        .select(`*, l_clienti:id_cliente (*)`)
        .eq('id_macchina', 'MAG')
        .eq('id_fase', 'ATT')
        .eq('id_stato', 'ATT');
      if (data) setMagazzino(data);
    } catch (e) { console.error(e); }
  }, []);

  const fetchLavorazioni = useCallback(async (showLoader = true) => {
    if (!selectedMacchina) return;
    if (showLoader) { setLoading(true); setLoadingMsg('SINCRONIZZAZIONE...'); }
    try {
      const { data, error } = await supabase
        .from('l_lavorazioni')
        .select(`*, l_clienti:id_cliente (*), l_macchine:id_macchina (*), l_fasi_di_lavorazione:id_fase (*)`)
        .eq('id_macchina', selectedMacchina);
      
      if (error) throw error;
      if (data) setLavorazioni(data);
    } catch (e) { console.error("Errore fetch lavorazioni:", e); }
    finally { if (showLoader) setLoading(false); }
  }, [selectedMacchina]);

  useEffect(() => { 
    fetchMeta(); 
    fetchMagazzino();
  }, [fetchMeta, fetchMagazzino]);

  useEffect(() => {
    if (metaLoaded) {
      const isSelectedValid = macchine.some(m => m.id_macchina === selectedMacchina);
      if (!selectedMacchina || !isSelectedValid) {
        setShowMacchinaPicker(true);
      }
    }
  }, [metaLoaded, selectedMacchina, macchine]);

  useEffect(() => { fetchLavorazioni(); }, [fetchLavorazioni]);

  const updateStatoLavorazione = async (id: string, nuovoStato: Stati) => {
    setLoading(true);
    setLoadingMsg('AGGIORNAMENTO STATO...');
    try {
      const { error } = await supabase
        .from('l_lavorazioni')
        .update({ id_stato: nuovoStato })
        .eq('id_lavorazione', id);
      
      if (error) throw error;
      await fetchLavorazioni(false);
    } catch (err: any) {
      alert("Errore durante l'aggiornamento: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const assegnaSchedaAMacchina = async (scheda: Lavorazione) => {
    if (!selectedMacchina) return;
    setLoading(true);
    setLoadingMsg('ASSEGNAZIONE...');
    try {
      const { error } = await supabase
        .from('l_lavorazioni')
        .update({ id_macchina: selectedMacchina })
        .eq('id_lavorazione', scheda.id_lavorazione);
      
      if (error) throw error;
      
      setShowMagazzinoPicker(false);
      await fetchMagazzino();
      await fetchLavorazioni(false);
    } catch (err: any) {
      alert("Errore: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const startLavorazione = async (id: string, faseId: string) => {
    setLoading(true);
    setLoadingMsg('AVVIO PRODUZIONE...');
    try {
      const { error } = await supabase
        .from('l_lavorazioni')
        .update({ 
          id_fase: faseId, 
          id_stato: Stati.PRO, 
          inizio_lavorazione: new Date().toISOString() 
        })
        .eq('id_lavorazione', id);
      
      if (error) throw error;
      setShowFasePicker(null);
      await fetchLavorazioni(false);
    } catch (err: any) { alert("Errore avvio: " + err.message); }
    finally { setLoading(false); }
  };

  const finishLavorazione = async (l: Lavorazione, kg: number, metri: number, nastri: number, pezzi: number) => {
    setLoading(true);
    setLoadingMsg('COMPLETAMENTO...');
    try {
      const { error } = await supabase
        .from('l_lavorazioni')
        .update({ 
          id_stato: Stati.TER, fine_lavorazione: new Date().toISOString(),
          ordine_kg_lavorato: kg, metri_avvolti: metri,
          numero_passate: nastri, numero_pezzi: pezzi
        })
        .eq('id_lavorazione', l.id_lavorazione);
      if (error) throw error;
      setShowTerminaPicker(null);
      await fetchLavorazioni(false);
    } catch (err: any) { alert(err.message); }
    finally { setLoading(false); }
  };

  const proItems = useMemo(() => 
    lavorazioni.filter(l => 
      l.id_stato === Stati.PRE ||
      l.id_stato === Stati.PRO || 
      (l.id_stato === Stati.TER && l.fine_lavorazione?.startsWith(filterDate))
    )
    .sort((a,b) => {
      const order = { [Stati.PRE]: 0, [Stati.PRO]: 1, [Stati.TER]: 2 };
      return (order[a.id_stato as Stati] ?? 9) - (order[b.id_stato as Stati] ?? 9);
    }),
    [lavorazioni, filterDate]
  );

  const attItems = useMemo(() => {
    const filtered = lavorazioni.filter(l => l.id_stato === Stati.ATT);
    return [...filtered].sort((a, b) => {
      if (sortCriteria === 'cliente') return (a.l_clienti?.cliente || '').localeCompare(b.l_clienti?.cliente || '');
      if (sortCriteria === 'data') return (a.data_consegna || '').localeCompare(b.data_consegna || '');
      if (sortCriteria === 'misura') return (a.misura || 0) - (b.misura || 0);
      return a.scheda - b.scheda;
    });
  }, [lavorazioni, sortCriteria]);

  const changeDate = (days: number) => {
    const current = new Date(filterDate);
    current.setDate(current.getDate() + days);
    setFilterDate(formatDate(current));
  };

  const isToday = filterDate === formatDate(new Date());

  const currentMacchinaName = useMemo(() => {
    return macchine.find(m => m.id_macchina === selectedMacchina)?.macchina || 'POSTAZIONE';
  }, [macchine, selectedMacchina]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900 pb-20">
      <div className="w-full max-w-[1700px] mx-auto p-4 flex flex-col gap-6">
        
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <Link to="/lavoro" className="p-2 bg-slate-100 rounded-lg text-slate-700 hover:bg-slate-200 transition-all"><ArrowLeft size={20} /></Link>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">KME HUB</span>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">{currentMacchinaName}</h1>
                <button onClick={() => setShowMacchinaPicker(true)} className="p-2 bg-blue-600 text-white rounded-lg shadow-lg hover:scale-110 active:scale-90 transition-all ml-1">
                  <Settings2 size={14} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
             <button onClick={() => changeDate(-1)} className="p-2 hover:bg-white rounded-xl text-slate-500 hover:text-blue-600 transition-all active:scale-90">
                <ChevronLeft size={20} />
             </button>
             <div className="px-4 flex items-center gap-3">
                <div className="relative flex items-center">
                  <Calendar size={16} className="absolute left-3 text-blue-600 pointer-events-none" />
                  <input 
                    type="date" 
                    value={filterDate} 
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-[11px] font-black uppercase text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
             </div>
             <button onClick={() => changeDate(1)} className="p-2 hover:bg-white rounded-xl text-slate-500 hover:text-blue-600 transition-all active:scale-90">
                <ChevronRight size={20} />
             </button>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
             <button onClick={() => { fetchMagazzino(); setShowMagazzinoPicker(true); }} className="flex-1 md:flex-none px-5 py-3 bg-[#0f172a] text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all">
                <Inbox size={16} /> PRELEVA
             </button>
             <button onClick={() => fetchLavorazioni(true)} className="p-3 bg-blue-600 text-white rounded-xl shadow-lg active:scale-95 transition-all">
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
          <div className="bg-[#1e293b] rounded-[2.5rem] shadow-2xl border border-slate-800 overflow-hidden">
            <div className="px-6 py-4 flex justify-between items-center border-b border-white/5">
              <div className="flex flex-col">
                <span className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-white">
                  <Activity size={16} className="text-blue-500"/> ATTIVITÀ POSTAZIONE
                </span>
                <span className="text-[9px] font-bold text-slate-500 uppercase mt-1 tracking-widest italic">{isToday ? 'LIVE FEED' : `ARCHIVIO ${formatDateForDisplay(filterDate)}`}</span>
              </div>
              <span className="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-black">{proItems.length}</span>
            </div>
            <div className="p-4 space-y-4">
              {proItems.map(l => {
                const isPro = l.id_stato === Stati.PRO;
                const isPre = l.id_stato === Stati.PRE;
                const isTer = l.id_stato === Stati.TER;

                let bgColor = 'bg-emerald-500 border-l-emerald-800';
                let statusLabel = 'COMPLETATA';
                if (isPro) { bgColor = 'bg-sky-500 border-l-sky-800'; statusLabel = 'IN PRODUZIONE'; }
                if (isPre) { bgColor = 'bg-slate-100 border-l-slate-400'; statusLabel = 'IN PREPARAZIONE'; }

                return (
                  <div key={l.id_lavorazione} className={`relative flex items-center justify-between p-5 rounded-3xl transition-all shadow-lg border-l-[12px] ${bgColor}`}>
                    <div className="flex items-center gap-6">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-slate-950 text-2xl italic leading-none">{l.scheda}</h4>
                          <div className="flex gap-1 flex-wrap">
                             <span className="bg-white/60 px-2 py-0.5 rounded text-[10px] font-black text-slate-900 uppercase tracking-tighter">{l.mcoil_lega || 'RAME'}</span>
                             <span className="bg-slate-900/10 px-2 py-0.5 rounded text-[10px] font-black text-slate-900 uppercase tracking-tighter">{l.mcoil_stato_fisico || 'N/D'}</span>
                             {l.spessore && <span className="bg-white/60 px-2 py-0.5 rounded text-[10px] font-black text-slate-900 uppercase tracking-tighter">{l.spessore}</span>}
                             <span className="bg-white/60 px-2 py-0.5 rounded text-[10px] font-black text-slate-900 uppercase tracking-tighter">{l.mcoil}</span>
                          </div>
                        </div>
                        <p className="text-lg font-black text-slate-950 uppercase mt-1 truncate max-w-[280px] leading-tight tracking-tight">{l.l_clienti?.cliente}</p>
                        <div className="flex gap-3 mt-2.5 items-center">
                          <span className={`${isPre ? 'bg-slate-300/40' : 'bg-slate-900/10'} px-2.5 py-1.5 rounded-lg text-[9px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5 whitespace-nowrap`}>
                             <Info size={11} /> {statusLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 sm:gap-8">
                      <div className="text-center">
                        <span className="text-[9px] font-black text-slate-800/60 uppercase block leading-none mb-1.5">DATA</span>
                        <span className="text-lg font-black text-slate-950 italic leading-none whitespace-nowrap">{formatDateForDisplay(l.data_consegna)}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-[9px] font-black text-slate-800/60 uppercase block leading-none mb-1.5">ORDINE</span>
                        <span className="text-lg font-black text-slate-950 italic leading-none whitespace-nowrap">{l.ordine_kg_richiesto || '0'} KG</span>
                      </div>
                      <div className="text-center">
                        <span className="text-[9px] font-black text-slate-800/60 uppercase block leading-none mb-1.5">MISURA</span>
                        <span className="text-xl font-black text-slate-950 italic leading-none whitespace-nowrap">{l.misura}</span>
                      </div>
                      
                      <div className="flex gap-2">
                        {isPre && (
                          <div className="flex gap-2 bg-white/60 p-1.5 rounded-2xl border border-white/40 shadow-sm">
                            <button 
                              onClick={() => updateStatoLavorazione(l.id_lavorazione, Stati.ATT)} 
                              className="p-3 bg-white text-slate-400 hover:text-rose-600 rounded-xl shadow-md active:scale-95 transition-all border border-slate-200" 
                            >
                              <RotateCcw size={20} />
                            </button>
                            <button 
                              onClick={() => setShowFasePicker({ id: l.id_lavorazione })} 
                              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-xl active:scale-95 transition-all flex items-center gap-3 font-black text-[11px] uppercase tracking-widest"
                            >
                              <Play size={16} fill="white" /> AVVIA
                            </button>
                          </div>
                        )}
                        {isPro && (
                          <button 
                            onClick={() => setShowTerminaPicker(l)} 
                            className="p-4 bg-white text-sky-900 rounded-2xl hover:bg-sky-50 shadow-2xl active:scale-95 border-2 border-sky-600 transition-all flex items-center gap-2"
                          >
                            <CheckCircle2 size={24} />
                            <span className="font-black text-[10px] uppercase">TERMINA</span>
                          </button>
                        )}
                        {isTer && (
                          <div className="bg-white/50 px-6 py-4 rounded-2xl text-emerald-950 font-black text-[10px] border-2 border-emerald-700 shadow-sm uppercase tracking-[0.2em] italic">COMPLETATA</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-[#d97706] rounded-[2.5rem] shadow-2xl border border-amber-700 overflow-hidden">
            <div className="px-6 py-4 flex justify-between items-center border-b border-white/10">
              <span className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-white"><ClipboardList size={16}/> CODA ATTESA</span>
              <div className="flex gap-1">
                {['scheda', 'cliente', 'misura', 'data'].map(c => (
                  <button key={c} onClick={() => setSortCriteria(c as any)} className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${sortCriteria === c ? 'bg-white text-amber-600 shadow-md' : 'bg-amber-500 text-white hover:bg-amber-400'}`}>{c}</button>
                ))}
              </div>
            </div>
            <div className="p-4 space-y-4">
              {attItems.map(l => (
                <div key={l.id_lavorazione} className="bg-amber-500 border-l-[12px] border-l-amber-800 p-5 rounded-3xl flex items-center justify-between group hover:bg-amber-400 transition-all shadow-lg">
                  <div className="flex items-center gap-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-slate-950 text-2xl italic leading-none">{l.scheda}</h4>
                        <div className="flex gap-1 flex-wrap">
                           <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-black text-slate-900">{l.mcoil_lega}</span>
                           <span className="bg-slate-900/10 px-2 py-0.5 rounded text-[10px] font-black text-slate-900">{l.mcoil_stato_fisico}</span>
                        </div>
                      </div>
                      <p className="text-lg font-black text-amber-950 uppercase mt-1 truncate max-w-[280px] leading-tight tracking-tight">{l.l_clienti?.cliente}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 sm:gap-8">
                    <div className="text-center">
                      <span className="text-[9px] font-black text-amber-900/60 uppercase block mb-1 leading-none">DATA</span>
                      <span className="text-lg font-black text-slate-950 italic leading-none whitespace-nowrap">{formatDateForDisplay(l.data_consegna)}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-[9px] font-black text-amber-900/60 uppercase block mb-1 leading-none">ORDINE</span>
                      <span className="text-lg font-black text-slate-950 italic leading-none whitespace-nowrap">{l.ordine_kg_richiesto} KG</span>
                    </div>
                    <div className="text-center">
                      <span className="text-[9px] font-black text-amber-900/60 uppercase block mb-1 leading-none">MISURA</span>
                      <span className="text-2xl font-black text-slate-950 italic leading-none whitespace-nowrap">{l.misura}</span>
                    </div>
                    <button 
                      onClick={() => updateStatoLavorazione(l.id_lavorazione, Stati.PRE)} 
                      className="p-5 bg-white text-amber-900 rounded-2xl shadow-2xl border-2 border-amber-600 active:scale-95 hover:scale-105 transition-all flex items-center gap-2"
                    >
                      <PlayCircle size={26} />
                      <span className="font-black text-[10px] uppercase">PREPARA</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showMagazzinoPicker && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-[200]">
          <div className="bg-white rounded-[3rem] w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
            <div className="bg-slate-950 p-8 border-b border-white/10 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4 text-white">
                <div className="p-3 bg-amber-600 rounded-2xl shadow-lg shadow-amber-600/20"><Inbox size={24} /></div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tighter italic leading-none">MAGAZZINO SCHEDE</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase mt-1 tracking-widest italic">ASSEGNAZIONE A {currentMacchinaName}</p>
                </div>
              </div>
              <button onClick={() => setShowMagazzinoPicker(false)} className="text-slate-500 hover:text-white transition-colors p-2"><X size={32} /></button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-grow custom-scrollbar space-y-3 bg-slate-50">
              {magazzino.map(s => (
                <button 
                  key={s.id_lavorazione} 
                  onClick={() => assegnaSchedaAMacchina(s)}
                  className="w-full bg-white border border-slate-200 rounded-[2.5rem] p-6 flex items-center justify-between hover:bg-blue-50 hover:border-blue-200 group transition-all shadow-sm"
                >
                  <div className="flex gap-10 items-center">
                     <div className="text-left">
                        <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">SCHEDA</span>
                        <span className="text-3xl font-black text-slate-900 italic leading-none">{s.scheda}</span>
                     </div>
                     <div className="text-left">
                        <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">CLIENTE</span>
                        <span className="text-lg font-black text-slate-800 uppercase block truncate max-w-[240px] tracking-tight">{s.l_clienti?.cliente}</span>
                     </div>
                  </div>
                  <div className="flex items-center gap-8">
                     <div className="text-right">
                        <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">ORDINE</span>
                        <span className="text-2xl font-black text-blue-600 tabular-nums">{s.ordine_kg_richiesto} KG</span>
                     </div>
                     <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all">
                        <Plus size={24} />
                     </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showMacchinaPicker && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 z-[1000]">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative flex flex-col max-h-[95vh] sm:max-h-[90vh] overflow-hidden border border-slate-200">
            <div className="p-6 sm:p-8 pb-4 shrink-0 border-b border-slate-100 text-center">
               <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-xl shadow-blue-500/20">
                  <Laptop className="w-6 h-6 sm:w-8 sm:h-8" />
               </div>
               <h3 className="text-lg sm:text-xl font-black uppercase text-slate-950 italic leading-none">POSTAZIONE DI LAVORO</h3>
               <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 sm:mt-2">SELEZIONA UNITÀ OPERATIVA</p>
            </div>
            
            <div className="p-4 sm:p-8 overflow-y-auto flex-grow custom-scrollbar">
                <div className="grid grid-cols-2 gap-3 sm:gap-4 pb-4">
                  {macchine.map(m => (
                    <button 
                      key={m.id_macchina} 
                      onClick={() => { 
                        setSelectedMacchina(m.id_macchina); 
                        localStorage.setItem('kme_selected_macchina', m.id_macchina); 
                        setShowMacchinaPicker(false); 
                      }} 
                      className={`flex flex-col items-center justify-center p-4 sm:p-6 border-2 rounded-3xl transition-all active:scale-95 group shadow-sm min-h-[100px] sm:min-h-[140px] ${
                        selectedMacchina === m.id_macchina 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-500/20' 
                        : 'bg-slate-50 border-slate-100 hover:border-blue-200 text-slate-950 hover:bg-white'
                      }`}
                    >
                      <Laptop className={`w-6 h-6 sm:w-8 sm:h-8 mb-2 sm:mb-3 transition-transform group-hover:scale-110 ${selectedMacchina === m.id_macchina ? 'opacity-100' : 'opacity-20'}`} />
                      <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-center italic leading-tight">
                        {m.macchina}
                      </span>
                    </button>
                  ))}
                </div>
            </div>
          </div>
        </div>
      )}

      {showFasePicker && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[1500] p-4">
          <div className="bg-white rounded-[3rem] p-10 w-full max-w-xs border border-slate-200 shadow-2xl text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
               <Activity size={32} />
            </div>
            <h3 className="text-xs font-black uppercase mb-8 text-slate-950 tracking-widest leading-none italic">Scegli la Lavorazione</h3>
            <div className="flex flex-col gap-3">
              {fasi.filter(f => f.id_fase !== 'ATT').map(f => (
                <button 
                  key={f.id_fase} 
                  onClick={() => startLavorazione(showFasePicker.id, f.id_fase)} 
                  className="p-5 bg-slate-50 hover:bg-blue-600 hover:text-white rounded-2xl font-black text-[11px] uppercase transition-all border border-slate-100 text-slate-700 shadow-sm active:scale-95 flex items-center justify-between"
                >
                  <span>{f.fase_di_lavorazione}</span>
                  <ArrowRight size={14} className="opacity-30" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showTerminaPicker && (
        <TerminaModal lavorazione={showTerminaPicker} onClose={() => setShowTerminaPicker(null)} onConfirm={finishLavorazione} />
      )}

      {/* Widget Chat Flottante */}
      <Chat />

      {loading && (
        <div className="fixed inset-0 bg-[#0f172a]/95 backdrop-blur-xl flex flex-col items-center justify-center z-[9999]">
          <div className="w-16 h-16 border-4 border-white/10 border-t-blue-600 rounded-full animate-spin mb-6" />
          <p className="text-[13px] font-black text-white uppercase tracking-[0.4em] italic animate-pulse">{loadingMsg}</p>
        </div>
      )}
    </div>
  );
};

// Parser numerico evoluto
const parseNum = (val: any) => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  let s = String(val).trim();
  if (s.includes('.') && s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(',', '.');
  s = s.replace(/[^\d.]/g, ' ').trim().split(' ')[0];
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};

const TerminaModal: React.FC<any> = ({ lavorazione, onClose, onConfirm }) => {
  const [kgInput, setKgInput] = useState<string>(String(lavorazione.ordine_kg_lavorato || ''));
  const [nastri, setNastri] = useState<number>(lavorazione.numero_passate || 1);
  const [pezzi, setPezzi] = useState<number>(lavorazione.numero_pezzi || 1);
  const [spessoreInput, setSpessoreInput] = useState<string>(String(lavorazione.spessore || ''));
  const [misuraInput, setMisuraInput] = useState<string>(String(lavorazione.misura || ''));

  const metri = useMemo(() => {
    const p = parseNum(kgInput);
    const sp = parseNum(spessoreInput);
    const mi = parseNum(misuraInput);
    const n = Math.max(1, parseNum(nastri));
    if (p <= 0 || sp <= 0 || mi <= 0) return 0;
    const rho = (lavorazione.mcoil_lega || '').toUpperCase().includes('OT') ? 8.50 : 8.96;
    const totalWidth_mm = mi * n;
    const result = (p * 1000) / (rho * sp * totalWidth_mm);
    if (result > 100000) return 0; 
    return Math.round(result);
  }, [kgInput, spessoreInput, misuraInput, lavorazione.mcoil_lega, nastri]);

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white rounded-[3rem] w-full max-w-sm shadow-2xl relative border-t-[12px] border-emerald-500 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in duration-200">
        <button onClick={onClose} className="absolute top-8 right-8 text-slate-400 hover:text-slate-950 transition-colors z-20 p-2"><X size={32} /></button>
        <div className="p-10 space-y-6 bg-white overflow-y-auto flex-grow custom-scrollbar">
          
          <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-200 flex flex-col items-center text-center shadow-inner">
            <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-4 italic">PESO REALE (KG)</label>
            <input 
              type="text" 
              inputMode="decimal"
              value={kgInput} 
              autoFocus 
              onChange={(e) => setKgInput(e.target.value)} 
              className="w-full bg-white border border-slate-300 rounded-3xl py-6 px-4 font-black text-6xl text-center text-emerald-600 outline-none tabular-nums focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-lg" 
              placeholder="0,00"
            />
          </div>

          <div className="space-y-3">
             <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                   <label className="text-[9px] font-black text-slate-400 uppercase block mb-1 text-center">SPESSORE</label>
                   <input type="text" value={spessoreInput} onChange={e => setSpessoreInput(e.target.value)} className="w-full bg-transparent font-black text-xl text-center outline-none text-blue-600" />
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                   <label className="text-[9px] font-black text-slate-400 uppercase block mb-1 text-center">LARGHEZZA</label>
                   <input type="text" value={misuraInput} onChange={e => setMisuraInput(e.target.value)} className="w-full bg-transparent font-black text-xl text-center outline-none text-blue-600" />
                </div>
             </div>
             <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                   <label className="text-[9px] font-black text-slate-400 uppercase block mb-1 text-center">NASTRI</label>
                   <input type="number" value={nastri} onChange={e => setNastri(Number(e.target.value))} className="w-full bg-transparent font-black text-xl text-center outline-none" />
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                   <label className="text-[9px] font-black text-slate-400 uppercase block mb-1 text-center">PEZZI</label>
                   <input type="number" value={pezzi} onChange={e => setPezzi(Number(e.target.value))} className="w-full bg-transparent font-black text-xl text-center outline-none" />
                </div>
             </div>
          </div>

          <div className="bg-blue-600 p-6 rounded-[2rem] flex flex-col items-center justify-center gap-1 shadow-xl shadow-blue-600/20">
             <span className="text-xl font-black text-white uppercase tracking-widest italic">SVILUPPO</span>
             <span className="text-3xl font-black text-white">{metri} METRI</span>
          </div>
          
          <button onClick={() => onConfirm(lavorazione, parseNum(kgInput), metri, nastri, pezzi)} className="w-full bg-slate-950 py-6 rounded-[2rem] flex items-center justify-center gap-4 active:scale-95 shadow-2xl hover:bg-black transition-all">
             <CheckCircle2 size={28} className="text-emerald-400" />
             <span className="text-sm font-black text-white uppercase tracking-[0.2em]">SALVA E CHIUDI</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Produzione;
