import type { AnimationMeta, PerModeControl } from '@/types';

/** Whether a control applies to a mode. Missing list = all controls apply. */
export const isRelevant = (meta: AnimationMeta, control: PerModeControl): boolean =>
  !meta.controls || meta.controls.includes(control);
