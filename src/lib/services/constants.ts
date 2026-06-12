/**
 * Service Providers Hub vocabulary (transport assets + packaging inventory).
 * Values are stable keys stored in text[] columns; labels are display-only.
 */

export const VEHICLE_TYPES = [
  { value: 'ss_tanker', label: 'SS Tanker (Stainless Steel)' },
  { value: 'ms_tanker', label: 'MS Tanker (Mild Steel)' },
  { value: 'hdpe_tanker', label: 'HDPE Tanker' },
  { value: 'part_load', label: 'Part Load' },
  { value: 'body_truck', label: 'Body Truck' },
  { value: 'trailer', label: 'Trailer' },
  { value: 'container', label: 'Container' },
] as const;

export const PACKING_TYPES = [
  { value: 'fibc_bag', label: 'FIBC Bag' },
  { value: 'drums', label: 'Drums' },
  { value: 'iso_tank', label: 'ISO Tank' },
  { value: 'carboys', label: 'Carboys' },
] as const;

export const PACKING_CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'used', label: 'Used' },
  { value: 'other', label: 'Other' },
] as const;

export type VehicleType = (typeof VEHICLE_TYPES)[number]['value'];
export type PackingType = (typeof PACKING_TYPES)[number]['value'];
export type PackingCondition = (typeof PACKING_CONDITIONS)[number]['value'];

export const VEHICLE_TYPE_VALUES = VEHICLE_TYPES.map((v) => v.value) as readonly string[];
export const PACKING_TYPE_VALUES = PACKING_TYPES.map((p) => p.value) as readonly string[];
export const PACKING_CONDITION_VALUES = ['new', 'used', 'other'] as const;

export const VEHICLE_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  VEHICLE_TYPES.map((v) => [v.value, v.label]),
);
export const PACKING_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  PACKING_TYPES.map((p) => [p.value, p.label]),
);
export const PACKING_CONDITION_LABEL: Record<string, string> = {
  new: 'New',
  used: 'Used',
  other: 'Other',
};

export const SERVICE_KIND_LABEL: Record<string, string> = {
  transport: 'Transport',
  packing: 'Packing material',
};

export const SERVICE_STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  closed: 'Closed',
  cancelled: 'Cancelled',
};
