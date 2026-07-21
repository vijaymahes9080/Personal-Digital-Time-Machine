import React, { useState } from 'react';
import { useStore } from './store/useStore';
import Timeline from './components/timeline/Timeline';
import FilterPanel from './components/timeline/FilterPanel';
import EventDetailDrawer from './components/timeline/EventDetailDrawer';
import GraphExplorer from './components/graph/GraphExplorer';
import SearchWorkspace from './components/search/SearchWorkspace';
import ProjectReplay from './components/projects/ProjectReplay';
import PredictionsEvolution from './components/predictions/PredictionsEvolution';
import ResearchDocs from './components/research/ResearchDocs';
import AnalyticsReflections from './components/analytics/AnalyticsReflections';
import CreativeProjects from './components/creative/CreativeProjects';
import { 
  Clock, 
  Share2, 
  Search, 
  Settings, 
  Sun, 
  Moon,
  Workflow,
  Sparkles,
  Terminal
} from 'lucide-react';

function App() {
  const { 
    theme, 
    toggleTheme, 
    searchQuery, 
    setSearchQuery, 
    selectedEventId,
    resetFilters 
  } = useStore();

  const [activeTab, setActiveTab] = useState<'timeline' | 'graph' | 'search' | 'projects' | 'predictions' | 'research' | 'analytics' | 'settings' | 'creative'>('timeline');

  return (
    <div className="flex h-screen w-screen bg-background-light dark:bg-background-dark text-slate-800 dark:text-slate-200 font-sans overflow-hidden transition-colors duration-200">
      
      {/* 1. Left Navigation Sidebar */}
      <aside className="w-64 border-r border-slate-200/50 dark:border-slate-800/50 flex flex-col justify-between glass-panel z-10">
        <div className="p-6 flex flex-col gap-8">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-blue flex items-center justify-center shadow-glow-primary">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-xl tracking-tight bg-clip-text text-gradient-primary">
                ChronaAI
              </h1>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-semibold">
                Time Machine
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-2">
            <button 
              onClick={() => setActiveTab('timeline')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${
                activeTab === 'timeline' 
                  ? 'bg-primary-500/10 text-primary-500 shadow-sm border border-primary-500/20' 
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800/40 text-slate-500 dark:text-slate-400'
              }`}
            >
              <Clock className="h-4 w-4" />
              Timeline Stream
            </button>
            <button 
              onClick={() => setActiveTab('graph')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${
                activeTab === 'graph' 
                  ? 'bg-primary-500/10 text-primary-500 shadow-sm border border-primary-500/20' 
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800/40 text-slate-500 dark:text-slate-400'
              }`}
            >
              <Workflow className="h-4 w-4" />
              Knowledge Graph
            </button>
            <button 
              onClick={() => setActiveTab('search')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${
                activeTab === 'search' 
                  ? 'bg-primary-500/10 text-primary-500 shadow-sm border border-primary-500/20' 
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800/40 text-slate-500 dark:text-slate-400'
              }`}
            >
              <Sparkles className="h-4 w-4 text-primary-500" />
              Memory Assistant
            </button>
            <button 
              onClick={() => setActiveTab('projects')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${
                activeTab === 'projects' 
                  ? 'bg-primary-500/10 text-primary-500 shadow-sm border border-primary-500/20' 
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800/40 text-slate-500 dark:text-slate-400'
              }`}
            >
              <Workflow className="h-4 w-4 text-accent-blue" />
              Project Replay
            </button>
            <button 
              onClick={() => setActiveTab('predictions')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${
                activeTab === 'predictions' 
                  ? 'bg-primary-500/10 text-primary-500 shadow-sm border border-primary-500/20' 
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800/40 text-slate-500 dark:text-slate-400'
              }`}
            >
              <Sparkles className="h-4 w-4 text-accent-teal" />
              Predictions & Roadmaps
            </button>
            <button 
              onClick={() => setActiveTab('research')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${
                activeTab === 'research' 
                  ? 'bg-primary-500/10 text-primary-500 shadow-sm border border-primary-500/20' 
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800/40 text-slate-500 dark:text-slate-400'
              }`}
            >
              <Clock className="h-4 w-4 text-primary-500" />
              Research & Docs
            </button>
            <button 
              onClick={() => setActiveTab('creative')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${
                activeTab === 'creative' 
                  ? 'bg-primary-500/10 text-primary-500 shadow-sm border border-primary-500/20' 
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800/40 text-slate-500 dark:text-slate-400'
              }`}
            >
              <Sparkles className="h-4 w-4 text-primary-500 animate-pulse" />
              Creative Projects
            </button>
            <button 
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${
                activeTab === 'analytics' 
                  ? 'bg-primary-500/10 text-primary-500 shadow-sm border border-primary-500/20' 
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800/40 text-slate-500 dark:text-slate-400'
              }`}
            >
              <Settings className="h-4 w-4 text-accent-teal" />
              Analytics Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium ${
                activeTab === 'settings' 
                  ? 'bg-primary-500/10 text-primary-500 shadow-sm border border-primary-500/20' 
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800/40 text-slate-500 dark:text-slate-400'
              }`}
            >
              <Settings className="h-4 w-4" />
              Settings Panel
            </button>
          </nav>
        </div>

        {/* User / Theme Controls */}
        <div className="p-6 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-xs">
              V
            </div>
            <div>
              <p className="text-xs font-semibold">Vijay</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Local Session</p>
            </div>
          </div>
          <button 
            onClick={toggleTheme}
            className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700/80 transition-colors"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-primary-600" />}
          </button>
        </div>
      </aside>

      {/* 2. Main content area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* Top Header */}
        <header className="h-20 border-b border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between px-8 z-10 glass-panel">
          <div className="flex-1 max-w-xl relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <input 
              type="text" 
              placeholder="Search timeline semantically... (e.g. 'Show VSCode edits relating to database models')"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent-teal/10 border border-accent-teal/20 text-accent-teal text-xs font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-teal animate-pulse"></span>
              Timeline Recorder Active
            </div>
          </div>
        </header>

        {/* Content Tabs switcher */}
        <div className="flex-1 flex overflow-hidden">
          {activeTab === 'timeline' && (
            <>
              {/* Timeline Stream */}
              <div className="flex-1 overflow-y-auto px-8 py-6 relative">
                <Timeline />
              </div>
              
              {/* Filter Panel Drawer Right */}
              <aside className="w-80 border-l border-slate-200/50 dark:border-slate-800/50 p-6 glass-panel overflow-y-auto hidden lg:block">
                <FilterPanel />
              </aside>
            </>
          )}

          {activeTab === 'graph' && (
            <GraphExplorer />
          )}

          {activeTab === 'search' && (
            <SearchWorkspace />
          )}

          {activeTab === 'projects' && (
            <ProjectReplay />
          )}

          {activeTab === 'predictions' && (
            <PredictionsEvolution />
          )}

          {activeTab === 'research' && (
            <ResearchDocs />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsReflections />
          )}

          {activeTab === 'creative' && (
            <CreativeProjects />
          )}

          {activeTab === 'settings' && (
            <div className="flex-1 p-8 overflow-y-auto max-w-3xl">
              <h2 className="font-display font-bold text-2xl mb-6">Application Settings</h2>
              
              <div className="flex flex-col gap-6">
                <div className="p-5 rounded-2xl bg-white/40 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50">
                  <h3 className="text-sm font-semibold mb-1">Local Directory Paths</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">ChronaAI stores all logs locally to preserve privacy.</p>
                  
                  <div className="flex flex-col gap-3 text-xs">
                    <div className="flex justify-between py-2 border-b border-slate-200/20">
                      <span className="text-slate-400 dark:text-slate-500">Database Path</span>
                      <span className="font-mono">data/chrona_ai.db (SQLite)</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-200/20">
                      <span className="text-slate-400 dark:text-slate-500">Screenshots</span>
                      <span className="font-mono">data/screenshots/</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-400 dark:text-slate-500">Tantivy Indexes</span>
                      <span className="font-mono">data/tantivy/</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white/40 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50">
                  <h3 className="text-sm font-semibold mb-1">Local AI Agent Configurations</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Integrations to local inference models.</p>
                  
                  <div className="flex flex-col gap-3 text-xs">
                    <div className="flex justify-between py-2 border-b border-slate-200/20">
                      <span className="text-slate-400 dark:text-slate-500">Ollama API Endpoint</span>
                      <span className="font-mono">http://localhost:11434</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-200/20">
                      <span className="text-slate-400 dark:text-slate-500">Embedding Model</span>
                      <span className="font-mono">nomic-embed-text</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-400 dark:text-slate-500">LLM Engine</span>
                      <span className="font-mono">qwen2.5-coder:7b</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. Sliding Event Detail Inspection Drawer */}
        {selectedEventId && <EventDetailDrawer />}
      </main>
    </div>
  );
}

export default App;
