import { useEffect, useRef } from 'react';
import AttributeEditor from '@cloudscape-design/components/attribute-editor';
import Button from '@cloudscape-design/components/button';
import FormField from '@cloudscape-design/components/form-field';
import Select from '@cloudscape-design/components/select';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { useNodeForm } from './useNodeForm.js';
import { wouldCreateCycle } from '../utils/connectionRules.js';
import joinedCsv from '../data/transactions_joined.csv?raw';

import innerJoinUrl    from '../public/images/Type=Inner-join.svg';
import leftJoinUrl     from '../public/images/Type=Left-join.svg';
import rightJoinUrl    from '../public/images/Type=Right-join.svg';
import outerJoinUrl    from '../public/images/Type=Outter-join.svg';
import leftSemiUrl     from '../public/images/Type=Left-excluding-join.svg';
import leftAntiUrl     from '../public/images/Type=Outter-excluding-join.svg';

const JOIN_TYPE_OPTIONS = [
  {
    value:       'inner',
    label:       'Inner join',
    description: 'Select all rows from both datasets that meet the join condition.',
    iconUrl:     innerJoinUrl,
  },
  {
    value:       'left',
    label:       'Left join',
    description: 'Select all rows from the left dataset and the rows that meet the join condition from the right dataset.',
    iconUrl:     leftJoinUrl,
  },
  {
    value:       'right',
    label:       'Right join',
    description: 'Select all rows from the right dataset and the rows that meet the join condition from the left dataset.',
    iconUrl:     rightJoinUrl,
  },
  {
    value:       'outer',
    label:       'Outer join',
    description: 'Select all rows from both datasets regardless of join condition.',
    iconUrl:     outerJoinUrl,
  },
  {
    value:       'leftsemi',
    label:       'Left semi-join',
    description: 'Select all rows from the left dataset that has a match with the right dataset.',
    iconUrl:     leftSemiUrl,
  },
  {
    value:       'leftanti',
    label:       'Left anti-join',
    description: 'Select all rows from the left dataset that does not have a match with the right dataset.',
    iconUrl:     leftAntiUrl,
  },
];

let _joinedCsvCache = null;
function getJoinedCsvData() {
  if (_joinedCsvCache) return _joinedCsvCache;
  const lines    = joinedCsv.trim().split('\n');
  const headers  = lines[0].split(',').map(h => h.trim());
  const dataRows = lines.slice(1);
  const firstRow = dataRows[0]?.split(',').map(v => v.trim()) ?? [];
  const inferType = v => {
    if (!v) return 'string';
    if (v === 'true' || v === 'false') return 'boolean';
    if (!isNaN(v)) return Number.isInteger(+v) ? 'int' : 'double';
    return 'string';
  };
  _joinedCsvCache = {
    outputSchema: headers.map((name, i) => ({ name, dataType: inferType(firstRow[i] ?? '') })),
    previewData:  dataRows.map(line => {
      const values = line.split(',').map(v => v.trim());
      return Object.fromEntries(headers.map((name, i) => [name, values[i] ?? '']));
    }),
  };
  return _joinedCsvCache;
}

function getMockExtraData(config) {
  const pairs = config?.keyPairs ?? [];
  const complete = config?.leftInputNodeId && config?.rightInputNodeId &&
    config?.joinType && pairs.length > 0 && pairs.every(p => p.leftKey && p.rightKey);
  return complete ? getJoinedCsvData() : { outputSchema: [], previewData: [] };
}

