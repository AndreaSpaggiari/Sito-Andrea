
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Macchina, Lavorazione, Stati } from '../types';
import { 
  ArrowLeft, Wrench, Settings, Activity, Cpu, 
  ChevronRight, Scissors, Layers, 
  BarChart3, Box, Settings2, Laptop, Hammer,
  Clock
} from 'lucide-react';

const ORDERED_NAMES = [
  'SLITTER GRANDE', 'SLITTER PICCOLO', 'SLITTER NUOVO',
  'SBAVATRICE NUOVA', 'SBAVATRICE VECCHIA', 'LASTRE',
  'ELMA', 'STAMPATRICE', 'DI MAIO'
];

interface MachineStats {
  kgToday: number;
  countToday: number;
  avg30: number;
  countPending: number;
  kgPending: number;
}

const MACHINE_CONFIG: Record<string, { color: string; icon: any; tools: { label: string; icon: any; link: string }[] }> = {
  'DI MAIO': { color: 'border-slate-500', icon: Activity, tools: [{ label: 'MANUTENZIONE', icon: Wrench, link: '#' }, { label: 'STATISTICHE', icon: BarChart3, link: '#' }] },
  'ELMA': { color: 'border-blue-500', icon: Cpu, tools: [{ label: 'STAMPI', icon: Box, link: '#' }, { label: 'UTILITÀ', icon: Laptop, link: '#' }, { label: 'MANUTENZIONE', icon: Wrench, link: '#' }] },
  'LASTRE': { color: 'border-emerald-500', icon: Layers, tools: [{ label: 'PARAMETRI', icon: Settings2, link: '#' }, { label: 'MANUTENZIONE', icon: Wrench, link: '#' }] },
  'SBAVATRICE NUOVA': { color: 'border-amber-500', icon: Hammer, tools: [{ label: 'ATTREZZI', icon: Settings, link: '#' }, { label: 'MANUTENZIONE', icon: Wrench, link: '#' }] },
  'SBAVATRICE VECCHIA': { color: 'border-amber-700', icon: Hammer, tools: [{ label: 'ATTREZZI', icon: Settings, link: '#' }, { label: 'MANUTENZIONE', icon: Wrench, link: '#' }] },
  'SLITTER GRANDE': { color: 'border-indigo-700', icon: Scissors, tools: [{ label: 'MANUTENZIONE', icon: Wrench, link: '#' }, { label: 'STATISTICHE', icon: BarChart3, link: '#' }] },
  'SLITTER NUOVO': { color: 'border-indigo-500', icon: Scissors, tools: [{ label: 'LAME', icon: Scissors, link: '#' }, { label: 'MANUTENZIONE', icon: Wrench, link: '#' }] },
  'SLITTER PICCOLO': { 
    color: 'border-indigo-400', 
    icon: Scissors, 
    tools: [
      { label: 'LAME', icon: Scissors, link: '/lavoro/slitter-piccolo/lame' }, 
      { label: 'UTILITÀ', icon: Laptop, link: '/lavoro/slitter-piccolo' }, 
      { label: 'STATISTICHE', icon: BarChart3, link: '/lavoro/slitter-piccolo' }
    ] 
  },
  'STAMPATRICE': { color: 'border-rose-500', icon: Box, tools: [{ label: 'STAMPI', icon: Box, link: '#' }, { label: 'UTILITÀ', icon: Laptop, link: '#' }] }
};

