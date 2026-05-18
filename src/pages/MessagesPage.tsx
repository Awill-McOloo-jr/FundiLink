import { useEffect, useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { useAuth } from '../auth/AuthContext';
import { generateId, type Message, type Profile, type User } from '../db/schema';
import VerifiedEmployerBadge from '../components/VerifiedEmployerBadge';
import {
  MessageCircle,
  Paperclip,
  Plus,
  Search,
  Send,
  X,
} from 'lucide-react';

interface MessagesPageProps {
  messages: Message[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  showToast: (msg: string) => void;
}

interface ConversationSummary {
  id: string;
  receiverId: string;
  otherUser: string;
  lastMsg: string;
  lastTime: number;
  unread: number;
}

function conversationIdFor(a: string, b: string) {
  return [a, b].sort().join('_');
}

function initials(name: string) {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
}

function avatarFor(user?: User, profile?: Profile) {
  return profile?.avatarUrl || user?.avatarUrl || '';
}

function statusLabel(message: Message) {
  if (message.status === 'read' || message.read) return `Read ${formatTime(message.createdAt)}`;
  return 'Delivered';
}

export default function MessagesPage({ messages, setMessages, showToast }: MessagesPageProps) {
  const { currentUser, users, profiles } = useAuth();
  const [activeReceiverId, setActiveReceiverId] = useState('');
  const [newText, setNewText] = useState('');
  const [search, setSearch] = useState('');
  const [recipientSearch, setRecipientSearch] = useState('');
  const [showNewMessage, setShowNewMessage] = useState(false);

  const conversations = useMemo<ConversationSummary[]>(() => {
    if (!currentUser) return [];
    const convMap = new Map<string, ConversationSummary>();

    messages.forEach(message => {
      if (message.senderId !== currentUser._id && message.receiverId !== currentUser._id) return;
      const receiverId = message.senderId === currentUser._id ? message.receiverId : message.senderId;
      const otherUser = users.find(user => user._id === receiverId);
      const existing = convMap.get(message.conversationId);
      const unreadIncrement = !message.read && message.receiverId === currentUser._id ? 1 : 0;

      if (!existing) {
        convMap.set(message.conversationId, {
          id: message.conversationId,
          receiverId,
          otherUser: otherUser?.name || receiverId,
          lastMsg: message.content.slice(0, 80),
          lastTime: message.createdAt,
          unread: unreadIncrement,
        });
        return;
      }

      existing.unread += unreadIncrement;
      if (message.createdAt > existing.lastTime) {
        existing.lastMsg = message.content.slice(0, 80);
        existing.lastTime = message.createdAt;
      }
    });

    return Array.from(convMap.values()).sort((a, b) => b.lastTime - a.lastTime);
  }, [currentUser, messages, users]);

  const possibleRecipients = useMemo(() => {
    if (!currentUser) return [];
    return users.filter(user => user._id !== currentUser._id && !user.isSuspended);
  }, [currentUser, users]);

  const sidebarPeople = useMemo(() => {
    const query = search.trim().toLowerCase();
    return conversations.filter(entry => {
      if (!query) return true;
      const user = users.find(item => item._id === entry.receiverId);
      const profile = profiles.find(item => item.userId === entry.receiverId);
      return entry.otherUser.toLowerCase().includes(query)
        || entry.lastMsg.toLowerCase().includes(query)
        || user?.role.includes(query)
        || profile?.county.toLowerCase().includes(query)
        || profile?.skills.join(' ').toLowerCase().includes(query);
    });
  }, [conversations, profiles, search, users]);

  const recipientResults = useMemo(() => {
    const query = recipientSearch.trim().toLowerCase();
    return possibleRecipients.filter(user => {
      const profile = profiles.find(item => item.userId === user._id);
      return !query
        || user.name.toLowerCase().includes(query)
        || user.phone.includes(query)
        || profile?.county.toLowerCase().includes(query)
        || profile?.skills.join(' ').toLowerCase().includes(query);
    });
  }, [possibleRecipients, profiles, recipientSearch]);

  useEffect(() => {
    if (!activeReceiverId && conversations.length > 0) {
      setActiveReceiverId(conversations[0].receiverId);
    }
  }, [activeReceiverId, conversations]);

  useEffect(() => {
    if (!currentUser || !activeReceiverId) return;
    const activeConversationId = conversationIdFor(currentUser._id, activeReceiverId);
    setMessages(prev => {
      let changed = false;
      const next = prev.map(message => {
        if (
          message.conversationId === activeConversationId
          && message.receiverId === currentUser._id
          && (!message.read || message.status !== 'read')
        ) {
          changed = true;
          return { ...message, read: true, status: 'read' as const };
        }
        return message;
      });
      return changed ? next : prev;
    });
  }, [activeReceiverId, currentUser, setMessages]);

  if (!currentUser) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <div className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
          <MessageCircle className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-black text-slate-900">Sign in to access messages.</p>
        </div>
      </div>
    );
  }

  const activeReceiver = users.find(user => user._id === activeReceiverId);
  const activeProfile = profiles.find(profile => profile.userId === activeReceiverId);
  const activeConversationId = activeReceiverId ? conversationIdFor(currentUser._id, activeReceiverId) : '';
  const threadMessages = messages
    .filter(message => message.conversationId === activeConversationId)
    .sort((a, b) => a.createdAt - b.createdAt);
  const activeAvatar = avatarFor(activeReceiver, activeProfile);
  const latestOutgoingId = [...threadMessages].reverse().find(message => message.senderId === currentUser._id)?._id;

  const startConversation = (receiverId: string) => {
    setActiveReceiverId(receiverId);
    setNewText('');
    setRecipientSearch('');
    setShowNewMessage(false);
  };

  const handleSend = (event: FormEvent) => {
    event.preventDefault();
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
      status: 'delivered',
      conversationId: activeConversationId,
      createdAt: Date.now(),
    };

    setMessages(prev => [...prev, newMsg]);
    setNewText('');
    showToast('Message sent.');
  };

  return (
    <div className="mx-auto max-w-7xl px-3 py-3 sm:px-6 sm:py-4 lg:px-8">
      <div className="relative grid h-[calc(100vh-96px)] min-h-[520px] overflow-hidden rounded-[34px] border border-slate-200 bg-white shadow-2xl shadow-slate-200/80 lg:grid-cols-[360px_1fr]">
        <aside className="flex min-h-0 flex-col border-b border-slate-200 bg-[#f5f5f7] lg:border-b-0 lg:border-r">
          <div className="px-5 pb-3 pt-5">
            <div className="flex items-center justify-between gap-4">
              <h1 className="text-3xl font-black tracking-tight text-slate-950">Messages</h1>
              <button
                type="button"
                onClick={() => setShowNewMessage(true)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#007aff] shadow-sm ring-1 ring-slate-200 transition hover:scale-105 hover:bg-blue-50 active:scale-95"
                aria-label="New message"
                title="New message"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="relative mt-4">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search"
                className="w-full rounded-full border border-transparent bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 outline-none shadow-sm ring-1 ring-slate-200 transition focus:ring-2 focus:ring-[#007aff]/30"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-2.5 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 active:scale-95"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-4">
            {sidebarPeople.length === 0 ? (
              <div className="mx-2 rounded-3xl border border-dashed border-slate-300 bg-white p-5 text-sm leading-6 text-slate-500">
                {search ? 'No conversations match this search.' : 'No conversations yet.'}
                <button
                  type="button"
                  onClick={() => setShowNewMessage(true)}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#007aff] px-4 py-2.5 text-xs font-black text-white transition hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New message
                </button>
              </div>
            ) : sidebarPeople.map(conversation => {
              const user = users.find(item => item._id === conversation.receiverId);
              const profile = profiles.find(item => item.userId === conversation.receiverId);
              const active = activeReceiverId === conversation.receiverId;
              const avatarUrl = avatarFor(user, profile);

              return (
                <button
                  type="button"
                  key={conversation.id}
                  onClick={() => startConversation(conversation.receiverId)}
                  className={`group mb-1 flex w-full items-center gap-3 rounded-[24px] px-3 py-3 text-left transition duration-200 hover:bg-white hover:shadow-sm active:scale-[0.99] ${
                    active ? 'bg-white shadow-sm ring-1 ring-slate-200' : 'text-slate-900'
                  }`}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={user?.name || conversation.otherUser} className="h-12 w-12 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                      active ? 'bg-[#007aff] text-white' : 'bg-white text-[#007aff] ring-1 ring-slate-200'
                    }`}>
                      {initials(user?.name || conversation.otherUser)}
                    </span>
                  )}

                  <span className="min-w-0 flex-1 border-b border-slate-200/70 pb-2 group-last:border-b-0">
                    <span className="flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate text-[15px] font-black text-slate-950">{user?.name || conversation.otherUser}</span>
                        <VerifiedEmployerBadge user={user} />
                      </span>
                      <span className="shrink-0 text-[11px] font-bold text-slate-400">{formatTime(conversation.lastTime)}</span>
                    </span>
                    <span className="mt-0.5 flex min-w-0 items-center justify-between gap-3">
                      <span className="truncate text-sm text-slate-500">{conversation.lastMsg}</span>
                      {conversation.unread > 0 && (
                        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#007aff] px-1.5 text-[11px] font-black text-white">
                          {conversation.unread}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="flex min-h-0 flex-col bg-white">
          {activeReceiver ? (
            <>
              <header className="flex h-[76px] items-center justify-between gap-4 border-b border-slate-200 bg-white/90 px-5 backdrop-blur">
                <div className="flex min-w-0 items-center gap-3">
                  {activeAvatar ? (
                    <img src={activeAvatar} alt={activeReceiver.name} className="h-11 w-11 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#007aff] text-sm font-black text-white">
                      {initials(activeReceiver.name)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate text-[15px] font-black text-slate-950">{activeReceiver.name}</span>
                      <VerifiedEmployerBadge user={activeReceiver} />
                    </p>
                  </div>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto bg-[#fbfbfd] px-4 py-6 sm:px-8">
                {threadMessages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-center">
                    <div className="max-w-sm">
                      {activeAvatar ? (
                        <img src={activeAvatar} alt={activeReceiver.name} className="mx-auto h-24 w-24 rounded-full object-cover shadow-sm" />
                      ) : (
                        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-slate-950 text-2xl font-black text-white shadow-sm">
                          {initials(activeReceiver.name)}
                        </div>
                      )}
                      <p className="mt-4 flex items-center justify-center gap-1.5 text-xl font-black text-slate-950">
                        {activeReceiver.name}
                        <VerifiedEmployerBadge user={activeReceiver} className="h-5 w-5" />
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-center">
                      <span className="rounded-full bg-slate-200/70 px-3 py-1 text-[11px] font-bold text-slate-500">Today</span>
                    </div>

                    {threadMessages.map(message => {
                      const isMe = message.senderId === currentUser._id;
                      return (
                        <div key={message._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`flex max-w-[min(78%,620px)] flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className={`rounded-[22px] px-4 py-2.5 text-[15px] shadow-sm ${
                              isMe
                                ? 'rounded-br-md bg-[#007aff] text-white'
                                : 'rounded-bl-md bg-[#e9e9eb] text-slate-950'
                            }`}>
                              <p className="leading-6">{message.content}</p>
                            </div>
                            {isMe && message._id === latestOutgoingId ? (
                              <p className="mt-1 pr-1 text-right text-[11px] font-semibold text-slate-400">
                                {statusLabel(message)}
                              </p>
                            ) : !isMe ? (
                              <p className="mt-1 pl-1 text-[11px] font-medium text-slate-400">{formatTime(message.createdAt)}</p>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <form onSubmit={handleSend} className="border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f5f5f7] text-[#007aff] transition hover:scale-105 active:scale-95"
                    aria-label="Attach file"
                    onClick={() => showToast('Attachment uploads can be connected to CVs, photos, and job files.')}
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
                    <input
                      type="text"
                      value={newText}
                      onChange={(event) => setNewText(event.target.value)}
                      placeholder={`Message ${activeReceiver.name}`}
                      className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm outline-none placeholder:text-slate-400"
                    />
                    <button
                      disabled={!newText.trim()}
                      type="submit"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#007aff] text-white transition hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:hover:scale-100"
                      aria-label="Send message"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center bg-[#fbfbfd] px-6 text-center">
              <div className="max-w-sm">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white text-slate-300 shadow-sm ring-1 ring-slate-200">
                  <MessageCircle className="h-10 w-10" />
                </div>
                <p className="mt-5 text-xl font-black text-slate-950">Choose a conversation</p>
                <p className="mt-2 text-sm leading-6 text-slate-500">Pick a contact from the left to start messaging.</p>
              </div>
            </div>
          )}
        </main>

        {showNewMessage && (
          <div className="absolute inset-0 z-30 bg-slate-950/25 p-3 backdrop-blur-sm sm:p-5">
            <section className="flex h-full max-w-md flex-col overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-2xl">
              <div className="border-b border-slate-200 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-black text-slate-950">New message</h2>
                  <button
                    type="button"
                    onClick={() => setShowNewMessage(false)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800 active:scale-95"
                    aria-label="Close new message"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="relative mt-4">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    value={recipientSearch}
                    onChange={(event) => setRecipientSearch(event.target.value)}
                    placeholder="Search people"
                    className="w-full rounded-full border border-transparent bg-slate-100 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:bg-white focus:ring-2 focus:ring-[#007aff]/30"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3">
                {recipientResults.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-500">
                    No users match this search.
                  </div>
                ) : recipientResults.map(user => {
                  const profile = profiles.find(item => item.userId === user._id);
                  const avatarUrl = avatarFor(user, profile);
                  const detail = profile
                    ? [profile.county, profile.skills.slice(0, 2).join(', ')].filter(Boolean).join(' / ')
                    : user.phone;
                  return (
                    <button
                      type="button"
                      key={user._id}
                      onClick={() => startConversation(user._id)}
                      className="mb-1 flex w-full items-center gap-3 rounded-[24px] px-3 py-3 text-left transition hover:bg-slate-50 active:scale-[0.99]"
                    >
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={user.name} className="h-12 w-12 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#007aff] text-sm font-black text-white">
                          {initials(user.name)}
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className="block truncate text-sm font-black text-slate-950">{user.name}</span>
                          <VerifiedEmployerBadge user={user} />
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-slate-500">{detail}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
