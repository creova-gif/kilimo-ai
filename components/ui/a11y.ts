import type { Insets } from 'react-native';
import { SIZES } from '../../constants/Theme';

/** Minimum interactive target (points) — WCAG 2.5.5 / iOS HIG / Material. */
export const MIN_TOUCH_TARGET = SIZES.touchTarget;

/**
 * hitSlop that pads a control whose *visual* box is smaller than 44pt up to a
 * 44pt touch target, without changing its look (Figma chips are ~34pt tall).
 */
export function touchSlop(visualHeight: number, visualWidth?: number): Insets | undefined {
  const v = Math.max(0, Math.ceil((MIN_TOUCH_TARGET - visualHeight) / 2));
  const h =
    visualWidth === undefined ? 0 : Math.max(0, Math.ceil((MIN_TOUCH_TARGET - visualWidth) / 2));
  if (v === 0 && h === 0) return undefined;
  return { top: v, bottom: v, left: h, right: h };
}
