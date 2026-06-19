import { useEffect, useRef } from 'react';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import FormField from '@cloudscape-design/components/form-field';
import Input from '@cloudscape-design/components/input';
import Select from '@cloudscape-design/components/select';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Table from '@cloudscape-design/components/table';
import { useNodeForm } from './useNodeForm.js';
import { wouldCreateCycle } from '../utils/connectionRules.js';
import finalCsv from '../data/transactions_mapped.csv?raw';

const DATA_TYPE_OPTIONS = [
  'string', 'double', 'long', 'short', 'int', 'float',
  'boolean', 'binary', 'date', 'timestamp'
].map(t => ({ value: t, label: t }));

const INCLUDE_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no',  label: 'No'  },
];

let _finalCsvCache = null;
function getFinalCsvData() {
  if (_finalCsvCache) return _finalCsvCache;
  const lines    = finalCsv.trim().split('\n');
  const headers  = lines[0].split(',').map(h => h.trim());
  const dataRows = lines.slice(1);
  const firstRow = dataRows[0]?.split(',').map(v => v.trim()) ?? [];
  const inferType = v => {
    if (!v) return 'string';
    if (v === 'true' || v === 'false') return 'boolean';
    if (!isNaN(Number(v))) return Number.isInteger(Number(v)) ? 'int' : 'double';
    return 'string';
  };
  _finalCsvCache = {
    outputSchema: headers.map((name, i) => ({ name, dataType: inferType(firstRow[i] ?? '') })),
    previewData:  dataRows.map(line => {
      const values = line.split(',').map(v => v.trim());
      return Object.fromEntries(headers.map((name, i) => [name, values[i] ?? '']));
    }),
  };
  return _finalCsvCache;
}

function getMockExtraData(mappings) {
  const included = mappings.filter(m => m.include !== 'no');
  const complete  = included.length > 0 && included.every(m => m.source?.trim() && m.target?.trim());
  return complete ? getFinalCsvData() : { outputSchema: [], previewData: [] };
}

