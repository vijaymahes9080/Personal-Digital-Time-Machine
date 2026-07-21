import React, { useEffect, useState } from 'react';
import { 
  Sparkles, 
  Milestone, 
  Bug, 
  FileWarning, 
  Layers,
  Calendar,
  CheckCircle,
  TrendingUp
} from 'lucide-react';

interface TechStat {
  name: string;
  hours: number;
  level: string;
}

interface MilestoneData {
  id: string;
  title: string;
  date: string;
  tech: string;
  status: 'completed' | 'upcoming';
}

interface BugRisk {
  target: string;
  risk_score: 'High' | 'Medium' | 'Low';
  factors: string;
}

interface ForgottenTodo {
  file: string;
  issue: string;
}

const API_BASE = 'http://localhost:8000/api/v1';

function PredictionsEvolution() {
  const [techStats, setTechStats] = useState<TechStat[]>([]);
  const [milestones, setMilestones] = useState<MilestoneData[]>([]);
  const [bugRisks, setBugRisks] = useState<BugRisk[]>([]);
  const [todos, setTodos] = useState<ForgottenTodo[]>([]);
  const [streakDays, setStreakDays] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [resPreds, resEvol] = await Promise.all([
          fetch(`${API_BASE}/predictions`),
          fetch(`${API_BASE}/evolution`)
        ]);

        if (resPreds.ok && resEvol.ok) {
          const dataPreds = await resPreds.json();
          const dataEvol = await resEvol.json();
          
          setBugRisks(dataPreds.bug_risks);
          setTodos(dataPreds.forgotten_todos);
          
          setTechStats(dataEvol.tech_stats);
          setMilestones(dataEvol.milestones);
          setStreakDays(dataEvol.streak_days);
        }
      } catch (err) {
        console.error("Failed to load predictions & evolution telemetry data", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
        Loading Predictions & Learning Roadmaps...
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-auto p-6 md:p-8 flex flex-col gap-8 scrollbar-thin">
      
      {/* 1. Header Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/10">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-accent-blue/10 border border-accent-blue/30 flex items-center justify-center text-accent-blue">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-slate-800 dark:text-slate-100">
              AI Predictions & Knowledge Evolution
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Forecast upcoming deadline targets, bug risks, and learning progress curves.
            </p>
          </div>
        </div>
        <div className="text-xs font-semibold bg-accent-teal/10 text-accent-teal px-3 py-1.5 rounded-lg border border-accent-teal/20 flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5" />
          Learning Streak: {streakDays} days
        </div>
      </div>

      {/* 2. Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Evolution Roadmaps & Stats */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Technology focus progress tree */}
          <div className="p-6 rounded-2xl bg-white/40 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 font-display">
                Technology Expertise Profile
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {techStats.map((tech, idx) => (
                <div 
                  key={idx}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/40 dark:border-slate-800/40 flex flex-col gap-2"
                >
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-350">{tech.name}</span>
                  <div className="flex justify-between items-end">
                    <span className="text-lg font-bold text-primary-500 font-display">{tech.hours}h</span>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 dark:text-slate-500 px-1.5 py-0.5 rounded">
                      {tech.level}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Learning path milestones list */}
          <div className="p-6 rounded-2xl bg-white/40 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Milestone className="h-4 w-4 text-accent-teal" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 font-display">
                Expertise Growth Roadmaps
              </h3>
            </div>

            <div className="relative border-l border-slate-200/60 dark:border-slate-800/60 ml-3.5 pl-6 flex flex-col gap-5.5 py-2">
              {milestones.map((ms) => (
                <div key={ms.id} className="relative text-xs">
                  {/* Status node absolute symbol */}
                  <span className={`absolute -left-[30px] top-0.5 h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center ${
                    ms.status === 'completed' 
                      ? 'bg-accent-teal border-accent-teal-700' 
                      : 'bg-slate-900 border-slate-800'
                  }`}>
                    {ms.status === 'completed' && <CheckCircle className="h-2 w-2 text-white" />}
                  </span>
                  
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h4 className="font-bold text-slate-700 dark:text-slate-350 leading-snug">{ms.title}</h4>
                      <span className="text-[10px] font-semibold text-slate-400 mt-1 block">{ms.tech}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/50 px-1.5 py-0.5 rounded border border-slate-200/20">
                      {ms.date}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: AI Predictions Warnings & Bug forecasting */}
        <div className="flex flex-col gap-6">
          
          {/* Bug Risks warnings */}
          <div className="p-6 rounded-2xl bg-white/40 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Bug className="h-4 w-4 text-red-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 font-display">
                Forecasted Bug Risks
              </h3>
            </div>

            <div className="flex flex-col gap-3">
              {bugRisks.map((bug, idx) => (
                <div 
                  key={idx}
                  className="p-3.5 rounded-xl bg-red-500/5 border border-red-500/10 flex flex-col gap-2 text-xs"
                >
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-semibold text-slate-700 dark:text-slate-350 font-mono truncate max-w-[150px]">
                      {bug.target.split('/').pop()}
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                      bug.risk_score === 'High' 
                        ? 'bg-red-500/15 border-red-500/30 text-red-500' 
                        : 'bg-amber-500/15 border-amber-500/30 text-amber-500'
                    }`}>
                      {bug.risk_score} Risk
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-450 leading-relaxed">
                    {bug.factors}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Forgotten Todos / Documentation alerts */}
          <div className="p-6 rounded-2xl bg-white/40 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <FileWarning className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 font-display">
                Forgotten TODO Indexer
              </h3>
            </div>

            <div className="flex flex-col gap-3">
              {todos.map((todo, idx) => (
                <div 
                  key={idx}
                  className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 flex flex-col gap-1 text-xs"
                >
                  <span className="font-semibold text-slate-700 dark:text-slate-350 font-mono text-[10px]">
                    {todo.file}
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-450 leading-snug">
                    {todo.issue}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

export default PredictionsEvolution;
