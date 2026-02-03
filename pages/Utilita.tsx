
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Laptop, Calculator, Ruler, Zap, Hash, RefreshCcw } from 'lucide-react';

const Utilita: React.FC = () => {
  const tools = [
    { name: "Calcolatore Metri", icon: Ruler, desc: "Sviluppo nastri da peso/spessore" },
    { name: "Convertitore Unità", icon: RefreshCcw, desc: "Dimensioni e pesi internazionali" },
    { name: "Gestore Codici", icon: Hash, desc: "Generatore e validatore ID KME" },
    { name: "Quick Notes", icon: Laptop, desc: "Appunti rapidi per il turno" },
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-20">
      <div className="bg-slate-900 pt-16 pb-24 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-emerald-600/10"></div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-4 mb-6">
            <Link to="/lavoro" className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-all">
              <ArrowLeft size={20} />
            </Link>
            <div className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
              DAILY WORKER TOOLKIT
            </div>
          </div>
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter italic mb-4 text-white">
            UTILITÀ <span className="text-emerald-500">& VARIE</span>
          </h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-12 relative z-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {tools.map((tool, idx) => (
            <div key={idx} className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-200 group hover:bg-slate-900 transition-all duration-500 cursor-pointer">
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all mb-6">
                 <tool.icon size={28} />
              </div>
              <h3 className="text-lg font-black uppercase italic tracking-tighter group-hover:text-white leading-tight mb-2">{tool.name}</h3>
              <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest group-hover:text-slate-500 transition-colors">{tool.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-white rounded-[3rem] p-12 shadow-2xl border border-slate-200 flex flex-col items-center text-center">
           <Calculator size={48} className="text-emerald-600 mb-6 opacity-20" />
           <p className="text-slate-500 font-bold text-sm uppercase tracking-widest leading-relaxed max-w-lg">
             Il toolkit è in fase di popolamento. <br/>
             Invia suggerimenti su nuove funzionalità tramite la chat di reparto.
           </p>
        </div>
      </div>
    </div>
  );
};

export default Utilita;