export default function JoinTransformForm({ node, onUpdate, allNodes = [], allEdges = [], onAddEdge, onRemoveEdge }) {
  const rawConfig = node.data.config ?? {};

  // Derive upstream schemas from currently configured input nodes
  const leftNode    = allNodes.find(n => n.id === rawConfig.leftInputNodeId);
  const rightNode   = allNodes.find(n => n.id === rawConfig.rightInputNodeId);
  const leftSchema  = leftNode?.data?.status === 'success'  ? (leftNode?.data?.outputSchema  ?? []) : [];
  const rightSchema = rightNode?.data?.status === 'success' ? (rightNode?.data?.outputSchema ?? []) : [];

  const { config, errors, handleChange, handleConfigChange, atomicUpdate } = useNodeForm(node, onUpdate, [leftSchema, rightSchema]);

  // Seed defaults on first render: inner join + one empty key pair row
  useEffect(() => {
    const defaults = {};
    if (!config.joinType)        defaults.joinType  = 'inner';
    if (!config.keyPairs?.length) defaults.keyPairs = [{ leftKey: '', rightKey: '' }];
    if (Object.keys(defaults).length) {
      onUpdate(node.id, { config: { ...config, ...defaults } });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep a stable ref to atomicUpdate so the canvas-sync effect doesn't re-subscribe on every render
  const atomicUpdateRef = useRef(atomicUpdate);
  atomicUpdateRef.current = atomicUpdate;

  const keyPairs = config.keyPairs ?? [];

  // Auto-seed one empty key pair when both inputs are set and both upstream nodes are ready
  useEffect(() => {
    const leftReady  = leftNode?.data?.status === 'success';
    const rightReady = rightNode?.data?.status === 'success';
    if (config.leftInputNodeId && config.rightInputNodeId && leftReady && rightReady && keyPairs.length === 0) {
      handleConfigChange('keyPairs', [{ leftKey: '', rightKey: '' }]);
    }
  }, [config.leftInputNodeId, config.rightInputNodeId, leftNode?.data?.status, rightNode?.data?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear key pairs and output when an upstream node loses success
  useEffect(() => {
    if (!rawConfig.leftInputNodeId || !rawConfig.rightInputNodeId) return;
    const leftReady  = leftNode?.data?.status === 'success';
    const rightReady = rightNode?.data?.status === 'success';
    if ((!leftReady || !rightReady) && (rawConfig.keyPairs ?? []).length > 0) {
      atomicUpdateRef.current({
        configChanges: { keyPairs: [] },
        errorChanges:  { keyPairs: null },
        extraNodeData: { outputSchema: [], previewData: [] },
      });
    }
  }, [leftNode?.data?.status, rightNode?.data?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Canvas → form sync ────────────────────────────────────────────────────
  // When edges connecting to this join node change on the canvas (drag connect /
  // disconnect), reconcile config.leftInputNodeId / rightInputNodeId to match.
  useEffect(() => {
    const incoming  = allEdges.filter(e => e.target === node.id);
    const sourceIds = incoming.map(e => e.source);

    const curLeft  = config.leftInputNodeId  || null;
    const curRight = config.rightInputNodeId || null;

    // Preserve existing slots if they're still connected
    let newLeft  = curLeft  && sourceIds.includes(curLeft)  ? curLeft  : null;
    let newRight = curRight && sourceIds.includes(curRight) ? curRight : null;

    // Assign any newly-connected sources to empty slots
    const unassigned = sourceIds.filter(id => id !== newLeft && id !== newRight);
    for (const id of unassigned) {
      if      (!newLeft)  newLeft  = id;
      else if (!newRight) newRight = id;
    }

    if (newLeft === curLeft && newRight === curRight) return;

    const newConfig = { ...config, leftInputNodeId: newLeft, rightInputNodeId: newRight, keyPairs: [] };

    atomicUpdateRef.current({
      configChanges: { leftInputNodeId: newLeft, rightInputNodeId: newRight, keyPairs: [] },
      errorChanges:  {
        leftInputNodeId:  newLeft  ? null : 'Left input data frame is required.',
        rightInputNodeId: newRight ? null : 'Right input data frame is required.',
        keyPairs:         null,
      },
      extraNodeData: getMockExtraData(newConfig),
    });
  }, [allEdges, node.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Source node options ────────────────────────────────────────────────────
  const baseSourceOptions = allNodes
    .filter(n => n.id !== node.id)
    .filter(n => {
      const cat = n.data.type?.split(' - ')[0];
      return cat === 'Source' || cat === 'Transform';
    })
    .map(n => ({
      value:       n.id,
      label:       n.data.label ?? n.id,
      description: n.data.type,
      disabled:    wouldCreateCycle(n.id, node.id, allEdges),
    }));

  // Also disable whichever node the other slot already holds
  const leftOptions  = baseSourceOptions.map(o => ({ ...o, disabled: o.disabled || o.value === config.rightInputNodeId }));
  const rightOptions = baseSourceOptions.map(o => ({ ...o, disabled: o.disabled || o.value === config.leftInputNodeId  }));

  const selectedJoinType = JOIN_TYPE_OPTIONS.find(o => o.value === (config.joinType ?? 'inner')) ?? null;
  const selectedLeft     = leftOptions.find(o  => o.value === config.leftInputNodeId)  ?? null;
  const selectedRight    = rightOptions.find(o => o.value === config.rightInputNodeId) ?? null;

  const leftKeyOptions  = leftSchema.map(c  => ({ value: c.name,  label: c.name  }));
  const rightKeyOptions = rightSchema.map(c => ({ value: c.name, label: c.name }));

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleJoinTypeChange = ({ detail }) => {
    const newConfig = { ...config, joinType: detail.selectedOption.value };
    handleChange('joinType', detail.selectedOption.value, getMockExtraData(newConfig));
  };

  const handleLeftInputChange = ({ detail }) => {
    const newNodeId = detail.selectedOption?.value ?? null;
    const oldNodeId = config.leftInputNodeId;

    if (oldNodeId) {
      const oldEdge = allEdges.find(e => e.source === oldNodeId && e.target === node.id);
      if (oldEdge) onRemoveEdge?.(oldEdge.id);
    }
    if (newNodeId) {
      onAddEdge?.({ id: `e-${newNodeId}-${node.id}-left`, source: newNodeId, target: node.id, type: 'etlEdge', data: { joinSlot: 'left' } });
    }

    const newConfig = { ...config, leftInputNodeId: newNodeId, keyPairs: [] };

    atomicUpdate({
      configChanges: { leftInputNodeId: newNodeId, keyPairs: [] },
      errorChanges:  { leftInputNodeId: newNodeId ? null : 'Left input data frame is required.', keyPairs: null },
      extraNodeData: getMockExtraData(newConfig),
    });
  };

  const handleRightInputChange = ({ detail }) => {
    const newNodeId = detail.selectedOption?.value ?? null;
    const oldNodeId = config.rightInputNodeId;

    if (oldNodeId) {
      const oldEdge = allEdges.find(e => e.source === oldNodeId && e.target === node.id);
      if (oldEdge) onRemoveEdge?.(oldEdge.id);
    }
    if (newNodeId) {
      onAddEdge?.({ id: `e-${newNodeId}-${node.id}-right`, source: newNodeId, target: node.id, type: 'etlEdge', data: { joinSlot: 'right' } });
    }

    const newConfig = { ...config, rightInputNodeId: newNodeId, keyPairs: [] };

    atomicUpdate({
      configChanges: { rightInputNodeId: newNodeId, keyPairs: [] },
      errorChanges:  { rightInputNodeId: newNodeId ? null : 'Right input data frame is required.', keyPairs: null },
      extraNodeData: getMockExtraData(newConfig),
    });
  };

  const handleClearLeftInput = () => {
    const oldNodeId = config.leftInputNodeId;
    if (oldNodeId) {
      const oldEdge = allEdges.find(e => e.source === oldNodeId && e.target === node.id);
      if (oldEdge) onRemoveEdge?.(oldEdge.id);
    }
    const newConfig = { ...config, leftInputNodeId: null, keyPairs: [] };
    atomicUpdate({
      configChanges: { leftInputNodeId: null, keyPairs: [] },
      errorChanges:  { leftInputNodeId: null, keyPairs: null },
      extraNodeData: getMockExtraData(newConfig),
    });
  };

  const handleClearRightInput = () => {
    const oldNodeId = config.rightInputNodeId;
    if (oldNodeId) {
      const oldEdge = allEdges.find(e => e.source === oldNodeId && e.target === node.id);
      if (oldEdge) onRemoveEdge?.(oldEdge.id);
    }
    const newConfig = { ...config, rightInputNodeId: null, keyPairs: [] };
    atomicUpdate({
      configChanges: { rightInputNodeId: null, keyPairs: [] },
      errorChanges:  { rightInputNodeId: null, keyPairs: null },
      extraNodeData: getMockExtraData(newConfig),
    });
  };

  const handlePairChange = (itemIndex, field, value) => {
    const newPairs  = keyPairs.map((p, i) => i === itemIndex ? { ...p, [field]: value } : p);
    const newConfig = { ...config, keyPairs: newPairs };
    handleChange('keyPairs', newPairs, getMockExtraData(newConfig));
  };

  const handleAddPair = () => {
    handleConfigChange('keyPairs', [...keyPairs, { leftKey: '', rightKey: '' }]);
  };

  const handleRemovePair = ({ detail }) => {
    const newPairs  = keyPairs.filter((_, i) => i !== detail.itemIndex);
    const newConfig = { ...config, keyPairs: newPairs };
    handleChange('keyPairs', newPairs, getMockExtraData(newConfig));
  };

  const bothInputsSelected = !!(config.leftInputNodeId && config.rightInputNodeId);

  return (
    <SpaceBetween direction="vertical" size="m">
      <FormField
        label="Left input data frame"
        description="Source node that provides the left side of the join."
        errorText={errors.leftInputNodeId}
      >
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <Select
              selectedOption={selectedLeft}
              onChange={handleLeftInputChange}
              options={leftOptions}
              placeholder="Choose left input"
              empty="No source nodes on canvas."
              triggerVariant="option"
            />
          </div>
          <Button disabled={!config.leftInputNodeId} onClick={handleClearLeftInput}>Remove</Button>
        </div>
      </FormField>

      <FormField
        label="Right input data frame"
        description="Source node that provides the right side of the join."
        errorText={errors.rightInputNodeId}
      >
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <Select
              selectedOption={selectedRight}
              onChange={handleRightInputChange}
              options={rightOptions}
              placeholder="Choose right input"
              empty="No source nodes on canvas."
              triggerVariant="option"
            />
          </div>
          <Button disabled={!config.rightInputNodeId} onClick={handleClearRightInput}>Remove</Button>
        </div>
      </FormField>
      <div style={{ borderTop: '1px solid #d1d5db', padding: '0' }} />
      <FormField label="Join type" errorText={errors.joinType}>
        <Select
          selectedOption={selectedJoinType}
          onChange={handleJoinTypeChange}
          options={JOIN_TYPE_OPTIONS}
          placeholder="Choose join type"
          triggerVariant="option"
        />
      </FormField>

      <FormField label="Join keys" description="Choose a key from each data input to set the condition of the join."errorText={errors.keyPairs}>
        <AttributeEditor
          onAddButtonClick={handleAddPair}
          onRemoveButtonClick={handleRemovePair}
          items={keyPairs}
          addButtonText="Add key pair"
          removeButtonText="Remove"
          disableAddButton={!bothInputsSelected}
          empty="Add a key pair to configure the join."
          definition={[
            {
              label: 'Left key',
              control: (item, itemIndex) => (
                <Select
                  selectedOption={item.leftKey ? { value: item.leftKey, label: item.leftKey } : null}
                  onChange={({ detail }) => handlePairChange(itemIndex, 'leftKey', detail.selectedOption.value)}
                  options={leftKeyOptions}
                  placeholder="Choose left key column"
                  empty="No columns available."
                />
              ),
            },
            {
              label: 'Right key',
              control: (item, itemIndex) => (
                <Select
                  selectedOption={item.rightKey ? { value: item.rightKey, label: item.rightKey } : null}
                  onChange={({ detail }) => handlePairChange(itemIndex, 'rightKey', detail.selectedOption.value)}
                  options={rightKeyOptions}
                  placeholder="Choose right key column"
                  empty="No columns available."
                />
              ),
            },
          ]}
        />
      </FormField>
    </SpaceBetween>
  );
}
