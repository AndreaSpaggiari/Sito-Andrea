
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { ChatMessage, OnlineUser } from '../types';
import { Send, Users, LogOut, UserCircle, MessageSquare, ChevronRight, AlertCircle, RefreshCw, Zap, ZapOff } from 'lucide-react';

const Chat: React.FC = () => {
  const [username, setUsername] = useState<string>(localStorage.getItem('chat_username') || '');
  const [inputName, setInputName] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [recipient, setRecipient] = useState<string>('ALL');
  const [isSending, setIsSending] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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

    // Carica messaggi recenti (ultime 24 ore)
    const loadHistory = async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('messages')
        .select('*')
        .gt('created_at', yesterday)
        .order('created_at', { ascending: true });
      if (data) setMessages(data);
    };
    loadHistory();

    // Inizializza Canale BROADCAST (Bypass Database)
    const channel = supabase.channel('room-1', {
      config: {
        broadcast: { self: true },
        presence: { key: username },
      },
    });

    channel
      .on('broadcast', { event: 'shout' }, (payload) => {
        const msg = payload.payload as ChatMessage;
        // Filtra per destinatario
        if (msg.recipient_name === 'ALL' || msg.recipient_name === username || msg.sender_name === username) {
          setMessages((prev) => {
            if (prev.some(m => m.id === msg.id && msg.id)) return prev;
            return [...prev, msg];
          });
        }
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

    setIsSending(true);
    setError(null);

    const msgPayload: ChatMessage = {
      sender_name: username,
      recipient_name: recipient,
      content: content,
      created_at: new Date().toISOString(),
    };

    try {
      // 1. Invia via BROADCAST (Istantaneo, non serve DB)
      await channelRef.current.send({
        type: 'broadcast',
        event: 'shout',
        payload: msgPayload,
      });

      setMessage('');

      // 2. Prova a salvare nel DATABASE (per lo storico)
      // Se fallisce, non importa, il messaggio è già stato visto via broadcast
      supabase.from('messages').insert([
        { sender_name: username, recipient_name: recipient, content: content }
      ]).then(({ error }) => {
        if (error) console.warn("Salvataggio storico fallito, ma broadcast riuscito:", error.message);
      });

    } catch (err: any) {
      setError("ERRORE INVIO");
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  if (!username) {
    return (
      <div className="bg-white rounded-3xl shadow-2xl p-8 border border-slate-200">
        <div className="text-center">
          <div className="w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg text-slate-900">
            <UserCircle size={32} />
          </div>
          <h2 className="text-xl font-black uppercase italic mb-6">Chat Rapida</h2>
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
              placeholder="NOME..."
              className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-black text-center uppercase outline-none focus:border-yellow-400"
            />
            <button className="w-full py-4 bg-slate-900 text-white font-black rounded-xl uppercase text-xs tracking-widest shadow-lg">Entra</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-2xl flex flex-col h-[600px] border-2 border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 p-4 text-white flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center text-slate-900">
              <MessageSquare size={16} />
            </div>
            <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-900 ${isLive ? 'bg-green-500' : 'bg-red-500'}`}></div>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-tighter leading-none">{username}</p>
            <p className="text-[8px] font-bold text-slate-400 uppercase mt-1 flex items-center gap-1">
              {isLive ? <Zap size={8} className="text-yellow-400" /> : <ZapOff size={8} />}
              {onlineUsers.length} ONLINE
            </p>
          </div>
        </div>
        <button onClick={() => { setUsername(''); localStorage.removeItem('chat_username'); }} className="text-slate-500 hover:text-white transition-colors">
          <LogOut size={16} />
        </button>
      </div>

      {/* Area Messaggi */}
      <div className="flex-grow flex flex-col min-w-0 bg-slate-50">
        <div className="bg-white/80 px-4 py-1.5 border-b border-slate-100 flex justify-between items-center">
          <span className="text-[9px] font-black text-slate-400 uppercase">A: <span className="text-slate-900">{recipient}</span></span>
          {error && <span className="text-[8px] font-black text-red-500 uppercase">{error}</span>}
        </div>

        <div ref={scrollContainerRef} className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {messages.map((msg, i) => {
            const isMe = msg.sender_name === username;
            const isPriv = msg.recipient_name !== 'ALL';
            return (
              <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-1`}>
                <span className="text-[8px] font-black text-slate-400 mb-1 uppercase px-1">{msg.sender_name} {isPriv && '• PRIVATO'}</span>
                <div className={`px-4 py-2.5 rounded-2xl text-[13px] max-w-[85%] shadow-sm ${
                  isMe ? 'bg-slate-900 text-white rounded-tr-none' : 
                  isPriv ? 'bg-yellow-400 text-slate-900 rounded-tl-none border border-yellow-500' : 
                  'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                }`}>
                  <p className="leading-tight font-medium">{msg.content}</p>
                  <span className="text-[7px] mt-1 block opacity-40 text-right uppercase">
                    {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'LIVE'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Canali Rapidi */}
        <div className="px-4 py-2 bg-white border-t border-slate-100 flex gap-2 overflow-x-auto no-scrollbar">
          <button onClick={() => setRecipient('ALL')} className={`px-3 py-1 rounded-full text-[8px] font-black uppercase transition-all whitespace-nowrap ${recipient === 'ALL' ? 'bg-yellow-400 text-slate-900' : 'bg-slate-100 text-slate-400'}`}>Tutti</button>
          {onlineUsers.filter(u => u.username !== username).map((u, i) => (
            <button key={i} onClick={() => setRecipient(u.username)} className={`px-3 py-1 rounded-full text-[8px] font-black uppercase transition-all whitespace-nowrap ${recipient === u.username ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>{u.username}</button>
          ))}
        </div>

        {/* Input */}
        <div className="p-3 bg-white border-t border-slate-100">
          <form onSubmit={sendMessage} className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={e => setMessage(e.target.value)}
              disabled={isSending}
              placeholder="SCRIVI..."
              className="flex-grow px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold uppercase outline-none focus:border-yellow-400"
            />
            <button disabled={!message.trim()} className="w-12 h-12 bg-yellow-400 text-slate-900 rounded-xl flex items-center justify-center shadow-lg active:scale-90 disabled:opacity-50">
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default Chat;
