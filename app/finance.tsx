/**
 * Finance ledger ("Daftari la Fedha") — the farmer's own income and expenses.
 *
 * Real, per-user data: every entry is typed in by the user and stored in `public.finance_entries`
 * (owner-only RLS). There is no seed data, no contract/invoice mock, no invented budget and no
 * "auto-sync" claim — nothing on this screen is connected to a mobile-money account. Writes need a
 * connection; offline the screen says so instead of pretending to save.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Plus, Share2, WifiOff, Wallet } from 'lucide-react-native';

import { EntryFormSheet } from '../components/finance/EntryFormSheet';
import { MonthBars } from '../components/finance/MonthBars';
import {
  AlertCard,
  AppText,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  ListRow,
  MIN_TOUCH_TARGET,
  OfflineBanner,
  ScreenHeader,
  SkeletonBlock,
  SkeletonGroup,
} from '../components/ui';
import { useTheme } from '../constants/Theme';
import { useFinance } from '../hooks/useFinance';
import { useT, type TranslationKey } from '../lib/i18n';
import {
  currentMonthKey,
  entriesInMonth,
  entriesToCsv,
  formatTzs,
  lastMonths,
  monthKey,
  monthNumber,
  monthYear,
  shiftMonth,
  totals,
  totalsByCategory,
  type EntryInput,
  type EntryKind,
  type FinanceEntry,
  type MonthTotals,
} from '../lib/finance';

/** How far back the month picker goes (months before the current one). */
const MAX_MONTHS_BACK = 24;

