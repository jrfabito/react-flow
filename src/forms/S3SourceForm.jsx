import Checkbox from '@cloudscape-design/components/checkbox';
import FormField from '@cloudscape-design/components/form-field';
import Input from '@cloudscape-design/components/input';
import S3ResourceSelector from '@cloudscape-design/components/s3-resource-selector';
import Select from '@cloudscape-design/components/select';
import SpaceBetween from '@cloudscape-design/components/space-between';
import { useNodeForm } from './useNodeForm.js';
import transactionsCsv from '../data/transactions.csv?raw';

// ── Prototype mock data ────────────────────────────────────────────────────────
const MOCK_BUCKET = 'prototype-data';
const MOCK_KEY    = 'transactions.csv';

// fetchBuckets / fetchObjects / fetchVersions must return plain arrays (not { items: [] })
// fetchObjects receives (bucketName: string, pathPrefix: string) as positional args
const fetchBuckets  = async () => [
  { Name: MOCK_BUCKET, CreationDate: '2024-01-01T00:00:00Z' },
];

const fetchObjects  = async (bucketName) => bucketName === MOCK_BUCKET
  ? [{ Key: MOCK_KEY, LastModified: '2024-01-01T00:00:00Z', Size: 2048 }]
  : [];

const fetchVersions = async () => [];
// ── End prototype mock data ────────────────────────────────────────────────────

function detectFormat(uri) {
  const ext = uri?.split('?')[0].split('.').pop()?.toLowerCase();
  return { csv: 'csv', json: 'json', parquet: 'parquet', orc: 'orc', avro: 'avro' }[ext] ?? null;
}

const DELIMITER_OPTIONS = [
  { value: ',',  label: 'Comma (,)' },
  { value: '\t', label: 'Tab (\\t)' },
  { value: '|',  label: 'Pipe (|)' },
  { value: ';',  label: 'Semicolon (;)' },
];

const QUOTE_OPTIONS = [
  { value: '"',    label: 'Double quote (")' },
  { value: "'",    label: "Single quote (')" },
  { value: 'none', label: 'None' },
];

const S3_I18N = {
  inContextInputPlaceholder:          's3://bucket/prefix/object',
  inContextSelectPlaceholder:         'Choose a version',
  inContextBrowseButton:              'Browse S3',
  inContextLoadingText:               'Loading resource',
  inContextVersionSelectLabel:        'Object version',
  modalTitle:                         'Choose the data file from S3 you want to use.',
  modalCancelButton:                  'Cancel',
  modalSubmitButton:                  'Choose',
  modalLastUpdatedText:               'Last updated',
  selectionBuckets:                   'Buckets',
  selectionObjects:                   'Objects',
  selectionVersions:                  'Versions',
  selectionBucketsSearchPlaceholder:  'Find bucket',
  selectionObjectsSearchPlaceholder:  'Find object',
  selectionVersionsSearchPlaceholder: 'Find version',
  selectionBucketsLoading:            'Loading buckets',
  selectionBucketsNoItems:            'No buckets',
  selectionObjectsLoading:            'Loading objects',
  selectionObjectsNoItems:            'No objects',
  selectionVersionsLoading:           'Loading versions',
  selectionVersionsNoItems:           'No versions',
  filteringCounterText:               count => `${count} match${count !== 1 ? 'es' : ''}`,
  filteringNoMatches:                 'No matches',
  filteringCantFindMatch:             "We can't find a match",
  clearFilterButtonText:              'Clear filter',
  columnBucketName:                   'Bucket name',
  columnBucketCreationDate:           'Creation date',
  columnObjectKey:                    'Key',
  columnObjectLastModified:           'Last modified',
  columnObjectSize:                   'Size',
  columnVersionID:                    'Version ID',
  columnVersionLastModified:          'Last modified',
  columnVersionSize:                  'Size',
  validationPathMustBegin:            "The path must begin with 's3://'",
  validationBucketLowerCase:          'The bucket name must start with a lowercase character or number.',
  labelSortedDescending:              col => `${col}, sorted descending`,
  labelSortedAscending:               col => `${col}, sorted ascending`,
  labelNotSorted:                     col => `${col}, not sorted`,
  labelsPagination: {
    nextPageLabel:     'Next page',
    previousPageLabel: 'Previous page',
    pageLabel:         n => `Page ${n}`,
  },
  labelBreadcrumbs:       'S3 navigation',
  labelExpandBreadcrumbs: 'Show path',
  labelRefresh:           'Refresh',
  labelModalDismiss:      'Dismiss',
};

