
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { ChatMessage, OnlineUser } from '../types';
import { Send, Users, LogOut, UserCircle } from 'lucide-react';

const Chat: React.FC = () => {
  const [username, setUsername] = useState<string>(localStorage.getItem('chat_username') || '');
  const [inputName, setInputName] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [recipient, setRecipient] = useState<string>('ALL');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initial Fetch & Real-time setup
  useEffect(() => {
    if (!username) return;

    // 1. Fetch historical messages
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100);
      
      if (data) setMessages(data);
    };
    fetchMessages();

    // 2. Subscribe to new messages
    const messageChannel = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          // Filter if private
          if (newMessage.recipient_name === 'ALL' || newMessage.recipient_name === username || newMessage.sender_name === username) {
            setMessages((prev) => [...prev, newMessage]);
          }
        }
      )
      .subscribe();

    // 3. Presence (Online Users)
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
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
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
    if (error) {
      console.error('Error sending message:', error);
      alert("Errore nell'invio del messaggio. Controlla la tabella 'messages' nel DB.");
    } else {
      setMessage('');
    }
  };

  if (!username) {
    return (
      <div className="bg-white rounded-3xl shadow-xl p-8 border border-yellow-200">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 mb-4">
            <UserCircle size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Entra in Chat</h2>
          <p className="text-gray-500 mb-6">Inserisci il tuo nome per iniziare a chattare con i colleghi.</p>
          <form onSubmit={handleLogin} className="w-full">
            <input
              type="text"
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              placeholder="Il tuo nome..."
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl mb-4 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
              required
            />
            <button className="w-full py-4 bg-yellow-500 text-white font-bold rounded-2xl hover:bg-yellow-600 transition shadow-lg">
              ENTRA ORA
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl flex flex-col h-[600px] border border-yellow-200 overflow-hidden">
      {/* Chat Header */}
      <div className="bg-yellow-500 p-4 text-white flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <Users size={18} />
          </div>
          <div>
            <p className="font-bold leading-none">{username}</p>
            <p className="text-xs opacity-80">{onlineUsers.length} online</p>
          </div>
        </div>
        <button onClick={handleLogout} className="p-2 hover:bg-white/20 rounded-full transition" title="Cambia nome">
          <LogOut size={20} />
        </button>
      </div>

      <div className="flex flex-grow overflow-hidden">
        {/* Messages area */}
        <div className="flex-grow flex flex-col p-4 bg-yellow-50/30">
          <div className="flex-grow overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex flex-col ${msg.sender_name === username ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                    {msg.sender_name} {msg.recipient_name !== 'ALL' && `→ @${msg.recipient_name}`}
                  </span>
                </div>
                <div className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm shadow-sm ${
                  msg.sender_name === username 
                    ? 'bg-yellow-500 text-white rounded-tr-none' 
                    : 'bg-white text-gray-800 rounded-tl-none border border-yellow-100'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input form */}
          <form onSubmit={sendMessage} className="mt-4 flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={recipient === 'ALL' ? 'Scrivi a tutti...' : `Messaggio a ${recipient}...`}
              className="flex-grow px-4 py-3 bg-white border border-yellow-200 rounded-xl focus:ring-2 focus:ring-yellow-400 focus:outline-none shadow-inner"
            />
            <button className="bg-yellow-500 text-white p-3 rounded-xl hover:bg-yellow-600 transition shadow-md">
              <Send size={20} />
            </button>
          </form>
        </div>

        {/* Sidebar for Online Users Selection */}
        <div className="w-32 bg-gray-50 border-l border-yellow-100 p-2 overflow-y-auto hidden sm:block">
          <p className="text-[10px] font-bold text-gray-400 mb-2 uppercase">Destinatario</p>
          <button
            onClick={() => setRecipient('ALL')}
            className={`w-full text-left px-2 py-1 rounded-lg text-xs mb-1 transition ${recipient === 'ALL' ? 'bg-yellow-500 text-white font-bold' : 'hover:bg-yellow-100 text-gray-600'}`}
          >
            Tutti
          </button>
          {onlineUsers.filter(u => u.username !== username).map((u, i) => (
            <button
              key={i}
              onClick={() => setRecipient(u.username)}
              className={`w-full text-left px-2 py-1 rounded-lg text-xs mb-1 truncate transition ${recipient === u.username ? 'bg-yellow-500 text-white font-bold' : 'hover:bg-yellow-100 text-gray-600'}`}
            >
              {u.username}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Chat;
