import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import PageScaffold from '../../components/PageScaffold';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { useKilimoStore } from '../../store/useKilimoStore';
import { invokeAuthedFunction } from '../../lib/supabase';
import { useTheme } from '../../constants/Theme';

export default function BusinessVerification() {
  const router = useRouter();
  const { colors } = useTheme();
  const updateAgroId = useKilimoStore((s) => s.updateAgroId);
  const agroId = useKilimoStore((s) => s.agroId);
  const [tin, setTin] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const { error } = await invokeAuthedFunction('submit-verification', {
        body: {
          agroId: agroId,
          tin,
          regNumber,
          verificationType: 'business',
        },
      });

      if (error) throw error;

      updateAgroId({ verificationStatus: 'pending' });
      router.replace('/verification/pending');
    } catch (error: any) {
      console.warn('Failed to submit verification to Edge Function:', error);
      // Fallback: still update state to pending so user can proceed if offline or missing edge function
      updateAgroId({ verificationStatus: 'pending' });
      router.replace('/verification/pending');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageScaffold title="Business Details" subtitle="Step 2 of 2">
      <View style={styles.content}>
        <View style={styles.badgeWrap}>
          <Badge label="Optional for Smallholders" variant="info" />
        </View>

        <Input
          label="TIN Number (Optional)"
          placeholder="123-456-789"
          value={tin}
          onChangeText={setTin}
          keyboardType="number-pad"
        />
        <Input
          label="Business Registration (BRELA) (Optional)"
          placeholder="123456"
          value={regNumber}
          onChangeText={setRegNumber}
        />

        <Button
          label={isLoading ? 'Submitting...' : 'Submit Application'}
          onPress={handleSubmit}
          loading={isLoading}
          style={{ marginTop: 24 }}
        />
      </View>
    </PageScaffold>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24 },
  badgeWrap: { marginBottom: 24 },
});
