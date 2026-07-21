import { useQuery } from '@tanstack/react-query';

const API_BASE = 'http://127.0.0.1:8000/api/v1';

export interface ActivityEvent {
  id: string;
  event_id: string;
  timestamp: string;
  activity_type: string;
  app_name: string;
  window_title: string;
  details: Record<string, any>;
  ocr_extracted?: string;
  score?: number; // Search ranking score if applicable
}

export interface GroupedTimeline {
  epoch: string;
  events: ActivityEvent[];
}

export function useTimeline(filters: {
  searchQuery: string;
  activityType: string | null;
  appName: string | null;
}) {
  const { searchQuery, activityType, appName } = filters;

  return useQuery<GroupedTimeline[]>({
    queryKey: ['timeline', searchQuery, activityType, appName],
    queryFn: async () => {
      // 1. If searchQuery is present, call Hybrid Search endpoint
      if (searchQuery.trim().length > 0) {
        const response = await fetch(
          `${API_BASE}/search?q=${encodeURIComponent(searchQuery)}&limit=100`
        );
        if (!response.ok) {
          throw new Error('Search request failed');
        }
        const data = await response.json();
        const hits: ActivityEvent[] = data.hits || [];
        
        // Dynamic client-side grouping of search results by epochs
        return groupEventsByEpoch(hits);
      }

      // 2. Otherwise, fetch standard grouped Timeline
      let url = `${API_BASE}/timeline?grouped=true&limit=100`;
      if (activityType) {
        url += `&activity_type=${encodeURIComponent(activityType)}`;
      }
      if (appName) {
        url += `&app_name=${encodeURIComponent(appName)}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Timeline request failed');
      }
      return response.json();
    },
    refetchInterval: 5000, // Background poll every 5s to check for active windows
  });
}

export function useGraph(q: string, type: string | null) {
  return useQuery({
    queryKey: ['graph', q, type],
    queryFn: async () => {
      let url = `${API_BASE}/graph?limit=150`;
      if (q) {
        url += `&q=${encodeURIComponent(q)}`;
      }
      if (type) {
        url += `&type=${encodeURIComponent(type)}`;
      }
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Graph fetch failed');
      }
      return response.json();
    },
  });
}

// Client-side Date grouping logic for search hits mapping
function groupEventsByEpoch(events: ActivityEvent[]): GroupedTimeline[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const lastMonth = new Date(today);
  lastMonth.setDate(lastMonth.getDate() - 30);

  const epochs: Record<string, ActivityEvent[]> = {
    'Today': [],
    'Yesterday': [],
    'Last Week': [],
    'Last Month': [],
    'Career & History': [],
  };

  for (const event of events) {
    const eventDate = new Date(event.timestamp);
    eventDate.setHours(0, 0, 0, 0);

    if (eventDate.getTime() === today.getTime()) {
      epochs['Today'].push(event);
    } else if (eventDate.getTime() === yesterday.getTime()) {
      epochs['Yesterday'].push(event);
    } else if (eventDate >= lastWeek) {
      epochs['Last Week'].push(event);
    } else if (eventDate >= lastMonth) {
      epochs['Last Month'].push(event);
    } else {
      epochs['Career & History'].push(event);
    }
  }

  const grouped: GroupedTimeline[] = [];
  const epochKeys = ['Today', 'Yesterday', 'Last Week', 'Last Month', 'Career & History'];
  
  for (const key of epochKeys) {
    if (epochs[key].length > 0) {
      grouped.push({
        epoch: key,
        events: epochs[key],
      });
    }
  }
  
  return grouped;
}
