import { useState } from 'react';
import ExpandableSection from '@cloudscape-design/components/expandable-section';
import FormField from '@cloudscape-design/components/form-field';
import Input from '@cloudscape-design/components/input';
import Link from '@cloudscape-design/components/link';
import RadioGroup from '@cloudscape-design/components/radio-group';
import Select from '@cloudscape-design/components/select';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Textarea from '@cloudscape-design/components/textarea';
import { useNodeForm } from './useNodeForm.js';
import productsCsv from '../data/products.csv?raw';

const tableOptionsByConnection = {
  'retail-ops-rds': [
    { label: 'products',   value: 'products' },
    { label: 'stores',     value: 'stores' },
    { label: 'customers',  value: 'customers' },
    { label: 'orders',     value: 'orders' },
    { label: 'inventory',  value: 'inventory' },
  ],
  'analytics-mysql': [
    { label: 'dim_product',   value: 'dim_product' },
    { label: 'dim_store',     value: 'dim_store' },
    { label: 'fact_sales',    value: 'fact_sales' },
  ],
  'staging-postgres': [
    { label: 'raw_events',    value: 'raw_events' },
    { label: 'raw_sessions',  value: 'raw_sessions' },
  ],
};

const CONNECTION_OPTIONS = [
  { value: 'retail-ops-rds',    label: 'retail-ops-rds' },
  { value: 'analytics-mysql',   label: 'analytics-mysql' },
  { value: 'staging-postgres',  label: 'staging-postgres' },
];

function parseMockProductsCsv() {
  const lines    = productsCsv.trim().split('\n');
  const headers  = lines[0].split(',').map(h => h.trim());
  const dataRows = lines.slice(1);
  const firstRow = dataRows[0]?.split(',').map(v => v.trim()) ?? [];

  const inferType = v => {
    if (v === '') return 'string';
    if (v === 'true' || v === 'false') return 'boolean';
    if (!isNaN(v)) return Number.isInteger(+v) ? 'int' : 'double';
    return 'string';
  };

  const schema = headers.map((name, i) => ({
    name,
    dataType: inferType(firstRow[i] ?? ''),
  }));

  const previewData = dataRows.map(line => {
    const values = line.split(',').map(v => v.trim());
    return Object.fromEntries(headers.map((name, i) => [name, values[i] ?? '']));
  });

  return { schema, previewData };
}

function getMockExtraData(newConfig) {
  const mode       = newConfig?.dataSourceMode ?? 'table';
  const isComplete = !!newConfig?.connection?.trim() &&
    (mode === 'query' ? !!newConfig?.sqlQuery?.trim() : !!newConfig?.tableName?.trim());
  if (isComplete) {
    const { schema, previewData } = parseMockProductsCsv();
    return { outputSchema: schema, previewData };
  }
  return { outputSchema: [], previewData: [] };
}

export default function RDSSourceForm({ node, onUpdate, upstreamSchema }) {
  const { config, errors, handleChange, handleConfigChange, handleBlur, atomicUpdate } = useNodeForm(node, onUpdate, upstreamSchema);

  const dataSourceMode     = config.dataSourceMode ?? 'table';
  const selectedConnection = CONNECTION_OPTIONS.find(o => o.value === config.connection) ?? null;
  const [selectedTable, setSelectedTable] = useState(null);

  const handleConnectionChange = ({ detail }) => {
    setSelectedTable(null);
    const newConfig = { ...config, connection: detail.selectedOption.value, tableName: '' };
    handleChange('connection', detail.selectedOption.value, getMockExtraData(newConfig));
  };

  const handleTableSelect = ({ detail }) => {
    setSelectedTable(detail.selectedOption);
    const newConfig = { ...config, tableName: detail.selectedOption.value };
    handleChange('tableName', detail.selectedOption.value, getMockExtraData(newConfig));
  };

  const handleModeChange = ({ detail }) => {
    const mode      = detail.value;
    const newConfig = { ...config, dataSourceMode: mode };
    atomicUpdate({
      configChanges: { dataSourceMode: mode },
      errorChanges:  { tableName: null, sqlQuery: null },
      extraNodeData: getMockExtraData(newConfig),
    });
  };

  const handleQueryChange = ({ detail }) => handleConfigChange('sqlQuery', detail.value);

  return (
    <SpaceBetween direction="vertical" size="m">
      <FormField
        label="Connection"
        description="Choose a Glue connection configured for your RDS instance."
        errorText={errors.connection}
      >
        <SpaceBetween direction="vertical" size="xs">
          <Select
            selectedOption={selectedConnection}
            onChange={handleConnectionChange}
            options={CONNECTION_OPTIONS}
            placeholder="Choose a connection"
          />
          <Link external href="#">Manage connections</Link>
        </SpaceBetween>
      </FormField>

      <FormField label="Data source">
        <RadioGroup
          value={dataSourceMode}
          onChange={handleModeChange}
          items={[
            { value: 'table', label: 'Table name' },
            { value: 'query', label: 'Custom SQL query' },
          ]}
        />
      </FormField>

      {dataSourceMode === 'table' && (
        <FormField label="Table name" description="Tables available in the selected connection." errorText={errors.tableName}>
          <Select
            selectedOption={selectedTable}
            onChange={handleTableSelect}
            options={tableOptionsByConnection[selectedConnection?.value] ?? []}
            placeholder="Select a table"
            empty="Select a connection first"
            disabled={!selectedConnection}
          />
        </FormField>
      )}

      {dataSourceMode === 'query' && (
        <FormField label="SQL query" errorText={errors.sqlQuery}>
          <Textarea
            value={config.sqlQuery ?? ''}
            onChange={handleQueryChange}
            onBlur={() => handleBlur('sqlQuery', getMockExtraData({ ...config, sqlQuery: config.sqlQuery ?? '' }))}
            placeholder="SELECT * FROM products WHERE is_active = true"
            rows={5}
          />
        </FormField>
      )}

      <ExpandableSection headerText="Partition options" variant="footer">
        <SpaceBetween direction="vertical" size="m">
          <FormField
            label={<>Hash field <i> - optional</i></>}
            description="Column used to partition data for parallel reads."
          >
            <Input
              value={config.hashField ?? ''}
              onChange={({ detail }) => handleChange('hashField', detail.value)}
              placeholder="Enter hashfield"
            />
          </FormField>
          <FormField label={<>Number of partitions <i> - optional</i></>}>
            <Input
              type="number"
              value={config.numPartitions ?? ''}
              onChange={({ detail }) => handleChange('numPartitions', detail.value)}
              placeholder="Enter number of partitions"
            />
          </FormField>
        </SpaceBetween>
      </ExpandableSection>
    </SpaceBetween>
  );
}
