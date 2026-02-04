
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Macchina, FaseLavorazione, Lavorazione, Stati } from '../types';
import { 
  ArrowLeft, Calendar, BarChart3, TrendingUp, 
  RefreshCw, ChevronLeft, ChevronRight, Filter,
  Weight, Activity, Cpu, Box, PieChart, Target, X, ClipboardList, Info,
  Clock, Timer
} from 'lucide-react';

type DateFilter = 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM';

const CUSTOM_ORDER = [
  'SLITTER GRANDE',
  'SLITTER PICCOLO',
  'SLITTER NUOVO',
  'SBAVATRICE VECCHIA',
  'SBAVATRICE NUOVA',
  'LASTRE',
  'ELMA',
  'STAMPATRICE',
  'DI MAIO'
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
      supabase.from('l_lavorazioni')
        .select('*, l_clienti:id_cliente (*)')
        .eq('id_stato', 'TER')
        .gte('fine_lavorazione', start)
        .lte('fine_lavorazione', end),
      supabase.from('l_lavorazioni')
        .select('*, l_clienti:id_cliente (*)')
        .in('id_stato', ['PRE', 'ATT'])
    ]);

    if (mRes.data) {
      const sorted = mRes.data
        .filter(m => !['CASSONE', 'UFFICIO', 'MAGAZZINO', 'IMBALLAGGIO'].includes(m.macchina.toUpperCase()))
        .sort((a, b) => {
          const idxA = CUSTOM_ORDER.indexOf(a.macchina.toUpperCase());
          const idxB = CUSTOM_ORDER.indexOf(b.macchina.toUpperCase());
          if (idxA === -1 && idxB === -1) return a.macchina.localeCompare(b.macchina);
          if (idxA === -1) return 1;
          if (idxB === -1) return -1;
          return idxA - idxB;
        });
      setMacchine(sorted);
    }
    
    if (fRes.data) setFasi(fRes.data);
    if (lRes.data) setData(lRes.data);
    if (bRes.data) setBacklogData(bRes.data);
    
    setLoading(false);
  }, [getRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const matrix = useMemo(() => {
    const table: Record<string, Record<string, number>> = {};
    macchine.forEach(m => {
      table[m.id_macchina] = {};
      fasi.forEach(f => {
        table[m.id_macchina][f.id_fase] = 0;
      });
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
      stats[m.id_macchina] = {
        pre: { kg: 0, count: 0, items: [] },
        att: { kg: 0, count: 0, items: [] }
      };
    });

    backlogData.forEach(l => {
      const mId = l.id_macchina;
      if (stats[mId]) {
        if (l.id_stato === 'PRE') {
          stats[mId].pre.kg += (l.ordine_kg_richiesto || 0);
          stats[mId].pre.count += 1;
          stats[mId].pre.items.push(l);
        } else if (l.id_stato === 'ATT') {
          stats[mId].att.kg += (l.ordine_kg_richiesto || 0);
          stats[mId].att.count += 1;
          stats[mId].att.items.push(l);
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

  const stats = useMemo(() => {
    let topMachine = { name: '--', kg: 0 };
    let topPhase = { name: '--', kg: 0 };

    macchine.forEach(m => {
      if (totals.rowTotals[m.id_macchina] > topMachine.kg) {
        topMachine = { name: m.macchina, kg: totals.rowTotals[m.id_macchina] };
      }
    });

    fasi.forEach(f => {
      if (totals.colTotals[f.id_fase] > topPhase.kg) {
        topPhase = { name: f.fase_di_lavorazione, kg: totals.colTotals[f.id_fase] };
      }
    });

    return { topMachine, topPhase };
  }, [macchine, fasi, totals]);

  const handleCellClick = (m: Macchina, f: FaseLavorazione) => {
    const filteredItems = data.filter(l => l.id_macchina === m.id_macchina && l.id_fase === f.id_fase);
    if (filteredItems.length > 0) {
      setSelectedReport({
        macchina: m.macchina,
        fase: f.fase_di_lavorazione,
        items: filteredItems
      });
    }
  };

  const handleBacklogClick = (m: Macchina, type: 'PRE' | 'ATT') => {
    const s = backlogStats[m.id_macchina];
    const items = type === 'PRE' ? s.pre.items : s.att.items;
    if (items.length > 0) {
      setSelectedReport({
        macchina: m.macchina,
        fase: type === 'PRE' ? 'IN PREPARAZIONE' : 'IN ATTESA',
        items: items
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#060a14] text-slate-100 pb-10 overflow-x-hidden">
      
      {/* Header compattato */}
      <div className="relative pt-12 pb-20 px-6 overflow-hidden border-b border-white/5 bg-slate-900/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,_rgba(99,102,241,0.1),_transparent_40%)]"></div>
        <div className="relative z-10 max-w-[1800px] mx-auto flex flex-col xl:flex-row justify-between items-center gap-6">
          <div className="w-full xl:w-auto text-center xl:text-left">
            <div className="flex items-center justify-center xl:justify-start gap-4 mb-4">
              <Link to="/lavoro/ufficio" className="p-2 bg-white/5 rounded-lg text-white/40 hover:text-white transition-all border border-white/5 shadow-xl">
                <ArrowLeft size={16} />
              </Link>
              <div className="flex flex-col items-start">
                <span className="text-indigo-400 font-black text-[8px] uppercase tracking-[0.4em] italic leading-none">ANALYTICS ENGINE</span>
                <div className="flex items-center gap-1 mt-1">
                   <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                   <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Live Sync</span>
                </div>
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter italic leading-none text-white">
              OFFICE <span className="text-indigo-500">CORE</span>
            </h1>
          </div>

          <div className="flex flex-col gap-4 w-full xl:w-auto">
             <div className="bg-slate-950/80 p-1 rounded-2xl border border-white/10 flex gap-0.5 shadow-2xl backdrop-blur-md overflow-x-auto custom-scrollbar">
                {(['TODAY', 'WEEK', 'MONTH', 'CUSTOM'] as DateFilter[]).map(f => (
                  <button 
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filter === f ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    {f === 'TODAY' ? 'Oggi' : f === 'WEEK' ? 'Settimana' : f === 'MONTH' ? 'Mese' : 'Custom'}
                  </button>
                ))}
             </div>
             
             {filter === 'CUSTOM' && (
               <div className="flex items-center gap-2 animate-in slide-in-from-top-2 duration-300 bg-white/5 p-2 rounded-xl border border-white/5 self-center xl:self-end">
                  <input type="date" value={customRange.start} onChange={e => setCustomRange({...customRange, start: e.target.value})} className="bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[10px] font-bold outline-none text-white" />
                  <span className="text-white/20">-</span>
                  <input type="date" value={customRange.end} onChange={e => setCustomRange({...customRange, end: e.target.value})} className="bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-[10px] font-bold outline-none text-white" />
                  <button onClick={fetchData} className="p-1.5 bg-indigo-600 rounded-lg text-white hover:bg-indigo-500 transition-colors"><RefreshCw size={14} /></button>
               </div>
             )}
          </div>
        </div>
      </div>

      <div className="max-w-[1850px] mx-auto px-4 -mt-10 relative z-20">
        
        {/* KPI Scoreboard compattato */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
           {[
             { label: 'OUTPUT TOTALE (TER)', val: `${totals.grandTotal.toLocaleString()} KG`, icon: Weight, color: 'text-indigo-500' },
             { label: 'UNITÀ LEADER', val: stats.topMachine.name, icon: Target, color: 'text-emerald-500', sub: `${stats.topMachine.kg.toLocaleString()} KG` },
             { label: 'FOCUS LAVORAZIONE', val: stats.topPhase.name, icon: PieChart, color: 'text-amber-500', sub: `${stats.topPhase.kg.toLocaleString()} KG` },
             { label: 'STATUS MATRICE', val: 'OPERATIVO', icon: Activity, color: 'text-indigo-400', sub: 'Update live ogni 10s' }
           ].map((kpi, idx) => (
             <div key={idx} className="bg-white/[0.03] backdrop-blur-2xl rounded-3xl p-5 border border-white/10 shadow-xl relative overflow-hidden group">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                   <kpi.icon size={10} className={kpi.color} /> {kpi.label}
                </p>
                <p className="text-xl font-black text-white italic tracking-tight truncate">
                  {kpi.val}
                </p>
                {kpi.sub && <p className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">{kpi.sub}</p>}
             </div>
           ))}
        </div>

        {/* Matrice Compattata */}
        <div className="bg-white/[0.02] backdrop-blur-3xl rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden flex flex-col">
          <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-indigo-600/[0.02]">
             <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-600/20 text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-500/20">
                   <BarChart3 size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black uppercase italic tracking-tighter leading-none mb-0.5">MATRICE INTEGRATA</h2>
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em]">Monitoraggio flussi produttivi</p>
                </div>
             </div>
             <button onClick={fetchData} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 transition-all border border-white/5 flex items-center gap-2 group">
                <span className="text-[8px] font-black uppercase tracking-widest group-hover:text-white transition-colors">Sync</span>
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
             </button>
          </div>

          <div className="flex-grow overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1200px]">
               <thead>
                 <tr className="bg-black/40 text-[8px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                    <th className="px-6 py-4 sticky left-0 z-40 bg-slate-950/95 backdrop-blur-xl border-r border-white/5 w-[180px]">UNITÀ</th>
                    
                    {fasi.map(f => (
                      <th key={f.id_fase} className="px-4 py-4 text-center bg-indigo-900/10">FINITI: {f.fase_di_lavorazione}</th>
                    ))}
                    
                    <th className="px-4 py-4 text-center bg-sky-900/20 border-l border-white/5 text-sky-400">IN PREP.</th>
                    <th className="px-4 py-4 text-center bg-amber-900/20 border-l border-white/5 text-amber-500">IN ATTESA</th>
                    
                    <th className="px-6 py-4 text-right text-white italic bg-indigo-950/20 border-l border-white/5">TOTAL KG (FIN)</th>
                 </tr>
               </thead>
               <tbody>
                 {macchine.map((m, mIdx) => {
                    const rowTotal = totals.rowTotals[m.id_macchina] || 0;
                    const bStats = backlogStats[m.id_macchina] || { pre: { kg: 0, count: 0 }, att: { kg: 0, count: 0 } };
                    
                    return (
                      <tr key={m.id_macchina} className="border-b border-white/[0.03] group hover:bg-indigo-600/[0.03] transition-colors">
                        <td className="px-6 py-5 font-black text-white italic text-sm uppercase tracking-tight sticky left-0 z-30 bg-[#0a0f1a] group-hover:bg-[#111827] transition-colors shadow-xl border-r border-white/5">
                          <span className="opacity-10 mr-2 tabular-nums text-[10px]">{(mIdx + 1).toString().padStart(2, '0')}</span>
                          {m.macchina}
                        </td>
                        
                        {fasi.map(f => {
                           const val = matrix[m.id_macchina][f.id_fase] || 0;
                           return (
                             <td key={f.id_fase} className="px-3 py-5 text-center tabular-nums font-bold">
                                {val > 0 ? (
                                  <button 
                                    onClick={() => handleCellClick(m, f)}
                                    className="flex flex-col items-center mx-auto hover:scale-105 active:scale-95 transition-all bg-white/5 hover:bg-indigo-600/20 px-3 py-1.5 rounded-xl border border-white/5"
                                  >
                                    <span className="text-slate-200 text-xs">{val.toLocaleString()}</span>
                                    <span className="text-[7px] font-black text-indigo-500/40 uppercase">KG</span>
                                  </button>
                                ) : (
                                  <span className="text-white/[0.03] text-lg font-thin">-</span>
                                )}
                             </td>
                           );
                        })}

                        {/* IN PREPARAZIONE Compattato */}
                        <td className="px-3 py-5 text-center tabular-nums font-bold bg-sky-900/5 border-l border-white/5">
                           {bStats.pre.count > 0 ? (
                              <button 
                                onClick={() => handleBacklogClick(m, 'PRE')}
                                className="flex flex-col items-center mx-auto hover:scale-105 active:scale-95 transition-all bg-sky-500/10 hover:bg-sky-500/20 px-3 py-1.5 rounded-xl border border-sky-500/20"
                              >
                                <span className="text-sky-400 text-xs">{bStats.pre.kg.toLocaleString()}</span>
                                <span className="text-[7px] font-black text-sky-500/60 uppercase">{bStats.pre.count} SCH</span>
                              </button>
                           ) : (
                              <span className="text-white/[0.02] text-sm">-</span>
                           )}
                        </td>

                        {/* IN ATTESA Compattato */}
                        <td className="px-3 py-5 text-center tabular-nums font-bold bg-amber-900/5 border-l border-white/5">
                           {bStats.att.count > 0 ? (
                              <button 
                                onClick={() => handleBacklogClick(m, 'ATT')}
                                className="flex flex-col items-center mx-auto hover:scale-105 active:scale-95 transition-all bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-xl border border-amber-500/20"
                              >
                                <span className="text-amber-500 text-xs">{bStats.att.kg.toLocaleString()}</span>
                                <span className="text-[7px] font-black text-amber-500/60 uppercase">{bStats.att.count} SCH</span>
                              </button>
                           ) : (
                              <span className="text-white/[0.02] text-sm">-</span>
                           )}
                        </td>

                        <td className="px-6 py-5 text-right font-black text-base text-indigo-400 tabular-nums italic bg-indigo-600/[0.01] group-hover:bg-indigo-600/10 border-l border-white/5 transition-colors">
                           {rowTotal > 0 ? rowTotal.toLocaleString() : '-'}
                        </td>
                      </tr>
                    );
                 })}
               </tbody>
               <tfoot>
                 <tr className="bg-indigo-600/5 border-t-2 border-indigo-500/30">
                    <td className="px-6 py-6 font-black text-white uppercase italic tracking-widest sticky left-0 z-30 bg-[#1e1b4b] border-r border-indigo-500/20 shadow-xl text-[10px]">TOTALE</td>
                    {fasi.map(f => (
                      <td key={f.id_fase} className="px-3 py-6 text-center font-black text-sm text-indigo-200 tabular-nums italic">
                        {totals.colTotals[f.id_fase] > 0 ? totals.colTotals[f.id_fase].toLocaleString() : '-'}
                      </td>
                    ))}
                    <td className="bg-sky-950/20 border-l border-white/5"></td>
                    <td className="bg-amber-950/20 border-l border-white/5"></td>
                    <td className="px-6 py-6 text-right font-black text-xl text-white italic bg-indigo-600 shadow-2xl relative">
                       {totals.grandTotal.toLocaleString()} <span className="text-[10px] opacity-50 ml-1">KG</span>
                    </td>
                 </tr>
               </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* Report Modal Drill-Down (Invariato nel funzionamento, solo CSS compattato) */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-3xl z-[2000] flex items-center justify-center p-4 animate-in zoom-in-95 duration-200">
           <div className="bg-[#0a0f1a] border border-white/10 rounded-[2.5rem] w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
              
              <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-indigo-600/5">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                       <ClipboardList size={20} />
                    </div>
                    <div>
                       <div className="flex items-center gap-2">
                          <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">{selectedReport.macchina}</h3>
                          <ChevronRight size={14} className="text-slate-600" />
                          <h3 className="text-xl font-black text-indigo-400 uppercase italic tracking-tighter">{selectedReport.fase}</h3>
                       </div>
                       <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mt-0.5">Dettaglio Ordini</p>
                    </div>
                 </div>
                 <button onClick={() => setSelectedReport(null)} className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-white/30 hover:text-white transition-all">
                    <X size={20} />
                 </button>
              </div>

              <div className="flex-grow overflow-y-auto custom-scrollbar p-6">
                 <table className="w-full text-left border-collapse">
                    <thead>
                       <tr className="text-[8px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                          <th className="px-4 py-3">Scheda</th>
                          <th className="px-4 py-3">Cliente</th>
                          <th className="px-4 py-3">Materiale</th>
                          <th className="px-4 py-3 text-center">Spessore</th>
                          <th className="px-4 py-3 text-center">Misura</th>
                          <th className="px-4 py-3 text-center">Stato</th>
                          <th className="px-4 py-3 text-right">Peso</th>
                       </tr>
                    </thead>
                    <tbody>
                       {selectedReport.items.map((item) => {
                          const isFinished = item.id_stato === 'TER';
                          const weight = isFinished ? item.ordine_kg_lavorato : item.ordine_kg_richiesto;
                          return (
                            <tr key={item.id_lavorazione} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                               <td className="px-4 py-4 font-black text-base text-white italic tabular-nums">{item.scheda}</td>
                               <td className="px-4 py-4 font-bold text-slate-300 uppercase text-xs truncate max-w-[180px]">{item.l_clienti?.cliente || 'N/D'}</td>
                               <td className="px-4 py-4">
                                  <div className="flex flex-col leading-none">
                                     <span className="text-[9px] font-black text-indigo-400 uppercase mb-0.5">{item.mcoil_lega}</span>
                                     <span className="text-[8px] font-bold text-slate-500 uppercase">{item.mcoil_stato_fisico}</span>
                                  </div>
                               </td>
                               <td className="px-4 py-4 text-center font-bold text-white text-xs tabular-nums">{item.spessore}</td>
                               <td className="px-4 py-4 text-center font-bold text-amber-500 text-xs tabular-nums">{item.misura}</td>
                               <td className="px-4 py-4 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest border ${
                                    item.id_stato === 'TER' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                    item.id_stato === 'PRE' ? 'bg-sky-500/10 text-sky-500 border-sky-500/20' :
                                    'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                  }`}>
                                    {item.id_stato === 'TER' ? 'TER' : item.id_stato === 'PRE' ? 'PRE' : 'ATT'}
                                  </span>
                               </td>
                               <td className="px-4 py-4 text-right font-black text-base text-indigo-300 italic tabular-nums">
                                  {weight?.toLocaleString()}
                               </td>
                            </tr>
                          );
                       })}
                    </tbody>
                 </table>
              </div>

              <div className="p-6 border-t border-white/5 bg-slate-950/50 flex justify-between items-center">
                 <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                    <Info size={12} className="text-indigo-400" />
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Totale Record: <span className="text-white">{selectedReport.items.length}</span></span>
                 </div>
                 <div className="text-right">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Sommatoria Produzione</p>
                    <p className="text-2xl font-black text-white italic tracking-tighter">
                       {selectedReport.items.reduce((acc, curr) => {
                          const w = curr.id_stato === 'TER' ? curr.ordine_kg_lavorato : curr.ordine_kg_richiesto;
                          return acc + (w || 0);
                       }, 0).toLocaleString()} <span className="text-xs opacity-30 ml-1">KG</span>
                    </p>
                 </div>
              </div>

           </div>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 bg-[#060a14]/90 backdrop-blur-xl z-[100] flex flex-col items-center justify-center animate-in fade-in duration-300">
           <RefreshCw size={32} className="text-indigo-500 animate-spin" />
           <p className="mt-4 text-[8px] font-black uppercase tracking-[0.4em] text-white/40 italic">Syncing Matrix...</p>
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
