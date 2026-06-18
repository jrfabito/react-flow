import { useState } from 'react';
import { BaseEdge, getSmoothStepPath } from '@xyflow/react';

export const STROKE_DEFAULT  = '#AAB7B8';
export const STROKE_SELECTED = '#1565c0';
export const STROKE_ERROR    = '#d13212';

export default function ETLEdge({
  id,
  sourceX, sourceY, sourcePosition,
  targetX, targetY, targetPosition,
  data,
}) {
  const [hovered,  setHovered]  = useState(false);
  const [dragging, setDragging] = useState(false);

  const [edgePath] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  const highlighted  = data?.highlighted  ?? false;
  const reconnecting = data?.reconnecting ?? false;
  const errored      = data?.errored      ?? false;

  // errored > highlighted > hover > default
  const stroke      = errored ? STROKE_ERROR : highlighted ? STROKE_SELECTED : STROKE_DEFAULT;
  const strokeWidth = highlighted ? 2 : hovered ? 3 : 2;
  const markerId    = errored ? 'etl-arrow-error' : highlighted ? 'etl-arrow-selected' : 'etl-arrow-default';

  const pathStyle = {
    stroke,
    strokeWidth,
    fill: 'none',
    ...(highlighted && !reconnecting && {
      strokeDasharray: '6 3',
      animation: 'etl-edge-flow 0.5s linear infinite',
    }),
  };

  const cursor = dragging ? 'grabbing' : hovered ? 'grab' : 'default';

  return (
    <>
      {/* Inline markers so each edge carries its own defs and url() never breaks */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <marker
            id="etl-arrow-default"
            markerWidth="10" markerHeight="10"
            refX="8" refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill={STROKE_DEFAULT} />
          </marker>
          <marker
            id="etl-arrow-selected"
            markerWidth="10" markerHeight="10"
            refX="8" refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill={STROKE_SELECTED} />
          </marker>
          <marker
            id="etl-arrow-error"
            markerWidth="10" markerHeight="10"
            refX="8" refY="3"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill={STROKE_ERROR} />
          </marker>
        </defs>
      </svg>
      <style>{`@keyframes etl-edge-flow { to { stroke-dashoffset: -18; } }`}</style>
      <BaseEdge
        id={id}
        path={edgePath}
        style={pathStyle}
        markerEnd={`url(#${markerId})`}
      />
      {/* Invisible hit area over the arrowhead only — SVG markers don't receive pointer events */}
      <circle
        cx={targetX}
        cy={targetY}
        r={40}
        fill="transparent"
        style={{ pointerEvents: 'all', cursor }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setDragging(false); }}
        onMouseDown={() => setDragging(true)}
        onMouseUp={() => setDragging(false)}
      />
    </>
  );
}
