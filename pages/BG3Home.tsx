
import React from 'react';
import { Link } from 'react-router-dom';
import { Swords, ListChecks, Trophy, BookOpen, ArrowLeft, Zap, Sparkles } from 'lucide-react';

const BG3Home: React.FC = () => {
  const sections = [
    { 
      title: "ATTO 1", 
      desc: "Checklist 100% Perfect Run", 
      link: "/personale/bg3/atto1", 
      icon: ListChecks, 
      color: "from-purple-600 to-indigo-700" 
    },
    { 
      title: "ATTO 2", 
      desc: "Checklist Terre Maledette", 
      link: "#", 
      icon: ListChecks, 
      color: "from-slate-700 to-slate-900",
      disabled: true
    },
    { 
      title: "ATTO 3", 
      desc: "Checklist Città Bassa", 
      link: "#", 
      icon: ListChecks, 
      color: "from-amber-600 to-rose-700",
      disabled: true
    },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 pb-20 overflow-x-hidden">
      {/* Hero Section */}
      <div className="relative pt-24 pb-40 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(147,51,234,0.1),_transparent_70%)]"></div>
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
        <div className="relative z-10 max-w-6xl mx-auto text-center">
          <Link to="/personale" className="inline-flex items-center gap-2 text-purple-400 hover:text-white transition-colors mb-8 text-[10px] font-black uppercase tracking-widest">
            <ArrowLeft size={14} /> Torna al Personale
          </Link>
          <div className="flex justify-center mb-8">
            <div className="p-4 bg-purple-600/20 rounded-[2rem] border border-purple-500/30 shadow-[0_0_40px_rgba(147,51,234,0.3)]">
              <Swords size={48} className="text-purple-400" />
            </div>
          </div>
          <h1 className="text-5xl md:text-8xl font-black uppercase tracking-tighter italic mb-4 leading-none text-transparent bg-clip-text bg-gradient-to-b from-white to-purple-800">
            BALDUR'S GATE <span className="text-purple-500">3</span>
          </h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.4em] text-xs max-w-2xl mx-auto">
            Progetto Archivio Perfect Run Guide & Checklist Interattive
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-20 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {sections.map((sec, i) => (
            <div key={i}>
              {sec.disabled ? (
                <div className="bg-slate-900/40 border border-white/5 rounded-[3rem] p-10 opacity-40 cursor-not-allowed h-full flex flex-col justify-center items-center text-center">
                   <sec.icon size={40} className="mb-4 text-slate-600" />
                   <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-1 leading-none">{sec.title}</h3>
                   <p className="text-[10px] font-bold uppercase tracking-widest">In arrivo...</p>
                </div>
              ) : (
                <Link to={sec.link} className={`group relative bg-slate-900/80 backdrop-blur-xl border border-white/5 rounded-[3rem] p-10 flex flex-col transition-all duration-500 hover:bg-purple-900/20 hover:-translate-y-2 hover:border-purple-500/30 shadow-2xl h-full`}>
                  <div className={`w-16 h-16 bg-gradient-to-br ${sec.color} rounded-2xl flex items-center justify-center text-white shadow-2xl group-hover:scale-110 transition-transform mb-8`}>
                    <sec.icon size={28} />
                  </div>
                  <h3 className="text-3xl font-black text-white tracking-tight uppercase italic mb-2 leading-none">{sec.title}</h3>
                  <p className="text-slate-500 font-bold text-xs uppercase tracking-widest group-hover:text-purple-300 transition-colors">{sec.desc}</p>
                  <div className="mt-12 flex items-center gap-2 text-purple-500 group-hover:text-white transition-colors">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Inizia Esplorazione</span>
                    <Sparkles size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 bg-slate-900/40 border border-white/5 rounded-[3rem] p-12 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-12 text-purple-500/5 rotate-12">
              <BookOpen size={240} />
           </div>
           <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-black text-white tracking-tight mb-4 uppercase italic leading-none">Status <span className="text-purple-500">Campagna</span></h2>
                <p className="text-slate-400 text-sm leading-relaxed max-w-xl font-medium">Sincronizzazione dei progressi per le guide "Perfect Run". Utilizza queste liste per non mancare alcun oggetto raro o interazione chiave con i compagni.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">Completamento Atto 1</p>
                    <div className="flex items-center gap-3">
                       <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500 w-[100%] shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>
                       </div>
                       <span className="text-xs font-black text-white italic">100%</span>
                    </div>
                 </div>
                 <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">Build Protagonista</p>
                    <span className="text-xs font-black text-amber-500 italic">Dark Urge Sorcerer</span>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default BG3Home;
