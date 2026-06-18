import { useState, useMemo, useEffect } from 'react';
import Alert from '@cloudscape-design/components/alert';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import FormField from '@cloudscape-design/components/form-field';
import Input from '@cloudscape-design/components/input';
import Select from '@cloudscape-design/components/select';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Header from '@cloudscape-design/components/header';
import PropertyFilter from '@cloudscape-design/components/property-filter';
import Table from '@cloudscape-design/components/table';
import Tabs from '@cloudscape-design/components/tabs';
import { NODE_REGISTRY } from '../nodes/nodeRegistry.js';
import { ICON_MAP } from '../nodes/iconMap.jsx';
import { serviceIconRegistry } from '../nodes/serviceIconRegistry.js';
import NodeForm from '../forms/index.jsx';
import { computeStatus } from '../forms/schemas/index.js';

const PROPERTY_FILTER_I18N = {
  filteringAriaLabel:           'Filter data output',
  filteringPlaceholder:         'Filter by property or value',
  dismissAriaLabel:             'Dismiss',
  groupValuesText:              'Values',
  groupPropertiesText:          'Properties',
  operatorsText:                'Operators',
  operationAndText:             'and',
  operationOrText:              'or',
  operatorContainsText:         'contains',
  operatorDoesNotContainText:   'does not contain',
  operatorEqualsText:           'equals',
  operatorDoesNotEqualText:     'does not equal',
  operatorStartsWithText:       'starts with',
  operatorDoesNotStartWithText: 'does not start with',
  editTokenHeader:              'Edit filter',
  propertyText:                 'Property',
  operatorText:                 'Operator',
  valueText:                    'Value',
  cancelActionText:             'Cancel',
  applyActionText:              'Apply',
  allPropertiesLabel:           'All properties',
  tokenLimitShowMore:           'Show more',
  tokenLimitShowFewer:          'Show fewer',
  clearFiltersText:             'Clear filters',
  removeTokenButtonAriaLabel:   token => `Remove filter: ${token.propertyKey} ${token.operator} ${token.value}`,
  enteredTextLabel:             v => `Use: "${v}"`,
};

function deriveCategory(type) {
  return type.split(' - ')[0];
}

