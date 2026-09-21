import React from 'react';
import { View } from 'react-native';
import { MapPin } from 'lucide-react-native';

import { cropNames } from '../../constants/onboardingOptions';
import { useTheme } from '../../constants/Theme';
import { useT } from '../../lib/i18n';
import { formatMoney, type Listing } from '../../lib/listings';
import { timeAgoKey } from '../../lib/timeAgo';
import { AppText, Badge, Card } from '../ui';

/** Localized crop title: the Swahili name when the UI is Swahili, else English. */
export function listingTitle(l: Listing, lang: 'sw' | 'en') {
  return lang === 'sw' ? (l.cropNameSw ?? cropNames(l.cropName).sw) : l.cropName;
}

export function ListingCard({ listing, onPress }: { listing: Listing; onPress: () => void }) {
  const { t, lang } = useT();
  const { colors, spacing } = useTheme();
  const title = listingTitle(listing, lang);
  const ago = timeAgoKey(listing.createdAt);

  return (
    <Card
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${t('soko.card.perKg', { price: formatMoney(listing.pricePerKg, listing.currency) })}, ${listing.location ?? ''}`}
      style={{ marginBottom: spacing.md }}
    >
      <View
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}
      >
        <View style={{ flex: 1, paddingRight: spacing.md }}>
          <AppText variant="h3">{title}</AppText>
          <AppText variant="caption" tone="muted" style={{ marginTop: 2 }}>
            {t('soko.card.qty', { qty: listing.quantityKg.toLocaleString('en-US') })}
          </AppText>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <AppText variant="h3" tone="primary">
            {t('soko.card.perKg', { price: formatMoney(listing.pricePerKg, listing.currency) })}
          </AppText>
          {!!listing.qualityGrade && (
            <Badge
              label={t('soko.card.grade', { grade: listing.qualityGrade })}
              variant="neutral"
              size="sm"
              style={{ marginTop: 6 }}
            />
          )}
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.md }}>
        {!!listing.location && (
          <>
            <MapPin size={14} color={colors.textMute} />
            <AppText variant="caption" tone="muted" style={{ marginLeft: 4 }}>
              {listing.location}
            </AppText>
            <AppText variant="caption" tone="muted">
              {'  ·  '}
            </AppText>
          </>
        )}
        <AppText variant="caption" tone="muted">
          {t(ago.key, ago.params)}
        </AppText>
      </View>
    </Card>
  );
}
