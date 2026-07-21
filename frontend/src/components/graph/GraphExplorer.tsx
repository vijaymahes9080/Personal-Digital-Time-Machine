import React, { useEffect, useRef, useState } from 'react';
import { useGraph, ActivityEvent } from '../../hooks/useTimeline';
import { 
  RefreshCw, 
  Search, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Zap, 
  Workflow,
  HelpCircle,
  Clock
} from 'lucide-react';

interface SimNode {
  id: string;
  label: string;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number | null;
  fy?: number | null;
  radius: number;
  properties: Record<string, any>;
}

interface SimEdge {
  source: string;
  target: string;
  relationship: string;
  properties: Record<string, any>;
}

function GraphExplorer() {
  const [q, setQ] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<SimNode | null>(null);

  // Fetch filtered graph structures
  const { data: graphData, isLoading, error, refetch } = useGraph(q, selectedType);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Simulation Settings & Physics States
  const nodesRef = useRef<SimNode[]>([]);
  const edgesRef = useRef<SimEdge[]>([]);
  
  // Pan and Zoom
  const [zoom, setZoom] = useState(1.0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const isDraggingViewport = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Physics simulation running flag
  const [isSimulating, setIsSimulating] = useState(true);

  // Dragging Node state
  const draggedNodeRef = useRef<SimNode | null>(null);

  // Color code mappings by Entity type
  const nodeColors: Record<string, { fill: string; border: string; glow: string }> = {
    Person: { fill: '#3b82f6', border: '#1d4ed8', glow: 'rgba(59, 130, 246, 0.4)' },      // Blue
    Technology: { fill: '#8b5cf6', border: '#6d28d9', glow: 'rgba(139, 92, 246, 0.4)' },  // Violet
    File: { fill: '#f59e0b', border: '#b45309', glow: 'rgba(245, 158, 11, 0.4)' },        // Amber
    Project: { fill: '#06b6d4', border: '#0e7490', glow: 'rgba(6, 182, 212, 0.4)' },       // Cyan
    Event: { fill: '#64748b', border: '#475569', glow: 'rgba(100, 116, 139, 0.4)' },       // Slate
    Concept: { fill: '#ec4899', border: '#be185d', glow: 'rgba(236, 72, 153, 0.4)' },     // Pink
    Error: { fill: '#ef4444', border: '#b91c1c', glow: 'rgba(239, 68, 68, 0.4)' },         // Red
  };

  const getEntityName = (node: any) => {
    return node.properties?.name || node.properties?.title || node.id;
  };

  // Sync incoming API data with simulation reference states
  useEffect(() => {
    if (!graphData) return;

    // Preserve existing coordinates when refreshing to avoid visual jumps
    const existingMap = new Map(nodesRef.current.map(n => [n.id, n]));
    
    const nextNodes: SimNode[] = graphData.nodes.map((node: any) => {
      const existing = existingMap.get(node.id);
      
      const width = canvasRef.current?.width || 800;
      const height = canvasRef.current?.height || 500;
      
      // Random coordinates around center if brand new
      const x = existing ? existing.x : (width / 2) + (Math.random() - 0.5) * 200;
      const y = existing ? existing.y : (height / 2) + (Math.random() - 0.5) * 200;
      
      return {
        id: node.id,
        label: node.label,
        name: getEntityName(node),
        x,
        y,
        vx: existing ? existing.vx : 0,
        vy: existing ? existing.vy : 0,
        fx: existing ? existing.fx : null,
        fy: existing ? existing.fy : null,
        radius: node.label === 'Person' ? 24 : node.label === 'Project' ? 18 : 12,
        properties: node.properties || {}
      };
    });

    nodesRef.current = nextNodes;
    edgesRef.current = graphData.edges.map((edge: any) => ({
      source: edge.source,
      target: edge.target,
      relationship: edge.relationship,
      properties: edge.properties || {}
    }));

    // If selectedNode is set, sync its fields too
    if (selectedNode) {
      const updated = nextNodes.find(n => n.id === selectedNode.id);
      if (updated) setSelectedNode(updated);
    }
  }, [graphData]);

  // Main Canvas Render & Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const tick = () => {
      // 1. Run Force-Directed Physics Updates (Verlet integration)
      if (isSimulating && nodesRef.current.length > 0) {
        const nodes = nodesRef.current;
        const edges = edgesRef.current;
        const width = canvas.width;
        const height = canvas.height;

        const chargeStrength = 200;
        const linkStrength = 0.05;
        const linkLength = 80;
        const gravityStrength = 0.02;

        // Force A: Node Repulsion (Charge)
        for (let i = 0; i < nodes.length; i++) {
          const nodeA = nodes[i];
          for (let j = i + 1; j < nodes.length; j++) {
            const nodeB = nodes[j];
            const dx = nodeB.x - nodeA.x;
            const dy = nodeB.y - nodeA.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1.0;
            
            // Repulsion formula
            const force = (chargeStrength * nodeA.radius * nodeB.radius) / (dist * dist);
            const pushX = (dx / dist) * force;
            const pushY = (dy / dist) * force;

            if (!nodeA.fx) { nodeA.vx -= pushX; nodeA.vy -= pushY; }
            if (!nodeB.fx) { nodeB.vx += pushX; nodeB.vy += pushY; }
          }
        }

        // Force B: Spring Attraction on Links (Edges)
        const nodeMap = new Map(nodes.map(n => [n.id, n]));
        for (const edge of edges) {
          const sourceNode = nodeMap.get(edge.source);
          const targetNode = nodeMap.get(edge.target);
          if (!sourceNode || !targetNode) continue;

          const dx = targetNode.x - sourceNode.x;
          const dy = targetNode.y - sourceNode.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1.0;
          
          // Spring force formula
          const force = (dist - linkLength) * linkStrength;
          const pullX = (dx / dist) * force;
          const pullY = (dy / dist) * force;

          if (!sourceNode.fx) { sourceNode.vx += pullX; sourceNode.vy += pullY; }
          if (!targetNode.fx) { targetNode.vx -= pullX; targetNode.vy -= pullY; }
        }

        // Force C: Center Gravity & Update velocities
        const cx = width / 2;
        const cy = height / 2;
        
        for (const node of nodes) {
          if (node.fx !== null && node.fx !== undefined) {
            node.x = node.fx;
            node.y = node.fy!;
            node.vx = 0;
            node.vy = 0;
          } else {
            // Pull to center gravity
            node.vx += (cx - node.x) * gravityStrength;
            node.vy += (cy - node.y) * gravityStrength;
            
            // Apply velocities & damping friction
            node.x += node.vx;
            node.y += node.vy;
            node.vx *= 0.85;
            node.vy *= 0.85;
          }
        }
      }

      // 2. Draw Graph Canvas Elements
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      
      // Apply pan & zoom translation matrix
      ctx.translate(panX, panY);
      ctx.scale(zoom, zoom);

      // Draw Edges / Relationships
      const nodeMap = new Map(nodesRef.current.map(n => [n.id, n]));
      for (const edge of edgesRef.current) {
        const src = nodeMap.get(edge.source);
        const dst = nodeMap.get(edge.target);
        if (!src || !dst) continue;

        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(dst.x, dst.y);
        ctx.strokeStyle = '#23304d';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw Nodes
      for (const node of nodesRef.current) {
        const themeColors = nodeColors[node.label] || { fill: '#64748b', border: '#475569', glow: 'rgba(0,0,0,0)' };
        
        // Draw Node glow ring
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 6, 0, 2 * Math.PI);
        ctx.fillStyle = themeColors.glow;
        ctx.fill();

        // Draw solid Node core
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
        ctx.fillStyle = themeColors.fill;
        ctx.strokeStyle = themeColors.border;
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();

        // Draw Node label text
        ctx.font = 'display 10px Outfit, sans-serif';
        ctx.fillStyle = '#94a3b8'; // Slate light
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(node.name, node.x, node.y + node.radius + 4);
      }

      ctx.restore();
      animationFrameId = requestAnimationFrame(tick);
    };

    tick();
    return () => cancelAnimationFrame(animationFrameId);
  }, [panX, panY, zoom, isSimulating]);

  // Adjust canvas bounds on screen resizes
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = canvas.parentElement?.clientWidth || 800;
      canvas.height = canvas.parentElement?.clientHeight || 500;
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial trigger
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Interaction Event Handlers ---

  const getCanvasMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Position relative to canvas screen coordinates
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert screen coordinates back into simulated zoomed/panned dimensions
    const simX = (mouseX - panX) / zoom;
    const simY = (mouseY - panY) / zoom;

    return { x: simX, y: simY, screenX: mouseX, screenY: mouseY };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasMousePos(e);
    
    // Check if clicked a node
    let clickedNode: SimNode | null = null;
    for (const node of nodesRef.current) {
      const dx = pos.x - node.x;
      const dy = pos.y - node.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= node.radius) {
        clickedNode = node;
        break;
      }
    }

    if (clickedNode) {
      // Initiate Node Drag
      draggedNodeRef.current = clickedNode;
      clickedNode.fx = pos.x;
      clickedNode.fy = pos.y;
      setSelectedNode(clickedNode);
    } else {
      // Initiate Viewport Pan Drag
      isDraggingViewport.current = true;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasMousePos(e);
    
    if (draggedNodeRef.current) {
      // Update dragged node position
      draggedNodeRef.current.fx = pos.x;
      draggedNodeRef.current.fy = pos.y;
    } else if (isDraggingViewport.current) {
      // Pan viewport
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      setPanX(prev => prev + dx);
      setPanY(prev => prev + dy);
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => {
    if (draggedNodeRef.current) {
      draggedNodeRef.current.fx = null;
      draggedNodeRef.current.fy = null;
      draggedNodeRef.current = null;
    }
    isDraggingViewport.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = 1.05;
    if (e.deltaY < 0) {
      setZoom(prev => Math.min(prev * zoomFactor, 3.0));
    } else {
      setZoom(prev => Math.max(prev / zoomFactor, 0.4));
    }
  };

  const resetView = () => {
    setZoom(1.0);
    setPanX(0);
    setPanY(0);
    
    // Reposition nodes loosely around center
    const canvas = canvasRef.current;
    if (canvas) {
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      nodesRef.current.forEach(node => {
        node.x = cx + (Math.random() - 0.5) * 100;
        node.y = cy + (Math.random() - 0.5) * 100;
        node.vx = 0;
        node.vy = 0;
      });
    }
  };

  // Lists outgoing relationships of selected node
  const getRelationsList = (nodeId: string) => {
    const list: { nodeName: string; relationship: string; label: string }[] = [];
    const nodeMap = new Map(nodesRef.current.map(n => [n.id, n]));
    
    for (const edge of edgesRef.current) {
      if (edge.source === nodeId) {
        const dest = nodeMap.get(edge.target);
        if (dest) {
          list.push({ nodeName: dest.name, relationship: edge.relationship, label: dest.label });
        }
      }
    }
    return list;
  };

  const activeRelations = selectedNode ? getRelationsList(selectedNode.id) : [];

  return (
    <div className="h-full w-full flex flex-col md:flex-row overflow-hidden relative">
      
      {/* 1. Left Canvas Explorer */}
      <div className="flex-1 flex flex-col min-w-0 h-[60vh] md:h-full relative bg-slate-950/20">
        
        {/* Controls Toolbar Overlay */}
        <div className="absolute top-4 left-4 flex gap-2 z-10 glass-panel p-1.5 rounded-xl border border-slate-200/40 dark:border-slate-800/40">
          <button 
            onClick={() => setZoom(prev => Math.min(prev * 1.1, 3.0))}
            className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button 
            onClick={() => setZoom(prev => Math.max(prev / 1.1, 0.4))}
            className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button 
            onClick={resetView}
            className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400"
            title="Fit Center"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button 
            onClick={() => setIsSimulating(!isSimulating)}
            className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${
              isSimulating 
                ? 'text-accent-teal hover:bg-slate-100 dark:hover:bg-slate-800' 
                : 'text-slate-400 bg-slate-200 dark:bg-slate-800'
            }`}
            title={isSimulating ? 'Pause physics' : 'Resume physics'}
          >
            <Zap className="h-4 w-4" />
          </button>
        </div>

        {/* Filter tags panel */}
        <div className="absolute top-4 right-4 flex gap-1.5 z-10">
          {['Person', 'Technology', 'Project', 'File', 'Error', 'Concept'].map(type => {
            const isSelected = selectedType === type;
            return (
              <button
                key={type}
                onClick={() => setSelectedType(isSelected ? null : type)}
                className={`px-3 py-1 rounded-full text-[10px] font-semibold border transition-all ${
                  isSelected 
                    ? 'bg-primary-500/20 border-primary-500 text-primary-500'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {type}
              </button>
            );
          })}
        </div>

        {/* Canvas Area */}
        <div className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            className="block h-full w-full"
          />
        </div>
      </div>

      {/* 2. Right Node Analysis Panel */}
      <aside className="w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-200/50 dark:border-slate-800/50 glass-panel flex flex-col overflow-hidden h-[40vh] md:h-full">
        
        {/* Node detail Header */}
        <div className="p-5 border-b border-slate-200/40 dark:border-slate-800/40 bg-slate-100/50 dark:bg-slate-950/20 shrink-0">
          <div className="flex items-center gap-2">
            <Workflow className="h-4 w-4 text-primary-500" />
            <h3 className="font-display font-bold text-sm tracking-tight text-slate-800 dark:text-slate-100">
              Connection Inspector
            </h3>
          </div>
        </div>

        {/* Sidebar details contents */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
          {selectedNode ? (
            <div className="flex flex-col gap-5">
              
              {/* Type Category Indicator */}
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
                  Entity Category
                </span>
                <div className="mt-1 flex items-center gap-2">
                  <span 
                    className="h-2.5 w-2.5 rounded-full border" 
                    style={{ 
                      backgroundColor: nodeColors[selectedNode.label]?.fill || '#64748b', 
                      borderColor: nodeColors[selectedNode.label]?.border || '#475569' 
                    }}
                  ></span>
                  <span className="text-xs font-semibold">{selectedNode.label}</span>
                </div>
              </div>

              {/* Node title */}
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
                  Node Identifier
                </span>
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-1 font-display leading-tight break-all">
                  {selectedNode.name}
                </h4>
              </div>

              {/* Node properties inspector */}
              {Object.keys(selectedNode.properties).length > 0 && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block mb-2">
                    Properties Log
                  </span>
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/40 dark:border-slate-800/40 text-xs font-mono flex flex-col gap-2.5 overflow-hidden">
                    {Object.entries(selectedNode.properties).map(([key, val]) => (
                      <div key={key} className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 capitalize">{key}</span>
                        <span className="text-slate-600 dark:text-slate-400 break-all text-[11px]">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Outbound relations listing */}
              <div className="flex flex-col gap-3">
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">
                  Active Relationships
                </span>
                
                {activeRelations.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {activeRelations.map((rel, idx) => (
                      <div 
                        key={idx} 
                        className="p-3 rounded-xl bg-white/40 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50 flex flex-col gap-1 text-xs"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-[9px] bg-primary-500/10 text-primary-500 px-1.5 py-0.5 rounded border border-primary-500/20">
                            {rel.relationship}
                          </span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold">{rel.label}</span>
                        </div>
                        <p className="font-semibold text-slate-700 dark:text-slate-300 truncate mt-1">
                          {rel.nodeName}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                    No relationships indexed for this node.
                  </p>
                )}
              </div>

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 gap-2 text-slate-400 dark:text-slate-500 my-auto">
              <HelpCircle className="h-10 w-10 text-slate-300 dark:text-slate-800" />
              <p className="text-xs font-semibold">Select a Node</p>
              <p className="text-[11px] text-slate-400/80 leading-relaxed max-w-[200px]">
                Click on any node in the left simulation pane to inspect its metadata properties and connected edges.
              </p>
            </div>
          )}
        </div>
      </aside>

    </div>
  );
}

export default GraphExplorer;
