export const BRANCHES = [
  'Santa Rosa',
  'Macachín',
  'General Acha',
  'General Pico',
  'Deposito'
];

export const createEmptyBranchStock = () =>
  Object.fromEntries(BRANCHES.map(branch => [branch, 0]));

export const getTotalBranchStock = branchStock =>
  BRANCHES.reduce((total, branch) => total + (branchStock[branch] || 0), 0);