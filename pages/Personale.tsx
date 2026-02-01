
import React from 'react';
import { User, Home as House, Folder, Plus, Shield, Zap } from 'lucide-react';

const Personale: React.FC = () => {
  const subsections = [
    { title: "Casa", desc: "Gestione Spese & Manutenzione", icon: House, num: "01" },
    { title: "Varie", desc: "Diario & Memo Personali", icon: Folder, num: "02" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 overflow-x-hidden">
      {/* Hero Section */}
      <div className="bg-emerald-600 pt-20 pb-28 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-slate-950/40"></div>
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 text-white px-4 py-1.5 rounded-full border border-white/20 text-[10px] font-black uppercase tracking-[0.2em] mb-6 animate-pulse">
             PRIVATE ARCHIVE ACCESS
          </div>
          <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter italic mb-4 leading-none text-white drop-shadow-2xl">
            AREA <span className="text-slate-950">PRIVATA</span>
          </h1>
          <p className="text-white/70 font-bold uppercase tracking-[0.3em] text-xs">Gestione Appunti & Vita Personale</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-16 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {subsections.map((sub, idx) => (
            <div key={idx} className="bg-slate-900/80 backdrop-blur-xl border border-white/5 rounded-[3rem] p-10 group hover:bg-emerald-600 transition-all duration-500 overflow-hidden relative shadow-2xl">
              <div className="absolute top-4 right-8 text-7xl font-black text-white/[0.03] group-hover:text-white/10 transition-colors">{sub.num}</div>
              <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center text-emerald-500 group-hover:bg-white group-hover:text-emerald-600 transition-all mb-8 shadow-inner">
                <sub.icon size={32} />
              </div>
              <h3 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-1 leading-none">{sub.title}</h3>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-widest group-hover:text-white/80">{sub.desc}</p>
              <button className="mt-8 bg-slate-950/50 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white hover:text-emerald-600 transition-all active:scale-95 group-hover:shadow-lg">
                 Accedi Ora →
              </button>
            </div>
          ))}
        </div>

        <div className="mt-16">
          <div className="bg-slate-900/40 border-2 border-dashed border-white/5 rounded-[3rem] p-16 flex flex-col items-center justify-center text-slate-500 text-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-10 text-emerald-500/5 group-hover:text-emerald-500/10 transition-colors">
               <Shield size={160} />
            </div>
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-inner text-emerald-500 group-hover:scale-110 transition-transform">
              <Plus size={32} />
            </div>
            <p className="text-xl font-black text-white uppercase italic tracking-tighter mb-2 leading-none">Nuovi Moduli</p>
            <p className="text-xs font-bold uppercase tracking-[0.3em] opacity-40 max-w-xs leading-relaxed">Lo spazio per i tuoi futuri moduli personali è pronto per essere attivato.</p>
          </div>
        </div>
        
        <div className="mt-8 text-center">
           <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.5em] flex items-center justify-center gap-3">
              <Zap size={12} className="text-emerald-500" /> Sincronizzato con Supabase Global
           </p>
        </div>
      </div>
    </div>
  );
};

export default Personale;
