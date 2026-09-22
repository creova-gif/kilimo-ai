import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';
import { AppText, MIN_TOUCH_TARGET } from '../ui';
import { useTheme } from '../../constants/Theme';

export interface FormSheetProps {
  visible: boolean;
  title: string;
  /** Translated accessibility label for the close button. */
  closeLabel: string;
  onClose: () => void;
  children: React.ReactNode;
}

/** Bottom-sheet modal shared by the ledger entry form and the payment-record form. */
export function FormSheet({ visible, title, closeLabel, onClose, children }: FormSheetProps) {
  const { colors, radius, spacing } = useTheme();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={[styles.scrim, { backgroundColor: colors.overlay.scrim }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.kav}
        >
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.card,
                borderTopLeftRadius: radius.lg,
                borderTopRightRadius: radius.lg,
                paddingHorizontal: spacing.lg,
                paddingTop: spacing.md,
              },
            ]}
          >
            <View style={styles.header}>
              <AppText variant="h3" accessibilityRole="header" style={styles.title}>
                {title}
              </AppText>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel={closeLabel}
                style={styles.close}
              >
                <X size={20} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: spacing.xl }}
            >
              {children}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end' },
  kav: { maxHeight: '92%' },
  sheet: { maxHeight: '100%' },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  title: { flex: 1 },
  close: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
