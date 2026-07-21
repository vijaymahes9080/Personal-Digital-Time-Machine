import React, { useState, useEffect } from 'react';
import { 
  Lightbulb, 
  Sparkles, 
  AlertTriangle, 
  Plus, 
  Trash, 
  ArrowRight, 
  BookOpen, 
  Terminal, 
  CheckSquare, 
  X, 
  Briefcase,
  Layers,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

interface Project {
  id: string;
  title: string;
  description: string;
  stage: 'Idea' | 'Researching' | 'Prototype' | 'Launched';
  techStack: string;
  notes: string;
  todos: { id: string; text: string; completed: boolean }[];
}

interface DuplicateFile {
  id: string;
  file_a: string;
  file_b: string;
  confidence: number;
  reason: string;
}

interface InnovationIdea {
  title: string;
  description: string;
  type: string;
}

const API_BASE = 'http://localhost:8000/api/v1';

export default function CreativeProjects() {
  // --- States ---
  const [projects, setProjects] = useState<Project[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateFile[]>([]);
  const [innovations, setInnovations] = useState<InnovationIdea[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);

  // Brainstorming state
  const [brainstormTopic, setBrainstormTopic] = useState('');
  const [brainstormResult, setBrainstormResult] = useState<{ title: string; description: string; reasoning: string } | null>(null);
  const [brainstorming, setBrainstorming] = useState(false);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTech, setNewTech] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Draft Planner Modal
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [draftProject, setDraftProject] = useState<{ title: string; description: string; type: string } | null>(null);
  const [draftPlanText, setDraftPlanText] = useState('');

  // Refactor Advisor Modal
  const [showAdvisorModal, setShowAdvisorModal] = useState(false);
  const [activeDuplicate, setActiveDuplicate] = useState<DuplicateFile | null>(null);

  // Project Detail/Editor Modal
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [newTodoText, setNewTodoText] = useState('');

  // --- Fetch suggestions & duplicates from backend ---
  const fetchCreativeData = async () => {
    try {
      setLoadingFeed(true);
      const res = await fetch(`${API_BASE}/creative`);
      if (res.ok) {
        const data = await res.json();
        setDuplicates(data.duplicates || []);
        setInnovations(data.innovations || []);
      }
    } catch (err) {
      console.error("Failed to load creative suggestions", err);
    } finally {
      setLoadingFeed(false);
    }
  };

  useEffect(() => {
    // Load projects from localStorage
    const saved = localStorage.getItem('chrona_ai_creative_projects');
    if (saved) {
      try {
        setProjects(JSON.parse(saved));
      } catch (e) {
        console.error("Error parsing saved projects", e);
      }
    } else {
      // Default placeholder project
      const defaultProj: Project[] = [
        {
          id: 'p-1',
          title: 'Offline-First local AI RAG',
          description: 'Secure, zero-docker local vector index manager directly targeting Tauri desktop instances.',
          stage: 'Idea',
          techStack: 'Tauri, Rust, SQLite',
          notes: 'Ensure Tesseract OCR falls back gracefully if not installed on target OS.',
          todos: [
            { id: 't-1', text: 'Research local vector embedding libraries', completed: true },
            { id: 't-2', text: 'Draft Tauri rust command boilerplate', completed: false }
          ]
        }
      ];
      setProjects(defaultProj);
      localStorage.setItem('chrona_ai_creative_projects', JSON.stringify(defaultProj));
    }

    fetchCreativeData();
  }, []);

  const saveProjects = (updated: Project[]) => {
    setProjects(updated);
    localStorage.setItem('chrona_ai_creative_projects', JSON.stringify(updated));
  };

  // --- Actions ---
  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newProj: Project = {
      id: `p-${Date.now()}`,
      title: newTitle,
      description: newDesc,
      stage: 'Idea',
      techStack: newTech || 'Any',
      notes: newNotes,
      todos: []
    };

    const updated = [...projects, newProj];
    saveProjects(updated);

    // Reset fields
    setNewTitle('');
    setNewDesc('');
    setNewTech('');
    setNewNotes('');
    setShowAddModal(false);
  };

  const moveProjectStage = (id: string, dir: 'left' | 'right') => {
    const stages: Project['stage'][] = ['Idea', 'Researching', 'Prototype', 'Launched'];
    const updated = projects.map(p => {
      if (p.id === id) {
        const idx = stages.indexOf(p.stage);
        let nextIdx = idx + (dir === 'right' ? 1 : -1);
        if (nextIdx >= 0 && nextIdx < stages.length) {
          return { ...p, stage: stages[nextIdx] };
        }
      }
      return p;
    });
    saveProjects(updated);
  };

  const handleDeleteProject = (id: string) => {
    const updated = projects.filter(p => p.id !== id);
    saveProjects(updated);
    if (editingProject?.id === id) {
      setEditingProject(null);
    }
  };

  // Brainstorming Assistant trigger
  const handleBrainstorm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brainstormTopic.trim()) return;

    try {
      setBrainstorming(true);
      const res = await fetch(`${API_BASE}/creative/brainstorm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: brainstormTopic })
      });
      if (res.ok) {
        const data = await res.json();
        setBrainstormResult(data);
      }
    } catch (err) {
      console.error("Failed to brainstorm topic", err);
    } finally {
      setBrainstorming(false);
    }
  };

  const createProjectFromBrainstorm = () => {
    if (!brainstormResult) return;
    const newProj: Project = {
      id: `p-${Date.now()}`,
      title: brainstormResult.title,
      description: brainstormResult.description,
      stage: 'Idea',
      techStack: 'Python/TypeScript',
      notes: `Reasoning: ${brainstormResult.reasoning}`,
      todos: []
    };
    saveProjects([...projects, newProj]);
    setBrainstormResult(null);
    setBrainstormTopic('');
  };

  const handleOpenDraftPlanner = (idea: InnovationIdea) => {
    setDraftProject(idea);
    setDraftPlanText(
      `# Project: ${idea.title}\n` +
      `Category: ${idea.type}\n\n` +
      `## Overview\n` +
      `${idea.description}\n\n` +
      `## Proposed Tech Stack\n` +
      `- Core framework:\n` +
      `- Database/Storage:\n` +
      `- Deployment:\n\n` +
      `## Milestones\n` +
      `- [ ] Core Architecture Outline\n` +
      `- [ ] Prototype MVP\n` +
      `- [ ] Alpha Release`
    );
    setShowDraftModal(true);
  };

  const handleSaveDraftToBoard = () => {
    if (!draftProject) return;
    const newProj: Project = {
      id: `p-${Date.now()}`,
      title: draftProject.title,
      description: draftProject.description,
      stage: 'Idea',
      techStack: 'TBD',
      notes: draftPlanText,
      todos: [
        { id: `t-${Date.now()}-1`, text: 'Core Architecture Outline', completed: false },
        { id: `t-${Date.now()}-2`, text: 'Prototype MVP', completed: false },
        { id: `t-${Date.now()}-3`, text: 'Alpha Release', completed: false }
      ]
    };
    saveProjects([...projects, newProj]);
    setShowDraftModal(false);
    setDraftProject(null);
  };

  // Todo items actions inside Project Editor
  const handleAddTodo = () => {
    if (!newTodoText.trim() || !editingProject) return;
    const newTodo = {
      id: `t-${Date.now()}`,
      text: newTodoText,
      completed: false
    };
    const updatedProject = {
      ...editingProject,
      todos: [...editingProject.todos, newTodo]
    };
    setEditingProject(updatedProject);
    const updatedList = projects.map(p => p.id === editingProject.id ? updatedProject : p);
    saveProjects(updatedList);
    setNewTodoText('');
  };

  const handleToggleTodo = (todoId: string) => {
    if (!editingProject) return;
    const updatedTodos = editingProject.todos.map(t => t.id === todoId ? { ...t, completed: !t.completed } : t);
    const updatedProject = { ...editingProject, todos: updatedTodos };
    setEditingProject(updatedProject);
    const updatedList = projects.map(p => p.id === editingProject.id ? updatedProject : p);
    saveProjects(updatedList);
  };

  const handleSaveNotes = () => {
    if (!editingProject) return;
    const updatedProject = { ...editingProject, notes: editNotes };
    setEditingProject(updatedProject);
    const updatedList = projects.map(p => p.id === editingProject.id ? updatedProject : p);
    saveProjects(updatedList);
  };

  // Render variables
  const stages: Project['stage'][] = ['Idea', 'Researching', 'Prototype', 'Launched'];

  return (
    <div className="h-full w-full overflow-y-auto p-6 md:p-8 flex flex-col gap-8 scrollbar-thin bg-background-light dark:bg-background-dark">
      
      {/* 1. Header Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/10">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary-500/10 border border-primary-500/30 flex items-center justify-center text-primary-500 shadow-glow-primary">
            <Sparkles className="h-6 w-6 text-primary-500" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-slate-800 dark:text-slate-100">
              Creative & Innovation Projects
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Explore dynamic suggestions, detect code redundancies, and organize creative ideas into actionable projects.
            </p>
          </div>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-blue text-white rounded-xl text-xs font-semibold hover:shadow-glow-primary transition-all duration-300 transform hover:scale-[1.02]"
        >
          <Plus className="h-4 w-4" /> Add Custom Idea
        </button>
      </div>

      {/* 2. Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Kanban Board (Left side, Columns 1 & 2) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="font-display font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary-500" /> Active Innovation Board
            </h3>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              Click cards to open task planner and custom diaries
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 h-[560px]">
            {stages.map(stage => {
              const stageProjects = projects.filter(p => p.stage === stage);
              return (
                <div 
                  key={stage}
                  className="flex flex-col gap-3 p-3.5 rounded-2xl bg-white/30 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md"
                >
                  {/* Column Header */}
                  <div className="flex justify-between items-center border-b border-slate-200/20 pb-2">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-350 flex items-center gap-1.5">
                      {stage === 'Idea' && '💡'}
                      {stage === 'Researching' && '🔍'}
                      {stage === 'Prototype' && '🛠️'}
                      {stage === 'Launched' && '🚀'}
                      {stage}
                    </span>
                    <span className="text-[9px] bg-slate-200/50 dark:bg-slate-850 px-1.5 py-0.5 rounded font-bold text-slate-500">
                      {stageProjects.length}
                    </span>
                  </div>

                  {/* Cards container */}
                  <div className="flex-1 overflow-y-auto flex flex-col gap-3 scrollbar-none pr-0.5">
                    {stageProjects.length === 0 ? (
                      <div className="h-full flex items-center justify-center border border-dashed border-slate-200/50 dark:border-slate-800/50 rounded-xl p-4 text-[10px] text-slate-400/80 dark:text-slate-500/80 text-center italic">
                        No projects here
                      </div>
                    ) : (
                      stageProjects.map(proj => {
                        const completedCount = proj.todos.filter(t => t.completed).length;
                        const totalCount = proj.todos.length;
                        const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

                        return (
                          <div 
                            key={proj.id}
                            onClick={() => {
                              setEditingProject(proj);
                              setEditNotes(proj.notes);
                            }}
                            className="p-3 rounded-xl bg-white/85 dark:bg-slate-950/75 border border-slate-200/60 dark:border-slate-800/60 hover:border-primary-500/40 dark:hover:border-primary-500/40 hover:shadow-md cursor-pointer transition-all duration-300 flex flex-col gap-2 group relative"
                          >
                            {/* Card Content */}
                            <div>
                              <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate pr-4">
                                {proj.title}
                              </h4>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-2 mt-1 leading-normal">
                                {proj.description}
                              </p>
                            </div>

                            {/* Tech Stack Badge */}
                            {proj.techStack && (
                              <div className="flex">
                                <span className="text-[8px] font-bold text-accent-blue bg-accent-blue/10 px-1 py-0.5 rounded truncate max-w-full">
                                  {proj.techStack}
                                </span>
                              </div>
                            )}

                            {/* Checklist Progress */}
                            {totalCount > 0 && (
                              <div className="flex flex-col gap-1 mt-1">
                                <div className="flex justify-between items-center text-[8px] text-slate-400">
                                  <span>Tasks</span>
                                  <span>{completedCount}/{totalCount} ({percent}%)</span>
                                </div>
                                <div className="h-1 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-primary-500 to-accent-teal" 
                                    style={{ width: `${percent}%` }}
                                  ></div>
                                </div>
                              </div>
                            )}

                            {/* Controls Overlay */}
                            <div className="flex justify-between items-center mt-2 border-t border-slate-200/10 pt-2 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteProject(proj.id);
                                }}
                                className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-500/10 transition-colors"
                                title="Delete Project"
                              >
                                <Trash className="h-3 w-3" />
                              </button>
                              
                              <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                {stage !== 'Idea' && (
                                  <button 
                                    onClick={() => moveProjectStage(proj.id, 'left')}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-650"
                                    title="Move Left"
                                  >
                                    <ChevronLeft className="h-3 w-3" />
                                  </button>
                                )}
                                {stage !== 'Launched' && (
                                  <button 
                                    onClick={() => moveProjectStage(proj.id, 'right')}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-650"
                                    title="Move Right"
                                  >
                                    <ChevronRight className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Panel: Brainstorming Assistant & Duplicate alerts (Column 3) */}
        <div className="flex flex-col gap-8">
          
          {/* A. Brainstorming Assistant */}
          <div className="p-6 rounded-2xl bg-white/40 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50 flex flex-col gap-4 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 font-display">
                Local Brainstorming AI
              </h3>
            </div>
            
            <form onSubmit={handleBrainstorm} className="flex gap-2">
              <input 
                type="text" 
                placeholder="Topic: e.g. Web3, Security, OCR"
                value={brainstormTopic}
                onChange={e => setBrainstormTopic(e.target.value)}
                className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 focus:outline-none focus:ring-1 focus:ring-primary-500 text-slate-850 dark:text-slate-100"
              />
              <button 
                type="submit"
                disabled={brainstorming || !brainstormTopic.trim()}
                className="px-3 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition-colors"
              >
                {brainstorming ? '...' : 'Ask AI'}
              </button>
            </form>

            {brainstormResult && (
              <div className="p-4 rounded-xl bg-primary-500/5 border border-primary-500/10 flex flex-col gap-2 animate-fadeIn text-xs">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-slate-850 dark:text-slate-200">{brainstormResult.title}</h4>
                  <span className="text-[8px] bg-primary-500/10 text-primary-500 px-1 py-0.5 rounded font-bold">Suggested Scope</span>
                </div>
                <p className="text-[10px] text-slate-550 dark:text-slate-400 mt-1 leading-normal">
                  {brainstormResult.description}
                </p>
                <div className="mt-2 text-[9px] text-slate-450 dark:text-slate-500 border-t border-slate-200/10 pt-2 italic">
                  <strong>Stack fit:</strong> {brainstormResult.reasoning}
                </div>
                
                <button 
                  onClick={createProjectFromBrainstorm}
                  className="mt-2 flex items-center justify-center gap-1 py-1.5 bg-gradient-to-r from-primary-500 to-accent-blue text-white rounded-lg text-[10px] font-bold shadow-sm"
                >
                  <Plus className="h-3 w-3" /> Track this Project Idea
                </button>
              </div>
            )}
          </div>

          {/* B. Redundancy Alerts */}
          <div className="p-6 rounded-2xl bg-white/40 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50 flex flex-col gap-4 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 font-display">
                Workspace Redundancy Alerts
              </h3>
            </div>

            <div className="flex flex-col gap-3 max-h-[220px] overflow-y-auto scrollbar-thin">
              {loadingFeed ? (
                <span className="text-[10px] text-slate-400 italic">Scanning directory for file duplicates...</span>
              ) : duplicates.length === 0 ? (
                <span className="text-[10px] text-slate-450 dark:text-slate-500 italic">No duplicated file paths detected. Clean workspace!</span>
              ) : (
                duplicates.map((dup) => (
                  <div 
                    key={dup.id}
                    className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 flex flex-col gap-1.5 text-xs hover:bg-amber-500/10 transition-colors"
                  >
                    <span className="text-[9px] text-amber-500 font-bold uppercase tracking-wider flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Potential Duplicate
                    </span>
                    <div className="text-[9px] font-mono text-slate-500 dark:text-slate-400 break-all leading-normal">
                      <div><strong>A:</strong> {dup.file_a}</div>
                      <div className="mt-1"><strong>B:</strong> {dup.file_b}</div>
                    </div>
                    <div className="flex justify-between items-center mt-1 pt-1.5 border-t border-slate-250/20">
                      <span className="text-[9px] text-slate-400">Match similarity: {Math.round(dup.confidence * 100)}%</span>
                      <button 
                        onClick={() => {
                          setActiveDuplicate(dup);
                          setShowAdvisorModal(true);
                        }}
                        className="text-[9px] font-bold text-primary-500 hover:underline"
                      >
                        Refactor scope
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* C. Dynamic Feed */}
          <div className="p-6 rounded-2xl bg-white/40 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50 flex flex-col gap-4 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 font-display">
                Startup & Open Source Feed
              </h3>
            </div>

            <div className="flex flex-col gap-3">
              {loadingFeed ? (
                <span className="text-[10px] text-slate-400 italic">Generating innovation recommendations...</span>
              ) : innovations.length === 0 ? (
                <span className="text-[10px] text-slate-500 italic">No recommendations compiled.</span>
              ) : (
                innovations.map((inn, idx) => (
                  <div 
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/40 dark:border-slate-800/40 flex flex-col gap-1 text-xs"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-bold text-slate-700 dark:text-slate-350">{inn.title}</h4>
                      <span className="text-[8px] font-bold text-primary-500 bg-primary-500/10 px-1.5 py-0.5 rounded whitespace-nowrap">
                        {inn.type}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-550 dark:text-slate-400 leading-normal mt-1">
                      {inn.description}
                    </p>
                    <button 
                      onClick={() => handleOpenDraftPlanner(inn)}
                      className="mt-2.5 text-left text-[9px] font-bold text-primary-500 hover:text-primary-600 flex items-center gap-1.5 font-sans"
                    >
                      <BookOpen className="h-3 w-3" /> Draft scope plan <ArrowRight className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      {/* --- MODALS --- */}
      
      {/* 1. Add Custom Project Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-6 flex flex-col gap-4 shadow-xl">
            <div className="flex justify-between items-center">
              <h4 className="font-display font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary-500" /> Add Custom Innovation Idea
              </h4>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-850 rounded">
                <X className="h-4 w-4 animate-spin-once" />
              </button>
            </div>

            <form onSubmit={handleAddProject} className="flex flex-col gap-3.5 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-400 uppercase text-[9px]">Project Title</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. SQLite Graph fallback optimizer"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 focus:outline-none focus:ring-1 focus:ring-primary-500 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-400 uppercase text-[9px]">Short Description</label>
                <textarea 
                  required
                  rows={2}
                  placeholder="Summarize the core innovational thesis"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 focus:outline-none focus:ring-1 focus:ring-primary-500 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-400 uppercase text-[9px]">Target Tech Stack</label>
                <input 
                  type="text" 
                  placeholder="e.g. React, Python, FastAPI (comma separated)"
                  value={newTech}
                  onChange={e => setNewTech(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 focus:outline-none focus:ring-1 focus:ring-primary-500 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-400 uppercase text-[9px]">Scope Details & Notes</label>
                <textarea 
                  rows={3}
                  placeholder="List initial requirements or research notes"
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 focus:outline-none focus:ring-1 focus:ring-primary-500 text-slate-800 dark:text-slate-100 font-mono text-[10px]"
                />
              </div>

              <button 
                type="submit"
                className="mt-2 py-2.5 bg-gradient-to-r from-primary-500 to-accent-blue text-white rounded-xl font-bold hover:shadow-glow-primary transition-all duration-300"
              >
                Track on Kanban
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. Draft Project Plan Modal */}
      {showDraftModal && draftProject && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-6 flex flex-col gap-4 shadow-xl">
            <div className="flex justify-between items-center">
              <h4 className="font-display font-bold text-slate-850 dark:text-slate-100 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary-500" /> Draft Innovation Project Scope
              </h4>
              <button onClick={() => setShowDraftModal(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-850 rounded">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold bg-primary-500/10 text-primary-500 px-2 py-0.5 rounded">
                  {draftProject.type}
                </span>
                <span className="font-bold text-slate-700 dark:text-slate-350">{draftProject.title}</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-slate-400 uppercase text-[9px]">Project Scope Document (Markdown)</label>
                <textarea 
                  rows={12}
                  value={draftPlanText}
                  onChange={e => setDraftPlanText(e.target.value)}
                  className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 focus:outline-none focus:ring-1 focus:ring-primary-500 text-slate-850 dark:text-slate-250 font-mono text-[10px] leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2.5">
                <button 
                  onClick={() => setShowDraftModal(false)}
                  className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-xl font-semibold border border-slate-200/50 dark:border-slate-800/50 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveDraftToBoard}
                  className="px-4 py-2 bg-gradient-to-r from-primary-500 to-accent-blue text-white rounded-xl font-bold hover:shadow-glow-primary transition-all duration-300"
                >
                  Save to Kanban Board
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Refactor Advisor Modal */}
      {showAdvisorModal && activeDuplicate && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-6 flex flex-col gap-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-slate-200/25 pb-3">
              <h4 className="font-display font-bold text-amber-500 flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4" /> Codebase Refactoring Advisor
              </h4>
              <button onClick={() => setShowAdvisorModal(false)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-850 rounded">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col gap-3.5 text-xs leading-normal">
              <div>
                <span className="font-semibold text-slate-400 uppercase text-[9px]">Flagged Paths</span>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/40 dark:border-slate-800/40 font-mono text-[9px] flex flex-col gap-1.5 mt-1 text-slate-500 dark:text-slate-455 break-all">
                  <div><strong>File A:</strong> {activeDuplicate.file_a}</div>
                  <div><strong>File B:</strong> {activeDuplicate.file_b}</div>
                </div>
              </div>

              <div>
                <span className="font-semibold text-slate-400 uppercase text-[9px]">Reasoning</span>
                <p className="mt-1 text-slate-650 dark:text-slate-400 font-medium">
                  {activeDuplicate.reason}. We calculated a similarity score of <strong>{Math.round(activeDuplicate.confidence * 100)}%</strong>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex flex-col gap-2">
                <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider flex items-center gap-1">
                  🛠️ Recommended Refactoring Step
                </span>
                <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-normal">
                  {activeDuplicate.confidence === 1.0 ? (
                    "Since these two files are exact duplicates, delete one of them and update its imports to refer to the remaining copy. Keeping identical files wastes disk index performance and causes developer confusion."
                  ) : (
                    "These files contain duplicate structure or naming. We recommend extracting their common logic (e.g. configurations, interfaces, base logic) into a shared utility file, then inheriting or importing that utility from both files."
                  )}
                </p>
              </div>

              <div className="flex justify-end mt-2">
                <button 
                  onClick={() => setShowAdvisorModal(false)}
                  className="px-4 py-2 bg-slate-900 text-white dark:bg-slate-800 rounded-xl font-bold"
                >
                  Acknowledge Advice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Project Detail / Tasks Board Modal */}
      {editingProject && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-6 flex flex-col gap-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-slate-200/25 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold bg-primary-500/10 text-primary-500 px-2 py-0.5 rounded">
                  {editingProject.stage}
                </span>
                <h4 className="font-display font-bold text-slate-850 dark:text-slate-100 text-sm">
                  {editingProject.title}
                </h4>
              </div>
              <button onClick={() => setEditingProject(null)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-850 rounded">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              
              {/* Left column: Details & Notes */}
              <div className="flex flex-col gap-4">
                <div>
                  <span className="font-semibold text-slate-400 uppercase text-[9px]">Description</span>
                  <p className="mt-1 text-slate-650 dark:text-slate-400 leading-normal font-medium">
                    {editingProject.description}
                  </p>
                </div>
                <div>
                  <span className="font-semibold text-slate-400 uppercase text-[9px]">Tech Stack</span>
                  <p className="mt-1 text-slate-650 dark:text-slate-400 font-semibold font-mono">
                    {editingProject.techStack}
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="font-semibold text-slate-400 uppercase text-[9px]">Diaries & Planner Notes</span>
                  <textarea 
                    rows={8}
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 focus:outline-none focus:ring-1 focus:ring-primary-500 text-slate-800 dark:text-slate-300 font-mono text-[10px]"
                  />
                  <button 
                    onClick={handleSaveNotes}
                    className="py-1.5 px-3 bg-slate-100 dark:bg-slate-850 text-slate-700 dark:text-slate-350 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-[10px] font-bold self-end border border-slate-250/20"
                  >
                    Save Notes
                  </button>
                </div>
              </div>

              {/* Right column: Checklist / Todos */}
              <div className="flex flex-col gap-4">
                <span className="font-semibold text-slate-400 uppercase text-[9px] flex items-center gap-1">
                  <CheckSquare className="h-3.5 w-3.5" /> Project Checklist
                </span>

                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="New milestone task..."
                    value={newTodoText}
                    onChange={e => setNewTodoText(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 focus:outline-none text-[10px] text-slate-800 dark:text-slate-100"
                  />
                  <button 
                    onClick={handleAddTodo}
                    className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-semibold text-[10px]"
                  >
                    Add
                  </button>
                </div>

                {/* Todos list */}
                <div className="flex-1 max-h-[220px] overflow-y-auto border border-slate-200/40 dark:border-slate-800/40 rounded-xl p-3 flex flex-col gap-2.5 scrollbar-thin">
                  {editingProject.todos.length === 0 ? (
                    <span className="text-[10px] text-slate-400 italic text-center py-4">No tasks added yet.</span>
                  ) : (
                    editingProject.todos.map(todo => (
                      <div 
                        key={todo.id}
                        onClick={() => handleToggleTodo(todo.id)}
                        className="flex items-center gap-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/60 p-1.5 rounded-lg transition-colors group"
                      >
                        <input 
                          type="checkbox" 
                          checked={todo.completed}
                          onChange={() => {}} // handled by click container
                          className="rounded text-primary-500 focus:ring-primary-500 h-3.5 w-3.5"
                        />
                        <span className={`text-[11px] ${todo.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-300 font-medium'}`}>
                          {todo.text}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            <div className="flex justify-between items-center border-t border-slate-200/25 pt-3 mt-2 text-xs">
              <button 
                onClick={() => {
                  handleDeleteProject(editingProject.id);
                }}
                className="flex items-center gap-1.5 text-red-500 hover:bg-red-500/10 py-1.5 px-3 rounded-lg"
              >
                <Trash className="h-3.5 w-3.5" /> Delete Project
              </button>
              <button 
                onClick={() => setEditingProject(null)}
                className="px-4 py-1.5 bg-slate-900 text-white dark:bg-slate-800 rounded-lg font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
