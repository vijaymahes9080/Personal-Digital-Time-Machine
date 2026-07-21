import React, { useState } from 'react';
import { useStore } from '../../store/useStore';
import { useTimeline } from '../../hooks/useTimeline';
import { 
  X, 
  Copy, 
  Check, 
  Terminal, 
  Image, 
  FileCode, 
  Monitor, 
  Clipboard,
  Calendar,
  FolderOpen
} from 'lucide-react';

function EventDetailDrawer() {
  const { selectedEventId, setSelectedEventId, searchQuery, selectedActivityType, selectedAppName } = useStore();
  const [copied, setCopied] = useState(false);
  const [showJson, setShowJson] = useState(false);

  // Retrieve current cached timeline list
  const { data: epochs } = useTimeline({
    searchQuery,
    activityType: selectedActivityType,
    appName: selectedAppName
  });

  // Find the selected event from the cached epoch records
  const allEvents = epochs?.flatMap((group) => group.events) || [];
  const event = allEvents.find((e) => e.event_id === selectedEventId);

  if (!event) return null;

  // Formats UTC date string into standard readables
  const formatFullDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString([], { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit'
      });
    } catch {
      return '';
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="absolute inset-y-0 right-0 w-full sm:w-[500px] border-l border-slate-200/50 dark:border-slate-800/50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl z-20 flex flex-col justify-between overflow-hidden transition-all duration-300">
      
      {/* 1. Header Section */}
      <div className="p-6 border-b border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between">
        <div>
          <h3 className="font-display font-bold text-base text-slate-800 dark:text-slate-100">
            Event Analysis
          </h3>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
            ID: {event.event_id}
          </p>
        </div>
        <button 
          onClick={() => setSelectedEventId(null)}
          className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors text-slate-400 dark:text-slate-500"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 2. Middle Contents Pane */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        
        {/* Timestamp */}
        <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
          <Calendar className="h-3.5 w-3.5" />
          <span>{formatFullDate(event.timestamp)}</span>
        </div>

        {/* Application details */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/40 dark:border-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-center font-bold text-sm">
              {event.app_name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500">Application Window</p>
              <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                {event.window_title || 'No Title'}
              </h4>
            </div>
          </div>
        </div>

        {/* Type Specific rendering */}
        {event.activity_type === 'clipboard' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Clipboard Text</span>
              <button 
                onClick={() => handleCopyText(event.details.text_content || '')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied!' : 'Copy Raw'}
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/50 text-xs font-mono whitespace-pre-wrap break-all max-h-60 overflow-y-auto text-slate-600 dark:text-slate-400">
              {event.details.text_content || 'Empty clip.'}
            </pre>
          </div>
        )}

        {event.activity_type === 'file_edit' && (
          <div className="flex flex-col gap-4">
            <div>
              <span className="text-xs font-semibold text-slate-500 block mb-1.5">Workspace Location</span>
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200/40 dark:border-slate-800/40">
                <FolderOpen className="h-4 w-4 shrink-0 text-amber-500" />
                <span className="break-all font-mono">{event.details.file_path}</span>
              </div>
            </div>

            <div className="flex gap-4">
              <div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Operation</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-500 mt-0.5 block">
                  {event.details.change_type}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Extension</span>
                <span className="text-xs font-mono font-semibold uppercase mt-0.5 block">
                  {event.details.extension || 'None'}
                </span>
              </div>
            </div>
          </div>
        )}

        {event.activity_type === 'screenshot' && (
          <div className="flex flex-col gap-4">
            <span className="text-xs font-semibold text-slate-500">Visual Record</span>
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 aspect-video relative group">
              <img 
                src={`http://127.0.0.1:8000/data/screenshots/${event.details.file_name}`} 
                alt="Captured screen content" 
                className="object-contain h-full w-full"
              />
            </div>

            {/* OCR Extracted texts */}
            {event.ocr_extracted && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">OCR Extracted Text</span>
                  <button 
                    onClick={() => handleCopyText(event.ocr_extracted || '')}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    {copied ? 'Copied' : 'Copy Text'}
                  </button>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/50 text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto text-slate-600 dark:text-slate-400">
                  {event.ocr_extracted}
                </div>
              </div>
            )}
          </div>
        )}

        {event.activity_type === 'window_switch' && event.details?.process_path && (
          <div className="flex flex-col gap-3 text-xs">
            <span className="font-semibold text-slate-500">Process Metadata</span>
            <div className="flex flex-col gap-2 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200/40 dark:border-slate-800/40 font-mono">
              <div className="flex justify-between py-1 border-b border-slate-200/20">
                <span className="text-slate-400 dark:text-slate-500">PID</span>
                <span>{event.details.pid || 'Unknown'}</span>
              </div>
              <div className="flex flex-col py-1 gap-1">
                <span className="text-slate-400 dark:text-slate-500">Executable Path</span>
                <span className="break-all text-[11px] text-slate-500">{event.details.process_path}</span>
              </div>
            </div>
          </div>
        )}

        {/* Collapsible raw json debugger */}
        <div className="border-t border-slate-200/30 dark:border-slate-800/30 pt-4 mt-2">
          <button 
            onClick={() => setShowJson(!showJson)}
            className="text-xs text-primary-500 hover:underline font-semibold"
          >
            {showJson ? 'Hide Raw Audit Log' : 'Show Raw Audit Log'}
          </button>
          {showJson && (
            <pre className="mt-3 p-4 rounded-xl bg-slate-950 text-slate-400 text-[10px] font-mono overflow-x-auto whitespace-pre leading-relaxed border border-slate-800">
              {JSON.stringify(event, null, 2)}
            </pre>
          )}
        </div>

      </div>

      {/* 3. Footer Action Section */}
      <div className="p-6 border-t border-slate-200/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-950/20 flex gap-3">
        <button 
          onClick={() => setSelectedEventId(null)}
          className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          Close Drawer
        </button>
      </div>
      
    </div>
  );
}

export default EventDetailDrawer;
