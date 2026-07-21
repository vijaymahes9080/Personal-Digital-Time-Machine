import React from 'react';
import { useStore } from '../../store/useStore';
import { useTimeline } from '../../hooks/useTimeline';
import TimelineItem from './TimelineItem';
import { RefreshCw, Hourglass } from 'lucide-react';

function Timeline() {
  const { searchQuery, selectedActivityType, selectedAppName } = useStore();

  const { data: epochs, isLoading, error } = useTimeline({
    searchQuery,
    activityType: selectedActivityType,
    appName: selectedAppName
  });

  if (isLoading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-3">
        <RefreshCw className="h-8 w-8 text-primary-500 animate-spin" />
        <p className="text-sm text-slate-400 dark:text-slate-500 animate-pulse font-medium">
          Reconstructing timeline records...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center text-red-500 gap-2">
        <p className="font-semibold">Failed to fetch timeline logs.</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Make sure your FastAPI backend server is running on localhost:8000.
        </p>
      </div>
    );
  }

  if (!epochs || epochs.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center gap-3 p-12 text-center">
        <Hourglass className="h-12 w-12 text-slate-300 dark:text-slate-700" />
        <h3 className="font-display font-semibold text-lg">No digital activities logged</h3>
        <p className="text-sm text-slate-400 dark:text-slate-500 max-w-sm mt-1">
          Open a project, copy text to clipboard, or work in your editor to see events appear in real-time.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-12 relative pb-20">
      
      {/* Dynamic timeline line background */}
      <div className="absolute left-6 top-8 bottom-8 w-0.5 timeline-line rounded-full opacity-30 dark:opacity-20 hidden md:block"></div>

      {/* Render Epoch Groups */}
      {epochs.map((group) => (
        <section key={group.epoch} className="flex flex-col gap-6 relative">
          
          {/* Epoch Title Header */}
          <div className="flex items-center gap-4 md:-ml-2">
            <div className="hidden md:flex h-5 w-5 rounded-full bg-slate-200 dark:bg-slate-800 border-4 border-background-light dark:border-background-dark items-center justify-center z-10">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-500"></span>
            </div>
            <h2 className="font-display font-bold text-lg tracking-tight text-slate-400 dark:text-slate-500">
              {group.epoch}
            </h2>
            <div className="flex-1 h-px bg-slate-200/50 dark:bg-slate-800/30"></div>
          </div>

          {/* Epoch Event Cards List */}
          <div className="flex flex-col gap-4 pl-0 md:pl-10">
            {group.events.map((event) => (
              <TimelineItem key={event.id} event={event} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default Timeline;
