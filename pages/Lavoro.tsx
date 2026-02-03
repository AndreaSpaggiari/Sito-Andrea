
import React from 'react';
import { Link } from 'react-router-dom';
import Chat from '../components/Chat';
import { Factory, Laptop, Inbox, Briefcase, Wrench, LayoutDashboard, Zap, ChevronRight } from 'lucide-react';

const Lavoro: React.FC = () => {
  const subsections = [
    { 
      title: "PRODUZIONE", 
      desc: "Real-time Production Feed",
      link: "/lavoro/produzione",
      icon: Factory,
      num: "01",
      color: "amber"
    },
    { 
      title: "MACCHINE", 
      desc: "Maintenance & Settings",
      link: "/lavoro/macchine",
      icon: Wrench,
      num: "02",
      color: "slate"
    },
    { 
      title: "MAGAZZINO", 
      desc: "Inventory & Stock Control",
      link: "/lavoro/magazzino",
      icon: Inbox,
      num: "03",
      color: "blue"
    },
    { 
      title: "UFFICIO", 
      desc: "Admin & Documents",
      link: "/lavoro/ufficio",
      icon: Briefcase,
      num: "04",
      color: "indigo"
    },
    { 
      title: "UTILITA' VARIE", 
      desc: "Calculators & Quick Tools",
      link: "/lavoro/utilita",
      icon: Laptop,
      num: "05",
      color: "emerald"
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-20 overflow-x-hidden">
      {/* Hero Section */}
      <div className="bg-amber-600 pt-20 pb-28 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-slate-950/40"></div>
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '25px 25px' }}></div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 text-white px-4 py-1.5 rounded-full border border-white/20 text-[10px] font-black uppercase tracking-[0.2em] mb-6">
             KME ITALY INDUSTRIAL HUB
          </div>
          <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter italic mb-4 leading-none text-white drop-shadow-2xl">
            LAVORO <span className="text-slate-950">TOOLS</span>
          </h1>
          <p className="text-white/70 font-bold uppercase tracking-[0.3em] text-xs">Gestione Industriale & Produzione</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-16 relative z-20">
        <div className="w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
              {subsections.map((sub, idx) => (
                <Link 
                  key={idx} 
                  to={sub.link} 
                  className="bg-white border border-slate-200 rounded-[2.5rem] p-8 group hover:bg-slate-900 transition-all duration-500 overflow-hidden relative shadow-xl hover:-translate-y-1"
                >
                  <div className="absolute top-4 right-6 text-5xl font-black text-slate-900/[0.03] group-hover:text-white/10 transition-colors italic">#{sub.num}</div>
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-all mb-6 shadow-inner border border-slate-100">
                    <sub.icon size={30} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter group-hover:text-white leading-none">{sub.title}</h3>
                  <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-2 group-hover:text-white/70">{sub.desc}</p>
                  
                  <div className="mt-8 flex items-center gap-2 text-slate-400 group-hover:text-amber-500 transition-colors">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em]">Accedi Sezione</span>
                    <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
              
              <div className="bg-white/40 border-2 border-dashed border-slate-200 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-slate-400 text-center min-h-[220px]">
                <LayoutDashboard size={40} className="mb-4 opacity-10" />
                <p className="text-[10px] font-black uppercase tracking-widest italic">Modulo futuro in arrivo...</p>
              </div>
            </div>

            <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-8 text-amber-600/10 transition-transform group-hover:scale-110 duration-700">
                  <Zap size={140} />
               </div>
               <div className="relative z-10">
                 <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter mb-4 leading-none">Dashboard <span className="text-amber-600">KME</span></h2>
                 <p className="text-slate-600 text-sm leading-relaxed max-w-xl font-bold">Benvenuto nella tua postazione di controllo digitale. Da qui puoi monitorare le schede di produzione, i flussi di lavoro e comunicare con il team in tempo reale attraverso i moduli specializzati.</p>
                 <div className="mt-8 flex flex-wrap gap-3">
                    <div className="bg-slate-50 rounded-2xl p-4 flex-1 min-w-[150px] border border-slate-200 shadow-sm">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Stato Sistemi</p>
                      <p className="text-xs font-bold text-emerald-600 mt-1 uppercase flex items-center gap-1.5">
                         <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Online & Sincronizzato
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-4 flex-1 min-w-[150px] border border-slate-200 shadow-sm">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Database</p>
                      <p className="text-xs font-bold text-amber-600 mt-1 uppercase tracking-tight italic">Supabase Cloud Engine</p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-4 flex-1 min-w-[150px] border border-slate-200 shadow-sm">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Analisi AI</p>
                      <p className="text-xs font-bold text-blue-600 mt-1 uppercase tracking-tight">Gemini 3 Flash</p>
                    </div>
                 </div>
               </div>
            </div>
        </div>
      </div>

      {/* La Chat ora è flottante */}
      <Chat />
    </div>
  );
};

export default Lavoro;