export default function FinanceScreen() {
  const router = useRouter();
  const { t } = useT();
  const { colors, spacing } = useTheme();
  const { entries, loading, loaded, error, isOffline, busy, add, edit, remove, refresh } =
    useFinance();

  const thisMonth = currentMonthKey();
  const [month, setMonth] = useState(thisMonth);
  const [filter, setFilter] = useState<'all' | EntryKind>('all');
  const [form, setForm] = useState<{ open: boolean; entry: FinanceEntry | null }>({
    open: false,
    entry: null,
  });
  const [notice, setNotice] = useState<string | null>(null);

  // Success / info messages fade after a few seconds.
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(id);
  }, [notice]);

  const monthName = useCallback(
    (key: string) => `${t(`money.month.${monthNumber(key)}` as TranslationKey)} ${monthYear(key)}`,
    [t]
  );
  const shortMonth = useCallback(
    (key: string) => t(`money.month.short.${monthNumber(key)}` as TranslationKey),
    [t]
  );
  const formatDate = useCallback(
    (d: string) => `${Number(d.slice(8, 10))} ${shortMonth(monthKey(d))} ${d.slice(0, 4)}`,
    [shortMonth]
  );
  const categoryName = (c: string) => t(`money.category.${c}` as TranslationKey);

  const monthEntries = useMemo(() => entriesInMonth(entries, month), [entries, month]);
  const monthTotals = useMemo(() => totals(monthEntries), [monthEntries]);
  const chartMonths = useMemo(() => lastMonths(entries, month, 6), [entries, month]);
  const shown = useMemo(
    () => (filter === 'all' ? monthEntries : monthEntries.filter((e) => e.kind === filter)),
    [monthEntries, filter]
  );
  const incomeByCategory = useMemo(() => totalsByCategory(monthEntries, 'income'), [monthEntries]);
  const expenseByCategory = useMemo(() => totalsByCategory(monthEntries, 'expense'), [monthEntries]);

  const canGoPrev = month > shiftMonth(thisMonth, -MAX_MONTHS_BACK);
  const canGoNext = month < thisMonth;

  const closeForm = () => setForm({ open: false, entry: null });

  const submitForm = async (input: EntryInput) => {
    const r = form.entry ? await edit(form.entry.id, input) : await add(input);
    if (r.ok) {
      closeForm();
      setNotice(t('money.finance.saved'));
      // Jump to the month the entry landed in so the user sees it appear.
      setMonth(monthKey(input.entryDate));
    }
    return r;
  };

  const confirmDelete = () => {
    const target = form.entry;
    if (!target) return;
    Alert.alert(t('money.finance.delete.title'), t('money.finance.delete.body'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('money.finance.delete.confirm'),
        style: 'destructive',
        onPress: async () => {
          const r = await remove(target.id);
          if (r.ok) {
            closeForm();
            setNotice(t('money.finance.deleted'));
          } else {
            Alert.alert(t('money.error.deleteFailed'));
          }
        },
      },
    ]);
  };

  const shareMonth = async () => {
    if (monthEntries.length === 0) {
      setNotice(t('money.finance.export.empty'));
      return;
    }
    try {
      await Share.share({
        title: t('money.finance.export.title', { month: monthName(month) }),
        message: entriesToCsv(monthEntries),
      });
    } catch {
      setNotice(t('money.finance.export.failed'));
    }
  };

  /* ── whole-screen states (nothing to show yet) ───────────────────────────────────────── */
  let blocked: React.ReactElement | null = null;
  if (error === 'not_configured') {
    blocked = (
      <EmptyState
        title={t('money.notConfigured.title')}
        description={t('money.notConfigured.body')}
        icon={<Wallet size={48} color={colors.primary} />}
      />
    );
  } else if (error === 'signed_out') {
    blocked = (
      <EmptyState
        title={t('money.signedOut.title')}
        description={t('money.signedOut.body')}
        icon={<Wallet size={48} color={colors.primary} />}
      />
    );
  } else if (!loaded && isOffline) {
    blocked = (
      <EmptyState
        title={t('money.offline.empty.title')}
        description={t('money.offline.empty.body')}
        icon={<WifiOff size={48} color={colors.primary} />}
      />
    );
  } else if (!loaded && loading) {
    blocked = (
      <View style={{ padding: spacing.lg }}>
        <SkeletonGroup label={t('state.loading')}>
          <SkeletonBlock height={96} radius={16} />
          <SkeletonBlock height={140} radius={16} />
          <SkeletonBlock height={64} radius={16} />
        </SkeletonGroup>
      </View>
    );
  } else if (!loaded && error === 'error') {
    blocked = (
      <ErrorState
        title={t('money.finance.error.title')}
        description={t('state.error.body')}
        retryLabel={t('common.retry')}
        onRetry={refresh}
      />
    );
  }

  const hasAnyEntries = entries.length > 0;

  const monthNav = (
    <View style={styles.monthNav}>
      <Pressable
        onPress={() => canGoPrev && setMonth(shiftMonth(month, -1))}
        disabled={!canGoPrev}
        accessibilityRole="button"
        accessibilityLabel={t('money.month.prev')}
        accessibilityState={{ disabled: !canGoPrev }}
        style={[styles.navBtn, { opacity: canGoPrev ? 1 : 0.35 }]}
      >
        <ChevronLeft size={22} color={colors.text} />
      </Pressable>
      <AppText variant="h3" accessibilityRole="header" testID="finance-month">
        {monthName(month)}
      </AppText>
      <Pressable
        onPress={() => canGoNext && setMonth(shiftMonth(month, 1))}
        disabled={!canGoNext}
        accessibilityRole="button"
        accessibilityLabel={t('money.month.next')}
        accessibilityState={{ disabled: !canGoNext }}
        style={[styles.navBtn, { opacity: canGoNext ? 1 : 0.35 }]}
      >
        <ChevronRight size={22} color={colors.text} />
      </Pressable>
    </View>
  );

  const summary = (
    <Card>
      <View style={styles.summaryRow}>
        <SummaryCell
          label={t('money.finance.income')}
          value={formatTzs(monthTotals.income)}
          tone="success"
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SummaryCell
          label={t('money.finance.expense')}
          value={formatTzs(monthTotals.expense)}
          tone="error"
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <SummaryCell
          label={t('money.finance.net')}
          value={formatTzs(monthTotals.net)}
          tone={monthTotals.net < 0 ? 'error' : 'default'}
        />
      </View>
    </Card>
  );

  const categoryBlock = (kind: EntryKind) => {
    const rows = kind === 'income' ? incomeByCategory : expenseByCategory;
    if (rows.length === 0) return null;
    const max = Math.max(...rows.map((r) => r.total), 1);
    return (
      <View key={kind} style={{ marginTop: spacing.md }}>
        <AppText variant="label" style={{ marginBottom: spacing.sm }}>
          {t(kind === 'income' ? 'money.finance.byCategory.income' : 'money.finance.byCategory.expense')}
        </AppText>
        {rows.map((r) => (
          <View
            key={r.category}
            accessible
            accessibilityLabel={`${categoryName(r.category)}, ${formatTzs(r.total)}`}
            style={{ marginBottom: spacing.sm }}
          >
            <View style={styles.catHead}>
              <AppText variant="small">{categoryName(r.category)}</AppText>
              <AppText variant="smallStrong">{formatTzs(r.total)}</AppText>
            </View>
            <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}>
              <View
                style={[
                  styles.fill,
                  {
                    width: `${Math.max(4, Math.round((r.total / max) * 100))}%`,
                    backgroundColor: kind === 'income' ? colors.primary : colors.error,
                  },
                ]}
              />
            </View>
          </View>
        ))}
      </View>
    );
  };

  const content = (
    <ScrollView
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.huge }}
      keyboardShouldPersistTaps="handled"
    >
      {notice ? (
        <AlertCard
          variant="success"
          title={notice}
          announce
          style={{ marginBottom: spacing.md }}
        />
      ) : null}
      {error && loaded ? (
        <AlertCard
          variant="warning"
          title={t('money.finance.error.title')}
          actionLabel={t('common.retry')}
          onAction={refresh}
          style={{ marginBottom: spacing.md }}
        />
      ) : null}

      {monthNav}
      {summary}

      {monthTotals.net < 0 ? (
        <AlertCard
          variant="warning"
          title={t('money.finance.lossNotice')}
          style={{ marginTop: spacing.md }}
        />
      ) : null}

      {hasAnyEntries ? (
        <Card style={{ marginTop: spacing.md }}>
          <AppText variant="label" style={{ marginBottom: spacing.md }}>
            {t('money.finance.chart.title')}
          </AppText>
          <MonthBars
            months={chartMonths}
            selectedMonth={month}
            labelFor={shortMonth}
            a11yFor={(m: MonthTotals) =>
              t('money.finance.chart.a11y', {
                month: monthName(m.month),
                income: formatTzs(m.income),
                expense: formatTzs(m.expense),
              })
            }
            incomeLabel={t('money.finance.income')}
            expenseLabel={t('money.finance.expense')}
          />
          {categoryBlock('income')}
          {categoryBlock('expense')}
        </Card>
      ) : null}

      <View style={[styles.filterRow, { marginTop: spacing.lg }]}>
        <View style={styles.chips}>
          <Chip
            label={t('money.filter.all')}
            selected={filter === 'all'}
            onPress={() => setFilter('all')}
          />
          <Chip
            label={t('money.finance.income')}
            selected={filter === 'income'}
            onPress={() => setFilter('income')}
          />
          <Chip
            label={t('money.finance.expense')}
            selected={filter === 'expense'}
            onPress={() => setFilter('expense')}
          />
        </View>
      </View>

      <Button
        label={t('money.finance.add')}
        icon={<Plus size={18} color={colors.textOnPrimary} />}
        onPress={() => setForm({ open: true, entry: null })}
        disabled={isOffline}
        accessibilityHint={isOffline ? t('money.offline.needsConnection') : undefined}
        style={{ marginTop: spacing.md, marginBottom: spacing.lg }}
        testID="finance-add"
      />

      {!hasAnyEntries ? (
        <View style={{ paddingVertical: spacing.lg }}>
          <EmptyState
            style={{ flex: 0 }}
            title={t('money.finance.empty.title')}
            description={t('money.finance.empty.body')}
            actionLabel={isOffline ? undefined : t('money.finance.empty.action')}
            onAction={() => setForm({ open: true, entry: null })}
            icon={<Wallet size={48} color={colors.primary} />}
          />
        </View>
      ) : shown.length === 0 ? (
        <EmptyState
          style={{ flex: 0, paddingVertical: spacing.lg }}
          title={t('money.finance.emptyMonth.title', { month: monthName(month) })}
          description={t('money.finance.emptyMonth.body')}
        />
      ) : (
        <View>
          <AppText variant="label" accessibilityRole="header" style={{ marginBottom: spacing.sm }}>
            {t('money.finance.entriesHeading')}
          </AppText>
          {shown.map((e) => (
            <Card
              key={e.id}
              onPress={() => setForm({ open: true, entry: e })}
              accessibilityRole="button"
              accessibilityLabel={t('money.finance.entry.a11y', {
                kind: t(`money.kind.${e.kind}` as const),
                category: categoryName(e.category),
                amount: formatTzs(e.amountTzs),
                date: formatDate(e.entryDate),
              })}
              style={{ marginBottom: spacing.sm, minHeight: MIN_TOUCH_TARGET }}
            >
              <View style={styles.entryRow}>
                <View style={{ flex: 1, paddingRight: spacing.md }}>
                  <AppText variant="label" numberOfLines={1}>
                    {e.description || categoryName(e.category)}
                  </AppText>
                  <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
                    {categoryName(e.category)} · {formatDate(e.entryDate)}
                  </AppText>
                </View>
                <AppText variant="h3" tone={e.kind === 'income' ? 'success' : 'error'}>
                  {e.kind === 'income' ? '+' : '-'}
                  {formatTzs(e.amountTzs)}
                </AppText>
              </View>
            </Card>
          ))}
        </View>
      )}

      <View style={{ marginTop: spacing.lg }}>
        <ListRow
          title={t('money.finance.paymentsLink.title')}
          subtitle={t('money.finance.paymentsLink.body')}
          onPress={() => router.push('/mobile-money' as any)}
        />
      </View>

      <AppText variant="caption" tone="muted" style={{ marginTop: spacing.lg }}>
        {t('money.finance.note')}
      </AppText>
    </ScrollView>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title={t('money.finance.title')}
        subtitle={t('money.finance.subtitle')}
        showBack
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        backLabel={t('common.back')}
        trailing={
          loaded ? (
            <Pressable
              onPress={shareMonth}
              accessibilityRole="button"
              accessibilityLabel={t('money.finance.export.a11y')}
              style={styles.navBtn}
              testID="finance-share"
            >
              <Share2 size={20} color={colors.primary} />
            </Pressable>
          ) : undefined
        }
      />
      <OfflineBanner visible={isOffline} message={t('money.offline.banner')} />
      {blocked ?? content}

      <EntryFormSheet
        visible={form.open}
        entry={form.entry}
        defaultDate={month === thisMonth ? undefined : `${month}-01`}
        busy={busy}
        offline={isOffline}
        onSubmit={submitForm}
        onDelete={confirmDelete}
        onClose={closeForm}
      />
    </SafeAreaView>
  );
}

function SummaryCell({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'default' | 'success' | 'error';
}) {
  return (
    <View style={styles.summaryCell} accessible accessibilityLabel={`${label}: ${value}`}>
      <AppText variant="captionStrong" tone="muted" uppercase>
        {label}
      </AppText>
      <AppText variant="h3" tone={tone} adjustsFontSizeToFit numberOfLines={1}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  navBtn: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryCell: { flex: 1, alignItems: 'center', gap: 4 },
  divider: { width: 1, height: 40, marginHorizontal: 4 },
  filterRow: { flexDirection: 'row', alignItems: 'center' },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  entryRow: { flexDirection: 'row', alignItems: 'center' },
  catHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
});
