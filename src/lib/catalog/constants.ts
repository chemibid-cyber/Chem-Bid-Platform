export const GRADES = [
  {
    value: 'pure',
    label: 'Pure',
    desc: 'Analytical/reagent grade — highest purity, COA-critical.',
  },
  {
    value: 'distilled',
    label: 'Distilled',
    desc: 'Distillation-grade — high purity but not analytical.',
  },
  { value: 'trade', label: 'Trade', desc: 'Commercial/technical grade.' },
] as const;

export const ROLES = [
  { value: 'mfr', label: 'Manufacturer' },
  { value: 'dist', label: 'Distributor' },
  { value: 'trader', label: 'Trader' },
] as const;

export type GradeValue = (typeof GRADES)[number]['value'];
export type RoleValue = (typeof ROLES)[number]['value'];

export const ROLE_LABEL: Record<string, string> = Object.fromEntries(
  ROLES.map((r) => [r.value, r.label]),
);
