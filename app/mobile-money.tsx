/**
 * M-Pesa / Airtel Money — Mobile Money Hub
 * Send, receive, pay bills, buy airtime via integrated wallet
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Smartphone,
  Receipt,
  RefreshCw,
  Eye,
  EyeOff,
  Sparkles,
  Clock,
  AlertCircle,
  ChevronRight,
  Wallet,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../constants/Theme';
import { useKilimoStore } from '../store/useKilimoStore';

const { width: SW } = Dimensions.get('window');

// No real M-Pesa/Airtel Money API integration exists anywhere in this
// codebase (wallet-admin's own real workflow is manual receipt entry, since
// Daraja wiring is a separate, tracked follow-up). This used to fake an
// instant "Imekamilika/Success" for Send/Receive/Pay Bills after collecting
// a real phone number and amount — a farmer could believe they'd actually
// sent money to someone. Matches the same class of finding already fixed
// in insurance.tsx (fake enrollment) and finance.tsx (fake AUTO-SYNC).
const MOBILE_MONEY_LIVE = false;

type Provider = 'mpesa' | 'airtel';

type Txn = {
  id: string;
  label: string;
  amount: number;
  direction: 'in' | 'out';
  ts: number;
  status: 'done' | 'pending' | 'failed';
  provider: Provider;
};

const SAMPLE_TXNS: Txn[] = [
  {
    id: 't1',
    label: 'Uza Mahindi — Mwanzo Coop',
    amount: 84000,
    direction: 'in',
    ts: Date.now() - 3600000,
    status: 'done',
    provider: 'mpesa',
  },
  {
    id: 't2',
    label: 'Mbolea — Yara Tanzania',
    amount: 42500,
    direction: 'out',
    ts: Date.now() - 7200000,
    status: 'done',
    provider: 'mpesa',
  },
  {
    id: 't3',
    label: 'Ada ya Kilimo — TARI',
    amount: 5000,
    direction: 'out',
    ts: Date.now() - 86400000,
    status: 'done',
    provider: 'airtel',
  },
  {
    id: 't4',
    label: 'Pato la Mahindi — Sehemu 2',
    amount: 56000,
    direction: 'in',
    ts: Date.now() - 172800000,
    status: 'done',
    provider: 'mpesa',
  },
  {
    id: 't5',
    label: 'Airtime — Vodacom',
    amount: 3000,
    direction: 'out',
    ts: Date.now() - 259200000,
    status: 'done',
    provider: 'airtel',
  },
  {
    id: 't6',
    label: 'Usafirishaji wa Mazao',
    amount: 12000,
    direction: 'out',
    ts: Date.now() - 345600000,
    status: 'pending',
    provider: 'mpesa',
  },
];

const QUICK_ACTIONS = [
  { id: 'send', icon: ArrowUpRight, label: 'Tuma Pesa', labelEn: 'Send', color: '#ef4444' },
  { id: 'receive', icon: ArrowDownLeft, label: 'Pokea Pesa', labelEn: 'Receive', color: '#2E6F40' },
  { id: 'airtime', icon: Smartphone, label: 'Nunua Airtime', labelEn: 'Airtime', color: '#8b5cf6' },
  { id: 'bills', icon: Receipt, label: 'Lipa Bili', labelEn: 'Pay Bills', color: '#f59e0b' },
];

function fmtTZS(n: number) {
  return `TSh ${new Intl.NumberFormat('en-US').format(n)}`;
}
function fmtAge(ts: number) {
  const d = Date.now() - ts;
  if (d < 3600000) return `${Math.floor(d / 60000)}m`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h`;
  return `${Math.floor(d / 86400000)}d`;
}

function ProviderTag({ p }: { p: Provider }) {
  return (
    <View style={[pt.tag, { backgroundColor: p === 'mpesa' ? '#00a54f18' : '#ef444418' }]}>
      <Text style={[pt.txt, { color: p === 'mpesa' ? '#00a54f' : '#ef4444' }]}>
        {p === 'mpesa' ? 'M-PESA' : 'AIRTEL'}
      </Text>
    </View>
  );
}
const pt = StyleSheet.create({
  tag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  txt: { fontFamily: 'Inter_800ExtraBold', fontSize: 8 },
});

export default function MobileMoneyScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const language = useKilimoStore((s) => s.language);
  const wallet = useKilimoStore((s) => s.wallet);
  const [provider, setProvider] = useState<Provider>('mpesa');
  const [hideBalance, setHideBalance] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');

  const balance = wallet.balanceTZS;

  const showComingSoon = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      language === 'sw' ? 'Bado Haipatikani' : 'Coming Soon',
      language === 'sw'
        ? 'Kutuma/kupokea pesa kupitia app haipatikani bado. Hakuna pesa iliyotumwa.'
        : 'Sending/receiving money through the app isn’t available yet. No money was sent.'
    );
  };

  const handleAction = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!MOBILE_MONEY_LIVE) {
      showComingSoon();
      return;
    }
    setActiveAction((prev) => (prev === id ? null : id));
    setAmount('');
    setPhone('');
  };

  const handleSubmit = () => {
    const n = parseInt(amount.replace(/,/g, ''), 10);
    if (!phone || !n || n <= 0) {
      Alert.alert(language === 'sw' ? 'Tafadhali jaza fomu' : 'Please complete the form');
      return;
    }
    if (!MOBILE_MONEY_LIVE) {
      setActiveAction(null);
      showComingSoon();
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      language === 'sw' ? 'Imekamilika' : 'Success',
      language === 'sw' ? `${fmtTZS(n)} imetumwa kwa ${phone}` : `${fmtTZS(n)} sent to ${phone}`
    );
    setActiveAction(null);
  };

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={
          isDark
            ? ['#060a04', '#080e05', colors.background]
            : ['#f0fdf4', '#f8fafc', colors.background]
        }
        style={StyleSheet.absoluteFill}
        locations={[0, 0.3, 1]}
      />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            style={[s.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <ChevronLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[s.title, { color: colors.text }]}>
              {language === 'sw' ? 'Pesa za Simu' : 'Mobile Money'}
            </Text>
          </View>
          <View style={s.providerRow}>
            {(['mpesa', 'airtel'] as Provider[]).map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => {
                  Haptics.selectionAsync();
                  setProvider(p);
                }}
                style={[
                  s.provBtn,
                  {
                    backgroundColor:
                      provider === p ? (p === 'mpesa' ? '#00a54f' : '#ef4444') : colors.card,
                    borderColor: provider === p ? 'transparent' : colors.border,
                  },
                ]}
              >
                <Text style={[s.provTxt, { color: provider === p ? '#fff' : colors.textMute }]}>
                  {p === 'mpesa' ? 'M-Pesa' : 'Airtel'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Balance Card */}
          <Animated.View entering={FadeInUp.springify()} style={{ paddingHorizontal: 16 }}>
            <LinearGradient
              colors={provider === 'mpesa' ? ['#00a54f', '#007a3a'] : ['#ef4444', '#c92020']}
              style={[s.balCard, { shadowColor: provider === 'mpesa' ? '#00a54f' : '#ef4444' }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={s.balCardTop}>
                <View>
                  <Text style={s.balLabel}>
                    {language === 'sw' ? 'Salio Lako' : 'Your Balance'}
                  </Text>
                  <Text style={s.balProvider}>
                    {provider === 'mpesa' ? 'M-PESA' : 'AIRTEL MONEY'}
                  </Text>
                </View>
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Toggle balance visibility"
                  onPress={() => {
                    Haptics.selectionAsync();
                    setHideBalance((v) => !v);
                  }}
                  style={s.eyeBtn}
                >
                  {hideBalance ? (
                    <EyeOff size={18} color="rgba(255,255,255,0.7)" />
                  ) : (
                    <Eye size={18} color="rgba(255,255,255,0.7)" />
                  )}
                </TouchableOpacity>
              </View>
              <Text style={s.balAmount}>{hideBalance ? '••••••' : fmtTZS(balance)}</Text>
              <View style={s.balFooter}>
                {/* No real M-Pesa/Airtel account linkage exists in this app
                    (wallet.mpesaPhone is never set anywhere) — this used to
                    unconditionally claim "Active Account" regardless. */}
                <View style={[s.balBadge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                  <AlertCircle size={11} color="rgba(255,255,255,0.9)" />
                  <Text style={s.balBadgeTxt}>
                    {language === 'sw' ? 'Haijaunganishwa' : 'Not Linked'}
                  </Text>
                </View>
                <TouchableOpacity
                  disabled={!MOBILE_MONEY_LIVE}
                  onPress={() => Haptics.selectionAsync()}
                  style={[s.balBadge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
                >
                  <RefreshCw size={11} color="rgba(255,255,255,0.9)" />
                  <Text style={s.balBadgeTxt}>
                    {language === 'sw' ? 'Haipatikani' : 'Unavailable'}
                  </Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Quick Actions */}
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: colors.textMute }]}>
              {language === 'sw' ? 'VITENDO VYA HARAKA' : 'QUICK ACTIONS'}
            </Text>
            <View style={s.actionsGrid}>
              {QUICK_ACTIONS.map((a, i) => (
                <Animated.View
                  key={a.id}
                  entering={FadeInDown.delay(i * 60).springify()}
                  style={{ flex: 1 }}
                >
                  <TouchableOpacity
                    onPress={() => handleAction(a.id)}
                    style={[
                      s.actionCard,
                      {
                        backgroundColor: activeAction === a.id ? a.color : colors.card,
                        borderColor: activeAction === a.id ? a.color : colors.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        s.actionIcon,
                        {
                          backgroundColor:
                            activeAction === a.id ? 'rgba(255,255,255,0.2)' : a.color + '18',
                        },
                      ]}
                    >
                      <a.icon size={20} color={activeAction === a.id ? '#fff' : a.color} />
                    </View>
                    <Text
                      style={[
                        s.actionLabel,
                        { color: activeAction === a.id ? '#fff' : colors.text },
                      ]}
                    >
                      {language === 'sw' ? a.label : a.labelEn}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          </View>

          {/* Send / Receive form */}
          {activeAction && activeAction !== 'airtime' && (
            <Animated.View
              entering={FadeInDown.springify()}
              style={{ paddingHorizontal: 16, marginBottom: 8 }}
            >
              <View
                style={[s.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Text style={[s.formTitle, { color: colors.text }]}>
                  {activeAction === 'send'
                    ? language === 'sw'
                      ? 'Tuma Pesa'
                      : 'Send Money'
                    : activeAction === 'receive'
                      ? language === 'sw'
                        ? 'Omba Pesa'
                        : 'Request Money'
                      : language === 'sw'
                        ? 'Lipa Bili'
                        : 'Pay Bill'}
                </Text>
                <TextInput
                  style={[
                    s.input,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  placeholder={
                    language === 'sw'
                      ? 'Nambari ya simu (e.g. 0712...)'
                      : 'Phone number (e.g. 0712...)'
                  }
                  placeholderTextColor={colors.textMute}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
                <TextInput
                  style={[
                    s.input,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  placeholder={language === 'sw' ? 'Kiasi (TZS)' : 'Amount (TZS)'}
                  placeholderTextColor={colors.textMute}
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                />
                <TouchableOpacity
                  onPress={handleSubmit}
                  style={[
                    s.submitBtn,
                    { backgroundColor: provider === 'mpesa' ? '#00a54f' : '#ef4444' },
                  ]}
                >
                  <Text style={s.submitTxt}>{language === 'sw' ? 'Thibitisha' : 'Confirm'}</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {/* Transactions */}
          <View style={s.section}>
            <View style={s.sectionRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[s.sectionTitle, { color: colors.textMute }]}>
                  {language === 'sw' ? 'MIAMALA YA HIVI KARIBUNI' : 'RECENT TRANSACTIONS'}
                </Text>
                {/* No transaction backend exists yet (WalletState only tracks
                    balanceTZS/mpesaPhone/lastTransaction, no ledger) — SAMPLE_TXNS
                    below is illustrative only and must never be mistaken for the
                    user's real M-Pesa/Airtel history. */}
                <View
                  style={{
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 6,
                    backgroundColor: '#f59e0b22',
                  }}
                >
                  <Text style={{ fontSize: 9, fontFamily: 'Inter_700Bold', color: '#b45309' }}>
                    {language === 'sw' ? 'MFANO' : 'SAMPLE'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => router.push('/wallet-admin/transactions' as any)}>
                <Text style={[s.seeAll, { color: colors.primary }]}>
                  {language === 'sw' ? 'Zote →' : 'See all →'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: 16, gap: 8 }}>
              {SAMPLE_TXNS.map((t, i) => (
                <Animated.View key={t.id} entering={FadeInDown.delay(i * 40).springify()}>
                  <View
                    style={[s.txnRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <View
                      style={[
                        s.txnDot,
                        { backgroundColor: t.direction === 'in' ? '#2E6F4022' : '#ef444422' },
                      ]}
                    >
                      {t.direction === 'in' ? (
                        <ArrowDownLeft size={16} color="#2E6F40" />
                      ) : (
                        <ArrowUpRight size={16} color="#ef4444" />
                      )}
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[s.txnLabel, { color: colors.text }]} numberOfLines={1}>
                        {t.label}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <ProviderTag p={t.provider} />
                        <Clock size={10} color={colors.textMute} />
                        <Text style={[s.txnMeta, { color: colors.textMute }]}>
                          {fmtAge(t.ts)} {language === 'sw' ? 'iliyopita' : 'ago'}
                        </Text>
                        {t.status === 'pending' && <AlertCircle size={10} color="#f59e0b" />}
                      </View>
                    </View>
                    <Text
                      style={[s.txnAmount, { color: t.direction === 'in' ? '#2E6F40' : '#ef4444' }]}
                    >
                      {t.direction === 'in' ? '+' : '-'}
                      {fmtTZS(t.amount)}
                    </Text>
                  </View>
                </Animated.View>
              ))}
            </View>
          </View>

          {/* Link to full wallet */}
          <Animated.View
            entering={FadeInDown.delay(300).springify()}
            style={{ paddingHorizontal: 16 }}
          >
            <TouchableOpacity
              onPress={() => router.push('/wallet-admin' as any)}
              style={[s.walletLink, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Wallet size={18} color={colors.primary} />
              <Text style={[s.walletLinkTxt, { color: colors.text }]}>
                {language === 'sw' ? 'Fungua Pochi Kamili' : 'Open Full Wallet'}
              </Text>
              <ChevronRight size={16} color={colors.textMute} />
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  providerRow: { flexDirection: 'row', gap: 6 },
  provBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  provTxt: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  balCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 8,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  balCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  balLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  balProvider: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1,
    marginTop: 2,
  },
  eyeBtn: { padding: 4 },
  balAmount: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 36,
    color: '#fff',
    marginVertical: 12,
  },
  balFooter: { flexDirection: 'row', gap: 8 },
  balBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  balBadgeTxt: { fontFamily: 'Inter_600SemiBold', fontSize: 11, color: 'rgba(255,255,255,0.9)' },
  section: { paddingTop: 16 },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 10,
    letterSpacing: 0.8,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  seeAll: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  actionsGrid: { flexDirection: 'row', paddingHorizontal: 16, gap: 8 },
  actionCard: { alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, gap: 8 },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11, textAlign: 'center' },
  formCard: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 12 },
  formTitle: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  submitBtn: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  submitTxt: { fontFamily: 'Inter_700Bold', fontSize: 15, color: '#fff' },
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  txnDot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txnLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  txnMeta: { fontFamily: 'Inter_500Medium', fontSize: 10 },
  txnAmount: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  walletLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
  },
  walletLinkTxt: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 14 },
});
