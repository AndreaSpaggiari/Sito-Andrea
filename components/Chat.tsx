
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { ChatMessage, OnlineUser } from '../types';
import { Send, Users, LogOut, UserCircle, MessageSquare, ChevronRight, X, MessageCircle, Bell } from 'lucide-react';

const Chat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastMessagePreview, setLastMessagePreview] = useState<ChatMessage | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const [username, setUsername] = useState<string>(localStorage.getItem('chat_username') || '');
  const [inputName, setInputName] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [recipient, setRecipient] = useState<string>('ALL');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
    if (isOpen) {
      setTimeout(() => scrollToBottom('smooth'), 100);
      setUnreadCount(0);
      setShowPreview(false);
    }
  }, [isOpen, messages]);

  useEffect(() => {
    if (!username) return;

    const fetchMessages = async () => {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      const { data } = await supabase
        .from('messages')
        .select('*')
        .gte('created_at', startOfToday)
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
            
            // Gestione Notifiche se chat chiusa
            if (!isOpen && newMessage.sender_name !== username) {
              setUnreadCount(prev => prev + 1);
              setLastMessagePreview(newMessage);
              setShowPreview(true);
              setTimeout(() => setShowPreview(false), 4000);
              
              // Feedback aptico/sonoro opzionale qui
              try { if ('vibrate' in navigator) navigator.vibrate(50); } catch(e){}
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
    };
  }, [username, isOpen]);

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
    setIsOpen(false);
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

  // Render dell'icona flottante o della chat espansa
  return (
    <div className="fixed bottom-6 right-6 z-[1000] flex flex-col items-end pointer-events-none">
      
      {/* Anteprima Messaggio (Toast) */}
      {showPreview && !isOpen && lastMessagePreview && (
        <div 
          onClick={() => setIsOpen(true)}
          className="mb-4 bg-white shadow-2xl rounded-2xl p-4 border border-blue-100 flex items-center gap-3 animate-in slide-in-from-right-10 duration-300 pointer-events-auto cursor-pointer hover:bg-slate-50 max-w-[280px]"
        >
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shrink-0">
             <MessageSquare size={14} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{lastMessagePreview.sender_name}</p>
            <p className="text-xs font-bold text-slate-800 truncate">{lastMessagePreview.content}</p>
          </div>
        </div>
      )}

      {/* Finestra Chat Espansa */}
      {isOpen && (
        <div className="mb-4 w-[350px] sm:w-[400px] h-[550px] bg-white rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 slide-in-from-bottom-10 duration-300 pointer-events-auto">
          
          {/* Header */}
          <div className="bg-[#1e293b] px-6 py-4 text-white flex justify-between items-center shrink-0 shadow-md">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                  <MessageCircle size={20} />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-[#1e293b] rounded-full"></div>
              </div>
              <div>
                <p className="font-black text-[11px] uppercase tracking-widest leading-none">Reparto {username}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">{onlineUsers.length} Colleghi Online</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handleLogout} className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors" title="Logout">
                <LogOut size={16} />
              </button>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>

          {!username ? (
            <div className="flex-grow p-8 flex flex-col items-center justify-center text-center bg-slate-50">
               <UserCircle size={60} className="text-slate-300 mb-6" />
               <h3 className="text-lg font-black uppercase italic tracking-tighter text-slate-900 mb-2">Identificati</h3>
               <form onSubmit={handleLogin} className="w-full space-y-4">
                  <input
                    type="text"
                    value={inputName}
                    onChange={(e) => setInputName(e.target.value)}
                    placeholder="Nome o Sigla..."
                    className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-center outline-none focus:border-blue-500 shadow-sm"
                    required
                  />
                  <button className="w-full py-4 bg-slate-950 text-white font-black rounded-2xl uppercase text-[10px] tracking-widest">Entra</button>
               </form>
            </div>
          ) : (
            <div className="flex flex-grow overflow-hidden bg-white">
               {/* Sidebar Canali (Solo Desktop) */}
               <div className="hidden sm:block w-20 bg-slate-50/50 border-r border-slate-100 p-2 overflow-y-auto shrink-0 text-center">
                  <button onClick={() => setRecipient('ALL')} className={`w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center transition-all ${recipient === 'ALL' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-100'}`}>
                    <Users size={20} />
                  </button>
                  <div className="h-[1px] bg-slate-200 mb-4 mx-2"></div>
                  {onlineUsers.filter(u => u.username !== username).map((u, i) => (
                    <button 
                      key={i} 
                      onClick={() => setRecipient(u.username)}
                      className={`w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center font-black text-[10px] uppercase transition-all relative ${recipient === u.username ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-200/50 text-slate-500 hover:bg-slate-200'}`}
                      title={u.username}
                    >
                      {u.username.substring(0, 2)}
                      <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></div>
                    </button>
                  ))}
               </div>

               {/* Messaggi */}
               <div className="flex-grow flex flex-col min-w-0">
                  <div className="px-4 py-2 bg-slate-50/50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    Canale: <span className="text-blue-600">{recipient === 'ALL' ? 'Pubblico' : `Privato con ${recipient}`}</span>
                  </div>

                  <div ref={scrollContainerRef} className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#fcfdfe]">
                    {messages.filter(m => {
                      if (recipient === 'ALL') return m.recipient_name === 'ALL';
                      return (m.sender_name === username && m.recipient_name === recipient) || 
                             (m.sender_name === recipient && m.recipient_name === username);
                    }).map((msg, idx) => {
                      const isMe = msg.sender_name === username;
                      return (
                        <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                          {!isMe && <span className="text-[8px] font-black text-slate-400 uppercase mb-1 ml-1">{msg.sender_name}</span>}
                          <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-[12px] font-medium shadow-sm ${
                            isMe ? 'bg-[#1e293b] text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                          }`}>
                            {msg.content}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-4 bg-white border-t border-slate-100 shrink-0">
                    <form onSubmit={sendMessage} className="flex gap-2">
                      <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Scrivi..."
                        className="flex-grow px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-500 outline-none font-bold"
                      />
                      <button type="submit" className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-all">
                        <Send size={18} />
                      </button>
                    </form>
                  </div>
               </div>
            </div>
          )}
        </div>
      )}

      {/* Pulsante Flottante */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`pointer-events-auto relative w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500 hover:scale-110 active:scale-90 group ${
          isOpen ? 'bg-slate-900 rotate-90' : 'bg-blue-600 hover:bg-blue-500'
        }`}
      >
        {isOpen ? <X size={28} className="text-white" /> : (
          <>
            <MessageSquare size={28} className="text-white" />
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-4 border-white animate-bounce shadow-lg">
                {unreadCount}
              </div>
            )}
            {/* Indicatore visivo di attività */}
            {!isOpen && onlineUsers.length > 1 && (
               <div className="absolute bottom-1 right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
            )}
          </>
        )}
      </button>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
};

export default Chat;
