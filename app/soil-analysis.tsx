/**
 * Soil tests — results the FARMER records for their real plots (KIL-003).
 *
 * Replaces a screen of mock values: a hard-coded pH history (6.8 → 5.2), fixed N/P/K bars and a
 * "CRITICAL pH ANOMALY DETECTED" banner. Now every number shown was typed in by the farmer from a
 * lab report or test kit (`soil_tests`). pH is interpreted only with broad, generic guidance and
 * labelled as such; N/P/K are shown as entered because their meaning depends on the lab method.
 * New tests are saved through the offline outbox and marked until they sync.
 */
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { FlaskConical, Trash2 } from 'lucide-react-native';

import { FarmDataState } from '../components/farmtools/FarmDataState';
import { PhTrend } from '../components/farmtools/PhTrend';
import { SoilTestForm, SOURCE_KEY } from '../components/farmtools/SoilTestForm';
import {
  AlertCard,
  AppText,
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  ListGroup,
  ListRow,
  MIN_TOUCH_TARGET,
  OfflineBanner,
  ScreenHeader,
} from '../components/ui';
import { useTheme } from '../constants/Theme';
import { useFarms } from '../hooks/useFarms';
import { useSoilTests } from '../hooks/useSoilTests';
import { formatIsoDate } from '../lib/farms';
import { useT, type TranslationKey } from '../lib/i18n';
import { phBand, phSeries, type PhBand, type SoilTest } from '../lib/soilTests';

const BAND: Record<PhBand, { title: TranslationKey; body: TranslationKey; variant: 'success' | 'warning' | 'danger' }> = {
  strongAcid: { title: 'planning.soil.band.strongAcid', body: 'planning.soil.band.strongAcid.body', variant: 'danger' },
  acid: { title: 'planning.soil.band.acid', body: 'planning.soil.band.acid.body', variant: 'warning' },
  optimal: { title: 'planning.soil.band.optimal', body: 'planning.soil.band.optimal.body', variant: 'success' },
  alkaline: { title: 'planning.soil.band.alkaline', body: 'planning.soil.band.alkaline.body', variant: 'warning' },
  strongAlkaline: {
    title: 'planning.soil.band.strongAlkaline',
    body: 'planning.soil.band.strongAlkaline.body',
    variant: 'danger',
  },
};

