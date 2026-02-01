
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { ChatMessage, OnlineUser } from '../types';
import { Send, Users, LogOut, UserCircle, MessageSquare, ChevronRight } from 'lucide-react';

const Chat: React.FC = () => {
  const [username, setUsername] = useState<string>(localStorage.getItem('chat_username') || '');
  const [inputName, setInputName] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [recipient, setRecipient] = useState<string>('ALL');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Funzione di scroll sicura che non trascina la pagina intera
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (scrollContainerRef.current) {
      const { scrollHeight, clientHeight } = scrollContainerRef.current;
      scrollContainerRef.current.scrollTo({
        top: scrollHeight - clientHeight,
        behavior
      });
    }
  };

  // Scroll al caricamento e ai nuovi messaggi
  useEffect(() => {
    scrollToBottom(messages.length <= 1 ? 'auto' : 'smooth');
  }, [messages]);

  // Initial Fetch & Real-time setup
  useEffect(() => {
    if (!username) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100);
      
      if (data) setMessages(data);
    };
    fetchMessages();

    const messageChannel = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          if (newMessage.recipient_name === 'ALL' || newMessage.recipient_name === username || newMessage.sender_name === username) {
            setMessages((prev) => [...prev, newMessage]);
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
    };
  }, [username]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputName.trim()) {
      setUsername(inputName.trim());
      localStorage.setItem('chat_username', inputName.trim());
    }
  };

  const handleLogout = () => {
    setUsername('');
    localStorage.removeItem('chat_username');
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const newMessage: ChatMessage = {
      sender_name: username,
      recipient_name: recipient,
      content: message.trim(),
    };

    const { error } = await supabase.from('messages').insert([newMessage]);
    if (!error) {
      setMessage('');
    }
  };

  if (!username) {
    return (
      <div className="bg-white rounded-[2rem] shadow-2xl p-8 border border-yellow-100 animate-in fade-in duration-500">
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-yellow-50 rounded-3xl flex items-center justify-center text-yellow-600 mb-6 shadow-inner">
            <UserCircle size={48} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tight">Accedi alla Chat</h2>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed">Inserisci il tuo nome per comunicare in tempo reale con il team.</p>
          <form onSubmit={handleLogin} className="w-full space-y-4">
            <input
              type="text"
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              placeholder="Il tuo nome..."
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-yellow-400/20 focus:border-yellow-400 outline-none transition-all font-bold text-center"
              required
            />
            <button className="w-full py-4 bg-yellow-500 text-white font-black rounded-2xl hover:bg-yellow-600 transition-all shadow-lg active:scale-95 uppercase tracking-widest text-xs">
              ENTRA NELLA STANZA
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2rem] shadow-2xl flex flex-col h-[650px] border border-slate-100 overflow-hidden relative">
      {/* Header */}
      <div className="bg-slate-900 px-6 py-4 text-white flex justify-between items-center shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-yellow-500 rounded-xl flex items-center justify-center text-white shadow-lg">
              <MessageSquare size={20} />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-slate-900 rounded-full"></div>
          </div>
          <div>
            <p className="font-black text-[11px] uppercase tracking-widest leading-none">{username}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              <p className="text-[9px] font-bold text-slate-400 uppercase">{onlineUsers.length} Online</p>
            </div>
          </div>
        </div>
        <button onClick={handleLogout} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white">
          <LogOut size={18} />
        </button>
      </div>

      <div className="flex flex-grow overflow-hidden bg-slate-50/50">
        {/* Sidebar Destinatari */}
        <div className="w-24 sm:w-32 bg-white border-r border-slate-100 p-3 overflow-y-auto hidden md:block shrink-0">
          <p className="text-[8px] font-black text-slate-400 mb-4 uppercase tracking-widest px-1">Canale</p>
          <div className="space-y-1">
            <button
              onClick={() => setRecipient('ALL')}
              className={`w-full text-left px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-between group ${recipient === 'ALL' ? 'bg-yellow-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <span>Pubblico</span>
              {recipient === 'ALL' && <ChevronRight size={10} />}
            </button>
            <div className="pt-4 mb-2 border-t border-slate-50">
              <p className="text-[8px] font-black text-slate-400 mb-2 uppercase tracking-widest px-1">Privato</p>
              {onlineUsers.filter(u => u.username !== username).map((u, i) => (
                <button
                  key={i}
                  onClick={() => setRecipient(u.username)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-[9px] font-bold transition-all truncate flex items-center justify-between mb-1 ${recipient === u.username ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <span className="truncate">{u.username}</span>
                  <div className={`w-1 h-1 rounded-full ${recipient === u.username ? 'bg-white' : 'bg-green-500'}`}></div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Area Messaggi */}
        <div className="flex-grow flex flex-col min-w-0">
          <div className="bg-white/80 backdrop-blur-sm px-4 py-2 border-b border-slate-100 flex items-center justify-between shrink-0">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              Stai scrivendo a: <span className={`ml-1 ${recipient === 'ALL' ? 'text-yellow-600' : 'text-slate-900'}`}>{recipient === 'ALL' ? 'TUTTI' : recipient.toUpperCase()}</span>
            </span>
            <Users size={12} className="text-slate-300 md:hidden" />
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
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight">
                      {isMe ? 'Tu' : msg.sender_name} {isPrivate && !isMe && ` (Privato)`}
                    </span>
                  </div>
                  <div className={`group relative max-w-[90%] px-4 py-3 rounded-2xl text-[13px] shadow-sm transition-all hover:shadow-md ${
                    isMe 
                      ? 'bg-slate-900 text-white rounded-tr-none' 
                      : isPrivate 
                        ? 'bg-yellow-500 text-white rounded-tl-none'
                        : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                  }`}>
                    <p className="leading-relaxed break-words">{msg.content}</p>
                    <span className={`text-[8px] mt-1 block opacity-40 text-right ${isMe || isPrivate ? 'text-white' : 'text-slate-500'}`}>
                      {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Form Invio */}
          <div className="p-4 bg-white border-t border-slate-100 shrink-0">
            <form onSubmit={sendMessage} className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={recipient === 'ALL' ? 'Invia un messaggio pubblico...' : `Scrivi privatamente a ${recipient}...`}
                className="flex-grow px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-[1.25rem] text-sm focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all placeholder:text-slate-400 placeholder:text-xs font-medium"
              />
              <button 
                type="submit"
                className={`p-3.5 rounded-[1.25rem] transition-all shadow-lg active:scale-90 flex items-center justify-center ${
                  recipient === 'ALL' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'bg-slate-900 hover:bg-black text-white'
                }`}
              >
                <Send size={20} />
              </button>
            </form>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
};

export default Chat;
