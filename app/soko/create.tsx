/**
 * Soko — create a listing (phase 1). Writes to `market_listings` as the signed-in seller.
 * Escrow / smart-contract flags are not offered: no backend can honour them (server-side policy too).
 */
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';

import { AppText, Button, Chip, ScreenHeader, TextField } from '../../components/ui';
import { CROPS, REGIONS, cropNames } from '../../constants/onboardingOptions';
import { useTheme } from '../../constants/Theme';
import { useMyUserId } from '../../hooks/useListings';
import { useT } from '../../lib/i18n';
import {
  createListing,
  hasErrors,
  validateListingInput,
  type ListingErrors,
} from '../../lib/listings';
import { getSupabase } from '../../lib/supabase';
import { useKilimoStore } from '../../store/useKilimoStore';

export default function CreateListing() {
  const router = useRouter();
  const { t, lang } = useT();
  const { colors, spacing } = useTheme();
  const me = useMyUserId();
  const farm = useKilimoStore((s) => s.farmProfile);

  const [crop, setCrop] = useState('');
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  // The farmer's own saved region is a reasonable, editable starting point (their data, not ours).
  const [location, setLocation] = useState(farm?.region ?? '');
  const [notes, setNotes] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<ListingErrors>({});
  const [busy, setBusy] = useState(false);

  const publish = async () => {
    const names = cropNames(crop);
    const input = {
      cropName: crop ? names.en : '',
      cropNameSw: crop ? names.sw : undefined,
      quantityKg: qty,
      pricePerKg: price,
      location,
      notes,
      contactPhone: phone,
    };
    const e = validateListingInput(input);
    setErrors(e);
    if (hasErrors(e)) {
      Alert.alert(t('soko.create.invalid.title'), t('soko.create.invalid.body'));
      return;
    }
    if (!me) {
      Alert.alert(t('state.error.title'), t('auth.generic'));
      return;
    }
    setBusy(true);
    const r = await createListing(getSupabase(), me, input);
    setBusy(false);
    if (r.ok) router.replace('/soko/mine' as any);
    else Alert.alert(t('state.error.title'), t('soko.create.failed'));
  };

  const label = (text: string) => (
    <AppText variant="label" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>
      {text}
    </AppText>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title={t('soko.create.title')}
        showBack
        onBack={() => router.back()}
        backLabel={t('common.back')}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {label(t('soko.create.crop'))}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {CROPS.map((c) => {
              const n = cropNames(c);
              return (
                <Chip
                  key={c}
                  label={lang === 'sw' ? n.sw : n.en}
                  selected={crop === c}
                  onPress={() => setCrop(c)}
                />
              );
            })}
          </View>
          {errors.cropName && (
            <AppText variant="caption" tone="error">
              {t('soko.create.invalid.body')}
            </AppText>
          )}

          <TextField
            label={t('soko.create.qty')}
            value={qty}
            onChangeText={(v) => setQty(v.replace(/[^0-9.]/g, ''))}
            keyboardType="decimal-pad"
            error={errors.quantityKg ? t('soko.create.invalid.body') : undefined}
            testID="listing-qty"
            wrapperStyle={{ marginTop: spacing.lg }}
          />
          <TextField
            label={t('soko.create.price')}
            value={price}
            onChangeText={(v) => setPrice(v.replace(/[^0-9.]/g, ''))}
            keyboardType="decimal-pad"
            error={errors.pricePerKg ? t('soko.create.invalid.body') : undefined}
            testID="listing-price"
            wrapperStyle={{ marginTop: spacing.md }}
          />

          {label(t('soko.create.location'))}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {REGIONS.map((r) => (
              <Chip key={r} label={r} selected={location === r} onPress={() => setLocation(r)} />
            ))}
          </View>
          {errors.location && (
            <AppText variant="caption" tone="error">
              {t('soko.create.invalid.body')}
            </AppText>
          )}

          <TextField
            label={t('soko.create.phone')}
            hint={t('soko.create.phone.help')}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            error={errors.contactPhone ? t('onb.register.invalidNumber.body') : undefined}
            testID="listing-phone"
            wrapperStyle={{ marginTop: spacing.lg }}
          />
          <TextField
            label={t('soko.create.notes')}
            value={notes}
            onChangeText={setNotes}
            multiline
            wrapperStyle={{ marginTop: spacing.md }}
          />
        </ScrollView>
        <View style={{ padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Button
            label={t('soko.create.cta')}
            onPress={publish}
            loading={busy}
            size="lg"
            fullWidth
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
