export const CONNECTION_RULES = {
  Source:    ['Transform'],
  Transform: ['Transform', 'Target'],
  Target:    [],
};

export function deriveCategory(type) {
  return type.split(' - ')[0];
}
