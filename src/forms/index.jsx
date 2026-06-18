import S3SourceForm from './S3SourceForm.jsx';
import RDSSourceForm from './RDSSourceForm.jsx';
import JoinTransformForm from './JoinTransformForm.jsx';
import ApplyMappingTransformForm from './ApplyMappingTransformForm.jsx';
import FallbackForm from './FallbackForm.jsx';

const FORM_MAP = {
  'Source - S3':              S3SourceForm,
  'Source - RDS':             RDSSourceForm,
  'Transform - Join':         JoinTransformForm,
  'Transform - Apply mapping': ApplyMappingTransformForm,
};

export default function NodeForm({ node, onUpdate, upstreamSchema = [], allNodes = [], allEdges = [], onAddEdge, onRemoveEdge }) {
  const Form = FORM_MAP[node.data.type] ?? FallbackForm;
  return <Form node={node} onUpdate={onUpdate} upstreamSchema={upstreamSchema} allNodes={allNodes} allEdges={allEdges} onAddEdge={onAddEdge} onRemoveEdge={onRemoveEdge} />;
}
