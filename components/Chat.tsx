
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { ChatMessage, OnlineUser } from '../types';
import { Send, LogOut, UserCircle, MessageSquare, Radio, Database, Bell, BellOff, Volume2 } from 'lucide-react';

const Chat: React.FC = () => {
  const [username, setUsername] = useState<string>(localStorage.getItem('chat_username') || '');
  const [inputName, setInputName] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [recipient, setRecipient] = useState<string>('ALL');
  const [isSending, setIsSending] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [dbStatus, setDbStatus] = useState<'connected' | 'error' | 'syncing'>('syncing');
  const [isAlerting, setIsAlerting] = useState(false);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const titleIntervalRef = useRef<number | null>(null);
  const originalTitle = useRef(document.title);

  // Inizializzazione Audio
  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
    audioRef.current.volume = 0.4;
  }, []);

  const triggerNotifications = () => {
    // 1. Suono
    if (audioRef.current) {
      audioRef.current.play().catch(() => console.debug("Audio interrotto da interazione utente"));
    }

    // 2. Bagliore Visivo
    setIsAlerting(true);
    setTimeout(() => setIsAlerting(false), 2000);

    // 3. Titolo Browser (se tab non attiva)
    if (!document.hasFocus()) {
      if (titleIntervalRef.current) clearInterval(titleIntervalRef.current);
      let showAlt = false;
      titleIntervalRef.current = window.setInterval(() => {
        document.title = showAlt ? "🔴 NUOVO MESSAGGIO!" : originalTitle.current;
        showAlt = !showAlt;
      }, 1000);
    }

    // 4. Vibrazione (Mobile)
    if ("vibrate" in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
  };

  // Reset titolo al ritorno sulla tab
  useEffect(() => {
    const handleFocus = () => {
      if (titleIntervalRef.current) {
        clearInterval(titleIntervalRef.current);
        titleIntervalRef.current = null;
        document.title = originalTitle.current;
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!username) return;

    const loadDailyHistory = async () => {
      setDbStatus('syncing');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .gte('created_at', today.toISOString())
          .order('created_at', { ascending: true });
        
        if (error) throw error;
        if (data) setMessages(data);
        setDbStatus('connected');
      } catch (e) {
        setDbStatus('error');
      }
    };
    loadDailyHistory();

    const channel = supabase.channel('chat-main-v4', {
      config: {
        broadcast: { self: false },
        presence: { key: username },
      },
    });

    channel
      .on('broadcast', { event: 'message' }, (payload) => {
        const msg = payload.payload as ChatMessage;
        
        // Notifica solo se il messaggio è per noi o pubblico
        const forMe = msg.recipient_name === 'ALL' || msg.recipient_name === username;
        if (forMe) {
          triggerNotifications();
        }

        setMessages((prev) => {
          if (prev.some(m => m.created_at === msg.created_at && m.sender_name === msg.sender_name)) return prev;
          return [...prev, msg];
        });
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.keys(state).map(k => ({
          username: (state[k][0] as any).username,
          online_at: (state[k][0] as any).online_at
        }));
        setOnlineUsers(users as any);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsLive(true);
          await channel.track({ username, online_at: new Date().toISOString() });
        } else {
          setIsLive(false);
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      if (titleIntervalRef.current) clearInterval(titleIntervalRef.current);
    };
  }, [username]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = message.trim();
    if (!content || !channelRef.current) return;

    const msgPayload: ChatMessage = {
      sender_name: username,
      recipient_name: recipient,
      content: content,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, msgPayload]);
    setMessage('');
    setIsSending(true);

    try {
      channelRef.current.send({
        type: 'broadcast',
        event: 'message',
        payload: msgPayload,
      });

      const { error } = await supabase.from('messages').insert([{ 
        sender_name: username, 
        recipient_name: recipient, 
        content: content 
      }]);

      if (error) setDbStatus('error');
      else setDbStatus('connected');
    } catch (err) {
      console.error("Errore invio:", err);
    } finally {
      setIsSending(false);
    }
  };

  if (!username) {
    return (
      <div className="bg-white rounded-[2rem] shadow-2xl p-8 border border-slate-200 animate-in fade-in zoom-in duration-300">
        <div className="text-center">
          <div className="w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg text-slate-900">
            <UserCircle size={32} />
          </div>
          <h2 className="text-xl font-black uppercase italic mb-2">Benvenuto</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Inserisci il tuo nome per chattare</p>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (inputName.trim()) {
              const n = inputName.trim().toUpperCase();
              setUsername(n);
              localStorage.setItem('chat_username', n);
            }
          }} className="space-y-3">
            <input 
              type="text" 
              value={inputName} 
              onChange={e => setInputName(e.target.value)}
              placeholder="ES. ANDREA..."
              className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-black text-center uppercase outline-none focus:border-yellow-400 text-slate-900 placeholder:text-slate-300 shadow-inner"
              required
            />
            <button className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl uppercase text-xs tracking-widest shadow-xl active:scale-95 hover:bg-black transition-colors">
              ENTRA NELLA STANZA
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-[2rem] shadow-2xl flex flex-col h-[600px] border-4 overflow-hidden relative transition-all duration-300 ${isAlerting ? 'border-yellow-400 shadow-[0_0_30px_rgba(234,179,8,0.4)]' : 'border-slate-100'}`}>
      {/* Header */}
      <div className="bg-slate-900 p-4 text-white flex justify-between items-center z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-lg transition-colors ${isLive ? 'bg-yellow-400 text-slate-900' : 'bg-slate-800 text-slate-500'}`}>
              <Radio size={18} className={isLive ? 'animate-pulse' : ''} />
            </div>
            <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${isLive ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-red-500'}`}></div>
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-tighter leading-none italic">{username}</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-[8px] font-bold text-slate-400 uppercase leading-none">{onlineUsers.length} ONLINE</p>
              <div className={`flex items-center gap-0.5 text-[7px] font-black uppercase ${dbStatus === 'connected' ? 'text-emerald-500' : 'text-amber-500'}`}>
                <Database size={8} /> {dbStatus === 'connected' ? 'Salvato' : 'Sincronizzazione...'}
              </div>
            </div>
          </div>
        </div>
        <button onClick={() => { setUsername(''); localStorage.removeItem('chat_username'); }} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-slate-500 hover:text-white transition-colors">
          <LogOut size={16} />
        </button>
      </div>

      {/* Area Messaggi */}
      <div className="flex-grow flex flex-col min-w-0 bg-slate-50 relative overflow-hidden">
        <div className="bg-white/95 backdrop-blur-md px-4 py-2 border-b border-slate-100 flex justify-between items-center z-10">
          <div className="flex items-center gap-2">
            <Volume2 size={10} className="text-slate-400" />
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">A: <span className="text-slate-900">{recipient}</span></span>
          </div>
          <span className="text-[8px] font-black text-slate-300 uppercase italic">Realtime v4.0</span>
        </div>

        <div ref={scrollContainerRef} className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50">
          {messages.map((msg, i) => {
            const isMe = msg.sender_name === username;
            const isPriv = msg.recipient_name !== 'ALL';
            return (
              <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-1 duration-200`}>
                <span className="text-[8px] font-black text-slate-400 mb-1 px-1 uppercase tracking-tighter">
                  {isMe ? 'TU' : msg.sender_name} {isPriv && '• PRIVATO'}
                </span>
                <div className={`px-4 py-3 rounded-2xl text-[13px] max-w-[85%] shadow-sm relative border ${
                  isMe ? 'bg-slate-900 text-white rounded-tr-none border-slate-800' : 
                  isPriv ? 'bg-yellow-400 text-slate-900 rounded-tl-none border-yellow-500 font-bold' : 
                  'bg-white text-slate-900 border-slate-200 rounded-tl-none'
                }`}>
                  <p className="leading-tight font-medium break-words">{msg.content}</p>
                  <span className={`text-[7px] mt-1.5 block opacity-50 text-right font-black uppercase ${isMe ? 'text-white/60' : 'text-slate-500'}`}>
                    {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'LIVE'}
                  </span>
                </div>
              </div>
            );
          })}
          {messages.length === 0 && (
             <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-40">
                <MessageSquare size={32} className="mb-2" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">Inizia la conversazione</p>
             </div>
          )}
        </div>

        {/* Canali Rapidi / Utenti Online */}
        <div className="px-3 py-2 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          <button 
            onClick={() => setRecipient('ALL')} 
            className={`px-3.5 py-2 rounded-xl text-[9px] font-black uppercase transition-all whitespace-nowrap border-2 ${recipient === 'ALL' ? 'bg-yellow-400 border-yellow-500 text-slate-900 scale-105 shadow-md' : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'}`}
          >
            Tutti
          </button>
          {onlineUsers.filter(u => u.username !== username).map((u, i) => (
            <button 
              key={i} 
              onClick={() => setRecipient(u.username)} 
              className={`px-3.5 py-2 rounded-xl text-[9px] font-black uppercase transition-all whitespace-nowrap border-2 ${recipient === u.username ? 'bg-slate-900 border-black text-white scale-105 shadow-md' : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'}`}
            >
              {u.username}
            </button>
          ))}
        </div>

        {/* Input Messaggio */}
        <div className="p-3 bg-white border-t border-slate-100 shrink-0">
          <form onSubmit={sendMessage} className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={recipient === 'ALL' ? "SCRIVI A TUTTI..." : `SCRIVI A ${recipient}...`}
              className="flex-grow px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-[12px] font-black uppercase outline-none focus:border-yellow-400 text-slate-900 placeholder:text-slate-300 shadow-inner transition-all"
            />
            <button 
              type="submit"
              disabled={!message.trim() || isSending} 
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl active:scale-90 disabled:opacity-50 transition-all ${recipient === 'ALL' ? 'bg-yellow-400 text-slate-900' : 'bg-slate-900 text-white'}`}
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default Chat;
