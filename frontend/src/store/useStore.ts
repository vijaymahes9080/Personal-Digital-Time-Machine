import { create } from 'zustand';

interface UIState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  
  // Timeline Filters & Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedActivityType: string | null;
  setSelectedActivityType: (type: string | null) => void;
  selectedAppName: string | null;
  setSelectedAppName: (name: string | null) => void;
  
  // Selected Event details
  selectedEventId: string | null;
  setSelectedEventId: (id: string | null) => void;
  
  // Reset all search parameters
  resetFilters: () => void;
}

export const useStore = create<UIState>((set) => ({
  // Defaults to dark mode for a premium feel
  theme: 'dark',
  toggleTheme: () => set((state) => {
    const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
    const root = window.document.documentElement;
    if (nextTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    return { theme: nextTheme };
  }),

  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  selectedActivityType: null,
  setSelectedActivityType: (type) => set({ selectedActivityType: type }),
  
  selectedAppName: null,
  setSelectedAppName: (name) => set({ selectedAppName: name }),
  
  selectedEventId: null,
  setSelectedEventId: (id) => set({ selectedEventId: id }),

  resetFilters: () => set({
    searchQuery: '',
    selectedActivityType: null,
    selectedAppName: null
  })
}));

// Apply default theme class on first store import
if (typeof window !== 'undefined') {
  const root = window.document.documentElement;
  // ChronaAI default dark theme
  root.classList.add('dark');
}
