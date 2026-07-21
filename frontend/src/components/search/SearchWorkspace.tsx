import React, { useState } from 'react';
import { 
  Send, 
  Sparkles, 
  HelpCircle, 
  Clock, 
  Compass, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Workflow,
  Cpu,
  Database,
  ArrowRight
} from 'lucide-react';
import { useStore } from '../../store/useStore';

interface Message {
  sender: 'user' | 'assistant';
  text: string;
  sources?: {
    event_id: string;
    timestamp: string;
    activity_type: string;
    app_name: string;
    window_title: string;
  }[];
  used_fallback?: boolean;
}

const suggestionChips = [
  "When did I edit main.py?",
  "Find SQLite database setups",
  "Show clipboard content containing errors",
  "Summarize my recent VSCode work today"
];

const API_BASE = 'http://localhost:8000/api/v1';

function SearchWorkspace() {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'assistant',
      text: "Hello! I am your local AI Memory Assistant. I can search through your recorded digital history (window focuses, clipboard clips, code edits, and screenshots) and answer questions about what you worked on. Ask me anything!"
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [openSourcesIdx, setOpenSourcesIdx] = useState<number | null>(null);
  
  const setSelectedEventId = useStore((state) => state.setSelectedEventId);

  const handleAsk = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    // Add user message
    const userMsg: Message = { sender: 'user', text: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setQuestion('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/search/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: textToSend })
      });

      if (!response.ok) {
        throw new Error('RAG assistant query failed');
      }

      const data = await response.json();
      
      const assistantMsg: Message = {
        sender: 'assistant',
        text: data.answer,
        sources: data.sources,
        used_fallback: data.used_fallback
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages(prev => [...prev, {
        sender: 'assistant',
        text: "I encountered an error querying your memory databases. Please make sure the local FastAPI server is running."
      }]);
    } finally {
      setLoading(false);
    }
  };

  const toggleSources = (index: number) => {
    setOpenSourcesIdx(prev => prev === index ? null : index);
  };

  return (
    <div className="h-full w-full flex flex-col bg-slate-950/10 overflow-hidden relative">
      
      {/* 1. Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col gap-6 scrollbar-thin">
        {messages.map((msg, idx) => (
          <div 
            key={idx}
            className={`flex flex-col max-w-3xl ${
              msg.sender === 'user' ? 'self-end items-end' : 'self-start items-start'
            } gap-2.5`}
          >
            {/* Sender bubble */}
            <div className={`p-4.5 rounded-2xl text-sm leading-relaxed border transition-all ${
              msg.sender === 'user'
                ? 'bg-primary-600 border-primary-700 text-white shadow-lg rounded-tr-none'
                : 'bg-white/40 dark:bg-slate-900/40 border-slate-200/50 dark:border-slate-800/50 text-slate-700 dark:text-slate-300 rounded-tl-none shadow-sm'
            }`}>
              {/* Message Content */}
              <div className="whitespace-pre-line font-sans">{msg.text}</div>

              {/* RAG LLM engine fallback warning */}
              {msg.used_fallback && (
                <div className="mt-3 pt-2.5 border-t border-slate-200/40 dark:border-slate-800/40 flex items-center gap-1.5 text-[10px] text-amber-500 font-semibold">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Using direct database search fallback. Ollama instance was offline.
                </div>
              )}
            </div>

            {/* Collapsible RAG Sources (Only for assistant responses with sources) */}
            {msg.sender === 'assistant' && msg.sources && msg.sources.length > 0 && (
              <div className="w-full min-w-[280px] sm:min-w-[450px]">
                <button
                  onClick={() => toggleSources(idx)}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 hover:text-primary-500 dark:hover:text-primary-400 transition-colors uppercase tracking-wider"
                >
                  <Workflow className="h-3.5 w-3.5 text-primary-500" />
                  {openSourcesIdx === idx ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  Show Memory Context Sources ({msg.sources.length})
                </button>

                {openSourcesIdx === idx && (
                  <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto p-1 scrollbar-thin">
                    {msg.sources.map((src) => (
                      <div
                        key={src.event_id}
                        onClick={() => setSelectedEventId(src.event_id)}
                        className="p-3 rounded-xl bg-white/40 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50 hover:border-primary-500/50 hover:bg-white/70 dark:hover:bg-slate-900/60 cursor-pointer flex flex-col justify-between gap-2.5 transition-all text-xs"
                      >
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800/50 px-1.5 py-0.5 rounded border border-slate-200/30 dark:border-slate-700/30 font-semibold capitalize text-slate-500 dark:text-slate-400">
                            {src.app_name}
                          </span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 shrink-0">
                            {new Date(src.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="font-semibold text-slate-700 dark:text-slate-300 line-clamp-1">
                          {src.window_title || `${src.activity_type} activity`}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Typing / Thinking Loader */}
        {loading && (
          <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500 italic self-start bg-white/20 dark:bg-slate-900/20 p-3.5 rounded-2xl border border-slate-200/20 dark:border-slate-800/20">
            <Cpu className="h-4 w-4 animate-spin text-primary-500" />
            <span>ChronaAI Memory Engine is searching history & formulating response...</span>
          </div>
        )}
      </div>

      {/* 2. Bottom Input Bar Overlay */}
      <div className="p-6 border-t border-slate-200/50 dark:border-slate-800/50 glass-panel shrink-0 flex flex-col gap-4 bg-white/10 dark:bg-slate-950/20">
        
        {/* Suggestion Chips */}
        {messages.length === 1 && (
          <div className="flex flex-col gap-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1">
              <Compass className="h-3 w-3 text-primary-500" /> Suggested memory targets
            </span>
            <div className="flex flex-wrap gap-2">
              {suggestionChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAsk(chip)}
                  className="px-3.5 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/60 hover:bg-primary-500/10 hover:border-primary-500 hover:text-primary-500 dark:hover:text-primary-400 text-slate-500 dark:text-slate-400 transition-all font-semibold flex items-center gap-1"
                >
                  {chip} <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input box */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk(question);
          }}
          className="flex gap-2.5 items-center relative"
        >
          <div className="flex-1 relative">
            <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-500" />
            <input
              type="text"
              placeholder="Ask questions about your digital work history..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={loading}
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-100/70 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50 font-sans"
            />
          </div>
          <button
            type="submit"
            disabled={!question.trim() || loading}
            className="h-11 w-11 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center shadow-lg hover:shadow-primary-500/20 disabled:opacity-50 disabled:shadow-none transition-all"
          >
            <Send className="h-4.5 w-4.5" />
          </button>
        </form>
      </div>

    </div>
  );
}

export default SearchWorkspace;
