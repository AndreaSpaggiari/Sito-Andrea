
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { ChatMessage, OnlineUser } from '../types';
import { Send, LogOut, UserCircle, MessageSquare, Radio, Database, Volume2, Wifi, WifiOff } from 'lucide-react';

const Chat: React.FC = () => {
  const [username, setUsername] = useState<string>(localStorage.getItem('chat_username') || '');
  const [inputName, setInputName] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [recipient, setRecipient] = useState<string>('ALL');
  const [isSending, setIsSending] = useState(false);
  const [connStatus, setConnStatus] = useState<'online' | 'offline'>('offline');
  const [isAlerting, setIsAlerting] = useState(false);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const titleIntervalRef = useRef<number | null>(null);
  const originalTitle = useRef(document.title);

  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
    audioRef.current.volume = 0.4;
  }, []);

  const triggerNotifications = () => {
    if (audioRef.current) audioRef.current.play().catch(() => {});
    setIsAlerting(true);
    setTimeout(() => setIsAlerting(false), 2000);
    if (!document.hasFocus()) {
      if (titleIntervalRef.current) clearInterval(titleIntervalRef.current);
      let showAlt = false;
      titleIntervalRef.current = window.setInterval(() => {
        document.title = showAlt ? "🔴 CHAT" : originalTitle.current;
        showAlt = !showAlt;
      }, 1000);
    }
  };

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

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!username) return;

    // Caricamento storico iniziale (ultimi 50 messaggi)
    const fetchHistory = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(50);
      if (data) setMessages(data);
    };
    fetchHistory();

    // Sottoscrizione a NUOVI messaggi nel DB
    const messageChannel = supabase
      .channel('db-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          setMessages((prev) => {
            if (prev.some(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
          
          if (newMessage.sender_name !== username) {
            const forMe = newMessage.recipient_name === 'ALL' || newMessage.recipient_name === username;
            if (forMe) triggerNotifications();
          }
        }
      )
      .subscribe((status) => {
        setConnStatus(status === 'SUBSCRIBED' ? 'online' : 'offline');
      });

    // Presenza Online
    const presenceChannel = supabase.channel('online-status');
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const users = Object.keys(state).map(k => ({
          username: (state[k][0] as any).username,
          online_at: (state[k][0] as any).online_at
        }));
        setOnlineUsers(users as any);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ username, online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [username]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = message.trim();
    if (!content || isSending) return;

    setIsSending(true);
    try {
      // Metodo standard Supabase: Inserimento nel DB
      // Il Realtime listener sopra si occuperà di mostrare il messaggio non appena confermato dal DB
      const { error } = await supabase.from('messages').insert([{ 
        sender_name: username, 
        recipient_name: recipient, 
        content: content 
      }]);

      if (error) throw error;
      setMessage('');
    } catch (err: any) {
      console.error("Errore invio:", err);
      alert("Errore invio: " + err.message);
    } finally {
      setIsSending(false);
    }
  };

  if (!username) {
    return (
      <div className="bg-white rounded-[2rem] shadow-2xl p-8 border border-slate-200">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg text-white">
            <UserCircle size={32} />
          </div>
          <h2 className="text-xl font-black uppercase italic mb-6">Chat Login</h2>
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
              className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-xl font-black text-center uppercase outline-none focus:border-blue-600 text-slate-900"
              required
            />
            <button className="w-full py-4 bg-slate-900 text-white font-black rounded-xl uppercase text-xs tracking-widest shadow-xl active:scale-95">
              ENTRA NELLA CHAT
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-[2rem] shadow-2xl flex flex-col h-[550px] border-4 overflow-hidden relative transition-all duration-300 ${isAlerting ? 'border-blue-400' : 'border-slate-100'}`}>
      {/* Header */}
      <div className="bg-slate-900 p-4 text-white flex justify-between items-center z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <Radio size={16} />
            </div>
            <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-900 ${connStatus === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></div>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase italic leading-none">{username}</p>
            <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">{onlineUsers.length} ONLINE</p>
          </div>
        </div>
        <button onClick={() => { setUsername(''); localStorage.removeItem('chat_username'); }} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400">
          <LogOut size={14} />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-grow overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((msg, i) => {
          const isMe = msg.sender_name === username;
          const isPriv = msg.recipient_name !== 'ALL';
          return (
            <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <span className="text-[7px] font-black text-slate-400 mb-1 px-1 uppercase">{isMe ? 'TU' : msg.sender_name} {isPriv && '• PRIVATO'}</span>
              <div className={`px-4 py-2 rounded-2xl text-[12px] max-w-[85%] shadow-sm ${
                isMe ? 'bg-slate-900 text-white rounded-tr-none' : 
                isPriv ? 'bg-blue-600 text-white rounded-tl-none font-bold' : 
                'bg-white text-slate-900 border border-slate-200 rounded-tl-none'
              }`}>
                <p className="leading-tight">{msg.content}</p>
                <span className="text-[7px] mt-1 block opacity-40 text-right uppercase">
                  {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Online Picker */}
      <div className="px-3 py-2 bg-white border-t border-slate-100 flex gap-1 overflow-x-auto no-scrollbar shrink-0">
        <button 
          onClick={() => setRecipient('ALL')} 
          className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all border ${recipient === 'ALL' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
        >
          Pubblico
        </button>
        {onlineUsers.filter(u => u.username !== username).map((u, i) => (
          <button 
            key={i} 
            onClick={() => setRecipient(u.username)} 
            className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all border ${recipient === u.username ? 'bg-slate-900 border-black text-white' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
          >
            {u.username}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 bg-white border-t border-slate-100 shrink-0">
        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={e => setMessage(e.target.value)}
            disabled={isSending}
            placeholder={isSending ? "INVIO..." : "SCRIVI..."}
            className="flex-grow px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-[11px] font-black uppercase outline-none focus:border-blue-600 text-slate-900"
          />
          <button 
            type="submit"
            disabled={!message.trim() || isSending} 
            className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-90 disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </form>
      </div>

      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
};

export default Chat;
