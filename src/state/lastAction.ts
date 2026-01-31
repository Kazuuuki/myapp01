import { SetRecord } from '@/src/models/types';

export type LastAction =
  | { type: 'add_set'; setId: string }
  | { type: 'update_set'; setId: string; previousWeight: number; previousReps: number }
  | { type: 'delete_set'; set: SetRecord };

let lastAction: LastAction | null = null;

export function getLastAction(): LastAction | null {
  return lastAction;
}

export function setLastAction(action: LastAction | null) {
  lastAction = action;
}
