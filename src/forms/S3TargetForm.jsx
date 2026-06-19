import { useEffect, useRef } from 'react';
import Autosuggest from '@cloudscape-design/components/autosuggest';
import Button from '@cloudscape-design/components/button';
import FormField from '@cloudscape-design/components/form-field';
import S3ResourceSelector from '@cloudscape-design/components/s3-resource-selector';
import Select from '@cloudscape-design/components/select';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Toggle from '@cloudscape-design/components/toggle';
import { useNodeForm } from './useNodeForm.js';
import { wouldCreateCycle } from '../utils/connectionRules.js';

const FORMAT_OPTIONS = [
  { value: 'parquet', label: 'Parquet' },
  { value: 'csv',     label: 'CSV'     },
  { value: 'json',    label: 'JSON'    },
  { value: 'orc',     label: 'ORC'     },
  { value: 'avro',    label: 'Avro'    },
];

const DATABASE_OPTIONS = [
  { value: 'retail_dw',      label: 'retail_dw'      },
  { value: 'retail_staging', label: 'retail_staging'  },
  { value: 'retail_raw',     label: 'retail_raw'      },
];

const TABLE_SUGGESTIONS = {
  retail_dw:      ['daily_sales', 'dim_product', 'dim_store'],
  retail_staging: ['raw_events', 'raw_transactions'],
  retail_raw:     ['source_products', 'source_transactions'],
};

const MOCK_BUCKETS = [
  { Name: 'retail-raw',       CreationDate: '2024-01-01' },
  { Name: 'retail-warehouse', CreationDate: '2024-01-01' },
  { Name: 'retail-staging',   CreationDate: '2024-01-01' },
];

const fetchBuckets  = async () => MOCK_BUCKETS;
const fetchObjects  = async () => [];
const fetchVersions = async () => [];

const S3_I18N = {
  inContextSelectPlaceholder:     's3://bucket/prefix',
  inContextInputPlaceholder:      's3://bucket/prefix/object',
  inContextBrowseButton:          'Browse S3',
  inContextViewButton:            'View',
  inContextViewButtonAriaLabel:   'View selected S3 resource',
  modalTitle:                     'Choose an S3 destination',
  modalCancelButton:              'Cancel',
  modalSubmitButton:              'Choose destination',
  modalBreadcrumbRootItem:        'S3 buckets',
  labelModalDismiss:              'Dismiss',
  filteringCounterText:           count => `${count} ${count === 1 ? 'match' : 'matches'}`,
  filteringNoMatches:             'No matches',
  filteringCantFindMatch:         "We can't find a match.",
  labelFiltering:                 itemsType => `Filter ${itemsType}`,
  labelNotSorted:                 columnName => `${columnName}, not sorted`,
  labelSortedDescending:          columnName => `${columnName}, sorted descending`,
  labelSortedAscending:           columnName => `${columnName}, sorted ascending`,
  labelsBucketsSelection: {
    itemSelectionLabel:  (_, item) => item.Name ?? '',
    selectionGroupLabel: 'Buckets',
  },
  labelsPrefixesSelection: {
    itemSelectionLabel:  (_, item) => item.Key ?? '',
    selectionGroupLabel: 'Prefixes',
  },
  selectionBuckets:               'Buckets',
  selectionBucketsSearchPlaceholder: 'Search buckets',
  selectionBucketsNoItems:        'No buckets available',
  selectionBucketsLoading:        'Loading buckets',
  columnBucketName:               'Name',
  columnBucketCreationDate:       'Creation date',
  labelRefresh:                   'Refresh',
  labelBreadcrumbs:               'S3 navigation',
  labelExpandBreadcrumbs:         'Expand breadcrumbs',
  validationPathMustBegin:        'The path must begin with s3://',
  validationBucketLowerCase:      'The bucket name must start with a lower case letter or number.',
  validationBucketMustNotContain: 'The bucket name must not contain upper case characters.',
  validationBucketLength:         'The bucket name must be from 3 to 63 characters.',
  validationBucketMustComplyDns:  'The bucket name must comply with DNS naming conventions.',
};