export default function ApplyMappingTransformForm({ node, onUpdate, allNodes = [], allEdges = [], onAddEdge, onRemoveEdge }) {
  // Read dataInputNodeId from node.data.config directly to avoid a circular dep
  // (upstreamSchema is needed by useNodeForm, but it depends on dataInputNodeId from config)
  const incomingEdges    = allEdges.filter(e => e.target === node.id);
  const connectedNodeIds = new Set(incomingEdges.map(e => e.source));
  const configuredId     = node.data.config?.dataInputNodeId;
  const selectedInputId  = configuredId && connectedNodeIds.has(configuredId)
    ? configuredId
    : (connectedNodeIds.size === 1 ? [...connectedNodeIds][0] : null);
  const upstreamNode    = selectedInputId ? allNodes.find(n => n.id === selectedInputId) : null;
  const upstreamSchema  = upstreamNode?.data?.status === 'success'
    ? (upstreamNode?.data?.outputSchema ?? [])
    : [];

  const inputOptions = allNodes
    .filter(n => n.id !== node.id)
    .filter(n => ['Source', 'Transform'].includes(n.data.type?.split(' - ')[0]))
    .map(n => ({
      value:       n.id,
      label:       n.data.label ?? n.id,
      description: n.data.type,
      disabled:    connectedNodeIds.has(n.id) || wouldCreateCycle(n.id, node.id, allEdges),
    }));

  const { config, errors, handleChange, handleConfigChange } = useNodeForm(node, onUpdate, [upstreamSchema]);

  const mappings = config.mappings ?? [];

  const configRef      = useRef(config);
  configRef.current    = config;
  const handleChangeRef = useRef(handleChange);
  handleChangeRef.current = handleChange;

  // Reset form when the selected input node is removed from the canvas
  const prevSelectedInputIdRef = useRef(selectedInputId);
  useEffect(() => {
    const prev = prevSelectedInputIdRef.current;
    prevSelectedInputIdRef.current = selectedInputId;
    if (prev !== null && selectedInputId === null) {
      prevSchemaKeyRef.current = '';
      onUpdate(node.id, {
        config:           { ...configRef.current, dataInputNodeId: null, mappings: [] },
        status:           'pending',
        outputSchema:     [],
        previewData:      [],
        validationErrors: {},
      });
    }
  }, [selectedInputId]); // eslint-disable-line react-hooks/exhaustive-deps

  const prevSchemaKeyRef = useRef('');
  useEffect(() => {
    const schemaKey = upstreamSchema.map(c => `${c.name}:${c.dataType}`).join('|');

    if (upstreamSchema.length === 0) {
      prevSchemaKeyRef.current = '';
      if ((configRef.current.mappings ?? []).length > 0) {
        onUpdate(node.id, {
          config:       { ...configRef.current, mappings: [] },
          status:       'pending',
          outputSchema: [],
          previewData:  [],
        });
      }
      return;
    }

    if (schemaKey === prevSchemaKeyRef.current) return;
    prevSchemaKeyRef.current = schemaKey;

    const currentConfig = configRef.current;
    const existing      = currentConfig.mappings ?? [];
    const bySource      = Object.fromEntries(existing.map(m => [m.source, m]));

    const newMappings = upstreamSchema.map(col => {
      const prev = bySource[col.name];
      return prev
        ? { ...prev, dataType: col.dataType }
        : { source: col.name, dataType: col.dataType, target: col.name, targetType: col.dataType, include: 'yes' };
    });

    handleChangeRef.current('mappings', newMappings, getMockExtraData(newMappings));
  }, [upstreamSchema]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleDataInputChange = (nodeId) => {
    const existingEdge = allEdges.find(e => e.target === node.id);
    if (existingEdge) onRemoveEdge?.(existingEdge.id);
    onAddEdge?.({ id: `e-${nodeId}-${node.id}`, source: nodeId, target: node.id, type: 'etlEdge' });
    prevSchemaKeyRef.current = '';
    onUpdate(node.id, { config: { ...configRef.current, dataInputNodeId: nodeId, mappings: [] }, status: 'pending' });
  };

  const handleRemoveDataInput = () => {
    if (!selectedInputId) return;
    const edge = allEdges.find(e => e.source === selectedInputId && e.target === node.id);
    if (edge) onRemoveEdge?.(edge.id);
    prevSchemaKeyRef.current = '';
    onUpdate(node.id, {
      config:           { ...configRef.current, dataInputNodeId: null, mappings: [] },
      status:           'pending',
      outputSchema:     [],
      previewData:      [],
      validationErrors: {},
    });
  };

  const handleTargetKeyChange = (item, value) => {
    const idx         = mappings.indexOf(item);
    const newMappings = mappings.map((m, i) => i === idx ? { ...m, target: value } : m);
    handleConfigChange('mappings', newMappings);
  };

  const handleTargetKeyBlur = () => {
    handleChange('mappings', [...mappings], getMockExtraData(mappings));
  };

  const handleTargetTypeChange = (item, value) => {
    const idx         = mappings.indexOf(item);
    const newMappings = mappings.map((m, i) => i === idx ? { ...m, targetType: value } : m);
    handleChange('mappings', newMappings, getMockExtraData(newMappings));
  };

  const handleIncludeChange = (item, value) => {
    const idx         = mappings.indexOf(item);
    const newMappings = mappings.map((m, i) => i === idx ? { ...m, include: value } : m);
    handleChange('mappings', newMappings, getMockExtraData(newMappings));
  };

  return (
    <SpaceBetween direction="vertical" size="m">
      <FormField label="Data input" description="Choose the node that provides the data to transform.">
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <Select
              expandToViewport
              triggerVariant="option"
              selectedOption={inputOptions.find(o => o.value === selectedInputId) ?? null}
              onChange={({ detail }) => handleDataInputChange(detail.selectedOption.value)}
              options={inputOptions}
              placeholder="Choose a data input"
              empty="No input nodes connected."
            />
          </div>
          <Button disabled={!selectedInputId} onClick={handleRemoveDataInput}>Remove</Button>
        </div>
      </FormField>
      <div style={{ borderTop: '1px solid #d1d5db', padding: '0' }} />
      <FormField label="Mappings" description="Map source fields to output fields. Rename columns, change data types, or exclude fields from the output.">
        <Table
          variant="embedded"
          items={mappings}
          columnDefinitions={[
            {
              id:       'source',
              header:   'Source field',
              minWidth: 120,
              cell: item => (
                <div style={{ padding: '4px 0' }}>
                  <div style={{ fontWeight: 400 }}>{item.source}</div>
                  <div style={{ fontSize: '12px', color: '#5f6b7a', marginTop: '2px' }}>{item.dataType}</div>
                </div>
              ),
            },
            {
              id:       'target',
              header:   'Target field',
              minWidth: 140,
              cell: item => {
                const validPattern = /^[a-zA-Z0-9_-]*$/;
                const hasInvalidChars = !!item.target?.trim() && !validPattern.test(item.target.trim());
                const isEmpty        = !!errors.mappings && !item.target?.trim();
                const errorText      = hasInvalidChars
                  ? 'Only letters, numbers, _ and - are allowed.'
                  : isEmpty ? 'Target field name is required.' : undefined;
                return (
                  <FormField errorText={errorText}>
                    <Input
                      value={item.target ?? ''}
                      placeholder="Enter target field name"
                      invalid={hasInvalidChars || isEmpty}
                      onChange={({ detail }) => handleTargetKeyChange(item, detail.value)}
                      onBlur={handleTargetKeyBlur}
                    />
                  </FormField>
                );
              },
            },
            {
              id:       'dataType',
              header:   'Data type',
              minWidth: 140,
              cell: item => (
                <Select
                  expandToViewport
                  selectedOption={DATA_TYPE_OPTIONS.find(o => o.value === (item.targetType ?? item.dataType)) ?? null}
                  onChange={({ detail }) => handleTargetTypeChange(item, detail.selectedOption.value)}
                  options={DATA_TYPE_OPTIONS}
                  placeholder="Choose type"
                />
              ),
            },
            {
              id:       'include',
              header:   'Include',
              minWidth: 100,
              cell: item => (
                <Select
                  expandToViewport
                  selectedOption={INCLUDE_OPTIONS.find(o => o.value === (item.include ?? 'yes')) ?? INCLUDE_OPTIONS[0]}
                  onChange={({ detail }) => handleIncludeChange(item, detail.selectedOption.value)}
                  options={INCLUDE_OPTIONS}
                />
              ),
            },
          ]}
          empty={
            <Box textAlign="center" color="inherit" padding="l">
              Connect an input node to populate mappings.
            </Box>
          }
        />
      </FormField>
    </SpaceBetween>
  );
}
