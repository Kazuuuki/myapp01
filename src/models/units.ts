import { WeightUnit } from './types';

const KG_TO_LB = 2.20462;

export function toDisplayWeight(weightKg: number, unit: WeightUnit): number {
  if (unit === 'lb') {
    return roundTo(weightKg * KG_TO_LB, 1);
  }
  return roundTo(weightKg, 1);
}

export function fromDisplayWeight(displayWeight: number, unit: WeightUnit): number {
  if (unit === 'lb') {
    return roundTo(displayWeight / KG_TO_LB, 2);
  }
  return roundTo(displayWeight, 2);
}

export function getWeightStep(unit: WeightUnit): number {
  return unit === 'lb' ? 5 : 2.5;
}

export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
