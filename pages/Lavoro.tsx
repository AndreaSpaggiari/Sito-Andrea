
import React from 'react';
import { Link } from 'react-router-dom';
import Chat from '../components/Chat';
import { Briefcase, Factory, Wrench, Calculator, LayoutDashboard, Zap } from 'lucide-react';

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
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      {/* Hero Section */}
      <div className="relative pt-20 pb-32 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=2000" 
            alt="Work Background" 
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-amber-600/40 via-slate-950/80 to-slate-950"></div>
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-400 px-4 py-1.5 rounded-full border border-amber-500/30 text-[10px] font-black uppercase tracking-[0.2em] mb-6">
             KME ITALY INDUSTRIAL HUB
          </div>
          <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter italic mb-4 leading-none text-white">
            LAVORO <span className="text-amber-500">TOOLS</span>
          </h1>
          <p className="text-white/70 font-bold uppercase tracking-[0.3em] text-xs">Gestione Industriale & Produzione</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-16 relative z-20">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Main Modules */}
          <div className="flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {subsections.map((sub, idx) => (
                <Link 
                  key={idx} 
                  to={sub.link} 
                  className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 group hover:bg-amber-600 transition-all duration-500 overflow-hidden relative shadow-xl"
                >
                  <div className="absolute top-4 right-6 text-5xl font-black text-white/[0.03] group-hover:text-white/10 transition-colors">#{sub.num}</div>
                  <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center text-amber-500 group-hover:bg-white group-hover:text-amber-600 transition-all mb-6">
                    <sub.icon size={28} />
                  </div>
                  <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none">{sub.title}</h3>
                  <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-1 group-hover:text-white/70">{sub.desc}</p>
                </Link>
              ))}
              
              <div className="bg-slate-900/40 border-2 border-dashed border-white/10 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-slate-600 text-center">
                <LayoutDashboard size={40} className="mb-4 opacity-10" />
                <p className="text-[10px] font-black uppercase tracking-widest">Modulo futuro in arrivo...</p>
              </div>
            </div>

            <div className="bg-slate-900/80 backdrop-blur-xl rounded-[3rem] p-10 border border-white/10 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 text-amber-500/10">
                  <Zap size={120} />
               </div>
               <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4 leading-none">Dashboard <span className="text-amber-500">KME</span></h2>
               <p className="text-slate-400 text-sm leading-relaxed max-w-xl font-medium">Monitoraggio schede di produzione e flussi di lavoro in tempo reale.</p>
            </div>
          </div>

          {/* Chat Sidebar */}
          <div className="w-full lg:w-96 flex-shrink-0">
            <div className="sticky top-24">
              <Chat />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Lavoro;
