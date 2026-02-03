
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Briefcase, FileText, Users, Mail, ClipboardCheck } from 'lucide-react';

const Ufficio: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-20">
      <div className="bg-slate-900 pt-16 pb-24 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-indigo-600/10"></div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-4 mb-6">
            <Link to="/lavoro" className="p-2 bg-white/10 rounded-lg text-white hover:bg-white/20 transition-all">
              <ArrowLeft size={20} />
            </Link>
            <div className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">
              ADMINISTRATION HUB
            </div>
          </div>
          <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter italic mb-4 text-white">
            UFFICIO <span className="text-indigo-500">& ADMIN</span>
          </h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-12 relative z-20">
        <div className="bg-white rounded-[3rem] p-12 shadow-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-8">
           <div className="space-y-6">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm">
                 <FileText size={24} />
              </div>
              <h3 className="text-xl font-black uppercase italic tracking-tighter">Documentazione</h3>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-tight leading-relaxed">Archivio digitale delle bolle di carico, ordini e certificazioni di qualità.</p>
           </div>
           <div className="space-y-6">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm">
                 <Users size={24} />
              </div>
              <h3 className="text-xl font-black uppercase italic tracking-tighter">Gestione Team</h3>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-tight leading-relaxed">Pianificazione turni e gestione accessi al portale industriale KME.</p>
           </div>
           <div className="space-y-6">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm">
                 <ClipboardCheck size={24} />
              </div>
              <h3 className="text-xl font-black uppercase italic tracking-tighter">Reporting</h3>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-tight leading-relaxed">Generazione report mensili di produzione e analisi efficienza.</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Ufficio;
