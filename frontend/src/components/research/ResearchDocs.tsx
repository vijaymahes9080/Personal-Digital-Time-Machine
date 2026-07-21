import React, { useEffect, useState } from 'react';
import { 
  BookOpen, 
  Search, 
  Quote, 
  FileText, 
  ArrowDownToLine,
  ExternalLink,
  ClipboardCheck,
  Clipboard
} from 'lucide-react';

interface Citation {
  id: string;
  title: string;
  authors: string;
  journal: string;
  year: number;
  bibtex: string;
}

const API_BASE = 'http://localhost:8000/api/v1';

function ResearchDocs() {
  const [query, setQuery] = useState('');
  const [citations, setCitations] = useState<Citation[]>([]);
  const [review, setReview] = useState('');
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function fetchResearch(searchQuery: string) {
    setLoading(true);
    try {
      const url = `${API_BASE}/research${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCitations(data.citations);
        setReview(data.literature_review);
      }
    } catch (err) {
      console.error("Failed to load research assistant logs", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchResearch('');
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const downloadReport = (format: string) => {
    // Generate simple document blob
    const content = `CHRONAAI SUMMARY REPORT\n=======================\n\nLiterature Review:\n${review}\n\nBibliography Citations:\n` + citations.map(c => `[${c.authors}, ${c.year}] ${c.title} (${c.journal})`).join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chrona_ai_report_${format.toLowerCase()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full w-full overflow-y-auto p-6 md:p-8 flex flex-col gap-8 scrollbar-thin">
      
      {/* 1. Header Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/10">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary-500/10 border border-primary-500/30 flex items-center justify-center text-primary-500">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-slate-800 dark:text-slate-100">
              Research Assistant & Docs Generator
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Organize citations, synthesize reviews, and export markdown developer journals.
            </p>
          </div>
        </div>
        
        {/* Document exporter downloads */}
        <div className="flex gap-2">
          <button 
            onClick={() => downloadReport('Developer Journal')}
            className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-xs font-semibold text-slate-600 dark:text-slate-350 border border-slate-200/40 dark:border-slate-800/40 flex items-center gap-1.5"
          >
            <FileText className="h-3.5 w-3.5 text-primary-500" />
            Developer Journal
          </button>
          <button 
            onClick={() => downloadReport('Weekly')}
            className="px-3.5 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold shadow-lg hover:shadow-primary-500/20 flex items-center gap-1.5"
          >
            <ArrowDownToLine className="h-3.5 w-3.5" />
            Export Weekly Report
          </button>
        </div>
      </div>

      {/* 2. Search collections query header */}
      <div className="flex gap-2 shrink-0">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
          <input 
            type="text" 
            placeholder="Search papers database or compile reviews..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchResearch(query)}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-white/40 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <button
          onClick={() => fetchResearch(query)}
          className="px-4 py-2.5 rounded-xl bg-slate-900/90 text-white hover:bg-slate-850 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-1"
        >
          Research
        </button>
      </div>

      {/* 3. Main layout grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Literature review */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="p-6 rounded-2xl bg-white/40 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-accent-teal" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 font-display">
                  Dynamic Literature Synthesis
                </h3>
              </div>
            </div>
            
            {loading ? (
              <div className="text-xs text-slate-400 italic py-4">Compiling review context...</div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/40 dark:border-slate-800/40 text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans whitespace-pre-line">
                {review}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Bibliography / Citations */}
        <div className="flex flex-col gap-6">
          <div className="p-6 rounded-2xl bg-white/40 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Quote className="h-4 w-4 text-primary-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 font-display">
                Bibliography Exporter
              </h3>
            </div>

            <div className="flex flex-col gap-4">
              {citations.map((cit) => (
                <div 
                  key={cit.id}
                  className="p-4 rounded-xl bg-white/60 dark:bg-slate-900/20 border border-slate-200/45 dark:border-slate-800/45 flex flex-col gap-3 text-xs"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="font-bold text-slate-700 dark:text-slate-350 leading-snug">{cit.title}</h4>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                        {cit.authors} • {cit.journal} ({cit.year})
                      </span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(cit.bibtex, cit.id)}
                      className="text-slate-400 hover:text-primary-500 shrink-0 h-6 w-6 rounded hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center"
                      title="Copy BibTeX"
                    >
                      {copiedId === cit.id ? <ClipboardCheck className="h-3.5 w-3.5 text-accent-teal" /> : <Clipboard className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  
                  {/* Bibtex code preview */}
                  <pre className="p-2.5 rounded bg-slate-100 dark:bg-slate-950 text-[9px] font-mono overflow-x-auto text-slate-500 dark:text-slate-500 max-h-24">
                    {cit.bibtex}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

export default ResearchDocs;
