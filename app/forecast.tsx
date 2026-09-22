/**
 * Weather forecast — rebuilt on the design system, replacing the legacy glass/blur screen.
 *
 * Source: OpenWeather via hooks/useWeather (lib/weather.ts). Honesty rules:
 *   - No API key configured → an explicit "not set up" state. No temperatures, no days, no tips:
 *     sample weather is never shown in place of a forecast.
 *   - No farm region → useWeather falls back to Arusha; the screen says so, with a way to fix it.
 *   - Offline → cached data (if any) is labelled as the last forecast loaded.
 *   - The field note is a fixed rule over the forecast numbers and is labelled "not AI advice".
 * Day names, dates, condition names and tips are rendered from schedule.* keys (lib/weather.ts
 * returns Swahili-only strings, so lib/scheduleFormat.ts maps them rather than showing them raw).
 */
import React, { useCallback, useMemo, useState } from 'react';
import { View, ScrollView, RefreshControl, SafeAreaView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Sun,
  CloudSun,
  CloudRain,
  CloudLightning,
  Snowflake,
  CloudOff,
  MapPin,
} from 'lucide-react-native';

import { useTheme } from '../constants/Theme';
import { useKilimoStore } from '../store/useKilimoStore';
import { useWeather } from '../hooks/useWeather';
import { useT, type TranslationKey } from '../lib/i18n';
import type { WeatherCondition } from '../lib/weather';
import {
  AlertCard,
  AppText,
  Card,
  EmptyState,
  ErrorState,
  ListRow,
  OfflineBanner,
  ScreenHeader,
  SkeletonBlock,
  SkeletonGroup,
} from '../components/ui';
import { fieldTipKey, forecastDayLabels } from '../lib/scheduleFormat';

const conditionKey = (c: WeatherCondition) =>
  `schedule.forecast.condition.${c}` as TranslationKey;

function ConditionIcon({ c, size, color }: { c: WeatherCondition; size: number; color: string }) {
  switch (c) {
    case 'cloud':
      return <CloudSun size={size} color={color} />;
    case 'rain':
      return <CloudRain size={size} color={color} />;
    case 'storm':
      return <CloudLightning size={size} color={color} />;
    case 'snow':
      return <Snowflake size={size} color={color} />;
    default:
      return <Sun size={size} color={color} />;
  }
}

