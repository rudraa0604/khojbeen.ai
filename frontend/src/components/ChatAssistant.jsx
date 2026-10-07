import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Bot, 
  X, 
  Send, 
  Sparkles, 
  User, 
  RefreshCw, 
  Mic, 
  MicOff, 
  RotateCcw, 
  ChevronDown,
  HelpCircle,
  Users
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import SearchMascot from './SearchMascot';

const CHAT_LANGUAGES = [
  { code: 'auto', name: 'Auto-detect' },
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिंदी (Hindi)' },
  { code: 'hinglish', name: 'Hinglish' },
  { code: 'bn', name: 'বাংলা (Bengali)' },
  { code: 'ta', name: 'தமிழ் (Tamil)' },
  { code: 'te', name: 'తెలుగు (Telugu)' },
  { code: 'mr', name: 'मराठी (Marathi)' },
  { code: 'gu', name: 'ગુજરાતી (Gujarati)' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ (Punjabi)' },
  { code: 'ur', name: 'اردو (Urdu)' },
];

export default function ChatAssistant() {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [chatLang, setChatLang] = useState('auto');
  const [isListening, setIsListening] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const messagesEndRef = useRef(null);

  // Draggable position state
  const [position, setPosition] = useState(() => {
    try {
      const saved = localStorage.getItem('chat_btn_position');
      if (saved) return JSON.parse(saved);
    } catch {}
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 640;
    return { 
      x: (typeof window !== 'undefined' ? window.innerWidth : 1200) - (isDesktop ? 132 : 100), 
      y: (typeof window !== 'undefined' ? window.innerHeight : 800) - (isDesktop ? 136 : 104) 
    };
  });

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ startX: 0, startY: 0, initialPosX: 0, initialPosY: 0, hasMoved: false });
  const buttonRef = useRef(null);

  // Initialize greeting on mount or language change
  useEffect(() => {
    const greetings = {
      en: "Hi there! I'm the Khojbeen AI Assistant. Ask me anything about reporting lost items, generating QR Smart Tags, Student Dashboard, or Faculty Coordinators!",
      hi: "नमस्ते! मैं Khojbeen AI सहायक हूँ। मुझसे खोया सामान दर्ज करने, स्मार्ट QR टैग, स्टूडेंट डैशबोर्ड या समन्वयकों के बारे में कुछ भी पूछें!",
      hinglish: "Hello! Main Khojbeen AI Assistant hoon. Lost report, QR tag, student login ya matching ke baare me kuch bhi poochiye!",
    };
    const initialText = greetings[i18n.language] || greetings.en;

    setSuggestions([
      "How does the Student Dashboard work?",
      "How do I report a lost item & get QR tag?",
      "What happens when someone scans my QR?",
      "How does AI matching work?",
      "Who are Faculty Coordinators?"
    ]);

    setMessages((prev) => {
      if (prev.length === 0) {
        return [{
          role: 'assistant',
          content: initialText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }];
      }
      return prev;
    });
  }, [i18n.language]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isLoading]);

  // Window resize handler to keep button within bounds
  useEffect(() => {
    const handleResize = () => {
      const isDesktop = window.innerWidth >= 640;
      const mascotW = isDesktop ? 112 : 84;
      const mascotH = isDesktop ? 112 : 84;
      setPosition((prev) => {
        const maxX = window.innerWidth - mascotW - 12;
        const maxY = window.innerHeight - mascotH - 12;
        const newX = Math.min(Math.max(12, prev.x), Math.max(12, maxX));
        const newY = Math.min(Math.max(12, prev.y), Math.max(12, maxY));
        return { x: newX, y: newY };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Pointer drag event handlers for mouse and touch
  const handlePointerDown = (e) => {
    isDraggingRef.current = true;
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPosX: position.x,
      initialPosY: position.y,
      hasMoved: false,
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;

    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
      dragStartRef.current.hasMoved = true;
    }

    const isDesktop = window.innerWidth >= 640;
    const mascotW = isDesktop ? 112 : 84;
    const mascotH = isDesktop ? 112 : 84;

    const newX = Math.min(Math.max(12, dragStartRef.current.initialPosX + dx), window.innerWidth - mascotW - 12);
    const newY = Math.min(Math.max(12, dragStartRef.current.initialPosY + dy), window.innerHeight - mascotH - 12);

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);

    // If it was just a tap (movement < 6px), toggle chat window
    if (!dragStartRef.current.hasMoved) {
      setIsOpen((prev) => !prev);
      return;
    }

    // Snap gently to nearest edge (left or right)
    const isDesktop = window.innerWidth >= 640;
    const mascotW = isDesktop ? 112 : 84;
    setPosition((prev) => {
      const snapX = prev.x < window.innerWidth / 2 ? 16 : window.innerWidth - mascotW - 16;
      const finalPos = { x: snapX, y: prev.y };
      try {
        localStorage.setItem('chat_btn_position', JSON.stringify(finalPos));
      } catch {}
      return finalPos;
    });
  };

  const handleResetPosition = () => {
    const isDesktop = window.innerWidth >= 640;
    const defaultPos = { 
      x: window.innerWidth - (isDesktop ? 132 : 100), 
      y: window.innerHeight - (isDesktop ? 136 : 104) 
    };
    setPosition(defaultPos);
    try {
      localStorage.setItem('chat_btn_position', JSON.stringify(defaultPos));
    } catch {}
    setIsMenuOpen(false);
  };

  // Voice typing using Web Speech API
  const handleVoiceTyping = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice typing is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    const langMap = {
      en: 'en-IN',
      hi: 'hi-IN',
      bn: 'bn-IN',
      ta: 'ta-IN',
      te: 'te-IN',
      mr: 'mr-IN',
      gu: 'gu-IN',
      pa: 'pa-IN',
      ur: 'ur-IN',
    };
    recognition.lang = langMap[chatLang] || 'en-IN';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInputMessage((prev) => (prev ? `${prev} ${transcript}` : transcript));
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isLoading) return;

    setInputMessage('');

    const userMsg = {
      role: 'user',
      content: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await api.sendChatMessage({
        message: query,
        language: chatLang === 'auto' ? (i18n.language || 'en') : chatLang,
        history: messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
      });

      const botMsg = {
        role: 'assistant',
        content: response.reply,
        topic: response.matched_topic,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
      if (response.suggestions && response.suggestions.length > 0) {
        setSuggestions(response.suggestions);
      }
    } catch (err) {
      console.error('Chat error:', err);
      const errorMsg = {
        role: 'assistant',
        content: t('chat.fallback', "I'm having trouble connecting right now. Please browse our FAQ page or visit your Student Dashboard!"),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: "Chat cleared! How can I help you with campus lost & found today?",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    setIsMenuOpen(false);
  };

  const formatContent = (content) => {
    return content.split('\n').map((line, idx) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={idx} className={idx > 0 ? 'mt-1.5' : ''}>
          {parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={i} className="font-extrabold text-slate-950 dark:text-white">{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
        </p>
      );
    });
  };

  const isLeftSide = position.x < window.innerWidth / 2;
  const isTopSide = position.y < 350;

  return (
    <>
      {/* Draggable Search Mascot Launcher */}
      <div
        ref={buttonRef}
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          touchAction: 'none',
          zIndex: 40,
        }}
        onPointerDown={handlePointerDown}
      >
        <SearchMascot
          isOpen={isOpen}
          isDragging={isDragging}
          onClick={() => {
            if (!dragStartRef.current?.hasMoved) {
              setIsOpen((prev) => !prev);
            }
          }}
          isLeftSide={isLeftSide}
          isTopSide={isTopSide}
        />
      </div>

      {/* Floating Chat Window Modal */}
      {isOpen && (
        <div
          className={`fixed z-50 w-[94vw] sm:w-[410px] h-[580px] max-h-[85vh] bg-white dark:bg-[#0F1B2D] rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${
            'bottom-3 left-3 right-3 sm:bottom-auto sm:left-auto sm:right-auto'
          }`}
          style={{
            ...(typeof window !== 'undefined' && window.innerWidth >= 640
              ? {
                  left: isLeftSide ? Math.max(16, position.x) : undefined,
                  right: !isLeftSide ? Math.max(16, window.innerWidth - position.x - 116) : undefined,
                  top: isTopSide ? Math.min(position.y + 120, window.innerHeight - 600) : undefined,
                  bottom: !isTopSide ? Math.max(16, window.innerHeight - position.y + 12) : undefined,
                }
              : {}),
          }}
          role="dialog"
          aria-label="Khojbeen AI Multilingual Chat Assistant"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white p-3.5 flex items-center justify-between shadow-md shrink-0 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center border border-white/30 shadow-xs overflow-hidden">
                <picture>
                  <source srcSet="/search-mascot.webp" type="image/webp" />
                  <img src="/search-mascot.png" alt="Mascot" className="w-6 h-6 object-contain" />
                </picture>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-sm leading-tight text-white tracking-tight">
                    khojbeen<span className="text-amber-300">.ai</span> Assistant
                  </h3>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-emerald-100 font-semibold">Online & Ready</span>
                </div>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-1.5 relative">
              {/* Language Selector */}
              <select
                value={chatLang}
                onChange={(e) => setChatLang(e.target.value)}
                className="bg-black/30 hover:bg-black/40 text-white text-[11px] font-bold py-1 px-2 rounded-lg border border-white/25 focus:outline-none cursor-pointer"
                title="Force Chat Language"
              >
                {CHAT_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code} className="text-slate-900 bg-white">
                    {l.name}
                  </option>
                ))}
              </select>

              {/* Reset Position / Clear menu */}
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-1.5 text-white/90 hover:text-white hover:bg-white/15 rounded-lg transition-colors"
                title="Options"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-44 bg-white dark:bg-[#13233A] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 py-1.5 z-50 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={clearChat}
                    className="w-full px-3 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Clear Conversation</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetPosition}
                    className="w-full px-3 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Reset Button Position</span>
                  </button>
                </div>
              )}

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-white/90 hover:text-white hover:bg-white/15 rounded-lg transition-colors ml-0.5"
                aria-label="Close Chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#F8FAFC] dark:bg-[#0B1220]">
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={index}
                  className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5 text-xs font-extrabold shadow-xs border border-emerald-200 dark:border-emerald-800">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`max-w-[84%] space-y-1 ${isUser ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                        isUser
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium rounded-br-xs'
                          : 'bg-white dark:bg-[#162A44] text-[#0F172A] dark:text-[#E6F1EF] border border-slate-200/90 dark:border-white/10 rounded-bl-xs'
                      }`}
                    >
                      {formatContent(msg.content)}
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 px-1 block">
                      {msg.time}
                    </span>
                  </div>

                  {isUser && (
                    <div className="w-7 h-7 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex gap-2.5 items-start">
                <div className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="p-3 bg-white dark:bg-[#162A44] border border-slate-200 dark:border-white/10 rounded-2xl rounded-bl-xs shadow-xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse delay-100" />
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse delay-200" />
                  <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold ml-1">AI is thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Chips */}
          {suggestions.length > 0 && (
            <div className="px-3 py-2 bg-white dark:bg-[#0F1B2D] border-t border-slate-200 dark:border-slate-800/80 overflow-x-auto whitespace-nowrap flex gap-1.5 scrollbar-thin">
              {suggestions.map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(sug)}
                  className="px-3 py-1.5 text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/80 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700/70 rounded-full transition-colors shrink-0 shadow-xs"
                >
                  {sug}
                </button>
              ))}
            </div>
          )}

          {/* Input Footer */}
          <div className="p-3 bg-white dark:bg-[#0F1B2D] border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#13233A] rounded-2xl border border-slate-300 dark:border-slate-700/80 px-3 py-1.5 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isListening ? "Listening... speak now" : "Type question in Hindi, English, Hinglish..."}
                className="flex-1 bg-transparent text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none py-1"
              />

              {/* Voice Typing Mic Button */}
              <button
                type="button"
                onClick={handleVoiceTyping}
                className={`p-1.5 rounded-xl transition-colors ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
                }`}
                title="Voice Typing (Microphone)"
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim() || isLoading}
                className="p-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white transition-all shadow-sm"
                aria-label="Send message"
              >
                <Send className="w-3.5 h-3.5 rtl:rotate-180" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
