/**
 * OTP Phone Authentication — PRD AUTH-01
 * Supabase phone OTP flow. If Supabase is not configured, shows a
 * "not configured" state rather than crashing or silently succeeding.
 */
import { getSupabase } from '../lib/supabase';
import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Phone, ChevronLeft, ShieldCheck, AlertCircle } from 'lucide-react-native';
import { useTheme } from '../constants/Theme';
import { useKilimoStore } from '../store/useKilimoStore';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
const SUPABASE_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ANON);

const supabase: any = SUPABASE_CONFIGURED ? getSupabase() : null;

type AuthStep = 'phone' | 'otp' | 'success' | 'not_configured';

interface Props {
  onSuccess?: (phone: string) => void;
  onSkip?: () => void;
  embedded?: boolean;
}

export function OtpAuthFlow({ onSuccess, onSkip, embedded = false }: Props) {
  const { colors, isDark } = useTheme();
  const language = useKilimoStore((s) => s.language);
  const updateAgroId = useKilimoStore((s) => s.updateAgroId);
  const isSw = language === 'sw';

  const [step, setStep] = useState<AuthStep>(SUPABASE_CONFIGURED ? 'phone' : 'not_configured');
  const [phone, setPhone] = useState('+255');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = () => {
    setCooldown(60);
    cooldownRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(cooldownRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const sendOtp = async () => {
    if (!supabase) return;
    const normalized = phone.replace(/\s/g, '');
    if (normalized.length < 9) {
      setError(isSw ? 'Weka nambari sahihi ya simu' : 'Enter a valid phone number');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { error: err } = await supabase.auth.signInWithOtp({ phone: normalized });
      if (err) throw err;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep('otp');
      startCooldown();
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e.message ?? (isSw ? 'Imeshindwa kutuma OTP' : 'Failed to send OTP'));
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!supabase) return;
    const normalized = phone.replace(/\s/g, '');
    if (otp.length < 6) {
      setError(isSw ? 'Weka nambari 6 za OTP' : 'Enter the 6-digit OTP');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data, error: err } = await supabase.auth.verifyOtp({
        phone: normalized,
        token: otp,
        type: 'sms',
      });
      if (err) throw err;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      updateAgroId({ phoneNumber: normalized, mpesaLinked: false });
      setStep('success');
      setTimeout(() => onSuccess?.(normalized), 800);
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e.message ?? (isSw ? 'OTP si sahihi' : 'Invalid OTP'));
    } finally {
      setLoading(false);
    }
  };

  if (step === 'not_configured') {
    return (
      <View style={[s.notConfigured, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <AlertCircle size={28} color="#f59e0b" />
        <Text style={[s.ncTitle, { color: colors.text }]}>
          {isSw ? 'Uthibitishaji wa OTP haujawekwa' : 'OTP Auth Not Configured'}
        </Text>
        <Text style={[s.ncBody, { color: colors.textMute }]}>
          {isSw
            ? 'Ongeza EXPO_PUBLIC_SUPABASE_URL na EXPO_PUBLIC_SUPABASE_ANON_KEY ili uwezeshe uthibitishaji wa simu.'
            : 'Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to enable phone verification.'}
        </Text>
        {onSkip && (
          <TouchableOpacity style={[s.skipBtn, { borderColor: colors.border }]} onPress={onSkip}>
            <Text style={[s.skipText, { color: colors.textMute }]}>
              {isSw ? 'Endelea bila kuthibitisha' : 'Continue without verifying'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (step === 'success') {
    return (
      <View style={[s.successWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <ShieldCheck size={40} color={colors.primary} />
        <Text style={[s.successText, { color: colors.text }]}>
          {isSw ? 'Nambari imethibitishwa!' : 'Phone verified!'}
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {step === 'phone' ? (
          <>
            <View style={s.iconRow}>
              <Phone size={20} color={colors.primary} />
              <Text style={[s.cardTitle, { color: colors.text }]}>
                {isSw ? 'Nambari ya Simu' : 'Phone Number'}
              </Text>
            </View>
            <Text style={[s.cardSub, { color: colors.textMute }]}>
              {isSw
                ? 'Tutakutumia nambari ya kuthibitisha kwa SMS.'
                : "We'll send you a verification code by SMS."}
            </Text>
            <TextInput
              style={[
                s.input,
                {
                  color: colors.text,
                  borderColor: error ? '#ef4444' : colors.border,
                  backgroundColor: colors.background,
                },
              ]}
              value={phone}
              onChangeText={(t) => {
                setPhone(t);
                setError('');
              }}
              keyboardType="phone-pad"
              placeholder="+255 712 000 000"
              placeholderTextColor={colors.textMute}
              autoFocus
              maxLength={15}
              accessibilityLabel={isSw ? 'Nambari ya simu' : 'Phone number'}
            />
            {error ? <Text style={s.errorText}>{error}</Text> : null}
            <TouchableOpacity
              style={[s.btn, { backgroundColor: colors.primary }]}
              onPress={sendOtp}
              disabled={loading}
              accessibilityLabel={isSw ? 'Tuma OTP' : 'Send OTP'}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={s.btnText}>{isSw ? 'Tuma Nambari' : 'Send Code'}</Text>
              )}
            </TouchableOpacity>
            {onSkip && (
              <TouchableOpacity style={s.skipLink} onPress={onSkip}>
                <Text style={[s.skipLinkText, { color: colors.textMute }]}>
                  {isSw ? 'Ruka hatua hii' : 'Skip this step'}
                </Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            <View style={s.iconRow}>
              <ShieldCheck size={20} color={colors.primary} />
              <Text style={[s.cardTitle, { color: colors.text }]}>
                {isSw ? 'Weka Nambari ya SMS' : 'Enter SMS Code'}
              </Text>
            </View>
            <Text style={[s.cardSub, { color: colors.textMute }]}>
              {isSw ? `Imetumwa kwa ${phone}` : `Sent to ${phone}`}
            </Text>
            <TextInput
              style={[
                s.input,
                s.otpInput,
                {
                  color: colors.text,
                  borderColor: error ? '#ef4444' : colors.border,
                  backgroundColor: colors.background,
                },
              ]}
              value={otp}
              onChangeText={(t) => {
                setOtp(t.replace(/\D/g, ''));
                setError('');
              }}
              keyboardType="number-pad"
              placeholder="000000"
              placeholderTextColor={colors.textMute}
              autoFocus
              maxLength={6}
              accessibilityLabel="OTP code"
            />
            {error ? <Text style={s.errorText}>{error}</Text> : null}
            <TouchableOpacity
              style={[s.btn, { backgroundColor: colors.primary }]}
              onPress={verifyOtp}
              disabled={loading || otp.length < 6}
              accessibilityLabel={isSw ? 'Thibitisha' : 'Verify'}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={s.btnText}>{isSw ? 'Thibitisha' : 'Verify'}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={s.skipLink}
              onPress={cooldown === 0 ? sendOtp : undefined}
              disabled={cooldown > 0}
            >
              <Text
                style={[s.skipLinkText, { color: cooldown > 0 ? colors.textMute : colors.primary }]}
              >
                {cooldown > 0
                  ? isSw
                    ? `Tuma tena baada ya ${cooldown}s`
                    : `Resend in ${cooldown}s`
                  : isSw
                    ? 'Tuma tena'
                    : 'Resend code'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

export default function OtpAuthScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const language = useKilimoStore((s) => s.language);
  const isSw = language === 'sw';

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <LinearGradient
        colors={[colors.primary + '1F', 'transparent']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.5 }}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={s.header}>
          <TouchableOpacity
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            style={[s.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            accessibilityLabel={isSw ? 'Rudi' : 'Back'}
          >
            <ChevronLeft size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={s.content}>
          <OtpAuthFlow
            onSuccess={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            onSkip={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
    paddingBottom: 12,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  card: { borderRadius: 20, borderWidth: 1, padding: 22 },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  cardTitle: { fontSize: 18, fontFamily: 'Inter_800ExtraBold' },
  cardSub: { fontSize: 13, fontFamily: 'Inter_500Medium', marginBottom: 18, lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
  },
  otpInput: { textAlign: 'center', letterSpacing: 8, fontSize: 24 },
  errorText: { color: '#ef4444', fontSize: 12, fontFamily: 'Inter_500Medium', marginBottom: 10 },
  btn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  btnText: { fontSize: 15, fontFamily: 'Inter_800ExtraBold', color: '#020617' },
  skipLink: { alignItems: 'center', marginTop: 14 },
  skipLinkText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  notConfigured: { borderRadius: 20, borderWidth: 1, padding: 24, alignItems: 'center', gap: 12 },
  ncTitle: { fontSize: 16, fontFamily: 'Inter_800ExtraBold', textAlign: 'center' },
  ncBody: { fontSize: 13, fontFamily: 'Inter_500Medium', textAlign: 'center', lineHeight: 20 },
  skipBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 4,
  },
  skipText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  successWrap: { borderRadius: 20, borderWidth: 1, padding: 32, alignItems: 'center', gap: 14 },
  successText: { fontSize: 18, fontFamily: 'Inter_800ExtraBold', textAlign: 'center' },
});
