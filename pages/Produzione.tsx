
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
  ArrowLeft, RefreshCw, CheckCircle2, X, 
  Activity, Plus, Settings2, Calendar, Inbox, 
  ChevronLeft, ChevronRight, PlayCircle
} from 'lucide-react';

const formatDateForDisplay = (dateStr: string | null) => {
  if (!dateStr) return 'N/D';
  try {
    const date = new Date(dateStr);
    const months = ['GEN', 'FEB', 'MAR', 'APR', 'MAG', 'GIU', 'LUG', 'AGO', 'SET', 'OTT', 'NOV', 'DIC'];
    return `${date.getDate().toString().padStart(2, '0')} ${months[date.getMonth()]}`;
  } catch (e) { return dateStr; }
};

const formatDate = (date: Date) => date.toISOString().split('T')[0];

const Produzione: React.FC = () => {
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
  const [loadingMsg, setLoadingMsg] = useState('CARICAMENTO...');
  const [showMacchinaPicker, setShowMacchinaPicker] = useState(false);
  const [showMagazzinoPicker, setShowMagazzinoPicker] = useState(false);
  const [showFasePicker, setShowFasePicker] = useState<{ id: string } | null>(null);
  const [showTerminaPicker, setShowTerminaPicker] = useState<Lavorazione | null>(null);
  const [sortCriteria, setSortCriteria] = useState<'scheda' | 'cliente' | 'data' | 'misura'>('scheda');

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
    if (showLoader) { setLoading(true); setLoadingMsg('SINCRONIZZAZIONE...'); }
    const { data } = await supabase.from('l_lavorazioni').select(`*, l_clienti:id_cliente (*), l_macchine:id_macchina (*), l_fasi_di_lavorazione:id_fase (*)`).eq('id_macchina', selectedMacchina);
    if (data) setLavorazioni(data);
    setLoading(false);
  }, [selectedMacchina]);

  useEffect(() => { fetchMeta(); fetchMagazzino(); }, [fetchMeta, fetchMagazzino]);
  useEffect(() => { if (!selectedMacchina) setShowMacchinaPicker(true); }, [selectedMacchina]);
  useEffect(() => { fetchLavorazioni(); }, [fetchLavorazioni]);

  const updateStato = async (id: string, nuovoStato: Stati) => {
    setLoading(true);
    await supabase.from('l_lavorazioni').update({ id_stato: nuovoStato }).eq('id_lavorazione', id);
    await fetchLavorazioni(false);
  };

  const assegnaMacchina = async (scheda: Lavorazione) => {
    if (!selectedMacchina) return;
    setLoading(true);
    await supabase.from('l_lavorazioni').update({ id_macchina: selectedMacchina }).eq('id_lavorazione', scheda.id_lavorazione);
    setShowMagazzinoPicker(false);
    fetchMagazzino();
    fetchLavorazioni(false);
  };

  const startLavorazione = async (id: string, faseId: string) => {
    setLoading(true);
    await supabase.from('l_lavorazioni').update({ id_fase: faseId, id_stato: Stati.PRO, inizio_lavorazione: new Date().toISOString() }).eq('id_lavorazione', id);
    setShowFasePicker(null);
    fetchLavorazioni(false);
  };

  const finishLavorazione = async (l: Lavorazione, kg: number, metri: number, nastri: number, pezzi: number) => {
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
        if (sortCriteria === 'cliente') {
          const nameA = a.l_clienti?.cliente || '';
          const nameB = b.l_clienti?.cliente || '';
          return nameA.localeCompare(nameB);
        }
        if (sortCriteria === 'misura') return a.misura - b.misura;
        if (sortCriteria === 'data') {
          const dateA = a.data_consegna || '9999-12-31';
          const dateB = b.data_consegna || '9999-12-31';
          return dateA.localeCompare(dateB);
        }
        return 0;
      });
  }, [lavorazioni, sortCriteria]);

  const currentMacchinaName = useMemo(() => macchine.find(m => m.id_macchina === selectedMacchina)?.macchina || 'POSTAZIONE', [macchine, selectedMacchina]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900 pb-10">
      <div className="w-full max-w-[1900px] mx-auto p-4 flex flex-col gap-6">
        
        {/* Postazione Sub-Header BLOCCATA (Sticky) */}
        <div className="sticky top-[73px] z-40 py-2 bg-slate-100/80 backdrop-blur-sm">
          <div className="bg-white p-4 rounded-3xl shadow-lg border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <Link to="/lavoro" className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-400 hover:text-slate-900 transition-all"><ArrowLeft size={20} /></Link>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 block">KME HUB</span>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-black text-[#1e293b] uppercase italic tracking-tighter leading-none">{currentMacchinaName}</h1>
                  <button onClick={() => setShowMacchinaPicker(true)} className="p-2 bg-blue-600 text-white rounded-xl shadow-lg active:scale-90 transition-all"><Settings2 size={16} /></button>
                </div>
              </div>
            </div>

            <div className="flex items-center bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
               <button onClick={() => { let d = new Date(filterDate); d.setDate(d.getDate()-1); setFilterDate(formatDate(d)); }} className="p-2 text-slate-400"><ChevronLeft size={20} /></button>
               <div className="px-4 flex items-center gap-3">
                  <Calendar size={16} className="text-blue-600" />
                  <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="bg-white border border-slate-200 rounded-xl py-2 px-4 text-[11px] font-black uppercase outline-none" />
               </div>
               <button onClick={() => { let d = new Date(filterDate); d.setDate(d.getDate()+1); setFilterDate(formatDate(d)); }} className="p-2 text-slate-400"><ChevronRight size={20} /></button>
            </div>

            <div className="flex gap-2">
               <button onClick={() => { fetchMagazzino(); setShowMagazzinoPicker(true); }} className="px-6 py-4 bg-[#0f172a] text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl flex items-center gap-3 active:scale-95 transition-all"><Inbox size={18} /> PRELEVA</button>
               <button onClick={() => fetchLavorazioni(true)} className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg active:scale-90 transition-all"><RefreshCw size={20} className={loading ? 'animate-spin' : ''} /></button>
            </div>
          </div>
        </div>

        {/* Layout Colonne Bilanciate 50/50 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          {/* Parte SINISTRA (Dark Blue) - Attività */}
          <div className="bg-[#1e293b] rounded-[2.5rem] shadow-2xl border border-slate-800 overflow-hidden min-h-[800px]">
            <div className="px-8 py-6 flex justify-between items-center border-b border-white/5 bg-[#1e293b]">
               <div className="flex items-center gap-3">
                  <Activity size={20} className="text-blue-500" />
                  <h2 className="text-white font-black uppercase italic tracking-widest text-sm">ATTIVITÀ POSTAZIONE</h2>
               </div>
               <span className="bg-blue-600 text-white px-4 py-1 rounded-xl text-xs font-black shadow-lg shadow-blue-500/20">{proItems.length}</span>
            </div>
            
            <div className="p-6 space-y-4">
               {proItems.map(l => {
                 const isPro = l.id_stato === Stati.PRO;
                 const isPre = l.id_stato === Stati.PRE;
                 const isTer = l.id_stato === Stati.TER;
                 let statusColor = "bg-emerald-400 border-l-emerald-600";
                 let badgeColor = "bg-emerald-600 text-white";
                 let badgeText = "TER";
                 
                 if (isPro) {
                   statusColor = "bg-sky-400 border-l-sky-600";
                   badgeColor = "bg-sky-600 text-white";
                   badgeText = "PRO";
                 }
                 if (isPre) {
                   statusColor = "bg-slate-200 border-l-slate-400";
                   badgeColor = "bg-slate-400 text-white";
                   badgeText = "PRE";
                 }

                 return (
                   <div key={l.id_lavorazione} className={`p-6 rounded-[2rem] border-l-[16px] shadow-xl flex flex-col items-stretch transition-all group ${statusColor}`}>
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex flex-col gap-2 flex-1">
                          <div className="flex items-center gap-3">
                             <div className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest shadow-sm ${badgeColor}`}>{badgeText}</div>
                             <span className="text-3xl font-black text-slate-900 italic leading-none">{l.scheda}</span>
                             <div className="flex flex-wrap gap-1">
                                <span className="bg-slate-900/10 px-2 py-0.5 rounded text-[8px] font-black uppercase">{l.mcoil_lega}</span>
                                <span className="bg-slate-900/10 px-2 py-0.5 rounded text-[8px] font-black uppercase">{l.mcoil_stato_fisico}</span>
                                <span className="bg-slate-900/10 px-2 py-0.5 rounded text-[8px] font-black uppercase">{l.spessore}</span>
                                <span className="bg-slate-900/10 px-2 py-0.5 rounded text-[8px] font-black uppercase">{l.mcoil}</span>
                             </div>
                          </div>
                          <div>
                            <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-tight">{l.l_clienti?.cliente}</h4>
                            <p className="text-[10px] font-bold text-slate-600 uppercase italic tracking-widest mt-0.5">{l.l_fasi_di_lavorazione?.fase_di_lavorazione || 'NON DEFINITA'}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                           <div className="flex items-center gap-6">
                              <div className="text-center">
                                 <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">CONSEGNA</span>
                                 <span className="text-lg font-black text-slate-900 uppercase italic leading-none">{formatDateForDisplay(l.data_consegna)}</span>
                              </div>
                              <div className="text-center">
                                 <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">ORDINE KG</span>
                                 <span className="text-lg font-black text-slate-900 uppercase italic leading-none">{l.ordine_kg_richiesto}</span>
                                 {isTer && <span className="text-[9px] block font-bold text-emerald-800 italic mt-0.5">{l.ordine_kg_lavorato} PROD.</span>}
                              </div>
                              <div className="text-center">
                                 <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">MISURA</span>
                                 <span className="text-3xl font-black text-slate-900 italic leading-none">{l.misura}</span>
                              </div>
                           </div>
                           
                           <div className="flex gap-2 min-w-[120px] justify-end">
                             {isPre && (
                               <button onClick={() => setShowFasePicker({ id: l.id_lavorazione })} className="px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-2xl active:scale-95 transition-all"><PlayCircle size={20} fill="white"/> PREPARA</button>
                             )}
                             {isPro && (
                               <button onClick={() => setShowTerminaPicker(l)} className="px-6 py-4 bg-white text-blue-900 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] border-2 border-blue-600 shadow-2xl active:scale-95 transition-all flex items-center gap-2">
                                 <CheckCircle2 size={20} className="text-blue-600"/> TERMINA
                               </button>
                             )}
                             {isTer && (
                               <div className="px-6 py-4 bg-white/50 border-2 border-emerald-600 rounded-2xl font-black text-[9px] uppercase tracking-widest text-emerald-950 shadow-inner">COMPLETATA</div>
                             )}
                           </div>
                        </div>
                      </div>
                   </div>
                 );
               })}
            </div>
          </div>

          {/* Parte DESTRA (Orange) - Coda Attesa */}
          <div className="bg-[#d97706] rounded-[2.5rem] shadow-2xl border border-amber-500 overflow-hidden min-h-[800px]">
             <div className="px-8 py-6 flex justify-between items-center border-b border-white/10 bg-[#d97706]">
                <div className="flex items-center gap-3 text-white">
                   <Inbox size={20} />
                   <h2 className="font-black uppercase italic tracking-widest text-sm">CODA ATTESA</h2>
                </div>
                <div className="flex gap-1">
                   {['SCHEDA', 'CLIENTE', 'MISURA', 'DATA'].map(c => (
                     <button key={c} onClick={() => setSortCriteria(c.toLowerCase() as any)} className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase transition-all ${sortCriteria === c.toLowerCase() ? 'bg-white text-amber-600 shadow-lg' : 'text-white/60 hover:text-white'}`}>{c}</button>
                   ))}
                </div>
             </div>

             <div className="p-6 space-y-4">
                {attItems.map(l => (
                  <div key={l.id_lavorazione} className="bg-amber-500 border-l-[16px] border-l-amber-700 p-6 rounded-[2rem] shadow-xl flex items-center justify-between group hover:bg-amber-400 transition-all">
                     <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                           <span className="text-3xl font-black text-slate-950 italic leading-none">{l.scheda}</span>
                           <div className="flex gap-1">
                            <span className="bg-amber-700/20 px-2 py-0.5 rounded text-[8px] font-black text-amber-950 uppercase">{l.mcoil_lega}</span>
                            <span className="bg-amber-700/20 px-2 py-0.5 rounded text-[8px] font-black text-amber-950 uppercase">{l.mcoil_stato_fisico}</span>
                           </div>
                        </div>
                        <h4 className="text-lg font-black text-amber-950 uppercase mt-1 truncate max-w-[200px] leading-tight">{l.l_clienti?.cliente}</h4>
                     </div>

                     <div className="flex items-center gap-8">
                        <div className="flex gap-6 text-right">
                           <div>
                              <span className="text-[8px] font-black text-amber-900/60 uppercase block mb-1">DATA</span>
                              <span className="text-base font-black text-slate-950 italic whitespace-nowrap">{formatDateForDisplay(l.data_consegna)}</span>
                           </div>
                           <div>
                              <span className="text-[8px] font-black text-amber-900/60 uppercase block mb-1 text-center">ORDINE</span>
                              <span className="text-base font-black text-slate-950 italic whitespace-nowrap">{l.ordine_kg_richiesto} KG</span>
                           </div>
                           <div>
                              <span className="text-[8px] font-black text-amber-900/60 uppercase block mb-1 text-center">MISURA</span>
                              <span className="text-3xl font-black text-slate-950 italic leading-none whitespace-nowrap">{l.misura}</span>
                           </div>
                        </div>
                        <button onClick={() => updateStato(l.id_lavorazione, Stati.PRE)} className="px-6 py-4 bg-white text-amber-900 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all flex items-center gap-2">
                           <PlayCircle size={20} fill="currentColor"/> PREPARA
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
          <div className="bg-white rounded-[3.5rem] w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
            <div className="bg-slate-950 p-8 flex justify-between items-center text-white">
              <h3 className="text-xl font-black uppercase italic tracking-tighter">MAGAZZINO SCHEDE ATTIVE</h3>
              <button onClick={() => setShowMagazzinoPicker(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><X size={32} /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-3 bg-slate-50">
              {magazzino.length === 0 ? <p className="text-center py-20 text-slate-400 font-black uppercase tracking-widest text-xs">Nessuna scheda disponibile</p> : magazzino.map(s => (
                <button key={s.id_lavorazione} onClick={() => assegnaMacchina(s)} className="w-full bg-white border border-slate-200 rounded-[2rem] p-6 flex items-center justify-between hover:bg-blue-50 transition-all shadow-sm">
                   <div className="flex flex-col text-left">
                     <span className="text-3xl font-black text-slate-900 italic leading-none">{s.scheda}</span>
                     <span className="text-[10px] font-black text-slate-400 uppercase mt-2">{s.l_clienti?.cliente}</span>
                   </div>
                   <div className="flex items-center gap-10">
                     <div className="text-right"><span className="text-[8px] font-black text-slate-400 block mb-1 uppercase">KG ORDINE</span><span className="text-2xl font-black text-blue-600 italic tabular-nums">{s.ordine_kg_richiesto}</span></div>
                     <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100"><Plus size={28} className="text-blue-600"/></div>
                   </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showMacchinaPicker && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 z-[1000]">
          <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl p-10 border border-slate-200 flex flex-col">
            <h3 className="text-2xl font-black uppercase text-center mb-8 italic text-slate-900 tracking-tighter underline decoration-blue-600 decoration-4 underline-offset-8">Scegli Postazione</h3>
            <div className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar text-center">
              {macchine.map(m => (
                <button key={m.id_macchina} onClick={() => { setSelectedMacchina(m.id_macchina); localStorage.setItem('kme_selected_macchina', m.id_macchina); setShowMacchinaPicker(false); }} className={`p-8 border-2 rounded-[2rem] font-black uppercase italic transition-all active:scale-95 ${selectedMacchina === m.id_macchina ? 'bg-blue-600 border-blue-600 text-white shadow-2xl' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-blue-600 hover:text-blue-600'}`}>{m.macchina}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showFasePicker && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[1500] p-4">
          <div className="bg-white rounded-[3rem] p-10 w-full max-w-xs border border-slate-200 shadow-2xl text-center flex flex-col gap-6">
            <h3 className="text-xs font-black uppercase tracking-[0.3em] italic text-slate-400 text-center">SELEZIONA LAVORAZIONE</h3>
            <div className="flex flex-col gap-3">
              {fasi.filter(f => f.id_fase !== 'ATT').map(f => (
                <button key={f.id_fase} onClick={() => startLavorazione(showFasePicker.id, f.id_fase)} className="p-6 bg-slate-50 hover:bg-blue-600 hover:text-white rounded-2xl font-black text-xs uppercase transition-all border border-slate-100 text-slate-700 shadow-sm active:scale-95">{f.fase_di_lavorazione}</button>
              ))}
            </div>
            <button onClick={() => setShowFasePicker(null)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">Annulla</button>
          </div>
        </div>
      )}

      {showTerminaPicker && (
        <TerminaModal lavorazione={showTerminaPicker} onClose={() => setShowTerminaPicker(null)} onConfirm={finishLavorazione} />
      )}

      {loading && (
        <div className="fixed inset-0 bg-[#0f172a]/95 backdrop-blur-xl flex flex-col items-center justify-center z-[9999]">
          <div className="w-16 h-16 border-4 border-white/10 border-t-blue-600 rounded-full animate-spin mb-6" />
          <p className="text-[13px] font-black text-white uppercase tracking-[0.4em] italic animate-pulse">{loadingMsg}</p>
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
    if (typeof val === 'number') return val;
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
    
    if (p <= 0 || sp <= 0 || mi <= 0 || n <= 0 || pz <= 0) return 0;
    const rho = (lavorazione.mcoil_lega || '').toUpperCase().includes('OT') ? 8.50 : 8.96;
    const totalWidth_mm = mi * n * pz;
    const result = (p * 1000) / (rho * sp * totalWidth_mm);
    return isFinite(result) ? Math.round(result) : 0;
  }, [kgInput, spessoreInput, misuraInput, lavorazione.mcoil_lega, nastri, pezzi]);

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white rounded-[3.5rem] w-full max-w-md shadow-2xl relative border-t-[20px] border-blue-600 overflow-hidden flex flex-col animate-in zoom-in duration-300">
        <button onClick={onClose} className="absolute top-10 right-10 text-slate-400 hover:text-slate-950 transition-colors z-20 p-2"><X size={36} /></button>
        <div className="p-12 space-y-10">
          <div className="text-center">
            <h3 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter leading-none mb-2">CHIUSURA SCHEDA</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Inserimento Dati Finali</p>
          </div>
          <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-200 flex flex-col items-center shadow-inner">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">PESO REALE (KG)</label>
            <input type="text" inputMode="decimal" value={kgInput} autoFocus onChange={(e) => setKgInput(e.target.value)} className="w-full bg-transparent font-black text-7xl text-center text-blue-600 outline-none tabular-nums placeholder-slate-200" placeholder="0,00" />
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100 flex flex-col items-center">
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">NASTRI</label>
                <input type="number" value={nastri} onChange={e => setNastri(Number(e.target.value))} className="w-full bg-transparent font-black text-2xl text-center outline-none text-slate-900" />
             </div>
             <div className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100 flex flex-col items-center">
                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">PEZZI</label>
                <input type="number" value={pezzi} onChange={e => setPezzi(Number(e.target.value))} className="w-full bg-transparent font-black text-2xl text-center outline-none text-slate-900" />
             </div>
          </div>
          <div className="bg-blue-600 p-8 rounded-[2.5rem] flex flex-col items-center justify-center gap-1 shadow-2xl shadow-blue-500/30">
            <span className="text-xl font-black text-white/60 uppercase tracking-widest italic leading-none mb-1">SVILUPPO</span>
            <span className="text-5xl font-black text-white italic tracking-tighter leading-none">{metri} <span className="text-xl opacity-50 not-italic">MT</span></span>
          </div>
          <button onClick={() => onConfirm(lavorazione, parseNum(kgInput), metri, nastri, pezzi)} className="w-full bg-slate-950 py-6 rounded-[2rem] flex items-center justify-center gap-4 active:scale-95 shadow-2xl transition-all group">
            <CheckCircle2 size={32} className="text-emerald-400 group-hover:scale-110" />
            <span className="text-sm font-black text-white uppercase tracking-[0.3em]">SALVA E CHIUDI</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Produzione;
