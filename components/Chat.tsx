
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { ChatMessage, OnlineUser } from '../types';
import { Send, Users, LogOut, UserCircle, MessageSquare, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';

const Chat: React.FC = () => {
  const [username, setUsername] = useState<string>(localStorage.getItem('chat_username') || '');
  const [inputName, setInputName] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [recipient, setRecipient] = useState<string>('ALL');
  const [isAlerting, setIsAlerting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const titleIntervalRef = useRef<number | null>(null);
  const originalTitle = useRef(document.title);

  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
    audioRef.current.volume = 0.8;
  }, []);

  const triggerNotifications = () => {
    try {
      if (audioRef.current) {
        audioRef.current.play().catch(() => console.debug("Audio playback interrotto"));
      }

      setIsAlerting(true);
      setTimeout(() => setIsAlerting(false), 3000);

      if (!document.hasFocus()) {
        if (titleIntervalRef.current) clearInterval(titleIntervalRef.current);
        let showAlt = false;
        titleIntervalRef.current = window.setInterval(() => {
          document.title = showAlt ? "🔴 NUOVO MESSAGGIO!" : originalTitle.current;
          showAlt = !showAlt;
        }, 1000);
      }

      if ("vibrate" in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
    } catch (e) {
      console.error("Errore notifiche:", e);
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

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (scrollContainerRef.current) {
      const { scrollHeight, clientHeight } = scrollContainerRef.current;
      scrollContainerRef.current.scrollTo({
        top: scrollHeight - clientHeight,
        behavior
      });
    }
  };

  useEffect(() => {
    scrollToBottom(messages.length <= 1 ? 'auto' : 'smooth');
  }, [messages]);

  useEffect(() => {
    if (!username) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100);
      
      if (error) {
        console.error("Errore fetch messaggi:", error);
      } else if (data) {
        setMessages(data);
      }
    };
    fetchMessages();

    const messageChannel = supabase
      .channel('chat-room')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          const forMe = newMessage.recipient_name === 'ALL' || newMessage.recipient_name === username;
          const fromMe = newMessage.sender_name === username;

          if (forMe || fromMe) {
            setMessages((prev) => {
              const exists = prev.some(m => m.id === newMessage.id);
              if (exists) return prev;
              return [...prev, newMessage];
            });
            
            if (forMe && !fromMe) {
              triggerNotifications();
            }
          }
        }
      )
      .subscribe();

    const presenceChannel = supabase.channel('online-users', {
      config: { presence: { key: username } }
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const newState = presenceChannel.presenceState();
        const users: OnlineUser[] = [];
        for (const key in newState) {
          const entry = newState[key][0] as any;
          users.push({
            presence_ref: key,
            username: entry.username || key,
            online_at: entry.online_at
          });
        }
        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            username: username,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(presenceChannel);
      if (titleIntervalRef.current) clearInterval(titleIntervalRef.current);
    };
  }, [username]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputName.trim()) {
      const cleanName = inputName.trim().toUpperCase();
      setUsername(cleanName);
      localStorage.setItem('chat_username', cleanName);
      if (audioRef.current) {
        audioRef.current.play().then(() => audioRef.current?.pause()).catch(() => {});
      }
    }
  };

  const handleLogout = () => {
    setUsername('');
    localStorage.removeItem('chat_username');
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSending) return;

    setIsSending(true);
    const newMessage: ChatMessage = {
      sender_name: username,
      recipient_name: recipient,
      content: message.trim(),
    };

    try {
      const { error } = await supabase.from('messages').insert([newMessage]);
      if (error) throw error;
      setMessage('');
    } catch (err: any) {
      console.error("Errore invio:", err);
      alert(`ERRORE INVIO: ${err.message || "Controlla la connessione o la tabella del DB"}`);
    } finally {
      setIsSending(false);
    }
  };

  if (!username) {
    return (
      <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-200 animate-in fade-in duration-500">
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-yellow-400 rounded-3xl flex items-center justify-center text-slate-900 mb-6 shadow-lg">
            <UserCircle size={48} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Accedi alla Chat</h2>
          <p className="text-slate-600 text-sm mb-8 leading-relaxed font-semibold">Inserisci il tuo nome per iniziare.</p>
          <form onSubmit={handleLogin} className="w-full space-y-4">
            <input
              type="text"
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              placeholder="ES. ANDREA..."
              className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-yellow-400/20 focus:border-yellow-500 outline-none transition-all font-black text-center uppercase text-slate-900 placeholder:text-slate-400"
              required
            />
            <button className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl hover:bg-black transition-all shadow-xl active:scale-95 uppercase tracking-widest text-xs">
              ENTRA NELLA STANZA
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-[2rem] shadow-2xl flex flex-col h-[650px] border-4 overflow-hidden relative transition-all duration-300 ${isAlerting ? 'border-yellow-500 shadow-[0_0_40px_rgba(234,179,8,0.5)] animate-glow-pulse' : 'border-slate-200'}`}>
      <div className="bg-slate-900 px-6 py-4 text-white flex justify-between items-center shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center text-slate-900 shadow-lg">
              <MessageSquare size={20} />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-slate-900 rounded-full"></div>
          </div>
          <div>
            <p className="font-black text-[11px] uppercase tracking-widest leading-none text-white">{username}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{onlineUsers.length} Online</p>
            </div>
          </div>
        </div>
        <button onClick={handleLogout} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white">
          <LogOut size={18} />
        </button>
      </div>

      <div className="flex flex-grow overflow-hidden bg-slate-100">
        <div className="w-24 sm:w-32 bg-white border-r border-slate-200 p-3 overflow-y-auto hidden md:block shrink-0">
          <p className="text-[8px] font-black text-slate-500 mb-4 uppercase tracking-widest px-1">Canale</p>
          <div className="space-y-1">
            <button
              onClick={() => setRecipient('ALL')}
              className={`w-full text-left px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-between group ${recipient === 'ALL' ? 'bg-yellow-400 text-slate-900 shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <span>Pubblico</span>
              {recipient === 'ALL' && <ChevronRight size={10} />}
            </button>
            <div className="pt-4 mb-2 border-t border-slate-100">
              <p className="text-[8px] font-black text-slate-500 mb-2 uppercase tracking-widest px-1">Privato</p>
              {onlineUsers.filter(u => u.username !== username).map((u, i) => (
                <button
                  key={i}
                  onClick={() => setRecipient(u.username)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-[9px] font-bold transition-all truncate flex items-center justify-between mb-1 ${recipient === u.username ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <span className="truncate">{u.username}</span>
                  <div className={`w-1 h-1 rounded-full ${recipient === u.username ? 'bg-white' : 'bg-green-500'}`}></div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-grow flex flex-col min-w-0">
          <div className="bg-white/90 backdrop-blur-sm px-4 py-2 border-b border-slate-200 flex items-center justify-between shrink-0">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
              Destinatario: <span className={`ml-1 font-black ${recipient === 'ALL' ? 'text-yellow-600' : 'text-slate-900'}`}>{recipient === 'ALL' ? 'TUTTI' : recipient.toUpperCase()}</span>
            </span>
            <Users size={12} className="text-slate-400 md:hidden" />
          </div>

          <div 
            ref={scrollContainerRef}
            className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar scroll-smooth"
          >
            {messages.map((msg, idx) => {
              const isMe = msg.sender_name === username;
              const isPrivate = msg.recipient_name !== 'ALL';
              
              return (
                <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                  <div className={`flex items-center gap-2 mb-1 px-1`}>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight">
                      {isMe ? 'TU' : msg.sender_name} {isPrivate && !isMe && ` (PRIVATO)`}
                    </span>
                  </div>
                  <div className={`group relative max-w-[90%] px-4 py-3 rounded-2xl text-[13px] shadow-sm transition-all hover:shadow-md ${
                    isMe 
                      ? 'bg-slate-900 text-white rounded-tr-none' 
                      : isPrivate 
                        ? 'bg-yellow-400 text-slate-900 rounded-tl-none border border-yellow-500/50'
                        : 'bg-white text-slate-800 rounded-tl-none border border-slate-200'
                  }`}>
                    <p className="leading-relaxed font-medium break-words">{msg.content}</p>
                    <span className={`text-[8px] mt-1 block opacity-50 text-right font-black ${isMe ? 'text-white' : 'text-slate-600'}`}>
                      {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 bg-white border-t border-slate-200 shrink-0">
            <form onSubmit={sendMessage} className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={isSending}
                placeholder={recipient === 'ALL' ? 'SCRIVI UN MESSAGGIO PUBBLICO...' : `SCRIVI PRIVATAMENTE A ${recipient}...`}
                className="flex-grow px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-[13px] focus:ring-4 focus:ring-yellow-400/10 focus:border-yellow-500 outline-none transition-all placeholder:text-slate-400 font-bold uppercase text-slate-900"
              />
              <button 
                type="submit"
                disabled={isSending || !message.trim()}
                className={`p-4 rounded-2xl transition-all shadow-xl active:scale-90 flex items-center justify-center disabled:opacity-50 ${
                  recipient === 'ALL' ? 'bg-yellow-400 hover:bg-yellow-500 text-slate-900' : 'bg-slate-900 hover:bg-black text-white'
                }`}
              >
                {isSending ? <RefreshCw size={22} className="animate-spin" /> : <Send size={22} />}
              </button>
            </form>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes glow-pulse {
          0% { box-shadow: 0 0 5px rgba(234, 179, 8, 0.4); }
          50% { box-shadow: 0 0 30px rgba(234, 179, 8, 0.8); }
          100% { box-shadow: 0 0 5px rgba(234, 179, 8, 0.4); }
        }
        .animate-glow-pulse {
          animation: glow-pulse 1.5s infinite;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default Chat;
