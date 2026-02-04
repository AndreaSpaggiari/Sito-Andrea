
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Macchina, FaseLavorazione, Lavorazione, Stati } from '../types';
import { 
  ArrowLeft, RefreshCw, ChevronLeft, ChevronRight, 
  Weight, Activity, Cpu, Box, PieChart, Target, X, ClipboardList, Info,
  LayoutDashboard, CheckCircle2, Clock, Timer
} from 'lucide-react';

type DateFilter = 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM';

const CUSTOM_ORDER = [
  'SLITTER GRANDE', 'SLITTER PICCOLO', 'SLITTER NUOVO',
  'SBAVATRICE VECCHIA', 'SBAVATRICE NUOVA', 'LASTRE',
  'ELMA', 'STAMPATRICE', 'DI MAIO'
];

const UfficioStats: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<DateFilter>('TODAY');
  const [customRange, setCustomRange] = useState({ 
    start: new Date().toISOString().split('T')[0], 
    end: new Date().toISOString().split('T')[0] 
  });
  
  const [macchine, setMacchine] = useState<Macchina[]>([]);
  const [fasi, setFasi] = useState<FaseLavorazione[]>([]);
  const [data, setData] = useState<Lavorazione[]>([]);
  const [backlogData, setBacklogData] = useState<Lavorazione[]>([]);
  const [selectedReport, setSelectedReport] = useState<{
    macchina: string;
    fase: string;
    items: Lavorazione[];
  } | null>(null);

  const getRange = useCallback(() => {
    const now = new Date();
    let start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    if (filter === 'WEEK') {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(start.setDate(diff));
    } else if (filter === 'MONTH') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (filter === 'CUSTOM' && customRange.start && customRange.end) {
      start = new Date(customRange.start);
      end = new Date(customRange.end);
      end.setHours(23, 59, 59);
    }
    return { start: start.toISOString(), end: end.toISOString() };
  }, [filter, customRange]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { start, end } = getRange();

    const [mRes, fRes, lRes, bRes] = await Promise.all([
      supabase.from('l_macchine').select('*'),
      supabase.from('l_fasi_di_lavorazione').select('*').order('fase_di_lavorazione'),
      supabase.from('l_lavorazioni').select('*, l_clienti:id_cliente (*)').eq('id_stato', 'TER').gte('fine_lavorazione', start).lte('fine_lavorazione', end),
      supabase.from('l_lavorazioni').select('*, l_clienti:id_cliente (*)').in('id_stato', ['PRE', 'ATT'])
    ]);

    if (mRes.data) {
      const sorted = mRes.data
        .filter(m => !['CASSONE', 'UFFICIO', 'MAGAZZINO', 'IMBALLAGGIO'].includes(m.macchina.toUpperCase()))
        .sort((a, b) => ORDERED_NAMES_COMPARATOR(a.macchina, b.macchina));
      setMacchine(sorted);
    }
    if (fRes.data) setFasi(fRes.data);
    if (lRes.data) setData(lRes.data);
    if (bRes.data) setBacklogData(bRes.data);
    setLoading(false);
  }, [getRange]);

  const ORDERED_NAMES_COMPARATOR = (a: string, b: string) => {
    const idxA = CUSTOM_ORDER.indexOf(a.toUpperCase());
    const idxB = CUSTOM_ORDER.indexOf(b.toUpperCase());
    if (idxA === -1 && idxB === -1) return a.localeCompare(b);
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  };

  useEffect(() => { fetchData(); }, [fetchData]);

  const matrix = useMemo(() => {
    const table: Record<string, Record<string, number>> = {};
    macchine.forEach(m => {
      table[m.id_macchina] = {};
      fasi.forEach(f => { table[m.id_macchina][f.id_fase] = 0; });
    });
    data.forEach(l => {
      if (table[l.id_macchina] && table[l.id_macchina][l.id_fase] !== undefined) {
        table[l.id_macchina][l.id_fase] += (l.ordine_kg_lavorato || 0);
      }
    });
    return table;
  }, [macchine, fasi, data]);

  const backlogStats = useMemo(() => {
    const stats: Record<string, { pre: { kg: number, count: number, items: Lavorazione[] }, att: { kg: number, count: number, items: Lavorazione[] } }> = {};
    macchine.forEach(m => {
      stats[m.id_macchina] = { pre: { kg: 0, count: 0, items: [] }, att: { kg: 0, count: 0, items: [] } };
    });
    backlogData.forEach(l => {
      if (stats[l.id_macchina]) {
        if (l.id_stato === 'PRE') {
          stats[l.id_macchina].pre.kg += (l.ordine_kg_richiesto || 0);
          stats[l.id_macchina].pre.count++;
          stats[l.id_macchina].pre.items.push(l);
        } else if (l.id_stato === 'ATT') {
          stats[l.id_macchina].att.kg += (l.ordine_kg_richiesto || 0);
          stats[l.id_macchina].att.count++;
          stats[l.id_macchina].att.items.push(l);
        }
      }
    });
    return stats;
  }, [macchine, backlogData]);

  const totals = useMemo(() => {
    const colTotals: Record<string, number> = {};
    let grandTotal = 0;
    fasi.forEach(f => {
      let sum = 0;
      macchine.forEach(m => { sum += matrix[m.id_macchina][f.id_fase] || 0; });
      colTotals[f.id_fase] = sum;
      grandTotal += sum;
    });
    const rowTotals: Record<string, number> = {};
    macchine.forEach(m => {
      let sum = 0;
      fasi.forEach(f => { sum += matrix[m.id_macchina][f.id_fase] || 0; });
      rowTotals[m.id_macchina] = sum;
    });
    return { colTotals, rowTotals, grandTotal };
  }, [macchine, fasi, matrix]);

  const handleCellClick = (m: Macchina, f: FaseLavorazione) => {
    const items = data.filter(l => l.id_macchina === m.id_macchina && l.id_fase === f.id_fase);
    if (items.length > 0) setSelectedReport({ macchina: m.macchina, fase: f.fase_di_lavorazione, items });
  };

  const handleBacklogClick = (m: Macchina, type: 'PRE' | 'ATT') => {
    const s = backlogStats[m.id_macchina];
    const items = type === 'PRE' ? s.pre.items : s.att.items;
    if (items.length > 0) setSelectedReport({ macchina: m.macchina, fase: type === 'PRE' ? 'IN PREPARAZIONE' : 'IN ATTESA', items });
  };

  return (
    <div className="min-h-screen bg-[#060a14] text-slate-100 pb-10 overflow-x-hidden">
      
      {/* Intestazione Chiara e Funzionale */}
      <div className="bg-[#0f172a] border-b border-white/5 pt-12 pb-24 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,_rgba(99,102,241,0.08),_transparent_50%)]"></div>
        <div className="max-w-[1850px] mx-auto flex flex-col xl:flex-row justify-between items-end gap-8 relative z-10">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <Link to="/lavoro/ufficio" className="p-2.5 bg-white/5 rounded-xl text-white/40 hover:text-white transition-all border border-white/5 hover:bg-white/10">
                <ArrowLeft size={18} />
              </Link>
              <div className="flex flex-col">
                <span className="text-indigo-400 font-black text-[9px] uppercase tracking-[0.4em] italic mb-1 leading-none">Intelligence Hub</span>
                <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter italic leading-none text-white">OFFICE <span className="text-indigo-500">STATS</span></h1>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/5 w-fit">
               <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
               <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Dati Sincronizzati Real-Time</span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
             <div className="bg-black/40 p-1 rounded-2xl border border-white/10 flex gap-0.5 backdrop-blur-md">
                {(['TODAY', 'WEEK', 'MONTH', 'CUSTOM'] as DateFilter[]).map(f => (
                  <button 
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    {f === 'TODAY' ? 'Oggi' : f === 'WEEK' ? 'Settimana' : f === 'MONTH' ? 'Mese' : 'Custom'}
                  </button>
                ))}
             </div>
             
             {filter === 'CUSTOM' && (
               <div className="flex items-center gap-2 animate-in slide-in-from-top-2 duration-300 bg-white/5 p-2 rounded-xl border border-white/5 self-end">
                  <input type="date" value={customRange.start} onChange={e => setCustomRange({...customRange, start: e.target.value})} className="bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[10px] font-bold outline-none text-white" />
                  <span className="text-white/20">-</span>
                  <input type="date" value={customRange.end} onChange={e => setCustomRange({...customRange, end: e.target.value})} className="bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[10px] font-bold outline-none text-white" />
                  <button onClick={fetchData} className="p-1.5 bg-indigo-600 rounded-lg text-white hover:bg-indigo-500 transition-colors"><RefreshCw size={14} /></button>
               </div>
             )}
          </div>
        </div>
      </div>

      <div className="max-w-[1850px] mx-auto px-6 -mt-12 relative z-20">
        
        {/* KPI Scoreboard - Chiaro e diretto */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
           <div className="bg-[#0a0f1a] rounded-3xl p-6 border border-white/10 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 text-indigo-500/10"><Weight size={80} /></div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">PRODUZIONE TOTALE (TER)</p>
              <p className="text-3xl font-black text-white italic tabular-nums">{totals.grandTotal.toLocaleString()} <span className="text-sm opacity-30 not-italic ml-1">KG</span></p>
           </div>
           <div className="bg-[#0a0f1a] rounded-3xl p-6 border border-white/10 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 text-emerald-500/10"><Target size={80} /></div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">UNITÀ PIÙ ATTIVA</p>
              {/* Fix: Explicitly cast Object.values to number[] to satisfy Math.max parameter type requirement */}
              <p className="text-2xl font-black text-emerald-400 uppercase italic truncate">{totals.grandTotal > 0 ? (macchine.find(m => totals.rowTotals[m.id_macchina] === Math.max(...(Object.values(totals.rowTotals) as number[])))?.macchina || '--') : '--'}</p>
           </div>
           <div className="bg-[#0a0f1a] rounded-3xl p-6 border border-white/10 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 text-amber-500/10"><PieChart size={80} /></div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">LAVORAZIONE DOMINANTE</p>
              {/* Fix: Explicitly cast Object.values to number[] to satisfy Math.max parameter type requirement */}
              <p className="text-2xl font-black text-amber-500 uppercase italic truncate">{totals.grandTotal > 0 ? (fasi.find(f => totals.colTotals[f.id_fase] === Math.max(...(Object.values(totals.colTotals) as number[])))?.fase_di_lavorazione || '--') : '--'}</p>
           </div>
           <div className="bg-[#0a0f1a] rounded-3xl p-6 border border-white/10 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 text-sky-500/10"><Activity size={80} /></div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">STATUS SISTEMA</p>
              <p className="text-2xl font-black text-white uppercase italic">OPERATIVO</p>
           </div>
        </div>

        {/* Tabella Integrata con Legenda e Colori Chiari */}
        <div className="bg-[#0a0f1a] rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden flex flex-col">
          <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
             <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-600/20 text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-500/20">
                   <LayoutDashboard size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black uppercase italic tracking-tighter leading-none mb-0.5">ANALISI FLUSSI DI PRODUZIONE</h2>
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em]">Matrice Integrata: Finiti, Preparazione, Attesa</p>
                </div>
             </div>
             
             {/* Legenda Chiara */}
             <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                   <div className="w-2.5 h-2.5 bg-indigo-600 rounded-sm"></div>
                   <span className="text-[8px] font-black text-slate-400 uppercase">Finiti</span>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-2.5 h-2.5 bg-sky-500 rounded-sm"></div>
                   <span className="text-[8px] font-black text-slate-400 uppercase">Prep.</span>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-2.5 h-2.5 bg-amber-500 rounded-sm"></div>
                   <span className="text-[8px] font-black text-slate-400 uppercase">Attesa</span>
                </div>
                <button onClick={fetchData} className="ml-4 p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 transition-all border border-white/5">
                   <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
             </div>
          </div>

          <div className="flex-grow overflow-y-auto custom-scrollbar bg-[#060a14]">
            <table className="w-full text-left border-collapse min-w-[1200px]">
               <thead>
                 <tr className="bg-black/40 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                    <th className="px-6 py-5 sticky left-0 z-40 bg-slate-900/95 backdrop-blur-xl border-r border-white/5 w-[180px]">UNITÀ</th>
                    
                    {/* Intestazioni Finiti */}
                    {fasi.map(f => (
                      <th key={f.id_fase} className="px-4 py-5 text-center bg-indigo-900/10 border-r border-white/5">
                        <div className="flex flex-col items-center">
                           <CheckCircle2 size={12} className="text-indigo-400 mb-1" />
                           <span className="whitespace-nowrap">{f.fase_di_lavorazione}</span>
                        </div>
                      </th>
                    ))}
                    
                    {/* Intestazioni Backlog */}
                    <th className="px-4 py-5 text-center bg-sky-900/20 border-r border-white/5 text-sky-400">
                       <div className="flex flex-col items-center">
                          <Timer size={12} className="mb-1" />
                          <span>IN PREP.</span>
                       </div>
                    </th>
                    <th className="px-4 py-5 text-center bg-amber-900/20 border-r border-white/5 text-amber-500">
                       <div className="flex flex-col items-center">
                          <Clock size={12} className="mb-1" />
                          <span>IN ATTESA</span>
                       </div>
                    </th>
                    
                    <th className="px-6 py-5 text-right text-white italic bg-indigo-950/40 border-l border-white/5">TOTAL FINITI</th>
                 </tr>
               </thead>
               <tbody>
                 {macchine.map((m, mIdx) => {
                    const rowTotal = totals.rowTotals[m.id_macchina] || 0;
                    const bStats = backlogStats[m.id_macchina] || { pre: { kg: 0, count: 0 }, att: { kg: 0, count: 0 } };
                    
                    return (
                      <tr key={m.id_macchina} className="border-b border-white/[0.03] group hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-6 font-black text-white italic text-sm uppercase sticky left-0 z-30 bg-[#0a0f1a] group-hover:bg-[#0f172a] transition-colors shadow-xl border-r border-white/5">
                          {m.macchina}
                        </td>
                        
                        {/* Celle Finiti */}
                        {fasi.map(f => {
                           const val = matrix[m.id_macchina][f.id_fase] || 0;
                           return (
                             <td key={f.id_fase} className="px-2 py-6 text-center tabular-nums border-r border-white/5">
                                {val > 0 ? (
                                  <button 
                                    onClick={() => handleCellClick(m, f)}
                                    className="inline-flex flex-col items-center bg-indigo-600/10 hover:bg-indigo-600/30 px-3 py-1.5 rounded-xl border border-indigo-500/20 transition-all hover:scale-105"
                                  >
                                    <span className="text-indigo-100 text-[11px] font-black">{val.toLocaleString()}</span>
                                    <span className="text-[7px] font-black text-indigo-400 uppercase">KG</span>
                                  </button>
                                ) : (
                                  <span className="text-white/5 text-sm font-thin">-</span>
                                )}
                             </td>
                           );
                        })}

                        {/* Cella PREPARAZIONE */}
                        <td className="px-2 py-6 text-center tabular-nums bg-sky-900/5 border-r border-white/5">
                           {bStats.pre.count > 0 ? (
                              <button 
                                onClick={() => handleBacklogClick(m, 'PRE')}
                                className="inline-flex flex-col items-center bg-sky-500/10 hover:bg-sky-500/30 px-3 py-1.5 rounded-xl border border-sky-500/20 transition-all hover:scale-105"
                              >
                                <span className="text-sky-100 text-[11px] font-black">{bStats.pre.kg.toLocaleString()}</span>
                                <span className="text-[7px] font-black text-sky-400 uppercase">{bStats.pre.count} SCH</span>
                              </button>
                           ) : (
                              <span className="text-white/5 text-sm font-thin">-</span>
                           )}
                        </td>

                        {/* Cella ATTESA */}
                        <td className="px-2 py-6 text-center tabular-nums bg-amber-900/5 border-r border-white/5">
                           {bStats.att.count > 0 ? (
                              <button 
                                onClick={() => handleBacklogClick(m, 'ATT')}
                                className="inline-flex flex-col items-center bg-amber-500/10 hover:bg-amber-500/30 px-3 py-1.5 rounded-xl border border-amber-500/20 transition-all hover:scale-105"
                              >
                                <span className="text-amber-100 text-[11px] font-black">{bStats.att.kg.toLocaleString()}</span>
                                <span className="text-[7px] font-black text-amber-500 uppercase">{bStats.att.count} SCH</span>
                              </button>
                           ) : (
                              <span className="text-white/5 text-sm font-thin">-</span>
                           )}
                        </td>

                        <td className="px-6 py-6 text-right font-black text-lg text-indigo-400 bg-indigo-600/[0.03] border-l border-white/5 italic">
                           {rowTotal > 0 ? rowTotal.toLocaleString() : '-'}
                        </td>
                      </tr>
                    );
                 })}
               </tbody>
               <tfoot>
                 <tr className="bg-indigo-950/20 border-t-2 border-indigo-500/30">
                    <td className="px-6 py-6 font-black text-white uppercase italic tracking-widest sticky left-0 z-30 bg-[#1e1b4b] border-r border-indigo-500/20 shadow-xl text-[10px]">TOTALI FASE</td>
                    {fasi.map(f => (
                      <td key={f.id_fase} className="px-2 py-6 text-center font-black text-sm text-indigo-200 tabular-nums italic border-r border-white/5">
                        {totals.colTotals[f.id_fase] > 0 ? totals.colTotals[f.id_fase].toLocaleString() : '-'}
                      </td>
                    ))}
                    <td className="bg-sky-950/40 border-r border-white/5"></td>
                    <td className="bg-amber-950/40 border-r border-white/5"></td>
                    <td className="px-6 py-8 text-right font-black text-2xl text-white italic bg-indigo-600 shadow-2xl relative">
                       <span className="text-[8px] font-black text-white/40 block mb-1 uppercase tracking-widest not-italic">Totale Globale</span>
                       {totals.grandTotal.toLocaleString()} <span className="text-xs opacity-50 ml-1">KG</span>
                    </td>
                 </tr>
               </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Report Modal Drill-Down (Design Report Pulito) */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[2000] flex items-center justify-center p-4 animate-in zoom-in-95 duration-200">
           <div className="bg-[#0a0f1a] border border-white/10 rounded-[2.5rem] w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
              
              <div className="px-10 py-8 border-b border-white/10 flex justify-between items-center bg-indigo-600/5">
                 <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
                       <ClipboardList size={28} />
                    </div>
                    <div>
                       <div className="flex items-center gap-3">
                          <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">{selectedReport.macchina}</h3>
                          <ChevronRight size={18} className="text-slate-600" />
                          <h3 className="text-2xl font-black text-indigo-400 uppercase italic tracking-tighter">{selectedReport.fase}</h3>
                       </div>
                       <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.4em] mt-1">Report Dettagliato degli Ordini Elaborati</p>
                    </div>
                 </div>
                 <button onClick={() => setSelectedReport(null)} className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center text-white/30 hover:text-white transition-all border border-white/10">
                    <X size={28} />
                 </button>
              </div>

              <div className="flex-grow overflow-y-auto custom-scrollbar p-8">
                 <table className="w-full text-left border-collapse">
                    <thead>
                       <tr className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/10">
                          <th className="px-6 py-4">Scheda</th>
                          <th className="px-6 py-4">Cliente</th>
                          <th className="px-6 py-4">Lega / Stato</th>
                          <th className="px-6 py-4 text-center">Spess.</th>
                          <th className="px-6 py-4 text-center">Misura</th>
                          <th className="px-6 py-4 text-center">Stato</th>
                          <th className="px-6 py-4 text-right">Peso KG</th>
                       </tr>
                    </thead>
                    <tbody>
                       {selectedReport.items.map((item, idx) => {
                          const isFinished = item.id_stato === 'TER';
                          const weight = isFinished ? item.ordine_kg_lavorato : item.ordine_kg_richiesto;
                          return (
                            <tr key={item.id_lavorazione} className={`border-b border-white/[0.03] transition-colors ${idx % 2 === 0 ? 'bg-white/[0.01]' : 'bg-transparent'} hover:bg-indigo-600/10`}>
                               <td className="px-6 py-5 font-black text-lg text-white italic tabular-nums">{item.scheda}</td>
                               <td className="px-6 py-5 font-bold text-slate-300 uppercase text-xs truncate max-w-[200px]">{item.l_clienti?.cliente || 'N/D'}</td>
                               <td className="px-6 py-5">
                                  <div className="flex flex-col leading-none">
                                     <span className="text-[9px] font-black text-indigo-400 uppercase mb-0.5">{item.mcoil_lega}</span>
                                     <span className="text-[8px] font-bold text-slate-500 uppercase truncate max-w-[120px]">{item.mcoil_stato_fisico}</span>
                                  </div>
                               </td>
                               <td className="px-6 py-5 text-center font-bold text-white text-xs tabular-nums">{item.spessore}</td>
                               <td className="px-6 py-5 text-center font-bold text-amber-500 text-xs tabular-nums">{item.misura}</td>
                               <td className="px-6 py-5 text-center">
                                  <span className={`px-2.5 py-1 rounded-full text-[7px] font-black uppercase tracking-widest border ${
                                    item.id_stato === 'TER' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                    item.id_stato === 'PRE' ? 'bg-sky-500/10 text-sky-500 border-sky-500/20' :
                                    'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                  }`}>
                                    {item.id_stato === 'TER' ? 'Finito' : item.id_stato === 'PRE' ? 'In Prep' : 'In Attesa'}
                                  </span>
                               </td>
                               <td className="px-6 py-5 text-right font-black text-lg text-indigo-200 italic tabular-nums">
                                  {weight?.toLocaleString()}
                               </td>
                            </tr>
                          );
                       })}
                    </tbody>
                 </table>
              </div>

              <div className="p-8 border-t border-white/10 bg-slate-950/80 flex justify-between items-center">
                 <div className="flex items-center gap-3 bg-white/5 px-6 py-3 rounded-2xl border border-white/5">
                    <Info size={16} className="text-indigo-400" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Totale Record: <span className="text-white">{selectedReport.items.length}</span></span>
                 </div>
                 <div className="text-right">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">Sommatoria Produzione Report</p>
                    <p className="text-4xl font-black text-white italic tracking-tighter">
                       {selectedReport.items.reduce((acc, curr) => {
                          const w = curr.id_stato === 'TER' ? curr.ordine_kg_lavorato : curr.ordine_kg_richiesto;
                          return acc + (w || 0);
                       }, 0).toLocaleString()} <span className="text-sm opacity-30 not-italic ml-2">KG</span>
                    </p>
                 </div>
              </div>

           </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 4px; width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.2); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,0.4); }
      `}</style>
    </div>
  );
};

export default UfficioStats;
