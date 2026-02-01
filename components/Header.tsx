
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Trophy, Briefcase, User, LogOut, Shield, UserCheck, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { UserProfile } from '../types';

interface Props {
  profile?: UserProfile | null;
  session?: any;
}

const Header: React.FC<Props> = ({ profile, session }) => {
  const location = useLocation();

  const getThemeColor = () => {
    if (location.pathname.includes('pallamano')) return 'bg-blue-600';
    if (location.pathname.includes('lavoro')) return 'bg-amber-600';
    if (location.pathname.includes('personale')) return 'bg-emerald-600';
    return 'bg-slate-950';
  };

  const handleLogout = () => supabase.auth.signOut();

  return (
    <header className={`${getThemeColor()} text-white shadow-xl p-4 transition-colors duration-500 sticky top-0 z-50 border-b border-white/10`}>
      <div className="container mx-auto flex justify-between items-center px-2">
        <Link to="/" className="text-xl font-bold flex items-center gap-2 group">
          <div className="p-2 bg-white/10 rounded-xl group-hover:bg-white/20 transition-all group-hover:scale-110">
            <Home size={18} />
          </div>
          <span className="hidden sm:inline font-black tracking-tighter uppercase text-base italic">ANDREA <span className="text-white/60">SPAGGIARI</span></span>
        </Link>
        
        <nav className="flex items-center gap-4 md:gap-8">
          <div className="hidden md:flex gap-8">
            <Link to="/pallamano" className={`flex items-center gap-2 hover:opacity-80 transition font-black text-[10px] uppercase tracking-widest ${location.pathname === '/pallamano' ? 'underline underline-offset-[12px] decoration-4' : ''}`}>
              <Trophy size={14} /> PALLAMANO
            </Link>
            <Link to="/lavoro" className={`flex items-center gap-2 hover:opacity-80 transition font-black text-[10px] uppercase tracking-widest ${location.pathname.startsWith('/lavoro') ? 'underline underline-offset-[12px] decoration-4' : ''}`}>
              <Briefcase size={14} /> LAVORO
            </Link>
            <Link to="/personale" className={`flex items-center gap-2 hover:opacity-80 transition font-black text-[10px] uppercase tracking-widest ${location.pathname === '/personale' ? 'underline underline-offset-[12px] decoration-4' : ''}`}>
              <User size={14} /> PERSONALE
            </Link>
          </div>

          {(profile || session) && (
            <div className="flex items-center gap-4 pl-6 border-l border-white/20">
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-2">
                  {!profile ? (
                    <span className="bg-white/10 text-white/50 text-[8px] font-black px-2 py-0.5 rounded uppercase flex items-center gap-1">
                      <Loader2 size={8} className="animate-spin" /> SYNC
                    </span>
                  ) : profile.role === 'ADMIN' ? (
                    <span className="bg-white text-slate-900 text-[8px] font-black px-2 py-0.5 rounded uppercase flex items-center gap-1 shadow-lg">
                      <Shield size={8} /> ADMIN
                    </span>
                  ) : (
                    <span className="bg-white/20 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase flex items-center gap-1">
                      <UserCheck size={8} /> USER
                    </span>
                  )}
                  <span className="text-[11px] font-black uppercase tracking-tighter italic">
                    {profile?.username || session?.user?.email?.split('@')[0]}
                  </span>
                </div>
                <button onClick={handleLogout} className="text-[9px] font-black text-white/50 hover:text-white uppercase tracking-widest flex items-center gap-1 transition-colors mt-0.5">
                  <LogOut size={8} /> Logout
                </button>
              </div>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
