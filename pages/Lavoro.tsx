
import React from 'react';
import { Link } from 'react-router-dom';
import Chat from '../components/Chat';
import { Briefcase, Factory, Wrench, Calculator, LayoutDashboard, ChevronRight, Zap } from 'lucide-react';

const Lavoro: React.FC = () => {
  const subsections = [
    { 
      title: "Produzione", 
      desc: "Real-time Production Feed",
      link: "/lavoro/produzione",
      icon: Factory,
      num: "PR"
    },
    { 
      title: "Utilità", 
      desc: "Daily Working Tools",
      link: "#",
      icon: Wrench,
      num: "UT"
    },
    { 
      title: "Logica", 
      desc: "Calc & Combinations",
      link: "#",
      icon: Calculator,
      num: "LG"
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-20 overflow-x-hidden">
      {/* Hero Section */}
      <div className="bg-amber-600 pt-20 pb-28 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-slate-950/40"></div>
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '25px 25px' }}></div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 text-white px-4 py-1.5 rounded-full border border-white/20 text-[10px] font-black uppercase tracking-[0.2em] mb-6 animate-pulse">
             KME ITALY INDUSTRIAL HUB
          </div>
          <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter italic mb-4 leading-none text-white drop-shadow-2xl">
            LAVORO <span className="text-slate-950">TOOLS</span>
          </h1>
          <p className="text-white/70 font-bold uppercase tracking-[0.3em] text-xs">Gestione Industriale & Produzione</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-16 relative z-20">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Main Modules */}
          <div className="flex-1 w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {subsections.map((sub, idx) => (
                <Link 
                  key={idx} 
                  to={sub.link} 
                  className="bg-white border border-slate-200 rounded-[2.5rem] p-8 group hover:bg-amber-600 transition-all duration-500 overflow-hidden relative shadow-xl"
                >
                  <div className="absolute top-4 right-6 text-5xl font-black text-slate-900/[0.03] group-hover:text-white/10 transition-colors">#{sub.num}</div>
                  <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-amber-600 group-hover:bg-white group-hover:text-amber-600 transition-all mb-6 shadow-inner">
                    <sub.icon size={28} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter group-hover:text-white leading-none">{sub.title}</h3>
                  <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-1 group-hover:text-white/70">{sub.desc}</p>
                </Link>
              ))}
              
              <div className="bg-white/40 border-2 border-dashed border-slate-200 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-slate-400 text-center">
                <LayoutDashboard size={40} className="mb-4 opacity-10" />
                <p className="text-[10px] font-black uppercase tracking-widest">Modulo futuro in arrivo...</p>
              </div>
            </div>

            <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 text-amber-600/10">
                  <Zap size={120} />
               </div>
               <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter mb-4 leading-none">Dashboard <span className="text-amber-600">KME</span></h2>
               <p className="text-slate-600 text-sm leading-relaxed max-w-xl font-bold">Benvenuto nella tua postazione di controllo digitale. Da qui puoi monitorare le schede di produzione, i flussi di lavoro e comunicare con il team in tempo reale.</p>
               <div className="mt-8 flex gap-3">
                  <div className="bg-slate-50 rounded-2xl p-4 flex-1 border border-slate-200">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Stato Sistemi</p>
                    <p className="text-xs font-bold text-emerald-600 mt-1 uppercase flex items-center gap-1.5">
                       <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Online
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-4 flex-1 border border-slate-200">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Database</p>
                    <p className="text-xs font-bold text-amber-600 mt-1 uppercase tracking-tight">Supabase SQL</p>
                  </div>
               </div>
            </div>
          </div>

          {/* Chat Sidebar */}
          <div className="w-full lg:w-[400px] lg:sticky lg:top-24 flex-shrink-0">
             <Chat />
          </div>

        </div>
      </div>
    </div>
  );
};

export default Lavoro;
