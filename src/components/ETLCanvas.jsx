import { forwardRef, useImperativeHandle, useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  ControlButton,
  addEdge,
  reconnectEdge,
  useNodesState,
  useEdgesState,
  useNodes,
  useEdges,
  useNodesInitialized,
  useReactFlow,
} from '@xyflow/react';
import zoomInUrl    from '../public/images/zoom-in.svg';
import zoomOutUrl   from '../public/images/zoom-out.svg';
import zoomToFitUrl from '../public/images/zoom-to-fit.svg';
import ETLEdge from './ETLEdge.jsx';
import { CONNECTION_RULES, deriveCategory } from '../utils/connectionRules.js';

const defaultEdgeOptions = { type: 'etlEdge' };
const edgeTypes          = { etlEdge: ETLEdge };
const NODE_WIDTH         = 260;
const NODE_HEIGHT        = 80;
const FIT_VIEW_PADDING   = 0.3;

// Rendered inside <ReactFlow> so RF store hooks are available.
// Waits until all nodes are measured, repositions each node centered on its
// parent(s), then re-fits the viewport. Runs exactly once on initial load.
function InitialLayoutPass({ onLayout }) {
  const initialized = useNodesInitialized();
  const nodes       = useNodes();
  const edges       = useEdges();
  const hasLaidOut = useRef(false);

  useEffect(() => {
    if (!initialized || hasLaidOut.current || nodes.length === 0) return;
    hasLaidOut.current = true;
    onLayout(nodes, edges);
  }, [initialized]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

function CustomControls({ fitViewOptions }) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  return (
    <Controls showZoom={false} showFitView={false} showInteractive={false} position="top-right" orientation="vertical">
      <ControlButton onClick={() => zoomIn()}>
        <img src={zoomInUrl} alt="Zoom in" />
      </ControlButton>
      <ControlButton onClick={() => zoomOut()}>
        <img src={zoomOutUrl} alt="Zoom out" />
      </ControlButton>
      <ControlButton onClick={() => fitView(fitViewOptions)}>
        <img src={zoomToFitUrl} alt="Zoom to fit" />
      </ControlButton>
    </Controls>
  );
}

const ETLCanvas = forwardRef(function ETLCanvas(
  {
    initialNodes,
    initialEdges,
    nodeTypes,
    onNodeSelect,
    onPaneClick,
    connectedEdgeIds = [],
    onReconnect,
    onEdgesSync,
    onNodesSync,
    readOnly = false,
  },
  ref
) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => { onEdgesSync?.(edges); }, [edges, onEdgesSync]);
  useEffect(() => { onNodesSync?.(nodes); }, [nodes, onNodesSync]);

  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  const edgesRef = useRef(edges);
  edgesRef.current = edges;

  const isReconnectingRef = useRef(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const reconnectedRef = useRef(false);

  const rfInstance    = useRef(null);
  const containerRef  = useRef(null);

  // ── Resize-to-fit ──────────────────────────────────────────────────────────
  // Watches the canvas container for size changes. Debounced 150 ms so fitView
  // fires once after the user finishes dragging the split-panel divider (or any
  // other resize), not on every pixel.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let debounceTimer;

    const observer = new ResizeObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        rfInstance.current?.fitView({ padding: FIT_VIEW_PADDING });
      }, 150);
    });

    observer.observe(el);

    return () => {
      clearTimeout(debounceTimer);
      observer.disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // ── End resize-to-fit ──────────────────────────────────────────────────────

  useImperativeHandle(ref, () => ({
    addNode:    (node) => setNodes((prev) => [...prev.map(n => ({ ...n, selected: false })), node]),
    addEdge:    (edge) => setEdges((prev) => [...prev, edge]),
    getNodes:   () => nodesRef.current,
    getEdges:   () => edgesRef.current,
    getViewport: () => rfInstance.current?.getViewport() ?? { x: 0, y: 0, zoom: 1 },
    screenToFlowPosition: (clientPos) => rfInstance.current?.screenToFlowPosition(clientPos) ?? { x: 0, y: 0 },
    getFlowCenter: () => {
      const el = containerRef.current;
      if (!el || !rfInstance.current) return { x: 0, y: 0 };
      const rect = el.getBoundingClientRect();
      return rfInstance.current.screenToFlowPosition({
        x: rect.left + rect.width  / 2,
        y: rect.top  + rect.height / 2,
      });
    },
    panToNode: (nodeId) => {
      const node = nodesRef.current.find(n => n.id === nodeId);
      if (!node) return;
      const w = node.measured?.width  ?? NODE_WIDTH;
      const h = node.measured?.height ?? NODE_HEIGHT;
      const { zoom } = rfInstance.current?.getViewport() ?? { zoom: 1 };
      rfInstance.current?.setCenter(
        node.position.x + w / 2,
        node.position.y + h / 2,
        { zoom, duration: 300 }
      );
    },
    fitView: (options) => rfInstance.current?.fitView(options),
    setNodes,
    setEdges,
    updateNodeData: (id, patch) =>
      setNodes((prev) =>
        prev.map(n => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)
      ),
  }));

  const handleNodeClick = useCallback((_, node) => {
    onNodeSelect?.(node);
  }, [onNodeSelect]);

  const handleConnect = useCallback((connection) => {
    setEdges(eds => addEdge({ ...connection, type: 'etlEdge' }, eds));
  }, [setEdges]);

  const handleEdgesChange = useCallback((changes) => {
    onEdgesChange(changes);
  }, [onEdgesChange]);

  const handleReconnectStart = useCallback(() => {
    isReconnectingRef.current = true;
    reconnectedRef.current = false;
    setIsReconnecting(true);
  }, []);

  const handleReconnectEnd = useCallback((_, edge) => {
    isReconnectingRef.current = false;
    setIsReconnecting(false);
    if (!reconnectedRef.current) {
      setEdges(eds => eds.filter(e => e.id !== edge.id));
    }
  }, [setEdges]);

  const handleReconnect = useCallback((oldEdge, newConnection) => {
    reconnectedRef.current = true;
    onReconnect?.();
    setEdges(eds => reconnectEdge(oldEdge, newConnection, eds));
  }, [onReconnect, setEdges]);

  const isValidConnection = useCallback((connection) => {
    const sourceNode = nodesRef.current.find(n => n.id === connection.source);
    const targetNode = nodesRef.current.find(n => n.id === connection.target);
    if (!sourceNode || !targetNode) return false;
    const sourceCategory = deriveCategory(sourceNode.data.type);
    const targetCategory = deriveCategory(targetNode.data.type);
    return CONNECTION_RULES[sourceCategory]?.includes(targetCategory) ?? false;
  }, []);

  // One-time layout pass: center each node's x on the average center of its parents.
  const handleInitialLayout = useCallback((currentNodes, currentEdges) => {
    const adjusted = currentNodes.map(node => {
      const parents = currentEdges
        .filter(e => e.target === node.id)
        .map(e => currentNodes.find(n => n.id === e.source))
        .filter(Boolean);

      if (parents.length === 0) return node;

      const avgParentCenterX =
        parents.reduce((sum, p) => sum + p.position.x + (p.measured?.width ?? 230) / 2, 0) /
        parents.length;

      return {
        ...node,
        position: {
          ...node.position,
          x: avgParentCenterX - (node.measured?.width ?? 230) / 2,
        },
      };
    });

    setNodes(adjusted);
  }, [setNodes]);

  // Merge display flags into edge data without mutating state
  const augmentedEdges = edges.map(e => {
    const sourceNode = nodesRef.current.find(n => n.id === e.source);
    const errored    = sourceNode?.data?.status === 'error';
    return {
      ...e,
      zIndex: connectedEdgeIds.includes(e.id) ? 1 : 0,
      data: {
        ...e.data,
        highlighted:  connectedEdgeIds.includes(e.id),
        reconnecting: isReconnecting,
        errored,
      },
    };
  });

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', background: '#f5f5f5' }}>
      <ReactFlow
        nodes={nodes}
        edges={augmentedEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={readOnly ? undefined : onNodesChange}
        onEdgesChange={readOnly ? undefined : handleEdgesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={onPaneClick}
        defaultEdgeOptions={defaultEdgeOptions}
        nodesDraggable={!readOnly}
        edgesReconnectable={!readOnly}
        onConnect={handleConnect}
        onReconnect={readOnly ? undefined : handleReconnect}
        onReconnectStart={readOnly ? undefined : handleReconnectStart}
        onReconnectEnd={readOnly ? undefined : handleReconnectEnd}
        isValidConnection={isValidConnection}
        selectionOnDrag={false}
        multiSelectionKeyCode={null}
        onInit={(instance) => {
          rfInstance.current = instance;
        }}
        snapToGrid
        snapGrid={[20, 20]}
        defaultViewport={{ x: 0, y: 0, zoom: 1.5 }}
        fitViewOptions={{ padding: FIT_VIEW_PADDING }}
      >
        <Background color="#babbbb" gap={12} size={1.5} variant="dots" />
        <CustomControls fitViewOptions={{ padding: FIT_VIEW_PADDING, minZoom: 0.5, maxZoom: 2 }} />
        <InitialLayoutPass onLayout={handleInitialLayout} />
      </ReactFlow>
    </div>
  );
});

export default ETLCanvas;
