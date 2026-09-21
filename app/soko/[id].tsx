/**
 * Soko listing detail — real listing + contact the seller (phase 1).
 * Contact uses the seller's OPT-IN listing phone only; the account phone is never exposed.
 * No offers, escrow or payments here: those have no backend yet (see BACKEND_CAPABILITY_MATRIX).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, SafeAreaView, ScrollView, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { MessageCircle, MessageSquare, Phone } from 'lucide-react-native';

import { listingTitle } from '../../components/soko/ListingCard';
import {
  AlertCard,
  AppText,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  ScreenHeader,
  SkeletonBlock,
  SkeletonGroup,
} from '../../components/ui';
import { useTheme } from '../../constants/Theme';
import { useMyUserId } from '../../hooks/useListings';
import { useT } from '../../lib/i18n';
import {
  fetchListing,
  formatMoney,
  markListingSold,
  smsUrl,
  telUrl,
  whatsappUrl,
  type Listing,
} from '../../lib/listings';
import { getSupabase } from '../../lib/supabase';
import { timeAgoKey } from '../../lib/timeAgo';

export default function ListingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t, lang } = useT();
  const { colors, spacing } = useTheme();
  const me = useMyUserId();

  const [listing, setListing] = useState<Listing | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');

  const load = useCallback(async () => {
    setState('loading');
    const r = await fetchListing(getSupabase(), String(id));
    if (!r.ok) return setState('error');
    if (!r.listing) return setState('missing');
    setListing(r.listing);
    setState('ready');
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  const open = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(t('state.error.title'), t('state.error.body'));
    }
  };

  const markSold = async () => {
    if (!listing) return;
    const r = await markListingSold(getSupabase(), listing.id);
    if (r.ok) setListing({ ...listing, status: 'sold' });
    else Alert.alert(t('state.error.title'), t('state.error.body'));
  };

  const header = (
    <ScreenHeader
      title={t('soko.detail.title')}
      showBack
      onBack={() => router.back()}
      backLabel={t('common.back')}
    />
  );

  let body: React.ReactNode;
  if (state === 'loading') {
    body = (
      <SkeletonGroup label={t('state.loading')}>
        <SkeletonBlock height={28} width="60%" />
        <SkeletonBlock height={120} radius={16} style={{ marginTop: spacing.lg }} />
      </SkeletonGroup>
    );
  } else if (state === 'error') {
    body = (
      <ErrorState
        title={t('soko.error.title')}
        description={t('state.error.body')}
        retryLabel={t('common.retry')}
        onRetry={load}
      />
    );
  } else if (state === 'missing' || !listing) {
    body = (
      <EmptyState
        title={t('soko.detail.notFound.title')}
        description={t('soko.detail.notFound.body')}
      />
    );
  } else {
    const title = listingTitle(listing, lang);
    const ago = timeAgoKey(listing.createdAt);
    const mine = !!me && listing.sellerId === me;
    const pitch = t('soko.detail.message', { crop: title });
    body = (
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <AppText variant="h1" style={{ flex: 1 }} accessibilityRole="header">
            {title}
          </AppText>
          {listing.status !== 'active' && (
            <Badge label={t(`soko.status.${listing.status}` as const)} variant="neutral" />
          )}
        </View>
        <AppText variant="hero" tone="primary" style={{ marginTop: spacing.sm }}>
          {t('soko.card.perKg', { price: formatMoney(listing.pricePerKg, listing.currency) })}
        </AppText>

        <Card style={{ marginTop: spacing.lg }}>
          <Row
            label={t('soko.create.qty')}
            value={t('soko.card.qty', { qty: listing.quantityKg.toLocaleString('en-US') })}
          />
          {!!listing.location && <Row label={t('soko.create.location')} value={listing.location} />}
          {!!listing.qualityGrade && (
            <Row label="" value={t('soko.card.grade', { grade: listing.qualityGrade })} />
          )}
          <AppText variant="caption" tone="muted" style={{ marginTop: spacing.sm }}>
            {t(ago.key, ago.params)}
          </AppText>
        </Card>

        {!!listing.notes && (
          <Card style={{ marginTop: spacing.md }}>
            <AppText variant="label">{t('soko.detail.notes')}</AppText>
            <AppText variant="body" style={{ marginTop: spacing.xs }}>
              {listing.notes}
            </AppText>
          </Card>
        )}

        {mine ? (
          <View style={{ marginTop: spacing.lg }}>
            <AppText variant="label" tone="muted">
              {t('soko.detail.mine')}
            </AppText>
            {listing.status === 'active' && (
              <Button
                label={t('soko.detail.markSold')}
                variant="secondary"
                onPress={markSold}
                style={{ marginTop: spacing.md }}
              />
            )}
          </View>
        ) : (
          <View style={{ marginTop: spacing.lg }}>
            <AppText variant="h3">{t('soko.detail.contact')}</AppText>
            {listing.contactPhone ? (
              <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
                <Button
                  label={t('soko.detail.call')}
                  icon={<Phone size={18} color="#fff" />}
                  onPress={() => open(telUrl(listing.contactPhone as string))}
                  style={{ flex: 1 }}
                />
                <Button
                  label={t('soko.detail.sms')}
                  icon={<MessageSquare size={18} color={colors.primary} />}
                  variant="outline"
                  onPress={() => open(smsUrl(listing.contactPhone as string, pitch))}
                  style={{ flex: 1 }}
                />
                <Button
                  label={t('soko.detail.whatsapp')}
                  icon={<MessageCircle size={18} color={colors.primary} />}
                  variant="outline"
                  onPress={() => open(whatsappUrl(listing.contactPhone as string, pitch))}
                  style={{ flex: 1 }}
                />
              </View>
            ) : (
              <AppText variant="body" tone="muted" style={{ marginTop: spacing.sm }}>
                {t('soko.detail.noContact')}
              </AppText>
            )}
            <AlertCard
              variant="info"
              title={t('soko.detail.safety')}
              style={{ marginTop: spacing.lg }}
            />
          </View>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      {header}
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl * 2 }}>
        {body}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
      <AppText variant="body" tone="muted">
        {label}
      </AppText>
      <AppText variant="label">{value}</AppText>
    </View>
  );
}
