import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { generateId, type Message } from '../db/schema';
import { BriefcaseBusiness, CheckCheck, MessageCircle, Search, Send, Shield, UserRound, Wifi } from 'lucide-react';

interface MessagesPageProps {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  showToast: (msg: string) => void;
}

function conversationIdFor(a: string, b: string) {
  return [a, b].sort().join('_');
}

export default function MessagesPage({ messages, setMessages, showToast }: MessagesPageProps) {
  const { currentUser, users, profiles } = useAuth();
  const [activeReceiverId, setActiveReceiverId] = useState('');
  const [newText, setNewText] = useState('');
  const [search, setSearch] = useState('');

  const possibleRecipients = useMemo(() => {
    if (!currentUser) return [];
    return users
      .filter(user => user._id !== currentUser._id)
      .filter(user => {
        if (currentUser.role === 'fundi') return user.role === 'employer';
        if (currentUser.role === 'employer') return user.role === 'fundi';
        return true;
      })
      .filter(user => !search || user.name.toLowerCase().includes(search.toLowerCase()) || user.role.includes(search.toLowerCase()));
  }, [currentUser, search, users]);

  const conversations = useMemo(() => {
    if (!currentUser) return [];
    const convMap = new Map<string, { id: string; receiverId: string; otherUser: string; lastMsg: string; lastTime: number; unread: number }>();

    messages.forEach(message => {
      if (message.senderId !== currentUser._id && message.receiverId !== currentUser._id) return;
      const receiverId = message.senderId === currentUser._id ? message.receiverId : message.senderId;
      const otherUser = users.find(user => user._id === receiverId);
      const existing = convMap.get(message.conversationId);
      const unread = (existing?.unread || 0) + (!message.read && message.receiverId === currentUser._id ? 1 : 0);
      if (!existing || message.createdAt > existing.lastTime) {
        convMap.set(message.conversationId, {
          id: message.conversationId,
          receiverId,
          otherUser: otherUser?.name || receiverId,
          lastMsg: message.content.slice(0, 70),
          lastTime: message.createdAt,
          unread,
        });
      }
    });

    return Array.from(convMap.values()).sort((a, b) => b.lastTime - a.lastTime);
  }, [messages, currentUser, users]);

  useEffect(() => {
    if (!activeReceiverId && conversations.length > 0) {
      setActiveReceiverId(conversations[0].receiverId);
    }
  }, [activeReceiverId, conversations]);

  if (!currentUser) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
          <MessageCircle className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-xs text-slate-500">Please sign in to access messaging.</p>
        </div>
      </div>
    );
  }

  const activeReceiver = users.find(user => user._id === activeReceiverId);
  const activeConversationId = activeReceiverId ? conversationIdFor(currentUser._id, activeReceiverId) : '';
  const threadMessages = messages
    .filter(message => message.conversationId === activeConversationId)
    .sort((a, b) => a.createdAt - b.createdAt);

  const startConversation = (receiverId: string) => {
    setActiveReceiverId(receiverId);
    setNewText('');
  };

  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    if (!activeReceiverId) {
      showToast('Select someone to message first.');
      return;
    }

    const newMsg: Message = {
      _id: generateId('msg'),
      senderId: currentUser._id,
      receiverId: activeReceiverId,
      content: newText.trim(),
      read: false,
      status: 'sent',
      conversationId: activeConversationId,
      createdAt: Date.now(),
    };

    setMessages(prev => [...prev, newMsg]);
    setNewText('');
    showToast('Message sent.');
  };

  const RoleIcon = currentUser.role === 'employer' ? UserRound : BriefcaseBusiness;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5">
        <span className="inline-flex items-center gap-2 rounded-md bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#005fec]">
          <Wifi className="h-3.5 w-3.5" />
          Live messaging
        </span>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Messages</h1>
        <p className="mt-1 text-sm text-slate-500">Start clean conversations with the people relevant to your role.</p>
      </div>

      <div className="grid min-h-[620px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm lg:grid-cols-[320px_1fr_280px]">
        <aside className="border-b border-slate-200 bg-slate-50 p-4 lg:border-b-0 lg:border-r">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs font-medium outline-none focus:border-[#005fec]"
            />
          </div>

          <div className="mt-4">
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Conversations</p>
            <div className="space-y-2">
              {conversations.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 bg-white p-3 text-[11px] leading-5 text-slate-500">
                  No messages yet. Pick a person from the directory to start.
                </p>
              ) : conversations.map(conversation => (
                <button
                  key={conversation.id}
                  onClick={() => startConversation(conversation.receiverId)}
                  className={`w-full rounded-lg p-3 text-left transition duration-200 hover:scale-[1.01] active:scale-[0.99] ${
                    activeReceiverId === conversation.receiverId ? 'bg-[#005fec] text-white shadow-md' : 'bg-white text-slate-800 ring-1 ring-slate-200 hover:bg-blue-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-black">{conversation.otherUser}</p>
                    {conversation.unread > 0 && <span className="rounded-full bg-amber-300 px-1.5 py-0.5 text-[10px] font-black text-slate-950">{conversation.unread}</span>}
                  </div>
                  <p className={`mt-1 truncate text-[11px] ${activeReceiverId === conversation.receiverId ? 'text-blue-100' : 'text-slate-400'}`}>
                    {conversation.lastMsg}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main className="flex min-h-[520px] flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-950 text-white">
                <RoleIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-950">{activeReceiver?.name || 'Select a recipient'}</p>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{activeReceiver?.role || 'Directory'}</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">
              <Wifi className="h-3 w-3" />
              Ready
            </span>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
            {!activeReceiverId ? (
              <div className="flex h-full items-center justify-center text-center">
                <div>
                  <MessageCircle className="mx-auto h-12 w-12 text-slate-300" />
                  <p className="mt-3 text-sm font-black text-slate-800">Choose a person to start messaging</p>
                  <p className="mt-1 text-xs text-slate-500">Your directory is filtered by your current role.</p>
                </div>
              </div>
            ) : threadMessages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-center">
                <div>
                  <Send className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-3 text-sm font-black text-slate-800">No messages with {activeReceiver?.name} yet</p>
                  <p className="mt-1 text-xs text-slate-500">Write the first message below.</p>
                </div>
              </div>
            ) : (
              threadMessages.map(message => {
                const isMe = message.senderId === currentUser._id;
                return (
                  <div key={message._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-xs shadow-sm ${
                      isMe ? 'rounded-br-md bg-[#005fec] text-white' : 'rounded-bl-md bg-white text-slate-800 ring-1 ring-slate-200'
                    }`}>
                      <p className="leading-5">{message.content}</p>
                      <p className={`mt-1 flex items-center gap-1 text-[9px] ${isMe ? 'text-blue-100' : 'text-slate-400'}`}>
                        {new Date(message.createdAt).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                        {isMe && <CheckCheck className="h-3 w-3" />}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={handleSend} className="border-t border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
              <input
                type="text"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder={activeReceiver ? `Message ${activeReceiver.name}...` : 'Select a recipient first...'}
                className="flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-slate-400"
              />
              <button disabled={!activeReceiverId || !newText.trim()} type="submit" className="flex items-center gap-2 rounded-lg bg-[#005fec] px-4 py-2 text-xs font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                Send
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>
        </main>

        <aside className="border-t border-slate-200 bg-white p-4 lg:border-l lg:border-t-0">
          <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
            {currentUser.role === 'fundi' ? 'Employers' : currentUser.role === 'employer' ? 'Fundis' : 'Directory'}
          </p>
          <div className="space-y-2">
            {possibleRecipients.map(user => {
              const profile = profiles.find(item => item.userId === user._id);
              const Icon = user.role === 'fundi' ? UserRound : user.role === 'employer' ? BriefcaseBusiness : Shield;
              return (
                <button
                  key={user._id}
                  onClick={() => startConversation(user._id)}
                  className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition duration-200 hover:scale-[1.01] active:scale-[0.99] ${
                    activeReceiverId === user._id ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-800 hover:bg-blue-50'
                  }`}
                >
                  {profile?.avatarUrl ? (
                    <img src={profile.avatarUrl} alt={user.name} className="h-10 w-10 rounded-lg object-cover" />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-[#005fec] ring-1 ring-slate-200">
                      <Icon className="h-4 w-4" />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-black">{user.name}</span>
                    <span className="block truncate text-[10px] font-bold uppercase tracking-widest opacity-60">{user.role}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}
