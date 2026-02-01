
import React from 'react';
import { Zap } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 text-slate-600 py-10 border-t border-white/5">
      <div className="container mx-auto px-4 flex flex-col items-center">
        <div className="flex items-center gap-3 mb-6 group cursor-default">
           <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center border border-white/5 group-hover:border-blue-500/30 transition-all">
              <Zap size={14} className="text-blue-500 animate-pulse" />
           </div>
           <p className="font-black italic text-base text-slate-400 uppercase tracking-tighter">ANDREA <span className="text-slate-600 group-hover:text-slate-500 transition-colors">SPAGGIARI</span></p>
        </div>
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-700">
          <span className="hover:text-slate-400 transition-colors cursor-default">© {new Date().getFullYear()} PRO PORTAL</span>
          <span className="hover:text-slate-400 transition-colors cursor-default">ARUBA EASY CLOUD</span>
          <span className="hover:text-slate-400 transition-colors cursor-default">SUPABASE REALTIME</span>
          <span className="hover:text-slate-400 transition-colors cursor-default">REACT ENGINE</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
