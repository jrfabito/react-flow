import Box from '@cloudscape-design/components/box';

export default function FallbackForm({ node }) {
  return (
    <Box color="text-status-inactive">
      Configuration for &ldquo;{node.data.type}&rdquo; is not yet available.
    </Box>
  );
}
