
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Briefcase, FileText, Users, ClipboardCheck, BarChart3, ChevronRight } from 'lucide-react';

const Ufficio: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#0a0f1a] text-slate-100 pb-20">
      <div className="bg-slate-900 pt-16 pb-24 px-6 text-center relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-indigo-600/5"></div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-4 mb-6">
            <Link to="/lavoro" className="p-3 bg-white/5 rounded-xl text-white hover:bg-white/10 transition-all border border-white/5">
              <ArrowLeft size={20} />
            </Link>
            <div className="inline-flex items-center gap-2 bg-indigo-600/20 text-indigo-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-indigo-500/20">
              ADMINISTRATION HUB
            </div>
          </div>
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter italic mb-4 text-white">
            UFFICIO <span className="text-indigo-500">& ADMIN</span>
          </h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-12 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           
           <Link to="/lavoro/ufficio/stats" className="bg-white/[0.03] backdrop-blur-xl rounded-[2.5rem] p-10 border border-white/10 group hover:bg-indigo-600 transition-all duration-500 shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 text-white/5 group-hover:text-white/10 transition-colors">
                <BarChart3 size={120} />
              </div>
              <div className="w-14 h-14 bg-indigo-500 text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:bg-white group-hover:text-indigo-600 transition-all mb-8">
                 <BarChart3 size={24} />
              </div>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-2">Statistiche Live</h3>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest group-hover:text-white/80">Monitoraggio produzione in tempo reale per macchina e fase.</p>
              <div className="mt-8 flex items-center gap-2 text-indigo-400 group-hover:text-white font-black text-[9px] uppercase tracking-widest">
                Apri Dashboard <ChevronRight size={14} />
              </div>
           </Link>

           <div className="bg-white/[0.02] backdrop-blur-xl rounded-[2.5rem] p-10 border border-white/5 opacity-50 cursor-not-allowed">
              <div className="w-14 h-14 bg-slate-800 text-slate-500 rounded-2xl flex items-center justify-center mb-8">
                 <FileText size={24} />
              </div>
              <h3 className="text-xl font-black uppercase italic tracking-tighter mb-2">Documentazione</h3>
              <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">Archivio digitale bolle e certificazioni (Prossimamente).</p>
           </div>

           <div className="bg-white/[0.02] backdrop-blur-xl rounded-[2.5rem] p-10 border border-white/5 opacity-50 cursor-not-allowed">
              <div className="w-14 h-14 bg-slate-800 text-slate-500 rounded-2xl flex items-center justify-center mb-8">
                 <Users size={24} />
              </div>
              <h3 className="text-xl font-black uppercase italic tracking-tighter mb-2">Gestione Team</h3>
              <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">Pianificazione turni e HR (Prossimamente).</p>
           </div>

        </div>
      </div>
    </div>
  );
};

export default Ufficio;