export default function NodePropertiesPanel({ node, onUpdate, onClose, upstreamSchema = [], allNodes = [], allEdges = [], onAddEdge, onRemoveEdge }) {
  const [activeTabId, setActiveTabId]         = useState('properties');
  const [propertyFilterQuery, setPropertyFilterQuery] = useState({ tokens: [], operation: 'and' });
  const [nameError, setNameError]               = useState(null);
  const [dismissedNodes, setDismissedNodes] = useState(new Set());
  const [dismissedUpstreamErrors, setDismissedUpstreamErrors] = useState(new Set());

  // Reset name error when the selected node changes
  useEffect(() => {
    setNameError(node?.data?.validationErrors?.label ?? null);
  }, [node?.id]);

  // Clear a node's dismissal when its status leaves 'success' (e.g. re-run)
  useEffect(() => {
    if (node?.id && node?.data?.status !== 'success') {
      setDismissedNodes(prev => {
        if (!prev.has(node.id)) return prev;
        const next = new Set(prev);
        next.delete(node.id);
        return next;
      });
    }
  }, [node?.id, node?.data?.status]);

  const hasUpstreamErrors = !!(node && allEdges
    .filter(e => e.target === node.id)
    .some(e => allNodes.find(n => n.id === e.source)?.data?.status === 'error'));

  // Reset upstream-error dismissal once all upstream errors are resolved
  useEffect(() => {
    if (node?.id && !hasUpstreamErrors) {
      setDismissedUpstreamErrors(prev => {
        if (!prev.has(node.id)) return prev;
        const next = new Set(prev);
        next.delete(node.id);
        return next;
      });
    }
  }, [node?.id, hasUpstreamErrors]);

  // Derive node values up-front so the header can use them regardless of branch
  const category      = node ? deriveCategory(node.data.type) : null;
  const registryItems = category ? (NODE_REGISTRY[category] ?? []) : [];
  const currentItem   = node ? registryItems.find(item => item.type === node.data.type) : null;
  const IconComponent = node ? ICON_MAP[node.data.iconType] : null;

  // Dynamic header title: "[icon] Category - Type" when a node is selected
  const headerTitle = node && category && currentItem ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {IconComponent && (
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          <IconComponent />
        </div>
      )}
      <Box variant="h4">{category} - {currentItem.label}</Box>
    </div>
  ) : (
    <Box variant="h4">No node selected</Box>
  );

  const header = (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 16px',
      borderBottom: '1px solid #e9ebed',
      flexShrink: 0,
    }}>
      {headerTitle}
      <Button variant="icon" iconName="close" ariaLabel="Close panel" onClick={onClose} />
    </div>
  );

  const dataOutputItems      = node?.data?.previewData ?? [];
  const filteringProperties  = useMemo(() =>
    (node?.data?.outputSchema ?? []).map(col => ({
      key:              col.name,
      label:            col.name,
      propertyLabel:    col.name,
      operators:        [':', '!:', '=', '!='],
      groupValuesLabel: `${col.name} values`,
    })),
    [node?.data?.outputSchema],
  );
  const filteringOptions = useMemo(() => {
    const schema = node?.data?.outputSchema ?? [];
    const rows   = node?.data?.previewData  ?? [];
    return schema.flatMap(col => {
      const unique = [...new Set(rows.map(row => String(row[col.name] ?? '')))];
      return unique.map(value => ({ propertyKey: col.name, value }));
    });
  }, [node?.data?.outputSchema, node?.data?.previewData]);

  const filteredDataOutputItems = useMemo(() => {
    const { tokens, operation } = propertyFilterQuery;
    if (!tokens.length) return dataOutputItems;
    return dataOutputItems.filter(item => {
      const results = tokens.map(({ propertyKey, operator, value }) => {
        const cell = String(item[propertyKey] ?? '').toLowerCase();
        const val  = String(value ?? '').toLowerCase();
        switch (operator) {
          case ':':  return cell.includes(val);
          case '!:': return !cell.includes(val);
          case '=':  return cell === val;
          case '!=': return cell !== val;
          default:   return true;
        }
      });
      return operation === 'or' ? results.some(Boolean) : results.every(Boolean);
    });
  }, [propertyFilterQuery, dataOutputItems]);

  if (!node) {
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {header}
        <Box padding="l">
          <Alert type="info">
            Select a node on the canvas to view and edit its properties.
          </Alert>
        </Box>
      </div>
    );
  }

  const { id, data } = node;

  const outputColumns = (data.outputSchema ?? []).map((col, idx) => ({
    id:     col.name,
    header: idx === 0 ? <span style={{ paddingLeft: '12px' }}>{col.name}</span> : col.name,
    cell:   item => idx === 0
      ? <span style={{ paddingLeft: '12px' }}>{item[col.name] ?? ''}</span>
      : (item[col.name] ?? ''),
  }));

  const selectOptions = registryItems.map(item => ({
    value:       item.id,
    label:       item.label,
    description: item.description,
    iconUrl:     serviceIconRegistry[item.iconType],
    disabled:    !item.enabled,
  }));

  const selectedOption = currentItem
    ? {
        value:       currentItem.id,
        label:       currentItem.label,
        description: currentItem.description,
        iconUrl:     serviceIconRegistry[currentItem.iconType],
      }
    : null;

  const handleTypeChange = ({ detail }) => {
    const item = registryItems.find(r => r.id === detail.selectedOption.value);
    if (!item) return;
    allEdges.filter(e => e.target === id).forEach(e => onRemoveEdge?.(e.id));
    onUpdate(id, {
      type:             item.type,
      iconType:         item.iconType,
      config:           {},
      status:           'pending',
      validationErrors: {},
      outputSchema:     [],
      previewData:      [],
    });
  };

  const handleLabelChange = ({ detail }) => {
    const error     = !detail.value.trim() ? 'Name is required.' : null;
    const newErrors = { ...(data.validationErrors ?? {}), label: error };
    const newStatus = computeStatus(data.type, data.config ?? {}, newErrors, detail.value);
    setNameError(error);
    onUpdate(id, { label: detail.value, validationErrors: newErrors, status: newStatus });
  };

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {header}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <Tabs
        fitHeight
        activeTabId={activeTabId}
        onChange={({ detail }) => setActiveTabId(detail.activeTabId)}
        tabs={[
          {
            id: 'properties',
            label: 'Properties',
            content: (
              <Box padding={{ left: 'm', top: 'none', right: 'm', bottom: 'm' }}>
                <SpaceBetween direction="vertical" size="m" stretch>
                  {hasUpstreamErrors && !dismissedUpstreamErrors.has(id) && (
                    <Alert
                      type="error"
                      dismissible
                      onDismiss={() => setDismissedUpstreamErrors(prev => new Set([...prev, id]))}
                    >
                      Check the connected input nodes that have errors.
                    </Alert>
                  )}
                  {data.status === 'success' && !dismissedNodes.has(id) && (
                    <Alert
                      type="success"
                      dismissible
                      onDismiss={() => setDismissedNodes(prev => new Set([...prev, id]))}
                    >
                      Output schema and data preview is ready.
                    </Alert>
                  )}
                  <FormField label={`${category} type`}>
                    <Select
                      selectedOption={selectedOption}
                      onChange={handleTypeChange}
                      options={selectOptions}
                      triggerVariant="option"
                    />
                  </FormField>
                  <FormField label="Name" errorText={nameError}>
                    <Input value={data.label ?? ''} onChange={handleLabelChange} />
                  </FormField>
                  <div style={{ padding: '4px 0', borderBottom: '1px solid #d1d5db', margin: '0 -24px' }} />
                  <NodeForm node={node} onUpdate={onUpdate} upstreamSchema={upstreamSchema} allNodes={allNodes} allEdges={allEdges} onAddEdge={onAddEdge} onRemoveEdge={onRemoveEdge} />
                </SpaceBetween>
              </Box>
            ),
          },
          {
            id: 'output-schema',
            label: 'Output schema',
            content: (
              <Box padding={{ left: 'm', top: 'none', right: 'm', bottom: 'm' }}>
                <Table
                  header={<Header variant="h3" description="The structure of the output data from this node.">Output schema</Header>}
                  resizableColumns
                  stripedRows
                  columnDefinitions={[
                    {
                      id: 'name',
                      header: <span style={{ paddingLeft: '12px' }}>Field name</span>,
                      cell: item => <span style={{ paddingLeft: '12px' }}>{item.name}</span>,
                    },
                    { id: 'dataType', header: 'Data type', cell: item => item.dataType },
                  ]}
                  items={node.data.outputSchema ?? []}
                  empty={
                    <Box textAlign="center" color="inherit" padding="l">
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <b>No output schema available.</b><p>Complete the node's properties to see the schema.</p>
                        <Button onClick={() => setActiveTabId('properties')}>Configure properties</Button>
                      </div>
                    </Box>
                  }
                  variant="embedded"
                />
              </Box>
            ),
          },
          {
            id: 'data-output',
            label: 'Data output',
            content: (
              <Box padding={{ left: 'm', top: 'none', right: 'm', bottom: 'm' }}>
                <Table
                  header={<Header variant="h3" description="A sample of the output data from this node.">Data output</Header>}
                  resizableColumns
                  stripedRows
                  filter={
                    <PropertyFilter
                      query={propertyFilterQuery}
                      onChange={({ detail }) => setPropertyFilterQuery(detail)}
                      filteringProperties={filteringProperties}
                      filteringOptions={filteringOptions}
                      countText={`${filteredDataOutputItems.length} match${filteredDataOutputItems.length !== 1 ? 'es' : ''}`}
                      i18nStrings={PROPERTY_FILTER_I18N}
                      disabled={dataOutputItems.length === 0}
                    />
                  }
                  columnDefinitions={outputColumns}
                  items={filteredDataOutputItems}
                  empty={
                    <Box textAlign="center" color="inherit" padding="l">
                      {propertyFilterQuery.tokens.length > 0 ? 'No matches found.' : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                          <b>No data output available.</b><p>Complete the node's properties to see the data.</p>
                          <Button onClick={() => setActiveTabId('properties')}>Configure properties</Button>
                        </div>
                      )}
                    </Box>
                  }
                  variant="embedded"
                />
              </Box>
            ),
          },
        ]}
      />
      </div>
    </div>
  );
}
