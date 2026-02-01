
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
    if (location.pathname.includes('lavoro')) return 'bg-yellow-600';
    if (location.pathname.includes('personale')) return 'bg-green-600';
    return 'bg-slate-900';
  };

  const handleLogout = () => supabase.auth.signOut();

  return (
    <header className={`${getThemeColor()} text-white shadow-md p-4 transition-colors duration-300 sticky top-0 z-50 border-b border-white/10`}>
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-xl font-bold flex items-center gap-2 group">
          <div className="p-1.5 bg-white/10 rounded-lg group-hover:bg-white/20 transition-colors">
            <Home size={20} />
          </div>
          <span className="hidden sm:inline font-black tracking-tighter uppercase text-sm">ANDREA SPAGGIARI</span>
        </Link>
        
        <nav className="flex items-center gap-4 md:gap-8">
          <div className="hidden md:flex gap-6">
            <Link to="/pallamano" className={`flex items-center gap-1.5 hover:opacity-80 transition font-black text-[10px] uppercase tracking-widest ${location.pathname === '/pallamano' ? 'underline underline-offset-8 decoration-2' : ''}`}>
              <Trophy size={14} /> PALLAMANO
            </Link>
            <Link to="/lavoro" className={`flex items-center gap-1.5 hover:opacity-80 transition font-black text-[10px] uppercase tracking-widest ${location.pathname === '/lavoro' ? 'underline underline-offset-8 decoration-2' : ''}`}>
              <Briefcase size={14} /> LAVORO
            </Link>
            <Link to="/personale" className={`flex items-center gap-1.5 hover:opacity-80 transition font-black text-[10px] uppercase tracking-widest ${location.pathname === '/personale' ? 'underline underline-offset-8 decoration-2' : ''}`}>
              <User size={14} /> PERSONALE
            </Link>
          </div>

          {(profile || session) && (
            <div className="flex items-center gap-3 pl-4 border-l border-white/20">
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1.5">
                  {!profile ? (
                    <span className="bg-white/10 text-white/50 text-[8px] font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-1">
                      <Loader2 size={8} className="animate-spin" /> SYNC...
                    </span>
                  ) : profile.role === 'ADMIN' ? (
                    <span className="bg-yellow-400 text-slate-900 text-[8px] font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5">
                      <Shield size={8} /> ADMIN
                    </span>
                  ) : (
                    <span className="bg-white/20 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5">
                      <UserCheck size={8} /> USER
                    </span>
                  )}
                  <span className="text-[10px] font-black uppercase tracking-tight">
                    {profile?.username || session?.user?.email?.split('@')[0] || 'Utente'}
                  </span>
                </div>
                <button onClick={handleLogout} className="text-[9px] font-bold text-white/50 hover:text-white uppercase tracking-tighter flex items-center gap-1 transition-colors">
                  <LogOut size={9} /> Esci
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
