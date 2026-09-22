import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useTheme } from '../../constants/Theme';
import { AppText } from '../ui';
import { IconButton } from './IconButton';

export interface RecordSheetProps {
  visible: boolean;
  /** Translated title. */
  title: string;
  onClose: () => void;
  /** Translated accessibility label for the close button (t('common.close')). */
  closeLabel: string;
  /** Pinned above the scrolling body (e.g. an offline banner). */
  banner?: React.ReactNode;
  children: React.ReactNode;
}

/** Full-height modal sheet: header with a close button, keyboard-aware scrolling body. */
export function RecordSheet({ visible, title, onClose, closeLabel, banner, children }: RecordSheetProps) {
  const { colors, spacing, borderWidth } = useTheme();
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.header,
            { borderBottomColor: colors.border, borderBottomWidth: borderWidth.hairline },
          ]}
        >
          <AppText variant="h3" accessibilityRole="header" numberOfLines={1} style={styles.title}>
            {title}
          </AppText>
          <IconButton
            label={closeLabel}
            onPress={onClose}
            icon={<X size={22} color={colors.text} />}
          />
        </View>
        {banner}
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.huge }}
          >
            {children}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    paddingRight: 8,
    minHeight: 56,
  },
  title: { flex: 1 },
});
