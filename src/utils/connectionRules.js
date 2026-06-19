export const CONNECTION_RULES = {
  Source:    ['Transform'],
  Transform: ['Transform', 'Target'],
  Target:    [],
};

export function deriveCategory(type) {
  return type.split(' - ')[0];
}

const MAX_INCOMING_CONNECTIONS = {
  'Transform - Apply mapping': 1,
  'Transform - Join':          2,
  'Target - S3':               1,
  'Target - Glue Data Catalog': 1,
};

export function getMaxIncoming(type) {
  return MAX_INCOMING_CONNECTIONS[type] ?? Infinity;
}

// Returns true if connecting source → target would create a cycle.
// Walks downstream from target through existing edges; if source is reachable, it's a cycle.
export function wouldCreateCycle(sourceId, targetId, edges) {
  const visited = new Set();
  const queue   = [targetId];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === sourceId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    edges.filter(e => e.source === current).forEach(e => queue.push(e.target));
  }
  return false;
}
