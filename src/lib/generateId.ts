let counter = 1;

export const generateId = (prefix: string): string => {
  return `${prefix}-${counter++}`;
};