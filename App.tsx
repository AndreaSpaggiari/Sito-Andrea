
import React, { useEffect, useState, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Home from './pages/Home';
import Pallamano from './pages/Pallamano';
import Lavoro from './pages/Lavoro';
import Produzione from './pages/Produzione';
import Personale from './pages/Personale';
import Login from './pages/Login';
import Header from './components/Header';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import { UserProfile } from './types';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrCreateProfile = useCallback(async (user: any) => {
    try {
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      if (!data) {
        const newProfile = {
          id: user.id,
          email: user.email,
          username: user.user_metadata?.display_name || user.email.split('@')[0],
          role: 'USER'
        };
        const { data: created } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();
        
        if (created) data = created;
      }
      
      if (data) setProfile(data as UserProfile);
    } catch (e) {
      console.error("Errore gestione profilo:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (currentSession?.user) {
      setLoading(true);
      await fetchOrCreateProfile(currentSession.user);
    }
  }, [fetchOrCreateProfile]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchOrCreateProfile(session.user);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchOrCreateProfile(session.user);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchOrCreateProfile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-white text-[10px] font-black uppercase tracking-widest">Sincronizzazione...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header profile={profile} session={session} />
      <main className="flex-grow">
        <Routes>
          <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
          
          {/* HOME PAGE PUBBLICA */}
          <Route path="/" element={<Home profile={profile} session={session} onRefresh={refreshProfile} />} />
          
          {/* SEZIONE PALLAMANO PUBBLICA */}
          <Route path="/pallamano" element={<Pallamano profile={profile} />} />
          
          {/* SEZIONI PROTETTE */}
          <Route path="/lavoro" element={
            <ProtectedRoute session={session} section="LAVORO" profile={profile}>
              <Lavoro />
            </ProtectedRoute>
          } />
          
          <Route path="/lavoro/produzione" element={
            <ProtectedRoute session={session} section="LAVORO" profile={profile}>
              <Produzione />
            </ProtectedRoute>
          } />
          
          <Route path="/personale" element={
            <ProtectedRoute session={session} section="PERSONALE" profile={profile}>
              <Personale />
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

export default App;
