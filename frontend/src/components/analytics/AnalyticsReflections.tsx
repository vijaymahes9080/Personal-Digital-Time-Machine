import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  Hourglass, 
  Target, 
  Sparkles, 
  Flame, 
  FileText,
  AlertTriangle,
  Lightbulb
} from 'lucide-react';

interface AppPercent {
  name: string;
  percent: number;
}

interface FrameworkCount {
  name: string;
  count: number;
}

interface AnalyticsData {
  total_coding_hours: number;
  focus_score: number;
  language_badges: string[];
  apps_breakdown: AppPercent[];
  frameworks: FrameworkCount[];
}

interface Reflection {
  date: string;
  focus_score: number;
  total_activities: number;
  achievements: string[];
  mistakes: string[];
  improvements: string[];
}

interface CreativeData {
  duplicates: { id: string; file_a: string; file_b: string; confidence: number }[];
  innovations: { title: string; description: string; type: string }[];
}

const API_BASE = 'http://localhost:8000/api/v1';

function AnalyticsReflections() {
  const [stats, setStats] = useState<AnalyticsData | null>(null);
  const [reflection, setReflection] = useState<Reflection | null>(null);
  const [creative, setCreative] = useState<CreativeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [resStats, resReflect, resCreative] = await Promise.all([
          fetch(`${API_BASE}/analytics`),
          fetch(`${API_BASE}/reflection`),
          fetch(`${API_BASE}/creative`)
        ]);

        if (resStats.ok && resReflect.ok && resCreative.ok) {
          setStats(await resStats.json());
          setReflection(await resReflect.json());
          setCreative(await resCreative.json());
        }
      } catch (err) {
        console.error("Failed to load analytics & reflection metadata", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
        Loading Analytics Dashboard & Reflection logs...
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto p-6 md:p-8 flex flex-col gap-8 scrollbar-thin">
      
      {/* 1. Header Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/10">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary-500/10 border border-primary-500/30 flex items-center justify-center text-primary-500">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-slate-800 dark:text-slate-100">
              Productivity Analytics & Reflections
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Review workspace focus scores, application ratios, and auto-generated developer reflections.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Top Stats Counter Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Coding hours */}
        <div className="p-5 rounded-2xl bg-white/40 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-primary-500/10 text-primary-500 flex items-center justify-center border border-primary-500/20">
            <Hourglass className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Coding Hours</span>
            <span className="text-xl font-bold text-slate-800 dark:text-slate-100 font-display">{stats?.total_coding_hours}h</span>
          </div>
        </div>

        {/* Focus Rating */}
        <div className="p-5 rounded-2xl bg-white/40 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-accent-teal/10 text-accent-teal flex items-center justify-center border border-accent-teal/20">
            <Target className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Focus Rating</span>
            <span className="text-xl font-bold text-slate-800 dark:text-slate-100 font-display">{stats?.focus_score}%</span>
          </div>
        </div>

        {/* Active Languages */}
        <div className="p-5 rounded-2xl bg-white/40 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-accent-blue/10 text-accent-blue flex items-center justify-center border border-accent-blue/20">
            <Flame className="h-5 w-5" />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Active Techs</span>
            <div className="flex gap-1">
              {stats?.language_badges.map(lang => (
                <span key={lang} className="text-[9px] bg-slate-100 dark:bg-slate-850 px-1 py-0.5 rounded font-semibold text-slate-600 dark:text-slate-400">
                  {lang}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Total Events */}
        <div className="p-5 rounded-2xl bg-white/40 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50 flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-primary-500/10 text-primary-500 flex items-center justify-center border border-primary-500/20">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Total Actions</span>
            <span className="text-xl font-bold text-slate-800 dark:text-slate-100 font-display">{reflection?.total_activities}</span>
          </div>
        </div>

      </div>

      {/* 3. Mid Grid Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Reflection report details */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="p-6 rounded-2xl bg-white/40 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50 flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-slate-200/20 pb-3">
              <FileText className="h-4 w-4 text-accent-teal" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 font-display">
                Auto-Reflection Report ({reflection?.date})
              </h3>
            </div>

            {/* List Achievements/Mistakes/Improvements */}
            <div className="flex flex-col gap-5 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-2 block">
                  Achievements Accomplished
                </span>
                <ul className="list-disc pl-5 flex flex-col gap-1.5 text-slate-600 dark:text-slate-400">
                  {reflection?.achievements.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-2 block">
                  Encountered Errors & Mistakes
                </span>
                <ul className="list-disc pl-5 flex flex-col gap-1.5 text-slate-650 dark:text-slate-400/80">
                  {reflection?.mistakes.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-2 block">
                  Recommended Improvements
                </span>
                <ul className="list-disc pl-5 flex flex-col gap-1.5 text-slate-600 dark:text-slate-400">
                  {reflection?.improvements.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Creative suggestions / Redundancy Alerts */}
        <div className="flex flex-col gap-6">
          
          {/* Innovations Suggestions */}
          <div className="p-6 rounded-2xl bg-white/40 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 font-display">
                Creative Innovation Suggestions
              </h3>
            </div>

            <div className="flex flex-col gap-3">
              {creative?.innovations.map((inn, idx) => (
                <div 
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/40 dark:border-slate-800/40 flex flex-col gap-1 text-xs"
                >
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-slate-700 dark:text-slate-350">{inn.title}</h4>
                    <span className="text-[9px] font-bold text-primary-500 bg-primary-500/10 px-1 py-0.5 rounded">
                      {inn.type}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-500 leading-normal mt-1">
                    {inn.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Redundancy Alerts */}
          <div className="p-6 rounded-2xl bg-white/40 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 font-display">
                Creative Redundancy Alerts
              </h3>
            </div>

            <div className="flex flex-col gap-3">
              {creative?.duplicates.map((dup) => (
                <div 
                  key={dup.id}
                  className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 flex flex-col gap-2 text-xs"
                >
                  <span className="text-[10px] text-amber-500 font-bold uppercase">Duplicate File Alert</span>
                  <div className="text-[10px] font-mono text-slate-500 dark:text-slate-500 leading-relaxed">
                    <div className="truncate">Path A: {dup.file_a}</div>
                    <div className="truncate mt-1">Path B: {dup.file_b}</div>
                  </div>
                  <div className="text-[9px] font-semibold text-slate-400">
                    Similarity: {Math.round(dup.confidence * 100)}%
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

export default AnalyticsReflections;
