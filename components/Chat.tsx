
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { ChatMessage, OnlineUser } from '../types';
import { Send, LogOut, UserCircle, MessageSquare, Zap, ZapOff, Clock, Radio, Database } from 'lucide-react';

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
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

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

    // 1. CARICAMENTO STORICO DI OGGI (Dalle 00:00)
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
        console.warn("Errore recupero storico:", e);
        setDbStatus('error');
      }
    };
    loadDailyHistory();

    // 2. CONNESSIONE CANALE REALTIME
    const channel = supabase.channel('chat-main-v4', {
      config: {
        broadcast: { self: false },
        presence: { key: username },
      },
    });

    channel
      .on('broadcast', { event: 'message' }, (payload) => {
        const msg = payload.payload as ChatMessage;
        // Evita duplicati se il messaggio è già arrivato via DB (raro in tempo reale)
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

    // LOCAL ECHO: Visualizza subito il tuo messaggio
    setMessages(prev => [...prev, msgPayload]);
    setMessage('');
    setIsSending(true);

    try {
      // A. VIA RADIO (Broadcast) - Istantaneo per chi è online
      channelRef.current.send({
        type: 'broadcast',
        event: 'message',
        payload: msgPayload,
      });

      // B. VIA DATABASE (Persistenza) - Per chi entrerà dopo o per il refresh
      const { error } = await supabase.from('messages').insert([{ 
        sender_name: username, 
        recipient_name: recipient, 
        content: content 
      }]);

      if (error) {
        console.warn("DB offline, messaggio salvato solo in sessione.");
        setDbStatus('error');
      } else {
        setDbStatus('connected');
      }
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
          <h2 className="text-xl font-black uppercase italic mb-6">Identificati</h2>
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
              placeholder="IL TUO NOME..."
              className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-black text-center uppercase outline-none focus:border-yellow-400"
              required
            />
            <button className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl uppercase text-xs tracking-widest shadow-xl active:scale-95">Accedi</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2rem] shadow-2xl flex flex-col h-[600px] border-2 border-slate-100 overflow-hidden relative">
      {/* Header */}
      <div className="bg-slate-900 p-4 text-white flex justify-between items-center z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-lg ${isLive ? 'bg-yellow-400 text-slate-900' : 'bg-slate-800 text-slate-500'}`}>
              <Radio size={18} className={isLive ? 'animate-pulse' : ''} />
            </div>
            <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${isLive ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-red-500'}`}></div>
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-tighter leading-none italic">{username}</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-[8px] font-bold text-slate-400 uppercase leading-none">{onlineUsers.length} ONLINE</p>
              <div className={`flex items-center gap-0.5 text-[7px] font-black uppercase ${dbStatus === 'connected' ? 'text-emerald-500' : 'text-amber-500'}`}>
                <Database size={8} /> {dbStatus === 'connected' ? 'Salvato' : 'Solo Live'}
              </div>
            </div>
          </div>
        </div>
        <button onClick={() => { setUsername(''); localStorage.removeItem('chat_username'); }} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-colors">
          <LogOut size={16} />
        </button>
      </div>

      {/* Messaggi */}
      <div className="flex-grow flex flex-col min-w-0 bg-slate-50 relative overflow-hidden">
        <div className="bg-white/90 backdrop-blur-md px-4 py-2 border-b border-slate-100 flex justify-between items-center z-10">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">A: <span className="text-slate-900">{recipient}</span></span>
          <span className="text-[8px] font-black text-slate-300 uppercase italic">Storico di Oggi</span>
        </div>

        <div ref={scrollContainerRef} className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {messages.map((msg, i) => {
            const isMe = msg.sender_name === username;
            const isPriv = msg.recipient_name !== 'ALL';
            return (
              <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-1`}>
                <span className="text-[8px] font-black text-slate-400 mb-1 px-1 uppercase">{isMe ? 'TU' : msg.sender_name}</span>
                <div className={`px-4 py-3 rounded-2xl text-[13px] max-w-[85%] shadow-sm relative ${
                  isMe ? 'bg-slate-900 text-white rounded-tr-none' : 
                  isPriv ? 'bg-yellow-400 text-slate-900 rounded-tl-none border-b-2 border-yellow-500' : 
                  'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                }`}>
                  <p className="leading-tight font-medium">{msg.content}</p>
                  <span className="text-[7px] mt-1.5 block opacity-40 text-right font-black uppercase">
                    {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'LIVE'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Canali Rapidi */}
        <div className="px-4 py-2 bg-white border-t border-slate-100 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
          <button onClick={() => setRecipient('ALL')} className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all whitespace-nowrap border ${recipient === 'ALL' ? 'bg-yellow-400 border-yellow-500 text-slate-900 scale-105 shadow-md' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>Tutti</button>
          {onlineUsers.filter(u => u.username !== username).map((u, i) => (
            <button key={i} onClick={() => setRecipient(u.username)} className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all whitespace-nowrap border ${recipient === u.username ? 'bg-slate-900 border-black text-white scale-105 shadow-md' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>{u.username}</button>
          ))}
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t border-slate-100 shrink-0">
          <form onSubmit={sendMessage} className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="SCRIVI..."
              className="flex-grow px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-[12px] font-black uppercase outline-none focus:border-yellow-400 shadow-inner"
            />
            <button disabled={!message.trim()} className="w-14 h-14 bg-yellow-400 text-slate-900 rounded-2xl flex items-center justify-center shadow-xl active:scale-90 disabled:opacity-50 transition-all">
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default Chat;
