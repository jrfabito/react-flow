import { useState } from 'react';
import { computeOutputSchema, computeStatus } from './schemas/index.js';

const VALIDATION_RULES = {
  'Source - S3': {
    s3Url: v => !v?.trim()              ? 'S3 URL is required.'
               : !v.startsWith('s3://') ? "Must start with s3://"
               : null,
  },
  'Source - RDS': {
    connection: v => !v?.trim() ? 'Connection is required.' : null,
    tableName:  (v, config) => (config?.dataSourceMode ?? 'table') !== 'query' && !v?.trim()
      ? 'Table name is required.'
      : null,
    sqlQuery:   (v, config) => config?.dataSourceMode === 'query' && !v?.trim()
      ? 'SQL query is required.'
      : null,
  },
  'Transform - Join': {
    joinType:         v => !v?.trim() ? 'Join type is required.' : null,
    leftInputNodeId:  v => !v?.trim() ? 'Left input data frame is required.' : null,
    rightInputNodeId: v => !v?.trim() ? 'Right input data frame is required.' : null,
    keyPairs: v => {
      if (!v || v.length === 0) return 'At least one join key pair is required.';
      if (v.some(p => !p.leftKey || !p.rightKey)) return 'All key pairs must have both columns selected.';
      return null;
    },
  },
  'Transform - Apply mapping': {
    mappings: v => {
      if (!v || v.length === 0) return null;
      const included = v.filter(m => m.include !== 'no');
      if (included.length === 0) return 'At least one field must be included.';
      if (included.some(m => !m.target?.trim())) return 'All included fields must have a target name.';
      const validPattern = /^[a-zA-Z0-9_-]+$/;
      if (included.some(m => m.target?.trim() && !validPattern.test(m.target.trim()))) return 'Target field names may only contain letters, numbers, _ and -.';
      const targets = included.filter(m => m.target?.trim()).map(m => m.target.trim());
      if (new Set(targets).size !== targets.length) return 'Target field names must be unique.';
      return null;
    },
  },
};

function validateField(type, field, value, config = {}) {
  if (field === 'label') return !value?.trim() ? 'Name is required.' : null;
  return VALIDATION_RULES[type]?.[field]?.(value, config) ?? null;
}

// Shared hook consumed by every per-type form component.
// Returns { config, errors, handleChange, handleMultiChange }.
// handleChange(field, value, extraNodeData?)  — single field auto-save + validation.
// handleMultiChange({ field: val }, extraNodeData?) — atomic multi-field save.
export function useNodeForm(node, onUpdate, upstreamSchema = []) {
  const config = node.data.config ?? {};
  const [errors, setErrors] = useState(node.data.validationErrors ?? {});

  const handleChange = (field, value, extraNodeData = {}) => {
    const newConfig = { ...config, [field]: value };
    const error     = validateField(node.data.type, field, value, newConfig);

    if (field === 'label') {
      setErrors(prev => ({ ...prev, label: error }));
      onUpdate(node.id, { label: value });
      return;
    }

    const newErrors = { ...errors, [field]: error };
    const newSchema = computeOutputSchema(node.data.type, newConfig, upstreamSchema);
    const newStatus = computeStatus(node.data.type, newConfig, newErrors, node.data.label);

    setErrors(newErrors);
    onUpdate(node.id, {
      config:           newConfig,
      outputSchema:     newSchema,
      validationErrors: newErrors,
      status:           newStatus,
      ...extraNodeData,
    });
  };

  const handleMultiChange = (fields, extraNodeData = {}) => {
    const newConfig = { ...config, ...fields };
    const newErrors = { ...errors };

    for (const [field, value] of Object.entries(fields)) {
      newErrors[field] = validateField(node.data.type, field, value, newConfig);
    }

    const newSchema = computeOutputSchema(node.data.type, newConfig, upstreamSchema);
    const newStatus = computeStatus(node.data.type, newConfig, newErrors, node.data.label);

    setErrors(newErrors);
    onUpdate(node.id, {
      config:           newConfig,
      outputSchema:     newSchema,
      validationErrors: newErrors,
      status:           newStatus,
      ...extraNodeData,
    });
  };

  // Updates config only — no validation, no status recompute.
  // Use for text fields where validation/success should only fire on blur.
  const handleConfigChange = (field, value) => {
    onUpdate(node.id, { config: { ...config, [field]: value } });
  };

  const handleBlur = (field, extraNodeData = {}) => {
    const error     = validateField(node.data.type, field, config[field] ?? '', config);
    const newErrors = { ...errors, [field]: error };
    const newStatus = computeStatus(node.data.type, config, newErrors, node.data.label);
    setErrors(newErrors);
    onUpdate(node.id, { validationErrors: newErrors, status: newStatus, ...extraNodeData });
  };

  // Atomically applies config changes + explicit error overrides in one update.
  // Use when you need to clear stale errors without re-validating (e.g. mode switches).
  const atomicUpdate = ({ configChanges = {}, errorChanges = {}, extraNodeData = {} }) => {
    const newConfig = { ...config, ...configChanges };
    const newErrors = { ...errors, ...errorChanges };
    const newSchema = computeOutputSchema(node.data.type, newConfig, upstreamSchema);
    const newStatus = computeStatus(node.data.type, newConfig, newErrors, node.data.label);
    setErrors(newErrors);
    onUpdate(node.id, {
      config:           newConfig,
      outputSchema:     newSchema,
      validationErrors: newErrors,
      status:           newStatus,
      ...extraNodeData,
    });
  };

  return { config, errors, handleChange, handleConfigChange, handleMultiChange, handleBlur, atomicUpdate };
}
