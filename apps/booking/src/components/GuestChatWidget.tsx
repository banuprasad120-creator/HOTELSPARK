import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'guest';
  text: string;
  timestamp: Date;
}

// Inline pure SVG icons (zero external dependencies)
function SparklesIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
      <path d="M19 3v4" /><path d="M21 5h-4" />
    </svg>
  );
}

function CloseIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function SendIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function UserIcon({ className = 'h-3 w-3' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function GuestChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: 'welcome-1',
        sender: 'ai',
        text: 'Namaste! Welcome to Hotel Spark, Hyderabad 🏨✨\n\nI am Spark, your 24/7 AI Receptionist. I can assist you in English, हिन्दी (Hindi), or తెలుగు (Telugu)!\n\nAsk me about room availability, prices in ₹, hotel amenities in Banjara Hills, or booking a stay.',
        timestamp: new Date(),
      },
    ];
  });
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [guestPhone] = useState(() => {
    try {
      const saved = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('spark_guest_phone') : null;
      if (saved) return saved;
      const gen = '9198' + Math.floor(10000000 + Math.random() * 90000000);
      sessionStorage?.setItem('spark_guest_phone', gen);
      return gen;
    } catch {
      return '9198' + Math.floor(10000000 + Math.random() * 90000000);
    }
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: `guest-${Date.now()}`,
      sender: 'guest',
      text: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await axios.post('/api/v1/channels/whatsapp/chat', {
        message: trimmed,
        guestPhone,
        guestName: 'Website Guest',
      });

      const replyText = response.data?.replyText || response.data?.reply || response.data?.message || 'Thank you for your message. How else may I assist you?';
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: replyText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'ai',
        text: 'Our AI concierge is connecting to the front desk. Please try again or call +91 98765 43210 for immediate assistance.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputText);
  };

  const quickPrompts = [
    'Check suite availability',
    'What are your room rates in ₹?',
    'Where is the hotel located?',
    'कमरे की कीमत क्या है?',
    'రూములు ఖాళీగా ఉన్నాయా?',
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end print:hidden">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2.5 rounded-full bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-3 text-white shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl focus:outline-none"
          aria-label="Open AI Receptionist Chat"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
            <SparklesIcon className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="text-left">
            <div className="text-xs font-bold leading-tight">Hotel Spark AI</div>
            <div className="text-[10px] text-teal-100 leading-tight">24/7 Receptionist</div>
          </div>
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-300 animate-pulse ml-0.5" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="flex h-[540px] w-[370px] sm:w-[400px] flex-col rounded-3xl border border-white/40 bg-white/95 shadow-2xl backdrop-blur-2xl overflow-hidden transition-all duration-300">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-teal-700 to-emerald-800 px-4 py-3.5 text-white">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 border border-white/20">
                <SparklesIcon className="h-4 w-4 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm leading-tight">Hotel Spark Concierge</h3>
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
                </div>
                <p className="text-[10px] text-teal-100 leading-tight">
                  EN • हिन्दी • తెలుగు | Banjara Hills, Hyderabad
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1 text-teal-100 hover:bg-white/10 hover:text-white transition"
              aria-label="Close Chat"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
            {messages.map((m) => {
              const isAi = m.sender === 'ai';
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isAi ? 'items-start' : 'items-end'}`}
                >
                  <div className="flex items-center gap-1 text-[10px] text-gray-400 mb-0.5 px-1">
                    {isAi ? (
                      <>
                        <SparklesIcon className="h-2.5 w-2.5 text-teal-600" />
                        <span className="font-semibold text-teal-700">Spark AI</span>
                      </>
                    ) : (
                      <>
                        <UserIcon className="h-2.5 w-2.5" />
                        <span>You</span>
                      </>
                    )}
                    <span>•</span>
                    <span>
                      {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-xs leading-relaxed whitespace-pre-wrap ${
                      isAi
                        ? 'bg-white border border-gray-200/80 text-gray-900 rounded-tl-xs'
                        : 'bg-teal-600 text-white rounded-tr-xs'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 rounded-2xl rounded-tl-xs border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-gray-500 w-fit">
                <SparklesIcon className="h-3 w-3 animate-spin text-teal-600" />
                <span>Spark is checking live PMS rates...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="px-3 py-2 border-t border-gray-100 bg-white overflow-x-auto flex gap-1.5 scrollbar-none">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                disabled={isLoading}
                className="shrink-0 rounded-full border border-teal-200 bg-teal-50/70 px-2.5 py-1 text-[11px] font-medium text-teal-800 hover:bg-teal-100 transition disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 border-t border-gray-200 bg-white p-2.5"
          >
            <input
              type="text"
              placeholder="Ask about rooms, rates in ₹, or say Namaste..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isLoading}
              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:border-teal-600 focus:bg-white focus:outline-none"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-600 text-white transition hover:bg-teal-700 disabled:opacity-40"
              aria-label="Send"
            >
              <SendIcon className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
