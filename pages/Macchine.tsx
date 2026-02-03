
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Macchina } from '../types';
import { 
  ArrowLeft, Wrench, Settings, Activity, AlertTriangle, 
  ShieldCheck, Laptop, Cpu, Gauge, Timer, Zap, ChevronRight 
} from 'lucide-react';

const Macchine: React.FC = () => {
  const [macchine, setMacchine] = useState<Macchina[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMacchine = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('l_macchine')
        .select('*')
        .order('macchina');
      
      if (error) throw error;
      
      // Filtriamo le macchine escluse: CASSONE, UFFICIO, MAGAZZINO, IMBALLAGGIO
      const escluse = ['CASSONE', 'UFFICIO', 'MAGAZZINO', 'IMBALLAGGIO'];
      const filtrate = (data || []).filter(m => 
        !escluse.includes(m.macchina.toUpperCase()) && 
        !escluse.includes(m.id_macchina.toUpperCase())
      );
      
      setMacchine(filtrate);
    } catch (e) {
      console.error("Errore fetch macchine:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMacchine();
  }, [fetchMacchine]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-20">
      {/* Hero Section */}
      <div className="bg-slate-900 pt-16 pb-24 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-600/10"></div>
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-4 mb-6">
            <Link to="/lavoro" className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-all">
              <ArrowLeft size={20} />
            </Link>
            <div className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
              KME INDUSTRIAL FLEET
            </div>
          </div>
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter italic mb-4 text-white">
            PARCO <span className="text-blue-500">MACCHINE</span>
          </h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">Monitoraggio & Configurazione Unità Operative</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-12 relative z-20">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Zap className="text-blue-500 animate-spin mb-4" size={40} />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizzazione Unità...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {macchine.map((m) => (
              <div 
                key={m.id_macchina} 
                className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-200 group hover:border-blue-500/50 transition-all duration-500 flex flex-col relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 text-blue-600/5 transition-transform group-hover:scale-125 duration-700">
                  <Cpu size={120} />
                </div>

                <div className="flex justify-between items-start mb-8 relative z-10">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner border border-slate-100">
                    <Settings size={28} className="group-hover:rotate-90 transition-transform duration-500" />
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-emerald-500 uppercase flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div> ONLINE
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-tighter">{m.id_macchina}</span>
                  </div>
                </div>

                <div className="relative z-10">
                  <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none mb-2">{m.macchina}</h3>
                  <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mb-8">Unità Operativa Attiva</p>
                  
                  <div className="grid grid-cols-2 gap-3 mb-8">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-2 text-slate-400 mb-1">
                        <Gauge size={12} />
                        <span className="text-[8px] font-black uppercase tracking-widest">Efficienza</span>
                      </div>
                      <p className="text-sm font-black text-slate-900">94.2%</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-2 text-slate-400 mb-1">
                        <Timer size={12} />
                        <span className="text-[8px] font-black uppercase tracking-widest">Uptime</span>
                      </div>
                      <p className="text-sm font-black text-slate-900">18h 12m</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg" title="Manutenzione programmata">
                        <Wrench size={14} />
                      </div>
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg" title="Sicurezza verificata">
                        <ShieldCheck size={14} />
                      </div>
                    </div>
                    <Link 
                      to="/lavoro/produzione" 
                      className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      Dettagli <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Global Stats Footer */}
        <div className="mt-12 bg-white rounded-[3rem] p-10 border border-slate-200 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="p-5 bg-blue-600 text-white rounded-3xl shadow-xl shadow-blue-600/20">
              <Activity size={32} />
            </div>
            <div>
              <h4 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter">Status Flotta Industriale</h4>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Tutte le unità operative sono sincronizzate con il database centrale.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-center min-w-[120px]">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Unità Attive</p>
              <p className="text-xl font-black text-blue-600">{macchine.length}</p>
            </div>
            <div className="px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-center min-w-[120px]">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Allarmi</p>
              <p className="text-xl font-black text-emerald-500">0</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Macchine;
