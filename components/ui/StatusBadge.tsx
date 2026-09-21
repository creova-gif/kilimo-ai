import React from 'react';
import { Badge, BadgeProps, BadgeVariant } from './Badge';

/** Figma "Status Badge" (32:108) variant names. */
export type Status = 'active' | 'warning' | 'error' | 'info' | 'neutral';

const STATUS_TO_VARIANT: Record<Status, BadgeVariant> = {
  active: 'success',
  warning: 'warning',
  error: 'error',
  info: 'info',
  neutral: 'neutral',
};

export interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status?: Status;
}

/** Figma-named wrapper: `<StatusBadge status="active" label={t('active')} />`. */
export function StatusBadge({ status = 'active', ...rest }: StatusBadgeProps) {
  return <Badge variant={STATUS_TO_VARIANT[status]} {...rest} />;
}