export default function S3TargetForm({ node, onUpdate, allNodes = [], allEdges = [], onAddEdge, onRemoveEdge }) {
  const incomingEdges    = allEdges.filter(e => e.target === node.id);
  const connectedNodeIds = new Set(incomingEdges.map(e => e.source));
  const configuredId     = node.data.config?.dataInputNodeId;
  const selectedInputId  = configuredId && connectedNodeIds.has(configuredId)
    ? configuredId
    : (connectedNodeIds.size === 1 ? [...connectedNodeIds][0] : null);

  const inputOptions = allNodes
    .filter(n => n.id !== node.id)
    .filter(n => ['Source', 'Transform'].includes(n.data.type?.split(' - ')[0]))
    .map(n => ({
      value:       n.id,
      label:       n.data.label ?? n.id,
      description: n.data.type,
      disabled:    connectedNodeIds.has(n.id) || wouldCreateCycle(n.id, node.id, allEdges),
    }));

  const { config, handleChange, handleMultiChange } = useNodeForm(node, onUpdate);

  const configRef = useRef(config);
  configRef.current = config;
  const handleChangeRef = useRef(handleChange);
  handleChangeRef.current = handleChange;

  // Seed defaults on first mount
  useEffect(() => {
    const defaults = {};
    if (!config.dataFormat)                     defaults.dataFormat        = 'parquet';
    if (config.registerToCatalog === undefined) defaults.registerToCatalog = true;
    if (Object.keys(defaults).length) {
      onUpdate(node.id, { config: { ...config, ...defaults } });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-sync dataInputNodeId into config when a canvas edge is drawn
  useEffect(() => {
    if (selectedInputId && selectedInputId !== configRef.current.dataInputNodeId) {
      handleChangeRef.current('dataInputNodeId', selectedInputId);
    }
  }, [selectedInputId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset dataInputNodeId when the connected node is removed from the canvas
  const prevSelectedInputIdRef = useRef(selectedInputId);
  useEffect(() => {
    const prev = prevSelectedInputIdRef.current;
    prevSelectedInputIdRef.current = selectedInputId;
    if (prev !== null && selectedInputId === null) {
      onUpdate(node.id, {
        config:           { ...configRef.current, dataInputNodeId: null },
        status:           'pending',
        validationErrors: {},
      });
    }
  }, [selectedInputId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleDataInputChange = (nodeId) => {
    const existingEdge = allEdges.find(e => e.target === node.id);
    if (existingEdge) onRemoveEdge?.(existingEdge.id);
    onAddEdge?.({ id: `e-${nodeId}-${node.id}`, source: nodeId, target: node.id, type: 'etlEdge' });
    handleChangeRef.current('dataInputNodeId', nodeId);
  };

  const handleRemoveDataInput = () => {
    if (!selectedInputId) return;
    const edge = allEdges.find(e => e.source === selectedInputId && e.target === node.id);
    if (edge) onRemoveEdge?.(edge.id);
    onUpdate(node.id, {
      config:           { ...configRef.current, dataInputNodeId: null },
      status:           'pending',
      validationErrors: {},
    });
  };

  // ── Derived values ─────────────────────────────────────────────────────────

  const dataFormat        = config.dataFormat        ?? 'parquet';
  const registerToCatalog = config.registerToCatalog ?? true;

  return (
    <SpaceBetween direction="vertical" size="m">

      <FormField
        label="Data input"
        description="Choose the node that provides the data to write to S3."
      >
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <Select
              expandToViewport
              triggerVariant="option"
              selectedOption={inputOptions.find(o => o.value === selectedInputId) ?? null}
              onChange={({ detail }) => handleDataInputChange(detail.selectedOption.value)}
              options={inputOptions}
              placeholder="Choose a data input"
              empty="No compatible nodes on canvas."
            />
          </div>
          <Button disabled={!selectedInputId} onClick={handleRemoveDataInput}>Remove</Button>
        </div>
      </FormField>

      <div style={{ borderTop: '1px solid #d1d5db', padding: '0' }} />

      <FormField
        label="S3 location"
        description="The S3 bucket and optional prefix where the output data will be written."
      >
        <div className="s3-no-view">
          <S3ResourceSelector
            resource={{ uri: config.s3Location ?? '' }}
            onChange={({ detail }) => handleChange('s3Location', detail.resource.uri)}
            selectableItemsTypes={['buckets', 'prefixes']}
            fetchBuckets={fetchBuckets}
            fetchObjects={fetchObjects}
            fetchVersions={fetchVersions}
            i18nStrings={S3_I18N}
          />
        </div>
      </FormField>

      <FormField
        label="Data format"
        description="The file format used to store the output data in S3."
      >
        <Select
          selectedOption={FORMAT_OPTIONS.find(o => o.value === dataFormat) ?? null}
          onChange={({ detail }) => handleChange('dataFormat', detail.selectedOption.value)}
          options={FORMAT_OPTIONS}
        />
      </FormField>

      <FormField
        label="Data Catalog registration"
        description="Register the output dataset as a table in the AWS Glue Data Catalog for use in queries and other jobs."
      >
        <SpaceBetween direction="vertical" size="s">
          <Toggle
            checked={registerToCatalog}
            onChange={({ detail }) => handleChange('registerToCatalog', detail.checked)}
          >
            Register output to Data Catalog
          </Toggle>
          {registerToCatalog && (
            <SpaceBetween direction="vertical" size="s">
              <FormField
                label="Database name"
                description="The Glue Data Catalog database where the table will be registered."
              >
                <Select
                  expandToViewport
                  selectedOption={DATABASE_OPTIONS.find(o => o.value === config.catalogDatabase) ?? null}
                  onChange={({ detail }) => handleMultiChange({ catalogDatabase: detail.selectedOption.value, catalogTable: '' })}
                  options={DATABASE_OPTIONS}
                  placeholder="Choose a database"
                />
              </FormField>
              <FormField
                label="Table name"
                description="The Glue Data Catalog table that will represent this output dataset."
              >
                <Autosuggest
                  value={config.catalogTable ?? ''}
                  options={(TABLE_SUGGESTIONS[config.catalogDatabase] ?? []).map(t => ({ value: t }))}
                  onChange={({ detail }) => handleChange('catalogTable', detail.value)}
                  placeholder="Enter or choose a table name"
                  empty="No suggestions available."
                  enteredTextLabel={v => `Use: "${v}"`}
                />
              </FormField>
            </SpaceBetween>
          )}
        </SpaceBetween>
      </FormField>

    </SpaceBetween>
  );
}
