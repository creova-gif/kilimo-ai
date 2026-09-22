/**
 * Profile tab — Agro ID summary, account settings, the "More / Zaidi" feature index (KIL-005),
 * legal links, sign-out and account deletion.
 *
 * Everything shown here is real state: the Agro ID card only renders a person's own Agro ID
 * (never a placeholder identity), the sync row reads the real offline outbox, and the More section
 * hides every feature the person's role cannot use (lib/access.tsx).
 */
import React, { useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Platform,
  Alert,
  AlertButton,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Settings,
  Fingerprint,
  Globe,
  Bell,
  CloudUpload,
  ShieldCheck,
  UserPen,
  LogOut,
  Trash2,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../constants/Theme';
import { useKilimoStore } from '../../store/useKilimoStore';
import { useAgroAuth } from '../../hooks/useAgroAuth';
import { useQueueCounts } from '../../hooks/useSyncEngine';
import { signOutCurrentUser, countUnsyncedChanges } from '../../lib/session';
import { translate as translateOffline, useT } from '../../lib/i18n';
import {
  allFeatures,
  normalizeRole,
  roleLabel,
  accessFor,
  type AccessLevel,
  type Feature,
} from '../../lib/access';
import {
  AppText,
  Badge,
  Button,
  Card,
  ListGroup,
  ListRow,
  ScreenHeader,
  MIN_TOUCH_TARGET,
} from '../../components/ui';
import { visibleMoreGroups } from '../../components/profile/moreFeatures';

const showSafeAlert = (
  title: string,
  message: string,
  buttons?: AlertButton[],
  // For irreversible actions (e.g. account deletion): when window.confirm is
  // unavailable (sandboxed iframe throws), DEFAULT TO CANCEL instead of
  // auto-running the destructive button. Never delete without explicit consent.
  opts?: { cancelOnUnavailable?: boolean }
) => {
  const runCancel = () => {
    const cancelBtn = buttons?.find((b) => b.style === 'cancel') || buttons?.[0];
    cancelBtn?.onPress?.();
  };
  const runPrimary = () => {
    const primaryBtn =
      buttons?.find((b) => b.style === 'destructive') || buttons?.[1] || buttons?.[0];
    primaryBtn?.onPress?.();
  };

  if (Platform.OS === 'web') {
    try {
      if (window.confirm(`${title}\n\n${message}`)) runPrimary();
      else runCancel();
    } catch (e) {
      console.warn('Alert blocked by iframe sandbox:', e);
      // Fail safe: destructive flows cancel; non-destructive keep prior behavior.
      if (opts?.cancelOnUnavailable) runCancel();
      else runPrimary();
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};

/** Access level for every feature for the current role (one store read, pure lookups). */
function useAccessMap(): Record<Feature, AccessLevel> {
  const role = useKilimoStore((s) => s.agroId?.role);
  return useMemo(() => {
    const map = {} as Record<Feature, AccessLevel>;
    for (const f of allFeatures()) map[f] = accessFor(role, f);
    return map;
  }, [role]);
}

/** Haptics are a nicety: never let an unavailable module (web, tests) break a press. */
function haptic(fn: () => unknown) {
  try {
    void Promise.resolve(fn()).catch(() => {});
  } catch {
    /* unavailable */
  }
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

export default function ProfileScreen() {
  const { colors, radius } = useTheme();
  const { t } = useT();
  const router = useRouter();
  const agroId = useKilimoStore((s) => s.agroId);
  const resetOnboarding = useKilimoStore((s) => s.resetOnboarding);
  const language = useKilimoStore((s) => s.language);
  const setLanguage = useKilimoStore((s) => s.setLanguage);
  const aiCertified = useKilimoStore((s) => s.aiCertified);
  const { deleteAccount, loading: authLoading } = useAgroAuth();
  const { pending, failed } = useQueueCounts();
  const access = useAccessMap();

  const role = normalizeRole(agroId?.role);
  const moreGroups = visibleMoreGroups(role, (f) => access[f]);
  const verification = (agroId?.verificationStatus as string) || 'unverified';

  const syncValue =
    failed > 0
      ? t('profile.sync.failed', { count: failed })
      : pending > 0
        ? t('profile.sync.pending', { count: pending })
        : t('profile.sync.clear');

  const verificationLabel =
    verification === 'verified'
      ? t('profile.verification.verified')
      : verification === 'pending'
        ? t('profile.verification.pending')
        : verification === 'rejected'
          ? t('profile.verification.rejected')
          : t('profile.verification.unverified');

  const go = (route: string) => {
    haptic(() => Haptics.selectionAsync());
    router.push(route as any);
  };

  const onToggleLanguage = () => {
    const next = language === 'sw' ? 'en' : 'sw';
    setLanguage(next);
    haptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  };

  const onSignOut = () => {
    haptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
    // Offline-safe sign-out (lib/session.ts): drains the outbox if online, always
    // removes the persisted session locally, clears user-scoped data (incl. the queue).
    const unsynced = countUnsyncedChanges();
    const so = (key: Parameters<typeof translateOffline>[1], n?: number) =>
      translateOffline(language, key, n === undefined ? undefined : { count: n });
    showSafeAlert(
      so('offline.signOut.title'),
      unsynced > 0
        ? `${so('offline.signOut.body')}\n\n${so('offline.signOut.unsynced', unsynced)}`
        : so('offline.signOut.body'),
      [
        { text: translateOffline(language, 'common.cancel'), style: 'cancel' },
        {
          text: so('offline.signOut.confirm'),
          style: 'destructive',
          onPress: () => {
            void signOutCurrentUser();
          },
        },
      ]
    );
  };

  const onDeleteAccount = () => {
    haptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
    showSafeAlert(
      t('profile.delete.title'),
      t('profile.delete.body'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.delete.confirm'),
          style: 'destructive',
          onPress: async () => {
            const res = (await deleteAccount()) as { ok: boolean; error?: string };
            if (res.ok) {
              haptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
              resetOnboarding();
            } else {
              showSafeAlert(
                t('profile.delete.failedTitle'),
                t('profile.delete.failedBody', { detail: res.error ?? '' })
              );
            }
          },
        },
      ],
      // Irreversible: never auto-confirm if the web dialog is blocked.
      { cancelOnUnavailable: true }
    );
  };

  const iconColor = colors.primary;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader
        variant="large"
        title={t('profile.title')}
        trailing={
          <Pressable
            onPress={() => go('/edit-profile')}
            accessibilityRole="button"
            accessibilityLabel={t('profile.a11y.editProfile')}
            style={styles.iconButton}
          >
            <Settings size={24} color={colors.text} />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Agro ID card — only ever the person's own Agro ID. */}
        {agroId ? (
          <Card
            onPress={() => go('/agro-id')}
            accessibilityLabel={t('profile.a11y.openAgroId', { name: agroId.name })}
            style={styles.block}
          >
            <View style={styles.idHeader}>
              <Badge
                label={t('profile.card.agroId')}
                variant="solid"
                size="sm"
                icon={<Fingerprint size={12} color={colors.onPrimary} />}
              />
              {aiCertified ? <Badge label={t('profile.card.certified')} variant="info" size="sm" /> : null}
              <View style={styles.flex} />
              <AppText style={{ color: colors.textMute }} selectable>
                {agroId.id}
              </AppText>
            </View>
            <View style={styles.idRow}>
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: colors.primarySoft, borderRadius: radius.lg },
                ]}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {initials(agroId.name || '?')}
                </Text>
              </View>
              <View style={styles.flex}>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
                  {agroId.name}
                </Text>
                <Text style={[styles.meta, { color: colors.textMute }]}>{roleLabel(role)}</Text>
                {agroId.location ? (
                  <Text style={[styles.meta, { color: colors.textMute }]}>{agroId.location}</Text>
                ) : null}
              </View>
            </View>
            <View style={[styles.idFooter, { borderTopColor: colors.border }]}>
              <Text style={[styles.meta, { color: colors.text }]}>
                {t('profile.card.tier', { tier: agroId.tier })}
              </Text>
              {agroId.joinDate ? (
                <Text style={[styles.meta, { color: colors.textMute }]}>
                  {t('profile.card.memberSince', { date: agroId.joinDate })}
                </Text>
              ) : null}
            </View>
          </Card>
        ) : (
          <Card style={styles.block}>
            <Text style={[styles.name, { color: colors.text }]}>{t('profile.card.none.title')}</Text>
            <Text style={[styles.body, { color: colors.textMute }]}>
              {t('profile.card.none.body')}
            </Text>
            <Button
              label={t('profile.card.none.action')}
              onPress={() => go('/agro-id')}
              size="md"
              style={{ marginTop: 12 }}
            />
          </Card>
        )}

        {/* Account */}
        <Text style={[styles.section, { color: colors.textMute }]}>
          {t('profile.section.account')}
        </Text>
        <ListGroup style={styles.block}>
          <ListRow
            title={t('profile.row.editProfile')}
            leading={<UserPen size={20} color={iconColor} />}
            onPress={() => go('/edit-profile')}
          />
          <ListRow
            title={t('profile.row.verification')}
            subtitle={verificationLabel}
            leading={<ShieldCheck size={20} color={iconColor} />}
            onPress={() =>
              go(
                verification === 'pending' || verification === 'verified'
                  ? '/verification/pending'
                  : '/verification/intro'
              )
            }
          />
          <ListRow
            title={t('profile.row.language')}
            value={language === 'sw' ? 'Kiswahili' : 'English'}
            leading={<Globe size={20} color={iconColor} />}
            onPress={onToggleLanguage}
            accessibilityHint={t('profile.a11y.languageHint')}
          />
          <ListRow
            title={t('profile.row.notifications')}
            leading={<Bell size={20} color={iconColor} />}
            onPress={() => go('/notifications')}
          />
          <ListRow
            title={t('profile.row.sync')}
            subtitle={syncValue}
            leading={<CloudUpload size={20} color={failed > 0 ? colors.errorText : iconColor} />}
            onPress={() => go('/offline-queue')}
          />
        </ListGroup>

        {/* More / Zaidi — every feature without another entry point, gated by role. */}
        <Text
          accessibilityRole="header"
          style={[styles.moreTitle, { color: colors.text }]}
        >
          {t('profile.more.title')}
        </Text>
        {moreGroups.map((group) => (
          <View key={group.id} testID={`more-group-${group.id}`}>
            <Text style={[styles.section, { color: colors.textMute }]}>{t(group.titleKey)}</Text>
            <ListGroup style={styles.block}>
              {group.items.map((item) => (
                <ListRow
                  key={item.id}
                  title={t(item.titleKey)}
                  subtitle={t(item.subtitleKey)}
                  onPress={() => go(item.route)}
                  accessibilityHint={t('profile.a11y.opens')}
                />
              ))}
            </ListGroup>
          </View>
        ))}

        {/* Sign out + delete account */}
        <Button
          label={t('profile.signOut')}
          variant="destructiveOutline"
          icon={<LogOut size={18} color={colors.errorText} />}
          onPress={onSignOut}
          accessibilityHint={t('profile.a11y.signOutHint')}
          style={styles.block}
        />
        {/* Delete account (required by App Store 5.1.1(v) / Google Play) */}
        <Button
          label={t('profile.delete.action')}
          variant="link"
          size="sm"
          disabled={authLoading}
          icon={<Trash2 size={16} color={colors.errorText} />}
          onPress={onDeleteAccount}
          accessibilityHint={t('profile.a11y.deleteHint')}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 140 },
  iconButton: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  block: { marginBottom: 20 },
  idHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  avatar: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  name: { fontSize: 20, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  meta: { fontSize: 13, fontFamily: 'Inter_500Medium', marginTop: 2 },
  body: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20, marginTop: 4 },
  idFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  section: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  moreTitle: { fontSize: 20, fontFamily: 'Inter_700Bold', marginBottom: 12, marginTop: 4 },
});
