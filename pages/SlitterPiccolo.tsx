
import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, Scissors, Wrench, Layers, Settings, 
  Activity, ShieldAlert, Cpu, ChevronRight, Zap,
  BarChart3, Laptop
} from 'lucide-react';
import Chat from '../components/Chat';

const SlitterPiccolo: React.FC = () => {
  const tools = [
    {
      title: "GESTIONE LAME",
      desc: "Usura, Affilatura & Inventario",
      icon: Scissors,
      color: "bg-indigo-600",
      status: "Configurazione",
      link: "/lavoro/slitter-piccolo/lame"
    },
    {
      title: "COMBINAZIONI",
      desc: "Calcolo Distanziali & Setup",
      icon: Layers,
      color: "bg-blue-600",
      status: "Configurato",
      link: "#"
    },
    {
      title: "UTILITÀ",
      desc: "Toolkit Operativo",
      icon: Laptop,
      color: "bg-emerald-600",
      status: "5 Tool Pronti",
      link: "#"
    },
    {
      title: "MANUTENZIONE",
      desc: "Log Interventi & Scadenze",
      icon: Wrench,
      color: "bg-slate-700",
      status: "Ok - 12/03",
      link: "#"
    },
    {
      title: "STATISTICHE",
      desc: "Analisi Produzione & KPI",
      icon: BarChart3,
      color: "bg-rose-600",
      status: "Aggiornate",
      link: "#"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-20 overflow-x-hidden">
      {/* Header */}
      <div className="bg-[#1e293b] pt-20 pb-28 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-indigo-600/5"></div>
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-4 mb-6">
            <Link to="/lavoro/macchine" className="p-3 bg-white/10 rounded-2xl text-white hover:bg-white/20 transition-all border border-white/5 shadow-xl active:scale-95">
              <ArrowLeft size={20} />
            </Link>
            <div className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-600/20">
              <Cpu size={14} /> SLITTER PICCOLO HUB
            </div>
          </div>
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter italic mb-4 text-white drop-shadow-2xl">
            SISTEMA <span className="text-indigo-500">TAGLIO</span>
          </h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] sm:text-xs italic">Gestione Specializzata Unità Taglio Sottile</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-16 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {tools.map((tool, idx) => (
            <Link 
              key={idx} 
              to={tool.link}
              className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-200 group hover:border-indigo-500/50 transition-all duration-500 flex flex-col relative overflow-hidden cursor-pointer"
            >
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div className={`w-14 h-14 ${tool.color} rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:rotate-6`}>
                  <tool.icon size={24} />
                </div>
              </div>

              <div className="relative z-10">
                <h3 className="text-xs font-black text-slate-900 uppercase italic tracking-tighter leading-none mb-1">{tool.title}</h3>
                <p className="text-slate-400 font-bold text-[8px] uppercase tracking-widest mb-6 leading-relaxed line-clamp-2">{tool.desc}</p>
                
                <div className="flex items-center justify-between border-t border-slate-50 pt-4">
                   <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                      <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">{tool.status}</span>
                   </div>
                   <ChevronRight size={14} className="text-indigo-600 opacity-0 group-hover:opacity-100 transition-all" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Slitter Info Section */}
        <div className="mt-8 bg-white rounded-[3rem] p-10 border border-slate-200 shadow-2xl relative overflow-hidden group">
           <div className="absolute -top-10 -right-10 text-indigo-600/5 rotate-12 transition-transform group-hover:scale-110 duration-700">
              <Cpu size={200} />
           </div>
           
           <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="max-w-xl text-center lg:text-left">
                <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter leading-none mb-3">Monitoraggio <span className="text-indigo-600">Performance</span></h2>
                <p className="text-slate-500 text-[10px] font-bold leading-relaxed uppercase tracking-tight italic">
                  Tutti i parametri del reparto taglio sono sincronizzati. Utilizza le sottosezioni per gestire l'inventario lame o calcolare i set di distanziali per il prossimo setup.
                </p>
              </div>

              <div className="flex gap-4">
                 <div className="bg-slate-50 px-8 py-6 rounded-[2rem] border border-slate-100 text-center shadow-inner">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Precisione</p>
                    <p className="text-2xl font-black text-indigo-600 italic tracking-tighter leading-none">+/-0.1</p>
                 </div>
                 <div className="bg-slate-50 px-8 py-6 rounded-[2rem] border border-slate-100 text-center shadow-inner">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Status</p>
                    <div className="flex items-center justify-center gap-2 text-emerald-600 font-black italic text-xl uppercase">
                       OK
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <Chat />
    </div>
  );
};

export default SlitterPiccolo;
