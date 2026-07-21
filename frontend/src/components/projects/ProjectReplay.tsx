import React, { useEffect, useState } from 'react';
import { 
  FolderGit, 
  GitBranch, 
  HelpCircle, 
  Clock, 
  ShieldCheck, 
  MessageSquareCode,
  ArrowRight
} from 'lucide-react';

interface FileChange {
  id: string;
  timestamp: string;
  file_path: string;
  app_name: string;
}

interface Decision {
  id: string;
  timestamp: string;
  app_name: string;
  title: string;
  issue: string;
  alternatives: string;
  pros: string;
  cons: string;
  result: string;
}

const API_BASE = 'http://localhost:8000/api/v1';

function ProjectReplay() {
  const [replayData, setReplayData] = useState<{ project_name: string; files_changed: FileChange[]; explanation: string } | null>(null);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [resReplay, resDecisions] = await Promise.all([
          fetch(`${API_BASE}/projects/replay`),
          fetch(`${API_BASE}/decisions`)
        ]);

        if (resReplay.ok && resDecisions.ok) {
          const dataReplay = await resReplay.json();
          const dataDecisions = await resDecisions.json();
          setReplayData(dataReplay);
          setDecisions(dataDecisions);
        }
      } catch (err) {
        console.error("Failed to load project replay data", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
        Loading Project Replay Systems...
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto p-6 md:p-8 flex flex-col gap-8 scrollbar-thin">
      
      {/* 1. Header Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/10">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary-500/10 border border-primary-500/30 flex items-center justify-center text-primary-500">
            <FolderGit className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-slate-800 dark:text-slate-100">
              Project Replay & Design Decisions
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Reconstruct and audit file modifications and key architectural choices.
            </p>
          </div>
        </div>
        <div className="text-xs font-semibold bg-primary-500/10 text-primary-500 px-3 py-1.5 rounded-lg border border-primary-500/20">
          Active Project: {replayData?.project_name || 'Personal Digital Time Machine'}
        </div>
      </div>

      {/* 2. Main content grids */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: File modifications and AI Explain Lifecycle */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* AI Explanation card */}
          <div className="p-6 rounded-2xl bg-white/40 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <MessageSquareCode className="h-4 w-4 text-accent-teal" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 font-display">
                AI Lifecycle Breakdown
              </h3>
            </div>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 whitespace-pre-line">
              {replayData?.explanation}
            </p>
          </div>

          {/* File changes checklist */}
          <div className="p-6 rounded-2xl bg-white/40 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-primary-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 font-display">
                Code Modifications Stream
              </h3>
            </div>

            <div className="flex flex-col gap-3">
              {replayData?.files_changed.map((file, idx) => (
                <div 
                  key={file.id || idx}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/40 dark:border-slate-800/40 flex items-center justify-between gap-4 text-xs"
                >
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono truncate">
                      {file.file_path}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-wider">
                      {file.app_name}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 font-semibold flex items-center gap-1 font-mono">
                    <Clock className="h-3 w-3" />
                    {new Date(file.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Decisions History */}
        <div className="flex flex-col gap-6">
          <div className="p-6 rounded-2xl bg-white/40 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-accent-blue" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 font-display">
                Engineering Decisions Log
              </h3>
            </div>

            <div className="flex flex-col gap-4">
              {decisions.map((dec, idx) => (
                <div 
                  key={dec.id || idx}
                  className="p-4 rounded-xl bg-white/60 dark:bg-slate-900/20 border border-slate-200/45 dark:border-slate-800/45 flex flex-col gap-3 text-xs"
                >
                  <div>
                    <span className="text-[9px] font-bold text-primary-500 bg-primary-500/10 px-1.5 py-0.5 rounded border border-primary-500/20">
                      DECISION
                    </span>
                    <h4 className="font-bold text-slate-700 dark:text-slate-300 mt-2 font-display leading-snug">
                      {dec.title}
                    </h4>
                  </div>

                  <div className="flex flex-col gap-2 border-t border-slate-200/20 pt-2 text-[11px] leading-relaxed">
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block">Issue:</span>
                      <span className="text-slate-500 dark:text-slate-400">{dec.issue}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block">Alternatives considered:</span>
                      <span className="text-slate-500 dark:text-slate-400">{dec.alternatives}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block">Pros vs Cons:</span>
                      <span className="text-slate-500 dark:text-slate-400">
                        Pro: {dec.pros} / Con: {dec.cons}
                      </span>
                    </div>
                    <div className="bg-primary-500/5 p-2 rounded-lg border border-primary-500/10 mt-1">
                      <span className="text-[10px] text-primary-500 font-bold block">Outcome & Result:</span>
                      <span className="text-slate-600 dark:text-slate-350">{dec.result}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

export default ProjectReplay;
