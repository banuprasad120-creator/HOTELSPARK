import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare,
  Search,
  PauseCircle,
  PlayCircle,
  Send,
  User,
  Bot,
  UserCheck,
  Check,
  CheckCheck,
  Phone,
  Clock,
  AlertTriangle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useProperty } from '../../context/PropertyContext';
import { useToast } from '../ui/Toast';

interface Conversation {
  id: string;
  propertyId?: string;
  property_id?: string;
  guestPhone?: string;
  guest_phone?: string;
  guestName?: string;
  guest_name?: string;
  status?: 'active' | 'paused' | 'escalated';
  ai_status?: 'active' | 'paused' | 'escalated';
  language: 'en' | 'hi' | 'te';
  lastMessage?: string;
  last_message_body?: string;
  unreadCount?: number;
  unread_count?: number;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

interface Message {
  id: string;
  conversationId?: string;
  conversation_id?: string;
  direction: 'inbound' | 'outbound';
  sender?: 'guest' | 'ai' | 'staff';
  sender_type?: 'guest' | 'ai' | 'staff';
  body: string;
  status: 'sent' | 'delivered' | 'read' | 'received';
  createdAt?: string;
  created_at?: string;
}

const LANGUAGE_LABELS: Record<string, { label: string; badge: string }> = {
  en: { label: 'English', badge: 'EN' },
  hi: { label: 'हिन्दी (Hindi)', badge: 'HI' },
  te: { label: 'తెలుగు (Telugu)', badge: 'TE' },
};

function getGuestName(c: Conversation): string {
  return c.guest_name || c.guestName || 'Hotel Guest';
}

function getGuestPhone(c: Conversation): string {
  return c.guest_phone || c.guestPhone || '';
}

function getStatus(c: Conversation): 'active' | 'paused' | 'escalated' {
  return (c.ai_status || c.status || 'active') as any;
}

function getLastMessage(c: Conversation): string {
  return c.last_message_body || c.lastMessage || '';
}

function getUpdatedAt(c: Conversation): string {
  return c.updated_at || c.updatedAt || c.created_at || c.createdAt || new Date().toISOString();
}

export default function WhatsAppLiveChat() {
  const { propertyId } = useProperty();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'escalated' | 'paused' | 'active'>('all');
  const [replyText, setReplyText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Poll conversations every 3 seconds for real-time responsiveness
  const {
    data: conversations = [],
    isLoading: convsLoading,
    refetch: refetchConvs,
  } = useQuery<Conversation[]>({
    queryKey: ['whatsapp-conversations', propertyId],
    queryFn: () =>
      api
        .get(`/v1/channels/whatsapp/conversations`, { params: { propertyId } })
        .then((r) => (r.data?.data ?? r.data ?? []) as Conversation[]),
    enabled: !!propertyId,
    refetchInterval: 3000,
  });

  // Select first conversation if none selected
  useEffect(() => {
    if (!selectedId && conversations.length > 0) {
      setSelectedId(conversations[0].id);
    }
  }, [conversations, selectedId]);

  // Poll messages for active conversation every 2 seconds
  const {
    data: messages = [],
    isLoading: messagesLoading,
  } = useQuery<Message[]>({
    queryKey: ['whatsapp-messages', selectedId],
    queryFn: () =>
      selectedId
        ? api
            .get(`/v1/channels/whatsapp/conversations/${selectedId}/messages`)
            .then((r) => (r.data?.data ?? r.data ?? []) as Message[])
        : Promise.resolve([]),
    enabled: !!selectedId,
    refetchInterval: 2000,
  });

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Pause AI mutation
  const pauseMutation = useMutation({
    mutationFn: (id: string) => api.post(`/v1/channels/whatsapp/conversations/${id}/pause`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      toast('success', 'AI receptionist paused. Human Takeover active.');
    },
    onError: (err: any) => {
      toast('error', err?.response?.data?.message || 'Failed to pause AI');
    },
  });

  // Resume AI mutation
  const resumeMutation = useMutation({
    mutationFn: (id: string) => api.post(`/v1/channels/whatsapp/conversations/${id}/resume`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      toast('success', 'AI receptionist resumed for this conversation.');
    },
    onError: (err: any) => {
      toast('error', err?.response?.data?.message || 'Failed to resume AI');
    },
  });

  // Staff reply mutation
  const replyMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) =>
      api.post(`/v1/channels/whatsapp/conversations/${id}/reply`, { body }),
    onSuccess: () => {
      setReplyText('');
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
      toast('success', 'Reply dispatched to guest WhatsApp.');
    },
    onError: (err: any) => {
      toast('error', err?.response?.data?.message || 'Failed to send reply');
    },
  });

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !replyText.trim() || replyMutation.isPending) return;
    replyMutation.mutate({ id: selectedId, body: replyText.trim() });
  };

  const activeConv = conversations.find((c) => c.id === selectedId);

  const filteredConversations = conversations.filter((c) => {
    const name = getGuestName(c).toLowerCase();
    const phone = getGuestPhone(c);
    const matchesSearch = name.includes(searchTerm.toLowerCase()) || phone.includes(searchTerm);
    if (!matchesSearch) return false;
    const status = getStatus(c);
    if (statusFilter === 'all') return true;
    return status === statusFilter;
  });

  const escalatedCount = conversations.filter((c) => getStatus(c) === 'escalated').length;

  return (
    <div className="flex h-[720px] rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* LEFT COLUMN: Conversation List */}
      <div className="w-80 sm:w-96 border-r border-gray-200 flex flex-col bg-gray-50/50">
        {/* Header & Search */}
        <div className="p-4 border-b border-gray-200 bg-white space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 font-bold text-xs">
                WA
              </span>
              <h2 className="font-bold text-telivity-navy text-sm">WhatsApp Chats</h2>
            </div>
            <button
              onClick={() => refetchConvs()}
              className="p-1 text-telivity-slate hover:text-telivity-navy rounded"
              title="Refresh"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search phone or guest name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-9 pr-3 text-xs text-telivity-navy focus:border-telivity-teal focus:bg-white focus:outline-none"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex gap-1 text-[11px]">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-full font-medium transition ${
                statusFilter === 'all'
                  ? 'bg-telivity-navy text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All ({conversations.length})
            </button>
            <button
              onClick={() => setStatusFilter('escalated')}
              className={`px-2.5 py-1 rounded-full font-medium transition ${
                statusFilter === 'escalated'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              Escalated ({escalatedCount})
            </button>
            <button
              onClick={() => setStatusFilter('paused')}
              className={`px-2.5 py-1 rounded-full font-medium transition ${
                statusFilter === 'paused'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              Paused
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-2.5 py-1 rounded-full font-medium transition ${
                statusFilter === 'active'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              Active
            </button>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {convsLoading ? (
            <div className="p-6 text-center text-xs text-gray-400">Loading conversations...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-400">No conversations found.</div>
          ) : (
            filteredConversations.map((c) => {
              const isSelected = c.id === selectedId;
              const name = getGuestName(c);
              const phone = getGuestPhone(c);
              const status = getStatus(c);
              const lastMsg = getLastMessage(c);
              const updated = getUpdatedAt(c);
              const langInfo = LANGUAGE_LABELS[c.language] || { label: c.language, badge: (c.language || 'EN').toUpperCase() };

              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`p-3.5 cursor-pointer transition flex items-start gap-3 ${
                    isSelected ? 'bg-teal-50/70 border-l-4 border-telivity-teal' : 'hover:bg-gray-100/70'
                  }`}
                >
                  <div className="relative mt-0.5">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-white font-bold text-xs">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    {status === 'paused' && (
                      <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white" title="Human Takeover" />
                    )}
                    {status === 'escalated' && (
                      <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-white animate-pulse" title="Needs Staff Attention" />
                    )}
                    {status === 'active' && (
                      <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" title="AI Active" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-xs text-telivity-navy truncate">
                        {name}
                      </span>
                      <span className="text-[10px] text-gray-400 shrink-0">
                        {new Date(updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-gray-500 truncate">
                        +{phone}
                      </span>
                      <span className="text-[9px] bg-gray-200 text-gray-700 px-1.5 py-0.2 rounded font-medium">
                        {langInfo.badge}
                      </span>
                    </div>

                    {lastMsg && (
                      <p className="text-[11px] text-gray-500 truncate mt-1">
                        {lastMsg}
                      </p>
                    )}

                    <div className="mt-1.5 flex items-center gap-1">
                      {status === 'escalated' && (
                        <span className="text-[10px] font-semibold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <AlertTriangle size={10} /> Escalated
                        </span>
                      )}
                      {status === 'paused' && (
                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <UserCheck size={10} /> Human Takeover
                        </span>
                      )}
                      {status === 'active' && (
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Bot size={10} /> AI Active
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Chat Window & Human Takeover Controls */}
      {activeConv ? (
        <div className="flex-1 flex flex-col bg-white">
          {/* Active Conversation Top Bar */}
          <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                {getGuestName(activeConv).charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-telivity-navy">
                    {getGuestName(activeConv)}
                  </h3>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                    {LANGUAGE_LABELS[activeConv.language]?.label || activeConv.language}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                  <Phone size={12} className="text-gray-400" />
                  <span>+{getGuestPhone(activeConv)}</span>
                  <span>•</span>
                  <span>Property: Hotel Spark</span>
                </div>
              </div>
            </div>

            {/* Human Takeover Action Buttons */}
            <div className="flex items-center gap-2">
              {getStatus(activeConv) === 'active' ? (
                <button
                  onClick={() => pauseMutation.mutate(activeConv.id)}
                  disabled={pauseMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
                  title="Pause AI receptionist so you can chat directly with guest"
                >
                  <PauseCircle size={15} />
                  <span>Pause AI (Take Over)</span>
                </button>
              ) : (
                <button
                  onClick={() => resumeMutation.mutate(activeConv.id)}
                  disabled={resumeMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
                  title="Release conversation back to autonomous AI receptionist"
                >
                  <PlayCircle size={15} />
                  <span>Resume AI Receptionist</span>
                </button>
              )}
            </div>
          </div>

          {/* Takeover Notice Banner */}
          {getStatus(activeConv) !== 'active' && (
            <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-600" />
                <span>
                  <strong>Human Takeover Active:</strong> AI receptionist is currently paused. Messages you type below will be sent directly to the guest's WhatsApp.
                </span>
              </div>
              <button
                onClick={() => resumeMutation.mutate(activeConv.id)}
                className="underline font-semibold hover:text-amber-900 ml-2 shrink-0"
              >
                Release to AI
              </button>
            </div>
          )}

          {/* Messages Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50/30">
            {messagesLoading && messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs text-gray-400">
                Loading messages...
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-xs text-gray-400 space-y-2">
                <Sparkles size={24} className="text-teal-400 opacity-60" />
                <p>No messages yet in this conversation.</p>
              </div>
            ) : (
              messages.map((m) => {
                const isInbound = m.direction === 'inbound';
                const senderType = m.sender_type || m.sender;
                const isAI = senderType === 'ai';
                const isStaff = senderType === 'staff';
                const createdAt = m.created_at || m.createdAt || new Date().toISOString();

                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isInbound ? 'items-start' : 'items-end'}`}
                  >
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 mb-0.5 px-1">
                      {isInbound ? (
                        <>
                          <User size={10} />
                          <span>{getGuestName(activeConv)}</span>
                        </>
                      ) : isAI ? (
                        <>
                          <Sparkles size={10} className="text-teal-600" />
                          <span className="font-semibold text-teal-700">Spark AI Receptionist</span>
                        </>
                      ) : (
                        <>
                          <UserCheck size={10} className="text-blue-600" />
                          <span className="font-semibold text-blue-700">Hotel Staff</span>
                        </>
                      )}
                      <span>•</span>
                      <span>
                        {new Date(createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div
                      className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-xs shadow-xs leading-relaxed whitespace-pre-wrap ${
                        isInbound
                          ? 'bg-white border border-gray-200 text-gray-900 rounded-tl-none'
                          : isStaff
                          ? 'bg-blue-600 text-white rounded-tr-none'
                          : 'bg-teal-700 text-white rounded-tr-none'
                      }`}
                    >
                      {m.body}
                    </div>

                    {!isInbound && (
                      <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5 px-1">
                        {m.status === 'read' ? (
                          <span className="flex items-center text-teal-600 font-medium">
                            <CheckCheck size={12} className="mr-0.5" /> Read
                          </span>
                        ) : m.status === 'delivered' ? (
                          <span className="flex items-center text-gray-500">
                            <CheckCheck size={12} className="mr-0.5" /> Delivered
                          </span>
                        ) : (
                          <span className="flex items-center text-gray-400">
                            <Check size={12} className="mr-0.5" /> Sent
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Staff Reply Bar */}
          <form
            onSubmit={handleSendReply}
            className="p-3 border-t border-gray-200 bg-white flex items-center gap-2"
          >
            <input
              type="text"
              placeholder={
                getStatus(activeConv) === 'active'
                  ? 'Type a message as staff (will automatically pause AI)...'
                  : 'Type a message to guest as hotel staff...'
              }
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-xs text-telivity-navy placeholder:text-gray-400 focus:border-telivity-teal focus:bg-white focus:outline-none"
            />
            <button
              type="submit"
              disabled={!replyText.trim() || replyMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-telivity-teal hover:bg-telivity-light-teal text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
            >
              <Send size={14} />
              <span>Send</span>
            </button>
          </form>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400 bg-gray-50/30">
          <MessageSquare size={36} className="text-gray-300 mb-2" />
          <h3 className="text-sm font-semibold text-telivity-navy">No conversation selected</h3>
          <p className="text-xs text-gray-500 max-w-sm mt-1">
            Select a guest conversation on the left to review the AI dialogue or take over the chat.
          </p>
        </div>
      )}
    </div>
  );
}
