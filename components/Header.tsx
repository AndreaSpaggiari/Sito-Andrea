
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Trophy, Briefcase, User, LogOut, Shield, UserCheck, Loader2, LogIn, ChevronRight } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { UserProfile } from '../types';

interface Props {
  profile?: UserProfile | null;
  session?: any;
}

const Header: React.FC<Props> = ({ profile, session }) => {
  const location = useLocation();

  const getThemeColor = () => {
    if (location.pathname.includes('pallamano')) return 'bg-blue-600/90';
    if (location.pathname.includes('lavoro')) return 'bg-amber-600/90';
    if (location.pathname.includes('personale')) return 'bg-emerald-600/90';
    return 'bg-slate-950/90';
  };

  const handleLogout = () => supabase.auth.signOut();

  return (
    <header className={`${getThemeColor()} text-white shadow-xl p-3 transition-colors duration-500 sticky top-0 z-50 border-b border-white/10 backdrop-blur-xl`}>
      <div className="container mx-auto flex justify-between items-center px-4">
        <Link to="/" className="flex items-center gap-3 group">
          {/* Logo Placeholder - Sostituisci src con l'URL del tuo logo reale */}
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20 group-hover:scale-110 transition-transform overflow-hidden shadow-inner">
             <img 
               src="https://api.dicebear.com/7.x/initials/svg?seed=AS&backgroundColor=fbbf24" 
               alt="Logo" 
               className="w-full h-full object-cover"
             />
          </div>
          <div className="flex flex-col">
            <span className="font-black tracking-tighter uppercase text-sm italic leading-none">ANDREA</span>
            <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest leading-none mt-1">SPAGGIARI</span>
          </div>
        </Link>
        
        <nav className="flex items-center gap-4 md:gap-8">
          <div className="hidden lg:flex gap-6">
            <Link to="/pallamano" className={`flex items-center gap-2 hover:text-blue-200 transition font-black text-[9px] uppercase tracking-widest ${location.pathname === '/pallamano' ? 'bg-white/10 px-3 py-1.5 rounded-lg' : ''}`}>
              <Trophy size={14} /> PALLAMANO
            </Link>
            <Link to="/lavoro" className={`flex items-center gap-2 hover:text-amber-200 transition font-black text-[9px] uppercase tracking-widest ${location.pathname.startsWith('/lavoro') ? 'bg-white/10 px-3 py-1.5 rounded-lg' : ''}`}>
              <Briefcase size={14} /> LAVORO
            </Link>
            <Link to="/personale" className={`flex items-center gap-2 hover:text-emerald-200 transition font-black text-[9px] uppercase tracking-widest ${location.pathname === '/personale' ? 'bg-white/10 px-3 py-1.5 rounded-lg' : ''}`}>
              <User size={14} /> PERSONALE
            </Link>
          </div>

          {(profile || session) ? (
            <div className="flex items-center gap-4 pl-4 border-l border-white/20">
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-2">
                  {!profile ? (
                    <span className="bg-white/10 text-white/50 text-[7px] font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-1">
                      <Loader2 size={8} className="animate-spin" />
                    </span>
                  ) : profile.role === 'ADMIN' ? (
                    <span className="bg-white text-slate-900 text-[7px] font-black px-1.5 py-0.5 rounded uppercase shadow-lg">ADMIN</span>
                  ) : null}
                  <span className="text-[10px] font-black uppercase italic tracking-tighter">
                    {profile?.username || session?.user?.email?.split('@')[0]}
                  </span>
                </div>
                <button onClick={handleLogout} className="text-[8px] font-black text-white/50 hover:text-white uppercase tracking-widest transition-colors">
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <Link to="/login" className="bg-white text-slate-900 hover:bg-slate-100 px-4 py-2 rounded-xl transition-all font-black text-[9px] uppercase tracking-widest shadow-lg flex items-center gap-2">
              <LogIn size={14} /> <span className="hidden sm:inline">Accesso</span>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
