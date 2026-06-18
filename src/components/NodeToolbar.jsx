import { useRef, useState } from 'react';
import Alert from '@cloudscape-design/components/alert';
import Button from '@cloudscape-design/components/button';
import Select from '@cloudscape-design/components/select';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { NODE_REGISTRY } from '../nodes/nodeRegistry.js';
import { serviceIconRegistry } from '../nodes/serviceIconRegistry.js';

const CATEGORIES = ['Source', 'Transform', 'Target'];

export default function NodeToolbar({
  onAddNode,
  onUndo, canUndo,
  onRedo, canRedo,
  onRemove, canRemove,
  onLoadJson,
  showGuideAlert = false,
}) {
  const [selected, setSelected] = useState({ Source: null, Transform: null, Target: null });
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        onLoadJson?.(data);
      } catch {
        // malformed JSON — silently ignore for now
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleChange = (category, { detail }) => {
    const item = NODE_REGISTRY[category].find(r => r.id === detail.selectedOption.value);
    if (item) {
      onAddNode(item);
      setSelected(prev => ({ ...prev, [category]: null }));
    }
  };

  return (
    <div className="node-toolbar" style={{
      padding: '24px 24px',
      background: 'transparent',
    }}>
      <SpaceBetween direction="horizontal" size="xs">
        {CATEGORIES.map(category => (
          <Select
            key={category}
            selectedOption={selected[category]}
            onChange={e => handleChange(category, e)}
            options={NODE_REGISTRY[category].map(item => ({
              value:       item.id,
              label:       item.label,
              description: item.description,
              iconUrl:     serviceIconRegistry[item.iconType],
              disabled:    !item.enabled,
            }))}
            placeholder={`Add ${category.toLowerCase()}`}
            filteringType="auto"
          />
        ))}
        <div className="node-toolbar-actions">
          <SpaceBetween direction="horizontal" size="xs">
            <Button iconName="undo"   variant="normal" disabled={!canUndo}   onClick={onUndo}></Button>
            <Button iconName="redo"   variant="normal" disabled={!canRedo}   onClick={onRedo}></Button>
            <Button iconName="remove" variant="normal" disabled={!canRemove} onClick={onRemove}></Button>
          </SpaceBetween>
        </div>
        {/* <Button iconName="upload" variant="normal" onClick={() => fileInputRef.current?.click()}>Load JSON</Button> */}
        {/* <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleFileChange} /> */}
      </SpaceBetween>
      {showGuideAlert && (
        <div style={{ marginTop: '20px' }}>
          <Alert type="info">
            To start creating a job, add a source to the canvas.
          </Alert>
        </div>
      )}
    </div>
  );
}