export default function ForecastScreen() {
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const { t } = useT();
  const isOffline = useKilimoStore((s) => s.isOffline);
  const farmRegion = useKilimoStore((s) => s.farmProfile?.region);
  const weather = useWeather();
  const [refreshing, setRefreshing] = useState(false);

  const usingDefaultLocation = !farmRegion?.trim();
  const displayLocation = (weather.current?.location || weather.location).replace(/,\s*TZ$/i, '');
  const days = weather.forecast ?? [];
  const hasData = Boolean(weather.current) || days.length > 0;

  const onRefresh = useCallback(async () => {
    if (!weather.configured) return;
    setRefreshing(true);
    try {
      await weather.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [weather]);

  const styles = useMemo(() => makeStyles(spacing), [spacing]);

  const errorCopy = (() => {
    if (weather.errorKind === 'unknown_location')
      return {
        title: t('schedule.forecast.error.location.title'),
        body: t('schedule.forecast.error.location.body', { location: displayLocation }),
      };
    if (weather.errorKind === 'network')
      return {
        title: t('schedule.forecast.error.network.title'),
        body: t('schedule.forecast.error.network.body'),
      };
    return {
      title: t('schedule.forecast.error.generic.title'),
      body: t('schedule.forecast.error.generic.body'),
    };
  })();

  let body: React.ReactNode;
  if (!weather.configured) {
    body = (
      <EmptyState
        icon={<CloudOff size={48} color={colors.primary} />}
        title={t('schedule.forecast.unconfigured.title')}
        description={t('schedule.forecast.unconfigured.body')}
        testID="forecast-unconfigured"
      />
    );
  } else if (weather.loading && !hasData) {
    body = (
      <SkeletonGroup label={t('state.loading')}>
        <SkeletonBlock height={140} />
        <SkeletonBlock height={56} />
        <SkeletonBlock height={56} />
        <SkeletonBlock height={56} />
      </SkeletonGroup>
    );
  } else if (!hasData && isOffline) {
    body = (
      <EmptyState
        icon={<CloudOff size={48} color={colors.primary} />}
        title={t('schedule.forecast.offline.empty.title')}
        description={t('schedule.forecast.offline.empty.body')}
        actionLabel={t('common.retry')}
        onAction={() => weather.refetch()}
      />
    );
  } else if (!hasData) {
    body = (
      <ErrorState
        title={errorCopy.title}
        description={errorCopy.body}
        retryLabel={t('common.retry')}
        onRetry={() => weather.refetch()}
        secondaryLabel={
          weather.errorKind === 'unknown_location' ? t('schedule.forecast.setRegion') : undefined
        }
        onSecondary={
          weather.errorKind === 'unknown_location'
            ? () => router.push('/edit-profile' as any)
            : undefined
        }
      />
    );
  } else {
    const first = days[0];
    const firstLabels = first ? forecastDayLabels(t, first) : null;
    body = (
      <>
        {weather.error ? (
          <AlertCard
            variant="warning"
            title={errorCopy.title}
            body={t('state.stale')}
            actionLabel={t('common.retry')}
            onAction={() => weather.refetch()}
            style={styles.block}
          />
        ) : null}

        {weather.current ? (
          <Card style={styles.block} testID="forecast-current">
            <AppText variant="overline" tone="muted" uppercase>
              {t('schedule.forecast.now', { location: displayLocation })}
            </AppText>
            <View style={[styles.rowBetween, { marginTop: spacing.sm }]}>
              <View>
                <AppText variant="hero">{`${Math.round(weather.current.temp)}°C`}</AppText>
                <AppText variant="body">{t(conditionKey(weather.current.condition))}</AppText>
              </View>
              <ConditionIcon c={weather.current.condition} size={56} color={colors.primary} />
            </View>
            <AppText variant="caption" tone="muted" style={{ marginTop: spacing.sm }}>
              {[
                t('dash.weather.feelsLike', { value: Math.round(weather.current.feelsLike) }),
                t('dash.weather.humidity', { value: Math.round(weather.current.humidity) }),
                t('dash.weather.wind', { value: Math.round(weather.current.windKph) }),
              ].join('  ·  ')}
            </AppText>
            <AppText variant="micro" tone="muted" style={{ marginTop: spacing.sm }}>
              {t('schedule.forecast.source')}
            </AppText>
          </Card>
        ) : null}

        {first && firstLabels ? (
          <Card variant="tinted" style={styles.block} testID="forecast-note">
            <AppText variant="h3">
              {t('schedule.forecast.note.title', { day: firstLabels.day })}
            </AppText>
            <AppText variant="body" style={{ marginTop: spacing.sm }}>
              {t(fieldTipKey(first.condition, first.high, parseInt(first.pop, 10) || 0))}
            </AppText>
            <AppText variant="caption" tone="muted" style={{ marginTop: spacing.sm }}>
              {t('schedule.forecast.note.caption')}
            </AppText>
          </Card>
        ) : null}

        <AppText variant="h3" style={styles.sectionTitle} accessibilityRole="header">
          {t('schedule.forecast.daily')}
        </AppText>
        {days.length === 0 ? (
          <AppText variant="body" tone="muted" style={styles.block}>
            {t('schedule.forecast.dailyEmpty')}
          </AppText>
        ) : (
          <Card padding={0} style={styles.block}>
            {days.map((d, i) => {
              const l = forecastDayLabels(t, d);
              const cond = t(conditionKey(d.condition));
              return (
                <ListRow
                  key={`${d.day}-${d.date}`}
                  title={`${l.day} · ${l.date}`}
                  subtitle={`${cond} · ${t('schedule.forecast.rain', { value: d.pop })}`}
                  value={t('schedule.forecast.range', { high: d.high, low: d.low })}
                  leading={<ConditionIcon c={d.condition} size={24} color={colors.primary} />}
                  accessibilityLabel={t('schedule.forecast.dayA11y', {
                    day: l.day,
                    date: l.date,
                    condition: cond,
                    high: d.high,
                    low: d.low,
                    pop: d.pop,
                  })}
                  divider={i < days.length - 1}
                />
              );
            })}
          </Card>
        )}
      </>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={t('schedule.forecast.title')}
        subtitle={weather.configured ? displayLocation : undefined}
        showBack
        onBack={() => (router.canGoBack?.() ? router.back() : router.replace('/' as any))}
        backLabel={t('common.back')}
      />
      <OfflineBanner
        visible={isOffline}
        message={hasData ? t('schedule.forecast.offline.cached') : t('offline.banner')}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          weather.configured ? (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          ) : undefined
        }
      >
        {weather.configured && usingDefaultLocation ? (
          <AlertCard
            variant="info"
            icon={<MapPin size={18} color={colors.infoText} />}
            title={t('schedule.forecast.defaultLocation', { location: displayLocation })}
            actionLabel={t('schedule.forecast.setRegion')}
            onAction={() => router.push('/edit-profile' as any)}
            style={styles.block}
            testID="forecast-default-location"
          />
        ) : null}
        {body}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (spacing: any) =>
  StyleSheet.create({
    safe: { flex: 1 },
    content: { padding: spacing.lg, paddingBottom: 120, flexGrow: 1 },
    block: { marginBottom: spacing.lg },
    sectionTitle: { marginBottom: spacing.md },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  });
