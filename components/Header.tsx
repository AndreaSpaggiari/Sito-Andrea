
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

  const handleLogout = () => supabase.auth.signOut();

  return (
    <header className="bg-[#e67e22] text-white shadow-xl p-4 sticky top-0 z-50 border-b border-white/10">
      <div className="container mx-auto flex justify-between items-center px-2">
        <Link to="/" className="text-xl font-bold flex items-center gap-3 group">
          <div className="p-2 bg-white/20 rounded-xl">
            <Home size={18} />
          </div>
          <span className="font-black tracking-tighter uppercase text-base italic">ANDREA <span className="text-white/80 font-medium">SPAGGIARI</span></span>
        </Link>
        
        <nav className="flex items-center gap-6">
          <div className="hidden lg:flex gap-8">
            <Link to="/pallamano" className={`flex items-center gap-2 hover:opacity-80 transition font-black text-[10px] uppercase tracking-widest ${location.pathname === '/pallamano' ? 'border-b-2 border-white pb-1' : ''}`}>
              <Trophy size={14} /> PALLAMANO
            </Link>
            <Link to="/lavoro" className={`flex items-center gap-2 hover:opacity-80 transition font-black text-[10px] uppercase tracking-widest ${location.pathname.startsWith('/lavoro') ? 'border-b-2 border-white pb-1' : ''}`}>
              <Briefcase size={14} /> LAVORO
            </Link>
            <Link to="/personale" className={`flex items-center gap-2 hover:opacity-80 transition font-black text-[10px] uppercase tracking-widest ${location.pathname === '/personale' ? 'border-b-2 border-white pb-1' : ''}`}>
              <User size={14} /> PERSONALE
            </Link>
          </div>

          {session ? (
            <div className="flex items-center gap-4 border-l border-white/20 pl-6">
              <div className="bg-white rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-sm">
                {profile?.role === 'ADMIN' && (
                  <span className="bg-slate-900 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase flex items-center gap-1">
                    <Shield size={8} /> ADMIN
                  </span>
                )}
                <span className="text-slate-900 text-[11px] font-black uppercase italic tracking-tighter">
                  {profile?.username || session?.user?.email?.split('@')[0]}
                </span>
                <button onClick={handleLogout} className="text-slate-400 hover:text-rose-500 transition-colors ml-1">
                  <LogOut size={14} />
                </button>
              </div>
            </div>
          ) : (
            <Link to="/login" className="bg-white text-slate-900 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
