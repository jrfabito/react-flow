import { useState } from 'react';
import { Handle, Position, useConnection, useEdges } from '@xyflow/react';
import StatusIndicator from '@cloudscape-design/components/status-indicator';
import { serviceIconRegistry } from './serviceIconRegistry.js';
import { deriveCategory, getMaxIncoming } from '../utils/connectionRules.js';

const handleBase = { width: 9, height: 9, border: '2px solid white' };

export function DataNode({ id, data, selected }) {
  const [hovered, setHovered] = useState(false);
  const { inProgress: connecting } = useConnection();
  const edges    = useEdges();
  const iconUrl  = serviceIconRegistry[data.iconType];
  const category = deriveCategory(data.type);

  const showHandles = hovered || selected || connecting;

  const incomingCount = edges.filter(e => e.target === id).length;
  const isFull        = incomingCount >= getMaxIncoming(data.type);

  const targetHandleStyle = {
    ...handleBase,
    background:  isFull ? '#9ca3af' : '#1565c0',
    opacity:     showHandles ? 1 : 0,
    pointerEvents: showHandles ? 'all' : 'none',
    transition:  'opacity 0.15s ease',
  };

  const sourceHandleStyle = {
    ...handleBase,
    background: '#1565c0',
    opacity:    showHandles ? 1 : 0,
    pointerEvents: showHandles ? 'all' : 'none',
    transition: 'opacity 0.15s ease',
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: selected ? '#F0FBFF' : 'white',
        border: selected ? '2px solid #1565c0' : hovered ? '2px solid #AAB7B8' : '1.5px solid #d0d5dd',
        borderRadius: '10px',
        padding: '10px 14px 10px 10px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        width: '260px',
        height: '80px',
        boxShadow: selected
          ? '0 0 0 3px rgba(21,101,192,0.15), 0 2px 8px rgba(0,0,0,0.10)'
          : '0 1px 4px rgba(0,0,0,0.08)',
        fontFamily: "'Open Sans', sans-serif",
        cursor: 'default',
        boxSizing: 'border-box',
      }}
    >
      {category !== 'Source' && (
        <Handle
          type="target"
          position={Position.Top}
          style={targetHandleStyle}
          isConnectable={!isFull}
        />
      )}

      <div style={{
        width: '48px',
        height: '48px',
        border: '1.5px solid #e2e8f0',
        borderRadius: '8px',
        background: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {iconUrl && <img src={iconUrl} width={34} height={34} alt={data.iconType} />}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500, marginBottom: '3px' }}>
          {data.type}
        </div>
        <div style={{ fontSize: '15px', fontWeight: '700', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
          {data.label}
        </div>
      </div>

      <StatusIndicator type={data.status} />

      {category !== 'Target' && <Handle type="source" position={Position.Bottom} style={sourceHandleStyle} />}
    </div>
  );
}

export const nodeTypes = { dataNode: DataNode };
