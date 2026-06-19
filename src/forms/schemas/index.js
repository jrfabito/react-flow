// Returns true when all required fields for a node type have valid values.
export function isFormComplete(type, config, label) {
  if (!label?.trim()) return false;
  switch (type) {
    case 'Source - S3':
      return !!(config?.s3Url?.trim()) && config.s3Url.startsWith('s3://');
    case 'Source - RDS': {
      if (!config?.connection?.trim()) return false;
      const mode = config?.dataSourceMode ?? 'table';
      return mode === 'query'
        ? !!(config?.sqlQuery?.trim())
        : !!(config?.tableName?.trim());
    }
    case 'Transform - Join': {
      if (!config?.joinType?.trim())         return false;
      if (!config?.leftInputNodeId?.trim())  return false;
      if (!config?.rightInputNodeId?.trim()) return false;
      const pairs = config?.keyPairs ?? [];
      return pairs.length > 0 && pairs.every(p => p.leftKey?.trim() && p.rightKey?.trim());
    }
    case 'Transform - Apply mapping':
      return (config?.mappings ?? []).length > 0;
    case 'Target - S3':
      return !!(config?.dataInputNodeId?.trim()) && !!(config?.s3Location?.trim());
    default:
      return false;
  }
}

// Derives the node status from current errors + completeness.
// 'loading' means the form is valid and the data preview should start fetching.
export function computeStatus(type, config, errors, label) {
  if (Object.values(errors).some(v => v != null)) return 'error';
  if (isFormComplete(type, config, label)) return 'success';
  return 'pending';
}

// Derives the output schema a node produces.
// Sources: user-managed via the Output Schema tab (return empty here).
// Transforms: computed from upstream schema + node config.
export function computeOutputSchema(type, config, upstreamSchema) {
  switch (type) {
    // Passthrough — output equals input
    case 'Transform - Filter':
    case 'Transform - Select from collection':
    case 'Transform - Union':
      return upstreamSchema[0] ?? [];

    // Field-shaping — refined when each form is built; passthrough for now
    case 'Transform - Select fields':
    case 'Transform - Drop fields':
    case 'Transform - Rename fields':
    case 'Transform - Split fields':
    case 'Transform - Spigot':
      return upstreamSchema[0] ?? [];

    // Apply mapping / Join: output schema is driven by mock CSV data in the form component
    case 'Transform - Apply mapping':
    case 'Transform - Join':
      return [];

    // Targets produce no downstream output
    case 'Target - S3':
    case 'Target - Glue Data Catalog':
      return [];

    // Sources: output schema is user-managed in the Output Schema tab
    default:
      return [];
  }
}