export default function SoilAnalysis() {
  const router = useRouter();
  const { t, lang } = useT();
  const { colors, spacing } = useTheme();
  const farmsData = useFarms();
  const { plots, loaded } = farmsData;
  const soil = useSoilTests();

  const [plotId, setPlotId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [notice, setNotice] = useState<{ variant: 'success' | 'danger' | 'warning'; text: string } | null>(null);

  const plot = plots.find((p) => p.id === plotId) ?? plots[0] ?? null;
  const tests = useMemo(
    () => (plot ? soil.tests.filter((s) => s.plotId === plot.id) : []),
    [soil.tests, plot]
  );
  const latest = tests[0] ?? null;
  const series = useMemo(() => (plot ? phSeries(soil.tests, plot.id) : []), [soil.tests, plot]);
  const band = latest ? phBand(latest.ph) : null;

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const date = (iso: string) => formatIsoDate(iso, lang) ?? iso;

  const confirmDelete = (test: SoilTest) => {
    Alert.alert(t('planning.soil.delete.title'), t('planning.soil.delete.body', { date: date(test.testedOn) }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('planning.soil.delete.cta'),
        style: 'destructive',
        onPress: async () => {
          const r = await soil.removeTest(test.id);
          setNotice(
            r.ok
              ? { variant: 'success', text: t('planning.soil.deleted') }
              : {
                  variant: 'danger',
                  text: t(r.reason === 'offline' ? 'planning.soil.offlineDelete' : 'planning.soil.err.delete'),
                }
          );
        },
      },
    ]);
  };

  const blocked = !(loaded && plots.length > 0);

  let body: React.ReactNode;
  if (blocked) {
    body = (
      <FarmDataState
        data={farmsData}
        onAddPlot={() => router.push('/(tabs)/fields' as any)}
        emptyBody={t('planning.soil.noPlots')}
      />
    );
  } else if (soil.error === 'not_configured') {
    body = <EmptyState title={t('state.unavailable.title')} description={t('planning.unconfigured')} />;
  } else if (soil.error && !soil.loaded && tests.length === 0) {
    body = (
      <ErrorState
        title={t('planning.soil.err.load')}
        description={t('state.error.body')}
        retryLabel={t('common.retry')}
        onRetry={soil.refresh}
      />
    );
  } else if (plot) {
    body = (
      <>
        {!!soil.error && soil.loaded && (
          <AlertCard variant="warning" title={t('planning.soil.err.load')} actionLabel={t('common.retry')} onAction={soil.refresh} />
        )}
        {!soil.loaded && soil.isOffline && (
          <AlertCard variant="info" title={t('planning.soil.offlineList')} />
        )}

        {tests.length === 0 ? (
          soil.loading && !soil.loaded ? (
            <AppText variant="small" tone="muted">
              {t('state.loading')}
            </AppText>
          ) : (
            <EmptyState
              icon={<FlaskConical size={48} color={colors.primary} />}
              title={t('planning.soil.empty.title', { plot: plot.name })}
              description={t('planning.soil.empty.body')}
              actionLabel={t('planning.soil.add')}
              onAction={() => setFormOpen(true)}
            />
          )
        ) : (
          <>
            <Card testID="soil-latest">
              <View style={styles.rowBetween}>
                <AppText variant="label">
                  {t('planning.soil.latest', { date: date(latest!.testedOn) })}
                </AppText>
                {latest!.pending ? (
                  <Badge label={t('planning.pendingSync')} variant="warning" />
                ) : (
                  <Badge label={t(SOURCE_KEY[latest!.source])} variant="neutral" />
                )}
              </View>
              <View style={{ marginTop: spacing.sm, gap: spacing.xs }}>
                <Value label={t('planning.soil.field.ph')} value={latest!.ph} />
                <Value label={t('planning.soil.field.n')} value={latest!.nitrogenPct} />
                <Value label={t('planning.soil.field.p')} value={latest!.phosphorusPpm} />
                <Value label={t('planning.soil.field.k')} value={latest!.potassiumPpm} />
                <Value label={t('planning.soil.field.om')} value={latest!.organicMatterPct} />
              </View>
              {!!latest!.notes && (
                <AppText variant="small" tone="muted" style={{ marginTop: spacing.sm }}>
                  {latest!.notes}
                </AppText>
              )}
            </Card>

            {band ? (
              <AlertCard
                variant={BAND[band].variant}
                title={t(BAND[band].title, { ph: latest!.ph as number })}
                body={`${t(BAND[band].body)}\n${t('planning.soil.guidanceNote')}`}
              />
            ) : (
              <AppText variant="small" tone="muted">
                {t('planning.soil.noPh')}
              </AppText>
            )}
            <AppText variant="caption" tone="muted">
              {t('planning.soil.npkNote')}
            </AppText>

            {series.length >= 2 && (
              <Card>
                <AppText variant="label" style={{ marginBottom: spacing.sm }}>
                  {t('planning.soil.trend', { n: series.length })}
                </AppText>
                <PhTrend
                  series={series}
                  labels={series.map((s) => date(s.testedOn))}
                  accessibilityLabel={t('planning.soil.trend.a11y', {
                    values: series.map((s) => `${date(s.testedOn)}: ${s.ph}`).join(', '),
                  })}
                />
                <AppText variant="caption" tone="muted" style={{ marginTop: spacing.xs }}>
                  {t('planning.soil.trend.band')}
                </AppText>
              </Card>
            )}

            <Button label={t('planning.soil.add')} onPress={() => setFormOpen(true)} />

            <AppText variant="h3" accessibilityRole="header">
              {t('planning.soil.history')}
            </AppText>
            <ListGroup>
              {tests.map((s) => (
                <ListRow
                  key={s.id}
                  title={date(s.testedOn)}
                  subtitle={summary(t, s)}
                  trailing={
                    s.pending ? (
                      <Badge label={t('planning.pendingSync')} variant="warning" />
                    ) : (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('planning.soil.delete.a11y', { date: date(s.testedOn) })}
                        onPress={() => confirmDelete(s)}
                        style={styles.iconBtn}
                      >
                        <Trash2 size={18} color={colors.error ?? '#B42318'} />
                      </Pressable>
                    )
                  }
                />
              ))}
            </ListGroup>
          </>
        )}

        <Card variant="tinted">
          <AppText variant="label">{t('planning.soil.how.title')}</AppText>
          <AppText variant="small" style={{ marginTop: spacing.xs }}>
            {t('planning.soil.how.body')}
          </AppText>
          <Button
            label={t('planning.soil.askExpert')}
            variant="link"
            fullWidth={false}
            style={{ alignSelf: 'flex-start' }}
            onPress={() => router.push('/consultations' as any)}
          />
        </Card>
      </>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader showBack onBack={goBack} backLabel={t('common.back')} title={t('planning.soil.title')} />
      {(farmsData.isOffline || soil.isOffline) && <OfflineBanner message={t('state.offline.banner')} />}
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 48, gap: spacing.md }}>
        {!!notice && <AlertCard variant={notice.variant} title={notice.text} announce />}
        {!blocked && plots.length > 1 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {plots.map((p) => (
              <Chip
                key={p.id}
                label={p.name}
                selected={plot?.id === p.id}
                onPress={() => {
                  setPlotId(p.id);
                  setNotice(null);
                }}
              />
            ))}
          </View>
        )}
        {!blocked && plots.length === 1 && plot && (
          <AppText variant="label">{t('planning.soil.forPlot', { plot: plot.name })}</AppText>
        )}
        {body}
      </ScrollView>

      {formOpen && plot && (
        <SoilTestForm
          plotId={plot.id}
          plotName={plot.name}
          onClose={() => setFormOpen(false)}
          onSubmit={(input) => {
            const r = soil.addTest(input);
            if (r.ok) {
              setNotice({
                variant: 'success',
                text: t(soil.isOffline ? 'planning.soil.savedOffline' : 'planning.soil.saved'),
              });
            }
            return r;
          }}
        />
      )}
    </SafeAreaView>
  );
}

function summary(t: ReturnType<typeof useT>['t'], s: SoilTest) {
  const parts: string[] = [];
  if (s.ph !== null) parts.push(`pH ${s.ph}`);
  if (s.nitrogenPct !== null) parts.push(`N ${s.nitrogenPct}%`);
  if (s.phosphorusPpm !== null) parts.push(`P ${s.phosphorusPpm} ppm`);
  if (s.potassiumPpm !== null) parts.push(`K ${s.potassiumPpm} ppm`);
  if (s.organicMatterPct !== null) parts.push(`${t('planning.soil.omShort')} ${s.organicMatterPct}%`);
  return parts.join(' · ');
}

function Value({ label, value }: { label: string; value: number | null }) {
  const { t } = useT();
  return (
    <View style={styles.rowBetween} accessible accessibilityLabel={`${label}: ${value ?? t('planning.soil.notMeasured')}`}>
      <AppText variant="small" tone="muted">
        {label}
      </AppText>
      <AppText variant="smallStrong">{value === null ? t('planning.soil.notMeasured') : String(value)}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  iconBtn: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
});
