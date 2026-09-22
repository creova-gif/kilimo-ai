import React, { useId, useState } from 'react';
import {
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../constants/Theme';
import { useT } from '../../lib/i18n';

/** iOS numeric keypads have no return key; these get a "Done" bar so the keyboard can close. */
const NUMERIC_KEYBOARDS = new Set(['number-pad', 'decimal-pad', 'numeric', 'phone-pad']);

export interface TextFieldProps extends TextInputProps {
  /** Field label rendered above the input (Figma: 14 SemiBold). Pass translated copy. */
  label?: string;
  /** Helper text under the field (hidden while an error is shown). */
  hint?: string;
  /** Error message. Turns the field red (Figma Input Field / Error) and is announced. */
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  /** Figma "Disabled" state. Also sets editable=false. */
  disabled?: boolean;
  /** md = 48pt (component frame 32:117), lg = 52pt (auth/form screens). */
  size?: 'md' | 'lg';
  /** rounded = r12 form field; search = r16 search bar (14:2835). */
  shape?: 'rounded' | 'search';
  /** Style for the bordered container (kept for legacy `<Input style>` callers). */
  style?: StyleProp<ViewStyle>;
  /** Style for the wrapper that includes the label + helper text. */
  wrapperStyle?: StyleProp<ViewStyle>;
}

/**
 * Figma Input Field (32:117): Default / Focus / Error / Disabled.
 * Flat white field, 1pt border, r12, 16pt horizontal padding, optional 20pt leading icon.
 */
export const TextField = React.forwardRef<TextInput, TextFieldProps>(function TextField(
  {
    label,
    hint,
    error,
    leftIcon,
    rightIcon,
    disabled,
    size = 'lg',
    shape = 'rounded',
    style,
    wrapperStyle,
    onFocus,
    onBlur,
    editable,
    multiline,
    accessibilityLabel,
    accessibilityHint,
    ...rest
  },
  ref
) {
  const [isFocused, setIsFocused] = useState(false);
  const { colors, radius, typography, borderWidth } = useTheme();
  const { t } = useT();
  const accessoryId = `tf-done-${useId().replace(/:/g, '')}`;
  const needsDoneBar =
    Platform.OS === 'ios' &&
    !multiline &&
    !rest.inputAccessoryViewID &&
    NUMERIC_KEYBOARDS.has(String(rest.keyboardType ?? ''));

  const isDisabled = Boolean(disabled) || editable === false;
  const hasError = Boolean(error);

  const container = (() => {
    if (isDisabled) return { bg: colors.disabledBg, border: colors.disabledBorder };
    if (hasError) return { bg: colors.errorSurface, border: colors.error };
    if (isFocused) return { bg: colors.card, border: colors.borderFocus };
    return { bg: colors.card, border: colors.border };
  })();

  const helper = error ?? hint;

  return (
    <View style={[styles.root, wrapperStyle]}>
      {label ? (
        <Text style={[typography.label, styles.label, { color: colors.text }]}>{label}</Text>
      ) : null}
      <View
        style={[
          styles.container,
          {
            minHeight: size === 'lg' ? 52 : 48,
            borderRadius: shape === 'search' ? radius.md : radius.sm,
            borderColor: container.border,
            backgroundColor: container.bg,
            borderWidth: borderWidth.hairline,
          },
          multiline && styles.multiline,
          style,
        ]}
      >
        {leftIcon ? <View style={styles.iconLeft}>{leftIcon}</View> : null}
        <TextInput
          ref={ref}
          style={[
            shape === 'search' ? typography.body : typography.bodyLg,
            styles.input,
            { color: isDisabled ? colors.textDisabled : colors.text },
          ]}
          placeholderTextColor={colors.placeholder}
          editable={!isDisabled}
          multiline={multiline}
          accessibilityLabel={accessibilityLabel ?? label ?? rest.placeholder}
          accessibilityHint={accessibilityHint ?? helper}
          accessibilityState={{ disabled: isDisabled }}
          inputAccessoryViewID={needsDoneBar ? accessoryId : undefined}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {rightIcon ? <View style={styles.iconRight}>{rightIcon}</View> : null}
      </View>
      {needsDoneBar ? (
        <InputAccessoryView nativeID={accessoryId}>
          <View
            style={[
              styles.doneBar,
              { backgroundColor: colors.surfaceMuted, borderTopColor: colors.border },
            ]}
          >
            <Pressable
              onPress={() => Keyboard.dismiss()}
              accessibilityRole="button"
              accessibilityLabel={t('common.done')}
              hitSlop={8}
              style={styles.doneButton}
            >
              <Text style={[typography.label, { color: colors.primary }]}>{t('common.done')}</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      ) : null}
      {helper ? (
        <Text
          accessibilityRole={hasError ? 'alert' : undefined}
          accessibilityLiveRegion={hasError ? 'polite' : undefined}
          style={[
            typography.caption,
            styles.helper,
            { color: hasError ? colors.errorText : colors.textMute },
          ]}
        >
          {helper}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  doneBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
  },
  doneButton: { minHeight: 44, minWidth: 64, alignItems: 'center', justifyContent: 'center' },
  root: { marginBottom: 16, width: '100%' },
  label: { marginBottom: 8 },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  multiline: { alignItems: 'flex-start', paddingVertical: 12 },
  input: { flex: 1, paddingVertical: 12, paddingHorizontal: 0 },
  iconLeft: { width: 20, alignItems: 'center', justifyContent: 'center' },
  iconRight: { alignItems: 'center', justifyContent: 'center' },
  helper: { marginTop: 6 },
});
