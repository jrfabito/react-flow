import { useState, useRef, useCallback, useEffect } from 'react';
import ETLCanvas from './ETLCanvas.jsx';
import EdgeMarkers from './EdgeMarkers.jsx';
import NodePropertiesPanel from './NodePropertiesPanel.jsx';
import NodeToolbar from './NodeToolbar.jsx';
import { nodeTypes } from '../nodes/DataNode.jsx';
import { CONNECTION_RULES, deriveCategory } from '../utils/connectionRules.js';
import { isFormComplete } from '../forms/schemas/index.js';

const edgeDefaults = { type: 'etlEdge' };

const HISTORY_LIMIT = 50;
const NODE_HEIGHT   = 80;

function findClearPosition(proposedPos, existingNodes, nodeWidth = 280, nodeHeight = 100, snapGrid = 20) {
  const snap = (val) => Math.round(val / snapGrid) * snapGrid;
  let x = snap(proposedPos.x);
  let y = snap(proposedPos.y);
  const overlaps = (px, py) => existingNodes.some(n =>
    Math.abs(n.position.x - px) < nodeWidth &&
    Math.abs(n.position.y - py) < nodeHeight
  );
  let attempts = 0;
  while (overlaps(x, y) && attempts < 100) {
    y = snap(y + nodeHeight + 20);
    if (attempts > 0 && attempts % 5 === 0) {
      x = snap(x + nodeWidth + 20);
      y = snap(proposedPos.y);
    }
    attempts++;
  }
  return { x, y };
}

