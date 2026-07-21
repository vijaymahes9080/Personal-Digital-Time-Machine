import React from 'react';
import { useStore } from '../../store/useStore';
import { 
  Filter, 
  Terminal, 
  Clipboard, 
  Monitor, 
  Image, 
  FileCode,
  RotateCcw
} from 'lucide-react';

function FilterPanel() {
  const {
    selectedActivityType,
    setSelectedActivityType,
    selectedAppName,
    setSelectedAppName,
    resetFilters
  } = useStore();

  const activityTypes = [
    { id: null, label: 'All Activities', icon: <Filter className="h-3.5 w-3.5" /> },
    { id: 'window_switch', label: 'Window Focus', icon: <Monitor className="h-3.5 w-3.5" /> },
    { id: 'clipboard', label: 'Clipboard History', icon: <Clipboard className="h-3.5 w-3.5" /> },
    { id: 'file_edit', label: 'File Workspace', icon: <FileCode className="h-3.5 w-3.5" /> },
    { id: 'screenshot', label: 'Screenshots', icon: <Image className="h-3.5 w-3.5" /> },
  ];

  const appFilters = [
    { id: null, label: 'All Applications' },
    { id: 'vscode', label: 'VS Code' },
    { id: 'chrome', label: 'Google Chrome' },
    { id: 'terminal', label: 'Terminal / CMD' },
    { id: 'explorer', label: 'File Explorer' },
  ];

  const hasActiveFilters = selectedActivityType !== null || selectedAppName !== null;

  return (
    <div className="flex flex-col gap-8">
      
      {/* Title */}
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-sm uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Refine Memory
        </h3>
        {hasActiveFilters && (
          <button 
            onClick={resetFilters}
            className="flex items-center gap-1 text-[10px] text-primary-500 hover:text-primary-600 font-medium transition-colors"
          >
            <RotateCcw className="h-2.5 w-2.5" />
            Reset
          </button>
        )}
      </div>

      {/* Activity Type Filters */}
      <div className="flex flex-col gap-2.5">
        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Filter by Event Type
        </h4>
        <div className="flex flex-col gap-1">
          {activityTypes.map((type) => {
            const isSelected = selectedActivityType === type.id;
            return (
              <button
                key={type.label}
                onClick={() => setSelectedActivityType(type.id)}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium border transition-all duration-150 ${
                  isSelected
                    ? 'bg-primary-500/10 border-primary-500/30 text-primary-500 shadow-sm'
                    : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/40 text-slate-500 dark:text-slate-400'
                }`}
              >
                {type.icon}
                {type.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Application Name Filters */}
      <div className="flex flex-col gap-2.5">
        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          Filter by Application
        </h4>
        <div className="flex flex-col gap-1">
          {appFilters.map((app) => {
            const isSelected = selectedAppName === app.id;
            return (
              <button
                key={app.label}
                onClick={() => setSelectedAppName(app.id)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium border transition-all duration-150 ${
                  isSelected
                    ? 'bg-primary-500/10 border-primary-500/30 text-primary-500 shadow-sm'
                    : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/40 text-slate-500 dark:text-slate-400'
                }`}
              >
                <span>{app.label}</span>
                {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-primary-500"></span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Summary Cards */}
      <div className="p-4 rounded-2xl bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50 flex flex-col gap-2 text-xs">
        <div className="flex items-center gap-2 font-semibold mb-1 text-slate-500">
          <span className="h-2 w-2 rounded-full bg-primary-500"></span>
          Privacy Protection
        </div>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
          ChronaAI runs local vectorization and Tantivy keyword indexing, ensuring no keystrokes, clipboard details, or screenshot logs leave this host.
        </p>
      </div>

    </div>
  );
}

export default FilterPanel;
