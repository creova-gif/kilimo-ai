import React from 'react';
import { ViewProps } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { useTheme } from '../../constants/Theme';
import { EmptyState } from './EmptyState';

export interface ErrorStateProps extends ViewProps {
  /** Pass translated copy — the primitive never embeds text. */
  title: string;
  description?: string;
  /** Technical reference line, e.g. an error code (Figma "Kosa: ERR-500"). */
  code?: string;
  /** Label + handler for the primary retry button. The button only renders when both are set. */
  retryLabel?: string;
  onRetry?: () => void;
  /** Optional secondary action (Figma "Ripoti Tatizo" / "Continue offline"). */
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Override the default alert-triangle icon (e.g. cloud-off for network errors). */
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

/** Figma State / Error / Generic (53:1388), Network Error (20:542), AI Service Unavailable (50:2506). */
export function ErrorState({
  title,
  description,
  code,
  retryLabel,
  onRetry,
  secondaryLabel,
  onSecondary,
  icon,
  children,
  ...rest
}: ErrorStateProps) {
  const { colors } = useTheme();
  return (
    <EmptyState
      announce
      tone="danger"
      icon={icon ?? <AlertTriangle size={48} color={colors.errorText} strokeWidth={2} />}
      title={title}
      description={description}
      caption={code}
      actionLabel={retryLabel}
      onAction={onRetry}
      secondaryActionLabel={secondaryLabel}
      onSecondaryAction={onSecondary}
      {...rest}
    >
      {children}
    </EmptyState>
  );
}