export default function AuthoringView({ onCanRunChange, onCanvasStateChange, initialNodes = [], initialEdges = [] }) {
  const [selectedNode, setSelectedNode]       = useState(null);
  const [history, setHistory]                 = useState([]);
  const [future, setFuture]                   = useState([]);
  const [splitPanelOpen, setSplitPanelOpen]   = useState(false);
  const [allNodes, setAllNodes]               = useState([]);
  const [allEdges, setAllEdges]               = useState([]);
  const [hasEverHadNodes, setHasEverHadNodes] = useState(initialNodes.length > 0);
  const defaultPanelWidth                     = Math.round(window.innerWidth / (1 + 1.618));
  const [panelWidth, setPanelWidth]           = useState(defaultPanelWidth);
  const canvasRef        = useRef(null);
  const canvasWrapperRef = useRef(null);
  const isDraggingRef    = useRef(false);

  // ── History helpers ────────────────────────────────────────────────────────

  const pushHistory = useCallback(() => {
    const snapshot = {
      nodes: canvasRef.current?.getNodes() ?? [],
      edges: canvasRef.current?.getEdges() ?? [],
    };
    setHistory(prev => {
      const base = prev.length >= HISTORY_LIMIT ? prev.slice(1) : prev;
      return [...base, snapshot];
    });
    setFuture([]);
  }, []);

  // ── Canvas event handlers ──────────────────────────────────────────────────

  const handleNodeSelect = (node) => {
    setSelectedNode(node);
    setSplitPanelOpen(true);
  };

  const handleUpdateNode = useCallback((id, patch) => {
    pushHistory();
    canvasRef.current?.updateNodeData(id, patch);
    setSelectedNode(prev =>
      prev?.id === id ? { ...prev, data: { ...prev.data, ...patch } } : prev
    );
  }, [pushHistory]);

  const handleAddNode = useCallback((registryItem) => {
    const newCategory      = deriveCategory(registryItem.type);
    const selectedCategory = selectedNode ? deriveCategory(selectedNode.data.type) : null;
    const canConnect       = selectedCategory !== null &&
      CONNECTION_RULES[selectedCategory]?.includes(newCategory);

    const existingNodes = canvasRef.current?.getNodes() ?? [];

    let position;
    if (canConnect) {
      const proposed = {
        x: selectedNode.position.x,
        y: selectedNode.position.y + NODE_HEIGHT + 80,
      };
      position = findClearPosition(proposed, existingNodes);
    } else if (selectedNode) {
      const proposed = {
        x: selectedNode.position.x + (selectedNode.measured?.width ?? 280) + 80,
        y: selectedNode.position.y,
      };
      position = findClearPosition(proposed, existingNodes);
    } else {
      const el = canvasWrapperRef.current;
      const rect = el
        ? el.getBoundingClientRect()
        : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };

      const screenCenter = {
        x: rect.left + rect.width  / 2,
        y: rect.top  + rect.height / 2,
      };

      const flowCenter = canvasRef.current?.screenToFlowPosition(screenCenter) ?? { x: 0, y: 0 };

      const basePosition = {
        x: Math.round(flowCenter.x / 20) * 20,
        y: Math.round(flowCenter.y / 20) * 20,
      };

      position = findClearPosition(basePosition, existingNodes);
    }

    const sameTypeCount = existingNodes.filter(n => n.data.iconType === registryItem.iconType).length;
    const label         = `${registryItem.label} ${newCategory.toLowerCase()} ${sameTypeCount + 1}`;
    const newNodeId     = `node-${Date.now()}`;

    const newNode = {
      id:       newNodeId,
      type:     'dataNode',
      position,
      selected: true,
      data: {
        type:     registryItem.type,
        label,
        iconType: registryItem.iconType,
        status:   'pending',
      },
    };

    pushHistory();
    canvasRef.current?.addNode(newNode);

    setTimeout(() => {
      canvasRef.current?.panToNode(newNodeId);
    }, 50);

    if (canConnect) {
      canvasRef.current?.addEdge({
        id:     `e-${selectedNode.id}-${newNodeId}`,
        source: selectedNode.id,
        target: newNodeId,
        ...edgeDefaults,
      });
    }

    setSelectedNode(newNode);
    setSplitPanelOpen(true);
  }, [selectedNode, pushHistory]);

  // ── Export JSON ───────────────────────────────────────────────────────────

  const handleExportJson = useCallback(() => {
    const nodes = canvasRef.current?.getNodes() ?? [];
    const edges = canvasRef.current?.getEdges() ?? [];
    const json = JSON.stringify({ nodes, edges }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'etl-job.json';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // ── Load JSON ─────────────────────────────────────────────────────────────

  const handleLoadJson = useCallback((data) => {
    if (!Array.isArray(data?.nodes) || !Array.isArray(data?.edges)) return;
    canvasRef.current?.setNodes(data.nodes);
    canvasRef.current?.setEdges(data.edges);
    setSelectedNode(null);
    setHistory([]);
    setFuture([]);
    setTimeout(() => canvasRef.current?.fitView({ padding: 0.12, duration: 300 }), 50);
  }, []);

  // ── Pane click (clear selection but keep panel open) ──────────────────────

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // ── Add / Remove edge (from form selects) ─────────────────────────────────

  const handleAddEdge = useCallback((edge) => {
    pushHistory();
    canvasRef.current?.addEdge(edge);
  }, [pushHistory]);

  const handleRemoveEdge = useCallback((edgeId) => {
    pushHistory();
    canvasRef.current?.setEdges(prev => prev.filter(e => e.id !== edgeId));
  }, [pushHistory]);

  // ── Reconnect (push history before edge update) ────────────────────────────

  const handleReconnect = useCallback(() => {
    pushHistory();
  }, [pushHistory]);

  // ── Undo / Redo / Remove ───────────────────────────────────────────────────

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const snapshot = history[history.length - 1];
    const current  = {
      nodes: canvasRef.current?.getNodes() ?? [],
      edges: canvasRef.current?.getEdges() ?? [],
    };
    setFuture(prev => [...prev, current]);
    setHistory(prev => prev.slice(0, -1));
    canvasRef.current?.setNodes(snapshot.nodes);
    canvasRef.current?.setEdges(snapshot.edges);
    setSelectedNode(null);
  }, [history]);

  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    const snapshot = future[future.length - 1];
    const current  = {
      nodes: canvasRef.current?.getNodes() ?? [],
      edges: canvasRef.current?.getEdges() ?? [],
    };
    setHistory(prev => {
      const base = prev.length >= HISTORY_LIMIT ? prev.slice(1) : prev;
      return [...base, current];
    });
    setFuture(prev => prev.slice(0, -1));
    canvasRef.current?.setNodes(snapshot.nodes);
    canvasRef.current?.setEdges(snapshot.edges);
    setSelectedNode(null);
  }, [future]);

  const handleRemove = useCallback(() => {
    if (!selectedNode) return;
    const id           = selectedNode.id;
    const currentNodes = canvasRef.current?.getNodes() ?? [];
    const currentEdges = canvasRef.current?.getEdges() ?? [];
    pushHistory();
    canvasRef.current?.setNodes(currentNodes.filter(n => n.id !== id));
    canvasRef.current?.setEdges(currentEdges.filter(e => e.source !== id && e.target !== id));
    setSelectedNode(null);
  }, [selectedNode, pushHistory]);

  // ── Derived state ──────────────────────────────────────────────────────────

  const connectedEdgeIds = selectedNode
    ? allEdges
        .filter(e => e.source === selectedNode.id || e.target === selectedNode.id)
        .map(e => e.id)
    : [];

  // ── Upstream status propagation ───────────────────────────────────────────
  // A Transform/Target node can only be 'success' if every upstream node is also
  // 'success'. This effect watches the full node+edge graph and corrects status
  // whenever an upstream node changes — regardless of which node is selected.
  useEffect(() => {
    for (const node of allNodes) {
      const cat = node.data.type?.split(' - ')[0];
      if (cat === 'Source') continue;

      const incoming = allEdges.filter(e => e.target === node.id);
      if (incoming.length === 0) continue;

      const allUpstreamReady = incoming.every(
        e => allNodes.find(n => n.id === e.source)?.data?.status === 'success'
      );

      if (!allUpstreamReady && node.data.status === 'success') {
        canvasRef.current?.updateNodeData(node.id, { status: 'pending' });
        setSelectedNode(prev =>
          prev?.id === node.id ? { ...prev, data: { ...prev.data, status: 'pending' } } : prev
        );
      } else if (allUpstreamReady && node.data.status === 'pending' &&
                 isFormComplete(node.data.type, node.data.config ?? {}, node.data.label)) {
        canvasRef.current?.updateNodeData(node.id, { status: 'success' });
        setSelectedNode(prev =>
          prev?.id === node.id ? { ...prev, data: { ...prev.data, status: 'success' } } : prev
        );
      }
    }
  }, [allNodes, allEdges]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (allNodes.length > 0) setHasEverHadNodes(true);
  }, [allNodes.length]);

  useEffect(() => {
    const hasSource  = allNodes.some(n => n.data.type?.startsWith('Source'));
    const hasTarget  = allNodes.some(n => n.data.type?.startsWith('Target'));
    const allSuccess = allNodes.length > 0 && allNodes.every(n => n.data.status === 'success');
    const connectedIds = new Set(allEdges.flatMap(e => [e.source, e.target]));
    const allConnected = allNodes.length > 0 && allNodes.every(n => connectedIds.has(n.id));
    onCanRunChange?.(hasSource && hasTarget && allSuccess && allConnected);
  }, [allNodes, allEdges]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    onCanvasStateChange?.({ nodes: allNodes, edges: allEdges });
  }, [allNodes, allEdges]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Drag handle ────────────────────────────────────────────────────────────

  const handleDragStart = (e) => {
    isDraggingRef.current = true;
    const startX     = e.clientX;
    const startWidth = panelWidth;

    const onMouseMove = (ev) => {
      if (!isDraggingRef.current) return;
      const delta    = startX - ev.clientX;
      const newWidth = Math.max(640, Math.min(1200, startWidth + delta));
      setPanelWidth(newWidth);
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <EdgeMarkers />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div ref={canvasWrapperRef} style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, pointerEvents: 'none' }}>
            <div style={{ pointerEvents: 'auto', display: 'inline-block' }}>
              <NodeToolbar
                onAddNode={handleAddNode}
                onUndo={handleUndo}     canUndo={history.length > 0}
                onRedo={handleRedo}     canRedo={future.length > 0}
                onRemove={handleRemove} canRemove={selectedNode !== null}
                onLoadJson={handleLoadJson}
                onExportJson={handleExportJson}
                showGuideAlert={!hasEverHadNodes}
              />
            </div>
          </div>
          <ETLCanvas
            ref={canvasRef}
            initialNodes={initialNodes}
            initialEdges={initialEdges}
            nodeTypes={nodeTypes}
            onNodeSelect={handleNodeSelect}
            onPaneClick={handlePaneClick}
            connectedEdgeIds={connectedEdgeIds}
            onReconnect={handleReconnect}
            onEdgesSync={setAllEdges}
            onNodesSync={setAllNodes}
            readOnly={false}
          />
        </div>
        {splitPanelOpen && (
          <>
            <div
              onMouseDown={handleDragStart}
              onMouseEnter={e => {
                e.currentTarget.querySelector('.drag-bar').style.background = '#0073bb';
                e.currentTarget.querySelector('svg').style.opacity = '1';
              }}
              onMouseLeave={e => {
                e.currentTarget.querySelector('.drag-bar').style.background = '#e9ebed';
                e.currentTarget.querySelector('svg').style.opacity = '0.5';
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
                cursor: 'col-resize',
                position: 'relative',
              }}
            >
              {/* 4px bar */}
              <div
                className="drag-bar"
                style={{
                  width: '4px',
                  height: '100%',
                  background: '#e9ebed',
                  transition: 'background 0.15s ease',
                  flexShrink: 0,
                }}
              />
              {/* grip dots — sits just outside the bar, overlapping the panel edge */}
              <svg
                width="8"
                height="14"
                viewBox="0 0 8 14"
                style={{
                  position: 'absolute',
                  left: '6px',
                  opacity: 0.5,
                  transition: 'opacity 0.15s ease',
                  cursor: 'col-resize',
                  zIndex: 1,
                }}
              >
                <circle cx="2" cy="2"  r="1.5" fill="#5f6b7a" />
                <circle cx="6" cy="2"  r="1.5" fill="#5f6b7a" />
                <circle cx="2" cy="7"  r="1.5" fill="#5f6b7a" />
                <circle cx="6" cy="7"  r="1.5" fill="#5f6b7a" />
                <circle cx="2" cy="12" r="1.5" fill="#5f6b7a" />
                <circle cx="6" cy="12" r="1.5" fill="#5f6b7a" />
              </svg>
            </div>
            <div style={{
              width: `${panelWidth}px`,
              flexShrink: 0,
              background: '#ffffff',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              minHeight: 0,
            }}>
              <NodePropertiesPanel
                node={selectedNode}
                onUpdate={handleUpdateNode}
                onClose={() => setSplitPanelOpen(false)}
                allNodes={allNodes}
                allEdges={allEdges}
                onAddEdge={handleAddEdge}
                onRemoveEdge={handleRemoveEdge}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
