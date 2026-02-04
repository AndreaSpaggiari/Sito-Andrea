
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

    // Fetch Macchine, Fasi, Lavorazioni Terminate (in range) e Lavorazioni in Backlog (PRE/ATT)
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

  // Matrice per Terminate (TER)
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

  // Backlog Mapping (PRE e ATT)
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
    <div className="min-h-screen bg-[#060a14] text-slate-100 pb-20 overflow-x-hidden">
      
      <div className="relative pt-20 pb-32 px-6 overflow-hidden border-b border-white/5 bg-slate-900/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,_rgba(99,102,241,0.1),_transparent_40%)]"></div>
        <div className="relative z-10 max-w-7xl mx-auto flex flex-col xl:flex-row justify-between items-end gap-10">
          <div className="w-full xl:w-auto">
            <div className="flex items-center gap-4 mb-6">
              <Link to="/lavoro/ufficio" className="p-3 bg-white/5 rounded-xl text-white/40 hover:text-white transition-all border border-white/5 shadow-xl">
                <ArrowLeft size={20} />
              </Link>
              <div className="flex flex-col">
                <span className="text-indigo-400 font-black text-[9px] uppercase tracking-[0.4em] italic mb-1">REAL-TIME PRODUCTION ANALYTICS</span>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                   <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Sincronizzazione Cloud Attiva</span>
                </div>
              </div>
            </div>
            <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tighter italic leading-none bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40">
              OFFICE <span className="text-indigo-500">CORE</span>
            </h1>
          </div>

          <div className="flex flex-col gap-4 w-full xl:w-auto">
             <div className="bg-slate-950/80 p-1.5 rounded-[1.5rem] border border-white/10 flex gap-1 shadow-2xl backdrop-blur-md">
                {(['TODAY', 'WEEK', 'MONTH', 'CUSTOM'] as DateFilter[]).map(f => (
                  <button 
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                  >
                    {f === 'TODAY' ? 'Oggi' : f === 'WEEK' ? 'Settimana' : f === 'MONTH' ? 'Mese' : 'Custom'}
                  </button>
                ))}
             </div>
             
             {filter === 'CUSTOM' && (
               <div className="flex items-center gap-3 animate-in slide-in-from-right-4 duration-500 bg-white/5 p-3 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-slate-500 uppercase">DAL</span>
                    <input type="date" value={customRange.start} onChange={e => setCustomRange({...customRange, start: e.target.value})} className="bg-slate-950 border border-white/10 rounded-lg px-4 py-2 text-xs font-bold outline-none focus:border-indigo-500 text-white" />
                  </div>
                  <ChevronRight size={14} className="text-slate-700" />
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-slate-500 uppercase">AL</span>
                    <input type="date" value={customRange.end} onChange={e => setCustomRange({...customRange, end: e.target.value})} className="bg-slate-950 border border-white/10 rounded-lg px-4 py-2 text-xs font-bold outline-none focus:border-indigo-500 text-white" />
                  </div>
                  <button onClick={fetchData} className="ml-2 w-10 h-10 bg-indigo-600 rounded-xl text-white flex items-center justify-center hover:bg-indigo-500 transition-colors shadow-xl"><RefreshCw size={18} /></button>
               </div>
             )}
          </div>
        </div>
      </div>

      <div className="max-w-[1900px] mx-auto px-6 -mt-16 relative z-20">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
           <div className="bg-white/[0.03] backdrop-blur-2xl rounded-[2.5rem] p-10 border border-white/10 flex flex-col justify-between group shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 text-indigo-500/5"><Weight size={120} /></div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <Weight size={12} className="text-indigo-500" /> OUTPUT TOTALE (TER)
              </p>
              <p className="text-5xl font-black text-white italic tracking-tighter tabular-nums leading-none">
                {totals.grandTotal.toLocaleString()} <span className="text-lg opacity-30 not-italic ml-1">KG</span>
              </p>
           </div>

           <div className="bg-white/[0.03] backdrop-blur-2xl rounded-[2.5rem] p-10 border border-white/10 flex flex-col justify-between group shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 text-emerald-500/5"><Target size={120} /></div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <Cpu size={12} className="text-emerald-500" /> UNITÀ LEADER
              </p>
              <p className="text-3xl font-black text-emerald-400 uppercase italic tracking-tighter leading-none mb-1">
                {stats.topMachine.name}
              </p>
              <p className="text-[11px] font-bold text-slate-500 uppercase italic">{stats.topMachine.kg.toLocaleString()} KG PRODOTTI</p>
           </div>

           <div className="bg-white/[0.03] backdrop-blur-2xl rounded-[2.5rem] p-10 border border-white/10 flex flex-col justify-between group shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 text-amber-500/5"><PieChart size={120} /></div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <Box size={12} className="text-amber-500" /> FOCUS LAVORAZIONE
              </p>
              <p className="text-3xl font-black text-amber-500 uppercase italic tracking-tighter leading-none mb-1">
                {stats.topPhase.name}
              </p>
              <p className="text-[11px] font-bold text-slate-500 uppercase italic">{stats.topPhase.kg.toLocaleString()} KG TOTALI</p>
           </div>

           <div className="bg-white/[0.03] backdrop-blur-2xl rounded-[2.5rem] p-10 border border-white/10 flex flex-col justify-between group shadow-2xl relative overflow-hidden border-indigo-500/20">
              <div className="absolute top-0 right-0 p-8 text-indigo-500/5"><TrendingUp size={120} /></div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                 <Activity size={12} className="text-indigo-400" /> STATUS MATRICE
              </p>
              <p className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none mb-1">OPERATIVO</p>
              <p className="text-[11px] font-bold text-indigo-400/60 uppercase tracking-widest italic animate-pulse">Update live ogni 10s</p>
           </div>
        </div>

        <div className="bg-white/[0.02] backdrop-blur-3xl rounded-[3.5rem] border border-white/5 shadow-[0_30px_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col">
          <div className="px-12 py-10 border-b border-white/5 flex justify-between items-center bg-indigo-600/[0.02]">
             <div className="flex items-center gap-6">
                <div className="w-12 h-12 bg-indigo-600/20 text-indigo-400 rounded-2xl flex items-center justify-center border border-indigo-500/20">
                   <BarChart3 size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black uppercase italic tracking-tighter leading-none mb-1">MATRICE DI PRODUZIONE INTEGRATA</h2>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">Sviluppo Kg per Unità Operativa e Stato Lavorazione</p>
                </div>
             </div>
             <button onClick={fetchData} className="px-6 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 transition-all border border-white/5 flex items-center gap-3 group">
                <span className="text-[9px] font-black uppercase tracking-widest group-hover:text-white transition-colors">Sync Data</span>
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
             </button>
          </div>

          <div className="flex-grow overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1600px]">
               <thead>
                 <tr className="bg-black/40 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                    <th className="px-12 py-8 sticky left-0 z-40 bg-slate-950/90 backdrop-blur-xl border-r border-white/5">UNITÀ OPERATIVA</th>
                    
                    {/* Fasi Terminate */}
                    {fasi.map(f => (
                      <th key={f.id_fase} className="px-8 py-8 text-center bg-indigo-900/10">FINITI: {f.fase_di_lavorazione}</th>
                    ))}
                    
                    {/* Nuove Colonne Backlog */}
                    <th className="px-8 py-8 text-center bg-sky-900/20 border-l border-white/5 text-sky-400">IN PREPARAZIONE</th>
                    <th className="px-8 py-8 text-center bg-amber-900/20 border-l border-white/5 text-amber-500">IN ATTESA</th>
                    
                    <th className="px-12 py-8 text-right text-white italic bg-indigo-950/20 border-l border-white/5">TOTAL KG (FINITI)</th>
                 </tr>
               </thead>
               <tbody>
                 {macchine.map((m, mIdx) => {
                    const rowTotal = totals.rowTotals[m.id_macchina] || 0;
                    const bStats = backlogStats[m.id_macchina] || { pre: { kg: 0, count: 0 }, att: { kg: 0, count: 0 } };
                    
                    return (
                      <tr key={m.id_macchina} className="border-b border-white/[0.03] group hover:bg-indigo-600/[0.03] transition-colors">
                        <td className="px-12 py-10 font-black text-white italic text-xl uppercase tracking-tighter sticky left-0 z-30 bg-[#0a0f1a] group-hover:bg-[#111827] transition-colors shadow-2xl border-r border-white/5">
                          <span className="opacity-10 mr-4 tabular-nums text-sm">{(mIdx + 1).toString().padStart(2, '0')}</span>
                          {m.macchina}
                        </td>
                        
                        {/* Celle Fasi Terminate */}
                        {fasi.map(f => {
                           const val = matrix[m.id_macchina][f.id_fase] || 0;
                           return (
                             <td key={f.id_fase} className="px-8 py-10 text-center tabular-nums font-bold">
                                {val > 0 ? (
                                  <button 
                                    onClick={() => handleCellClick(m, f)}
                                    className="flex flex-col items-center mx-auto hover:scale-110 active:scale-95 transition-all cursor-pointer bg-white/5 hover:bg-indigo-600/30 px-6 py-2 rounded-2xl border border-white/5 hover:border-indigo-500/30 group/cell"
                                  >
                                    <span className="text-slate-200 text-lg group-hover/cell:text-white transition-colors">{val.toLocaleString()}</span>
                                    <span className="text-[9px] font-black text-indigo-500/40 uppercase tracking-widest group-hover/cell:text-indigo-300">KG</span>
                                  </button>
                                ) : (
                                  <span className="text-white/[0.03] text-2xl font-thin select-none">-</span>
                                )}
                             </td>
                           );
                        })}

                        {/* Colonna IN PREPARAZIONE */}
                        <td className="px-8 py-10 text-center tabular-nums font-bold bg-sky-900/5 border-l border-white/5">
                           {bStats.pre.count > 0 ? (
                              <button 
                                onClick={() => handleBacklogClick(m, 'PRE')}
                                className="flex flex-col items-center mx-auto hover:scale-110 active:scale-95 transition-all cursor-pointer bg-sky-500/10 hover:bg-sky-500/30 px-6 py-2 rounded-2xl border border-sky-500/20 group/cell-pre"
                              >
                                <span className="text-sky-400 text-lg group-hover/cell-pre:text-white transition-colors">{bStats.pre.kg.toLocaleString()}</span>
                                <span className="text-[9px] font-black text-sky-500/60 uppercase tracking-widest">{bStats.pre.count} SCHEDE</span>
                              </button>
                           ) : (
                              <span className="text-white/[0.02] text-xl font-thin">-</span>
                           )}
                        </td>

                        {/* Colonna IN ATTESA */}
                        <td className="px-8 py-10 text-center tabular-nums font-bold bg-amber-900/5 border-l border-white/5">
                           {bStats.att.count > 0 ? (
                              <button 
                                onClick={() => handleBacklogClick(m, 'ATT')}
                                className="flex flex-col items-center mx-auto hover:scale-110 active:scale-95 transition-all cursor-pointer bg-amber-500/10 hover:bg-amber-500/30 px-6 py-2 rounded-2xl border border-amber-500/20 group/cell-att"
                              >
                                <span className="text-amber-500 text-lg group-hover/cell-att:text-white transition-colors">{bStats.att.kg.toLocaleString()}</span>
                                <span className="text-[9px] font-black text-amber-500/60 uppercase tracking-widest">{bStats.att.count} SCHEDE</span>
                              </button>
                           ) : (
                              <span className="text-white/[0.02] text-xl font-thin">-</span>
                           )}
                        </td>

                        <td className="px-12 py-10 text-right font-black text-2xl text-indigo-400 tabular-nums italic bg-indigo-600/[0.01] group-hover:bg-indigo-600/10 border-l border-white/5 transition-colors">
                           {rowTotal > 0 ? rowTotal.toLocaleString() : '-'}
                        </td>
                      </tr>
                    );
                 })}
               </tbody>
               <tfoot>
                 <tr className="bg-indigo-600/5 border-t-2 border-indigo-500/30">
                    <td className="px-12 py-12 font-black text-white uppercase italic tracking-[0.3em] sticky left-0 z-30 bg-[#1e1b4b] border-r border-indigo-500/20 shadow-[0_0_30px_rgba(0,0,0,0.5)]">TOTALE PER FASE</td>
                    {fasi.map(f => (
                      <td key={f.id_fase} className="px-8 py-12 text-center font-black text-xl text-indigo-200 tabular-nums italic">
                        {totals.colTotals[f.id_fase] > 0 ? totals.colTotals[f.id_fase].toLocaleString() : '-'}
                      </td>
                    ))}
                    <td className="bg-sky-950/20 border-l border-white/5"></td>
                    <td className="bg-amber-950/20 border-l border-white/5"></td>
                    <td className="px-12 py-12 text-right font-black text-4xl text-white italic bg-indigo-600 shadow-[0_-15px_60px_rgba(79,70,229,0.4)] relative">
                       <span className="text-xs uppercase tracking-[0.2em] font-black opacity-40 block mb-2 not-italic">Grand Total</span>
                       {totals.grandTotal.toLocaleString()} <span className="text-sm opacity-50 not-italic ml-1">KG</span>
                    </td>
                 </tr>
               </tfoot>
            </table>
          </div>
        </div>

        {loading && (
          <div className="fixed inset-0 bg-[#060a14]/90 backdrop-blur-xl z-[100] flex flex-col items-center justify-center animate-in fade-in duration-500">
             <div className="relative">
                <div className="w-24 h-24 border-2 border-indigo-500/20 rounded-full animate-ping"></div>
                <RefreshCw size={48} className="text-indigo-500 animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
             </div>
             <p className="mt-10 text-[10px] font-black uppercase tracking-[0.8em] text-white/40 italic animate-pulse">Aggiornamento Intelligence...</p>
          </div>
        )}
      </div>

      {/* Report Modal (Drill-Down) */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-3xl z-[2000] flex items-center justify-center p-6 animate-in zoom-in-95 duration-300">
           <div className="bg-[#0a0f1a] border border-white/10 rounded-[3rem] w-full max-w-6xl max-h-[85vh] overflow-hidden flex flex-col shadow-[0_0_100px_rgba(0,0,0,0.8)]">
              
              <div className="px-12 py-10 border-b border-white/5 flex justify-between items-center bg-indigo-600/5">
                 <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                       <ClipboardList size={28} />
                    </div>
                    <div>
                       <div className="flex items-center gap-3">
                          <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">{selectedReport.macchina}</h3>
                          <ChevronRight size={16} className="text-slate-600" />
                          <h3 className="text-2xl font-black text-indigo-400 uppercase italic tracking-tighter">{selectedReport.fase}</h3>
                       </div>
                       <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] mt-1 italic">Report Dettagliato Ordini</p>
                    </div>
                 </div>
                 <button onClick={() => setSelectedReport(null)} className="w-14 h-14 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center text-white/30 hover:text-white transition-all border border-white/10">
                    <X size={28} />
                 </button>
              </div>

              <div className="flex-grow overflow-y-auto custom-scrollbar p-10">
                 <div className="grid grid-cols-1 gap-4">
                    <table className="w-full text-left border-collapse">
                       <thead>
                          <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                             <th className="px-6 py-4">Scheda</th>
                             <th className="px-6 py-4">Cliente</th>
                             <th className="px-6 py-4">Materiale</th>
                             <th className="px-6 py-4 text-center">Spessore</th>
                             <th className="px-6 py-4 text-center">Misura</th>
                             <th className="px-6 py-4 text-center">Stato</th>
                             <th className="px-6 py-4 text-right">Peso (Rich./Eff.)</th>
                          </tr>
                       </thead>
                       <tbody>
                          {selectedReport.items.map((item, idx) => {
                             const isFinished = item.id_stato === 'TER';
                             const weight = isFinished ? item.ordine_kg_lavorato : item.ordine_kg_richiesto;
                             return (
                               <tr key={item.id_lavorazione} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors group">
                                  <td className="px-6 py-6 font-black text-xl text-white italic tabular-nums">{item.scheda}</td>
                                  <td className="px-6 py-6 font-bold text-slate-300 uppercase truncate max-w-[220px]">{item.l_clienti?.cliente || 'N/D'}</td>
                                  <td className="px-6 py-6">
                                     <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter leading-none mb-1">{item.mcoil_lega}</span>
                                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{item.mcoil_stato_fisico}</span>
                                     </div>
                                  </td>
                                  <td className="px-6 py-6 text-center font-bold text-white tabular-nums">{item.spessore} <span className="text-[9px] opacity-30">MM</span></td>
                                  <td className="px-6 py-6 text-center font-bold text-amber-500 tabular-nums">{item.misura} <span className="text-[9px] opacity-30">MM</span></td>
                                  <td className="px-6 py-6 text-center">
                                     <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                                       item.id_stato === 'TER' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                       item.id_stato === 'PRE' ? 'bg-sky-500/10 text-sky-500 border-sky-500/20' :
                                       'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                     }`}>
                                       {item.id_stato === 'TER' ? 'Terminata' : item.id_stato === 'PRE' ? 'Preparazione' : 'Attesa'}
                                     </span>
                                  </td>
                                  <td className="px-6 py-6 text-right font-black text-xl text-indigo-300 italic tabular-nums">
                                     {weight?.toLocaleString()} <span className="text-[10px] opacity-30 not-italic ml-1">KG</span>
                                  </td>
                               </tr>
                             );
                          })}
                       </tbody>
                    </table>
                 </div>
              </div>

              <div className="p-10 border-t border-white/5 bg-slate-950/50 flex justify-between items-center">
                 <div className="flex items-center gap-3 bg-white/5 px-6 py-3 rounded-2xl border border-white/5">
                    <Info size={16} className="text-indigo-400" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Totale Record: <span className="text-white">{selectedReport.items.length}</span></span>
                 </div>
                 <div className="text-right">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">Sommatoria Produzione Selezionata</p>
                    <p className="text-4xl font-black text-white italic tracking-tighter">
                       {selectedReport.items.reduce((acc, curr) => {
                          const w = curr.id_stato === 'TER' ? curr.ordine_kg_lavorato : curr.ordine_kg_richiesto;
                          return acc + (w || 0);
                       }, 0).toLocaleString()} <span className="text-lg opacity-30 not-italic ml-1">KG</span>
                    </p>
                 </div>
              </div>

           </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.3); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.2); border-radius: 10px; border: 2px solid rgba(0,0,0,0.2); }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,0.4); }
      `}</style>
    </div>
  );
};

export default UfficioStats;
