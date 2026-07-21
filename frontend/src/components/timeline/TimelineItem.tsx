import React from 'react';
import { useStore } from '../../store/useStore';
import { ActivityEvent } from '../../hooks/useTimeline';
import { 
  FileCode, 
  Clipboard, 
  Monitor, 
  Image, 
  Terminal, 
  Globe, 
  Lock,
  ChevronRight
} from 'lucide-react';

interface TimelineItemProps {
  event: ActivityEvent;
}

function TimelineItem({ event }: TimelineItemProps) {
  const { setSelectedEventId, selectedEventId } = useStore();
  const isSelected = selectedEventId === event.event_id;

  // Format timestamp (e.g. "08:45 PM")
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Maps activity type to relevant Lucide Icon & Badge Colors
  const getActivityMeta = (type: string, app: string) => {
    const appLower = app.toLowerCase();
    
    switch (type) {
      case 'window_switch':
        if (appLower.includes('code') || appLower.includes('visual studio')) {
          return {
            icon: <Terminal className="h-4 w-4 text-violet-500" />,
            bgColor: 'bg-violet-500/10 border-violet-500/20 text-violet-500',
            label: 'Code Editor'
          };
        }
        if (appLower.includes('chrome') || appLower.includes('firefox') || appLower.includes('safari') || appLower.includes('edge') || appLower.includes('browser')) {
          return {
            icon: <Globe className="h-4 w-4 text-accent-blue" />,
            bgColor: 'bg-blue-500/10 border-blue-500/20 text-accent-blue',
            label: 'Web Browser'
          };
        }
        return {
          icon: <Monitor className="h-4 w-4 text-slate-400" />,
          bgColor: 'bg-slate-500/10 border-slate-500/20 text-slate-400',
          label: 'Application'
        };

      case 'clipboard':
        return {
          icon: <Clipboard className="h-4 w-4 text-accent-pink" />,
          bgColor: 'bg-pink-500/10 border-pink-500/20 text-accent-pink',
          label: 'Clipboard Copy'
        };

      case 'file_edit':
        return {
          icon: <FileCode className="h-4 w-4 text-emerald-500" />,
          bgColor: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500',
          label: 'File Workspace'
        };

      case 'screenshot':
        return {
          icon: <Image className="h-4 w-4 text-accent-teal" />,
          bgColor: 'bg-teal-500/10 border-teal-500/20 text-accent-teal',
          label: 'Screen Capture'
        };

      default:
        return {
          icon: <Monitor className="h-4 w-4 text-slate-400" />,
          bgColor: 'bg-slate-500/10 border-slate-500/20 text-slate-400',
          label: 'System Log'
        };
    }
  };

  const meta = getActivityMeta(event.activity_type, event.app_name);

  return (
    <div 
      onClick={() => setSelectedEventId(event.event_id)}
      className={`group w-full p-4 rounded-2xl glass-card cursor-pointer border flex flex-col gap-3 md:flex-row md:items-center justify-between ${
        isSelected 
          ? 'border-primary-500 shadow-glow-primary bg-primary-500/5 dark:bg-primary-500/10' 
          : 'border-slate-200/50 dark:border-slate-800/50'
      }`}
    >
      <div className="flex items-start gap-4 flex-1 min-w-0">
        
        {/* Left Circular Icon Badge */}
        <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800/40 flex items-center justify-center shadow-sm shrink-0">
          {meta.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {/* Application Identifier */}
            <span className="font-display font-semibold text-sm">
              {event.app_name}
            </span>
            {/* Event Category Badge */}
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${meta.bgColor}`}>
              {meta.label}
            </span>
            {/* Search Relevance Tag */}
            {event.score !== undefined && (
              <span className="text-[9px] bg-accent-blue/10 border border-accent-blue/20 text-accent-blue px-1.5 py-0.5 rounded-md font-mono">
                RRF: {event.score.toFixed(4)}
              </span>
            )}
          </div>

          {/* Activity description title */}
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-lg">
            {event.window_title || 'No metadata provided'}
          </p>

          {/* Miniature image preview for screenshots */}
          {event.activity_type === 'screenshot' && event.details?.file_name && (
            <div className="mt-2.5 h-16 w-32 rounded-lg border border-slate-200/50 dark:border-slate-800/50 overflow-hidden relative group-hover:border-slate-300 dark:group-hover:border-slate-700 transition-colors">
              <img 
                src={`http://127.0.0.1:8000/data/screenshots/${event.details.file_name}`} 
                alt="Capture preview"
                className="object-cover h-full w-full opacity-80 group-hover:opacity-100 transition-opacity"
                onError={(e) => {
                  // Fallback if image fails to load
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-800/50">
        {/* Event Time display */}
        <span className="text-xs font-mono font-medium text-slate-400 dark:text-slate-500">
          {formatTime(event.timestamp)}
        </span>
        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all duration-200 hidden md:block" />
      </div>
    </div>
  );
}

export default TimelineItem;