function parseMockCsv() {
  const lines   = transactionsCsv.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const dataRows = lines.slice(1);
  const firstRow = dataRows[0]?.split(',').map(v => v.trim()) ?? [];

  const inferType = v => {
    if (v === '') return 'string';
    if (!isNaN(v)) return Number.isInteger(+v) ? 'int' : 'double';
    return 'string';
  };

  const schema = headers.map((name, i) => ({
    name,
    dataType: inferType(firstRow[i] ?? ''),
  }));

  // Each row becomes an object keyed by column name
  const previewData = dataRows.map(line => {
    const values = line.split(',').map(v => v.trim());
    return Object.fromEntries(headers.map((name, i) => [name, values[i] ?? '']));
  });

  return { schema, previewData };
}

export default function S3SourceForm({ node, onUpdate, upstreamSchema }) {
  const { config, errors, handleChange, handleMultiChange } = useNodeForm(node, onUpdate, upstreamSchema);

  const handleS3Change = ({ detail }) => {
    const uri    = detail.resource.uri;
    const format = detectFormat(uri);
    const extra  = uri?.startsWith('s3://')
      ? parseMockCsv()
      : { schema: [], previewData: [] };
    handleMultiChange(
      { s3Url: uri, ...(format ? { dataFormat: format } : {}) },
      { outputSchema: extra.schema, previewData: extra.previewData },
    );
  };

  return (
    <SpaceBetween direction="vertical" size="m">
      <div style={{ borderTop: '1px solid #d1d5db', padding: '0' }} />
      <FormField label="S3 location" description="Choose the data file from S3 you want to use." errorText={errors.s3Url}>
        <div className="s3-no-view">
          <S3ResourceSelector
            resource={{ uri: config.s3Url ?? '' }}
            onChange={handleS3Change}
            fetchBuckets={fetchBuckets}
            fetchObjects={fetchObjects}
            fetchVersions={fetchVersions}
            selectableItemsTypes={['objects']}
            i18nStrings={S3_I18N}
          />
        </div>
      </FormField>

      {config.dataFormat === 'csv' && (
        <SpaceBetween direction="vertical" size="m">
          <FormField label="Delimiter" errorText={errors.delimiter} description="The character used to separate fields in the CSV file.">
            <Select
              selectedOption={DELIMITER_OPTIONS.find(o => o.value === (config.delimiter ?? ',')) ?? DELIMITER_OPTIONS[0]}
              onChange={({ detail }) => handleChange('delimiter', detail.selectedOption.value)}
              options={DELIMITER_OPTIONS}
            />
          </FormField>
          
          <FormField label="Quote character" errorText={errors.quoteChar} description="The character used to quote fields in the CSV file.">
            <Select
              selectedOption={QUOTE_OPTIONS.find(o => o.value === (config.quoteChar ?? '"')) ?? QUOTE_OPTIONS[0]}
              onChange={({ detail }) => handleChange('quoteChar', detail.selectedOption.value)}
              options={QUOTE_OPTIONS}
            />
          </FormField>
          <Checkbox
            checked={config.multiLine ?? false}
            onChange={({ detail }) => handleChange('multiLine', detail.checked)}
          >
            Records in source files can span multiple lines
          </Checkbox>
          <Checkbox
            checked={config.hasHeader ?? true}
            onChange={({ detail }) => handleChange('hasHeader', detail.checked)}
          >
            First line of source file contains column headers
          </Checkbox>
          <FormField
            label={<>Escape character <i>- optional</i></>}
            description="The character which immediately follows is used as-is, except for a small set of well-known escapes (\n, \r, \t, and \0)."
            errorText={errors.escapeChar}
          >
            <Input
              value={config.escapeChar ?? ''}
              placeholder="Enter escape character"
              onChange={({ detail }) => handleChange('escapeChar', detail.value)}
            />
          </FormField>
        </SpaceBetween>
      )}
    </SpaceBetween>
  );
}