const Macchine: React.FC = () => {
  const [macchine, setMacchine] = useState<Macchina[]>([]);
  const [stats, setStats] = useState<Record<string, MachineStats>>({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchMacchine = useCallback(async () => {
    setLoading(true);
    
    const { data: machinesData } = await supabase.from('l_macchine').select('*');
    const filtrate = (machinesData || [])
      .filter(m => !['CASSONE', 'UFFICIO', 'MAGAZZINO', 'IMBALLAGGIO'].includes(m.macchina.toUpperCase()))
      .sort((a, b) => ORDERED_NAMES.indexOf(a.macchina.toUpperCase()) - ORDERED_NAMES.indexOf(b.macchina.toUpperCase()));
    setMacchine(filtrate);

    const todayStr = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const { data: allWork } = await supabase
      .from('l_lavorazioni')
      .select('id_macchina, id_stato, ordine_kg_lavorato, ordine_kg_richiesto, fine_lavorazione')
      .or(`id_stato.eq.TER,id_stato.eq.ATT,id_stato.eq.PRE`);

    const statsMap: Record<string, MachineStats> = {};
    const machinesHistory: Record<string, Record<string, number>> = {};

    filtrate.forEach(m => {
      statsMap[m.id_macchina] = { kgToday: 0, countToday: 0, avg30: 0, countPending: 0, kgPending: 0 };
      machinesHistory[m.id_macchina] = {};
    });

    allWork?.forEach(l => {
      const mId = l.id_macchina;
      if (!statsMap[mId]) return;

      if (l.id_stato === 'TER' && l.fine_lavorazione) {
        const finishDateStr = l.fine_lavorazione.split('T')[0];
        if (finishDateStr >= thirtyDaysAgoStr) {
          const kg = l.ordine_kg_lavorato || 0;
          if (finishDateStr === todayStr) {
            statsMap[mId].kgToday += kg;
            statsMap[mId].countToday += 1;
          }
          machinesHistory[mId][finishDateStr] = (machinesHistory[mId][finishDateStr] || 0) + kg;
        }
      } else if (l.id_stato === 'ATT' || l.id_stato === 'PRE') {
        statsMap[mId].countPending += 1;
        statsMap[mId].kgPending += (l.ordine_kg_richiesto || 0);
      }
    });

    const calendarDates: Date[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      calendarDates.push(d);
    }

    Object.keys(statsMap).forEach(mId => {
      let totalKg = 0;
      let divisorDays = 0;
      const history = machinesHistory[mId];

      calendarDates.forEach(date => {
        const dStr = date.toISOString().split('T')[0];
        const dayOfWeek = date.getDay();
        const hasData = !!history[dStr];

        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          divisorDays++;
          totalKg += history[dStr] || 0;
        } else if (dayOfWeek === 6 && hasData) {
          divisorDays++;
          totalKg += history[dStr] || 0;
        } else if (dayOfWeek === 0 && hasData) {
          divisorDays++;
          totalKg += history[dStr] || 0;
        }
      });
      statsMap[mId].avg30 = divisorDays > 0 ? Math.round(totalKg / divisorDays) : 0;
    });

    setStats(statsMap);
    setLoading(false);
  }, []);

  useEffect(() => { fetchMacchine(); }, [fetchMacchine]);

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-slate-200 pb-20">
      <div className="relative pt-16 pb-24 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_0%,_rgba(59,130,246,0.05),_transparent_40%)]"></div>
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-4 mb-8">
            <Link to="/lavoro" className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white/40 hover:text-white transition-all border border-white/10"><ArrowLeft size={18} /></Link>
            <span className="bg-blue-600/10 px-4 py-1.5 rounded-full border border-blue-500/20 text-[10px] font-bold text-blue-400 uppercase tracking-widest">UNITÀ OPERATIVE</span>
          </div>
          <h1 className="text-4xl md:text-7xl font-extrabold tracking-tight text-white mb-4 uppercase italic">MORTARA <span className="text-white/20 tracking-tighter">FLEET</span></h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.4em] text-[10px] italic">REPARTO PRODUZIONE & MANUTENZIONE</p>
        </div>
      </div>

      <div className="max-w-[1900px] mx-auto px-6 -mt-12 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {macchine.map((m) => {
            const config = MACHINE_CONFIG[m.macchina.toUpperCase()] || { color: 'border-slate-500', icon: Settings, tools: [] };
            const Icon = config.icon;
            const s = stats[m.id_macchina] || { kgToday: 0, countToday: 0, avg30: 0, countPending: 0, kgPending: 0 };

            return (
              <div key={m.id_macchina} className={`bg-white/[0.02] backdrop-blur-xl rounded-[3rem] p-10 border-t-[10px] border border-white/5 ${config.color} group relative overflow-hidden flex flex-col transition-all duration-500 hover:-translate-y-2 hover:bg-white/[0.05]`}>
                <div className="absolute -top-6 -right-6 text-white/[0.02] group-hover:text-white/[0.05] transition-colors pointer-events-none"><Icon size={220} /></div>
                
                <div className="flex flex-col mb-10 relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex gap-4 items-center">
                      <div className="w-3.5 h-3.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.5)]"></div>
                      <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none">{m.macchina}</h3>
                    </div>
                    <div className="w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center text-blue-500 shadow-xl border border-white/5 group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <Icon size={24} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-col items-center">
                       <span className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1 text-center leading-none">PROD. OGGI</span>
                       <span className="text-base font-black text-blue-400 italic tabular-nums">{s.kgToday.toLocaleString()} <span className="text-[9px] opacity-40">KG</span></span>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-col items-center">
                       <span className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1 text-center leading-none">SCHEDE OK</span>
                       <span className="text-base font-black text-emerald-500 italic tabular-nums">{s.countToday} <span className="text-[9px] opacity-40">SCH</span></span>
                    </div>
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-col items-center">
                       <span className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1 text-center leading-none">MEDIA 30G</span>
                       <span className="text-base font-black text-white/60 italic tabular-nums">{s.avg30.toLocaleString()} <span className="text-[9px] opacity-40">KG</span></span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-10 relative z-10">
                   {config.tools.map((tool, tIdx) => (
                     <Link key={tIdx} to={tool.link} className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-blue-500/30 hover:bg-white/10 transition-all flex items-center gap-3 group/btn">
                        <tool.icon size={14} className="text-white/40 group-hover/btn:text-blue-400" />
                        <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">{tool.label}</span>
                     </Link>
                   ))}
                </div>

                <div className="mt-auto pt-8 border-t border-white/5 flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-4 bg-white/5 px-6 py-4 rounded-2xl border border-white/5">
                    <Clock size={20} className="text-amber-500" />
                    <div className="flex flex-col leading-none">
                      <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1">CODA ATTESA</p>
                      <p className="text-sm font-black text-white italic">
                        {s.countPending} <span className="text-[9px] opacity-40 mr-1.5">ORD.</span> | {s.kgPending.toLocaleString()} <span className="text-[9px] opacity-40">KG</span>
                      </p>
                    </div>
                  </div>
                  
                  <button onClick={() => { localStorage.setItem('kme_selected_macchina', m.id_macchina); navigate('/lavoro/produzione'); }} className="flex items-center gap-3 bg-white text-slate-950 px-8 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all hover:bg-blue-600 hover:text-white">
                    PRODUZIONE <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Macchine;
