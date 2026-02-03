
import React from 'react';
import { Link } from 'react-router-dom';
import Chat from '../components/Chat';
import { Factory, Laptop, Inbox, Briefcase, Wrench, LayoutDashboard, Zap, ChevronRight, Settings } from 'lucide-react';

const Lavoro: React.FC = () => {
  const subsections = [
    { 
      title: "PRODUZIONE", 
      desc: "LAVORAZIONI IN TEMPO REALE",
      link: "/lavoro/produzione",
      icon: Factory,
      num: "01",
      color: "from-amber-400 to-amber-600"
    },
    { 
      title: "MACCHINE", 
      desc: "TUTTO SULLE MACCHINE DI MORTARA",
      link: "/lavoro/macchine",
      icon: Wrench,
      num: "02",
      color: "from-blue-400 to-blue-600"
    },
    { 
      title: "MAGAZZINO", 
      desc: "INVENTARIO E DINTORNI",
      link: "/lavoro/magazzino",
      icon: Inbox,
      num: "03",
      color: "from-slate-400 to-slate-600"
    },
    { 
      title: "UFFICIO", 
      desc: "UTILITA' VARIE PER L'UFFICIO",
      link: "/lavoro/ufficio",
      icon: Briefcase,
      num: "04",
      color: "from-indigo-400 to-indigo-600"
    },
    { 
      title: "UTILITA' VARIE", 
      desc: "CALCOLATORI - COMBINAZIONI - ...",
      link: "/lavoro/utilita",
      icon: Laptop,
      num: "05",
      color: "from-emerald-400 to-emerald-600"
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-slate-200 pb-20 overflow-x-hidden">
      {/* Hero Section Modernized */}
      <div className="relative pt-24 pb-40 px-6 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_0%,_rgba(245,158,11,0.08),_transparent_40%)]"></div>
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 text-[10px] font-bold text-white/60 uppercase tracking-[0.3em] mb-8 shadow-xl">
             <Settings size={12} className="text-amber-500" /> KME ITALY
          </div>
          <h1 className="text-6xl md:text-9xl font-extrabold tracking-tighter text-white mb-6 leading-none italic uppercase">
            MORTARA
          </h1>
          <p className="text-white/40 font-bold uppercase tracking-[0.5em] text-[10px] sm:text-xs">GESTIONE DELLA PRODUZIONE</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-24 relative z-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {subsections.map((sub, idx) => (
            <Link 
              key={idx} 
              to={sub.link} 
              className="group relative bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-10 flex flex-col transition-all duration-500 hover:bg-white/[0.05] hover:-translate-y-2 hover:border-white/10 shadow-2xl overflow-hidden"
            >
              <div className="absolute -top-4 -right-4 text-9xl font-black text-white/[0.02] group-hover:text-white/[0.04] transition-colors italic select-none">#{sub.num}</div>
              
              <div className={`w-16 h-16 bg-gradient-to-br ${sub.color} rounded-2xl flex items-center justify-center text-slate-950 shadow-2xl group-hover:scale-110 transition-transform mb-8 relative z-10`}>
                <sub.icon size={28} />
              </div>
              
              <div className="relative z-10">
                <h3 className="text-2xl font-bold text-white tracking-tight uppercase italic mb-2 leading-none">{sub.title}</h3>
                <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest leading-relaxed">{sub.desc}</p>
                
                <div className="mt-12 flex items-center gap-2 text-white/20 group-hover:text-amber-500 transition-colors">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">Accedi Sezione</span>
                  <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
          
          <div className="bg-white/[0.01] border border-dashed border-white/5 rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center opacity-40">
            <LayoutDashboard size={40} className="mb-4 text-white/10" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] italic">Modulo futuro in arrivo...</p>
          </div>
        </div>

        {/* Global Dashboard Card */}
        <div className="bg-white/[0.02] backdrop-blur-xl rounded-[3rem] p-12 border border-white/5 shadow-2xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-12 text-amber-500/5 group-hover:scale-110 transition-transform duration-1000">
              <Zap size={220} />
           </div>
           <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-white tracking-tight mb-4 uppercase italic leading-none">Dashboard <span className="text-amber-500">KME</span></h2>
                <p className="text-slate-400 text-sm leading-relaxed max-w-xl font-medium">Benvenuto nella tua postazione di controllo digitale. Monitoraggio real-time, analisi predittiva e sincronizzazione cloud end-to-end.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                 <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">Sistemi</p>
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                       <span className="text-xs font-bold text-white">Online</span>
                    </div>
                 </div>
                 <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">Engine</p>
                    <span className="text-xs font-bold text-amber-500 italic">Supabase Cloud</span>
                 </div>
                 <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">IA Core</p>
                    <span className="text-xs font-bold text-blue-400">Gemini Pro</span>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <Chat />
    </div>
  );
};

export default Lavoro;
