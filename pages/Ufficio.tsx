
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Briefcase, FileText, Users, BarChart3, ChevronRight, LayoutDashboard, ShieldCheck } from 'lucide-react';

const Ufficio: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#060a14] text-slate-100 pb-20 overflow-x-hidden">
      {/* Header Professionale */}
      <div className="relative pt-20 pb-32 px-6 overflow-hidden border-b border-white/5 bg-slate-900/40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_-20%,_rgba(99,102,241,0.15),_transparent_50%)]"></div>
        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Link to="/lavoro" className="p-3 bg-white/5 rounded-2xl text-white/40 hover:text-white transition-all border border-white/5 hover:bg-white/10 shadow-xl">
              <ArrowLeft size={20} />
            </Link>
            <div className="flex flex-col">
              <span className="text-indigo-400 font-black text-[9px] uppercase tracking-[0.4em] italic mb-1 leading-none">Management Control Panel</span>
              <div className="flex items-center gap-2">
                 <ShieldCheck size={12} className="text-indigo-500" />
                 <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Accesso Autorizzato: Amministrazione</span>
              </div>
            </div>
          </div>
          <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tighter italic mb-4 leading-none text-white">
            UFFICIO <span className="text-indigo-500">HUB</span>
          </h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.4em] text-xs max-w-2xl leading-relaxed">
            Centro di controllo per l'analisi dei dati di produzione, gestione documentale e monitoraggio performance dello stabilimento di Mortara.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-16 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           
           {/* Card Statistiche - In Evidenza */}
           <Link to="/lavoro/ufficio/stats" className="bg-[#0f172a] rounded-[3rem] p-10 border border-indigo-500/20 group hover:border-indigo-500/50 transition-all duration-500 shadow-2xl overflow-hidden relative flex flex-col h-full">
              <div className="absolute top-0 right-0 p-8 text-indigo-500/5 group-hover:scale-110 transition-transform duration-1000">
                <LayoutDashboard size={180} />
              </div>
              <div className="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform mb-10 relative z-10">
                 <BarChart3 size={28} />
              </div>
              <div className="relative z-10 flex-grow">
                <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-4 text-white">Dashboard <span className="text-indigo-500">Live</span></h3>
                <p className="text-slate-400 font-medium text-sm leading-relaxed mb-8">
                  Analisi in tempo reale della produzione. Visualizza KG prodotti per macchina, fase di lavorazione e monitora il backlog corrente.
                </p>
              </div>
              <div className="mt-auto flex items-center gap-2 text-indigo-400 group-hover:text-white font-black text-[10px] uppercase tracking-widest relative z-10">
                Accedi alla Dashboard <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
           </Link>

           {/* Card Documentazione */}
           <div className="bg-white/[0.02] backdrop-blur-xl rounded-[3rem] p-10 border border-white/5 flex flex-col h-full relative group opacity-60">
              <div className="w-16 h-16 bg-slate-800 text-slate-500 rounded-2xl flex items-center justify-center mb-10">
                 <FileText size={28} />
              </div>
              <div className="flex-grow">
                <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-4 text-white">Archivio Doc</h3>
                <p className="text-slate-500 font-medium text-sm leading-relaxed mb-6">
                  Gestione bolle, certificati di qualità e documentazione tecnica Master Coil.
                </p>
              </div>
              <div className="mt-auto inline-flex items-center gap-2 text-slate-600 font-black text-[9px] uppercase tracking-widest">
                Disponibile a breve
              </div>
           </div>

           {/* Card Gestione Team */}
           <div className="bg-white/[0.02] backdrop-blur-xl rounded-[3rem] p-10 border border-white/5 flex flex-col h-full relative group opacity-60">
              <div className="w-16 h-16 bg-slate-800 text-slate-500 rounded-2xl flex items-center justify-center mb-10">
                 <Users size={28} />
              </div>
              <div className="flex-grow">
                <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-4 text-white">Risorse Umane</h3>
                <p className="text-slate-500 font-medium text-sm leading-relaxed mb-6">
                  Pianificazione turni, gestione ferie e monitoraggio presenze reparti operativi.
                </p>
              </div>
              <div className="mt-auto inline-flex items-center gap-2 text-slate-600 font-black text-[9px] uppercase tracking-widest">
                Disponibile a breve
              </div>
           </div>

        </div>
      </div>
    </div>
  );
};

export default Ufficio;
