/**
 * Wallet Admin — Overview dashboard
 *
 * Surfaces the three metrics co-op leaders / commercial admins need at a
 * glance: aggregated balance across members, pending payout count, and the
 * most recent ledger activity. Drill-downs route to `/wallet-admin/payouts`
 * and `/wallet-admin/transactions`.
 *
 * Gated via `wallet_admin` feature — non-admin roles see a fallback explaining
 * the page is enterprise-only instead of an empty list.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronRight,
  Wallet,
  Users,
  Clock,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react-native';
import PageScaffold, { GlassCard, SectionHeader, EmptyState } from '../../components/PageScaffold';
import { useTheme } from '../../constants/Theme';
import { Gate } from '../../lib/access';
import { useWalletAdminStore } from '../../store/useWalletAdminStore';
import { RequireVerification } from '../../components/RequireVerification';

const fmt = (n: number) => `TSh ${new Intl.NumberFormat('en-US').format(n)}`;

export default function WalletAdminOverview() {
  const { colors } = useTheme();
  const router = useRouter();
  const members = useWalletAdminStore((s) => s.members);
  const transactions = useWalletAdminStore((s) => s.transactions);
  const payouts = useWalletAdminStore((s) => s.payouts);

  const totalBalance = members.reduce((sum, m) => sum + m.balanceTZS, 0);
  const pending = payouts.filter((p) => p.status === 'requested').length;
  const approvedAwaitingSettle = payouts.filter((p) => p.status === 'approved').length;
  const activeMembers = members.filter((m) => m.status === 'active').length;
  const recent = transactions.slice(0, 5);

  return (
    <Gate
      feature="wallet_admin"
      fallback={
        <PageScaffold title="Pochi ya Msimamizi" badge="ENTERPRISE">
          <View style={{ padding: 24 }}>
            <GlassCard style={{ padding: 24, alignItems: 'center' }}>
              <ShieldCheck size={32} color={colors.textMute} />
              <Text style={[s.fallbackTitle, { color: colors.text }]}>Hairuhusiwi</Text>
              <Text style={[s.fallbackBody, { color: colors.textMute }]}>
                Pochi ya Msimamizi inapatikana kwa Wakulima wa Biashara, Wakuu wa Operesheni, na
                Viongozi wa Ushirika tu.
              </Text>
            </GlassCard>
          </View>
        </PageScaffold>
      }
    >
      <RequireVerification>
        <PageScaffold title="Pochi ya Msimamizi" subtitle="Wallet Admin" badge="ENTERPRISE">
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          >
            {/* Hero — total balance */}
            <GlassCard style={[s.hero, { borderColor: colors.border }]}>
              <View style={s.heroRow}>
                <Wallet size={20} color={colors.primary} />
                <Text style={[s.heroLabel, { color: colors.textMute }]}>
                  JUMLA YA SALIO LA WANACHAMA
                </Text>
              </View>
              <Text style={[s.heroAmount, { color: colors.text }]}>{fmt(totalBalance)}</Text>
              <View style={s.heroMetaRow}>
                <View style={s.heroMeta}>
                  <Users size={14} color={colors.textMute} />
                  <Text style={[s.heroMetaText, { color: colors.textMute }]}>
                    {activeMembers} wanachama hai
                  </Text>
                </View>
                <View style={s.heroMeta}>
                  <Clock size={14} color="#f59e0b" />
                  <Text style={[s.heroMetaText, { color: '#f59e0b' }]}>
                    {pending} ombi linasubiri
                  </Text>
                </View>
              </View>
            </GlassCard>

            {/* Drill-down tiles */}
            <View style={s.tileRow}>
              <TouchableOpacity
                style={[s.tile, { backgroundColor: colors.card, borderColor: colors.border }]}
                activeOpacity={0.85}
                onPress={() => router.push('/wallet-admin/payouts')}
              >
                <View style={[s.tileBadge, { backgroundColor: '#f59e0b22' }]}>
                  <Text style={[s.tileBadgeText, { color: '#f59e0b' }]}>
                    {pending + approvedAwaitingSettle}
                  </Text>
                </View>
                <Text style={[s.tileTitle, { color: colors.text }]}>Foleni ya Malipo</Text>
                <Text style={[s.tileSub, { color: colors.textMute }]}>
                  {pending} ya kuidhinisha · {approvedAwaitingSettle} ya kulipwa
                </Text>
                <ChevronRight size={18} color={colors.textMute} style={s.tileChev} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.tile, { backgroundColor: colors.card, borderColor: colors.border }]}
                activeOpacity={0.85}
                onPress={() => router.push('/wallet-admin/transactions')}
              >
                <View style={[s.tileBadge, { backgroundColor: '#2E6F4022' }]}>
                  <Text style={[s.tileBadgeText, { color: colors.primary }]}>
                    {transactions.length}
                  </Text>
                </View>
                <Text style={[s.tileTitle, { color: colors.text }]}>Daftari la Miamala</Text>
                <Text style={[s.tileSub, { color: colors.textMute }]}>Miamala yote ya M-Pesa</Text>
                <ChevronRight size={18} color={colors.textMute} style={s.tileChev} />
              </TouchableOpacity>
            </View>

            {/* Recent activity */}
            <SectionHeader
              title="Shughuli za Hivi Karibuni"
              action="Yote"
              onAction={() => router.push('/wallet-admin/transactions')}
            />
            <GlassCard style={{ paddingVertical: 4 }}>
              {recent.length === 0 ? (
                <Text style={[s.empty, { color: colors.textMute }]}>Hakuna miamala bado.</Text>
              ) : (
                recent.map((t, idx) => {
                  const isOut = t.type === 'payout' || t.type === 'fee';
                  const color = isOut ? '#ef4444' : colors.primary;
                  return (
                    <View
                      key={t.id}
                      style={[
                        s.txnRow,
                        idx < recent.length - 1 && {
                          borderBottomColor: colors.border,
                          borderBottomWidth: StyleSheet.hairlineWidth,
                        },
                      ]}
                    >
                      <View style={[s.txnIcon, { backgroundColor: `${color}22` }]}>
                        {isOut ? (
                          <ArrowUpRight size={16} color={color} />
                        ) : (
                          <ArrowDownRight size={16} color={color} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.txnName, { color: colors.text }]} numberOfLines={1}>
                          {t.memberName}
                        </Text>
                        <Text style={[s.txnSub, { color: colors.textMute }]} numberOfLines={1}>
                          {t.reference} · {t.status}
                        </Text>
                      </View>
                      <Text style={[s.txnAmount, { color }]}>
                        {isOut ? '-' : '+'}
                        {fmt(t.amountTZS)}
                      </Text>
                    </View>
                  );
                })
              )}
            </GlassCard>

            {/* Members summary */}
            <SectionHeader title="Wanachama" />
            {members.length === 0 ? (
              <GlassCard style={{ paddingVertical: 4 }}>
                <EmptyState
                  icon={<Users size={32} color={colors.textMute} />}
                  title="Hakuna Wanachama"
                  body="Bado hujaongeza mwanachama yeyote wa ushirika."
                />
              </GlassCard>
            ) : (
              <GlassCard style={{ paddingVertical: 4 }}>
                {members.map((m, idx) => (
                  <View
                    key={m.id}
                    style={[
                      s.memRow,
                      idx < members.length - 1 && {
                        borderBottomColor: colors.border,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[s.memName, { color: colors.text }]}>{m.name}</Text>
                      <Text style={[s.memSub, { color: colors.textMute }]}>{m.mpesaPhone}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[s.memBalance, { color: colors.text }]}>
                        {fmt(m.balanceTZS)}
                      </Text>
                      <Text
                        style={[
                          s.memStatus,
                          { color: m.status === 'active' ? colors.primary : '#ef4444' },
                        ]}
                      >
                        {m.status === 'active' ? 'Hai' : 'Imesimamishwa'}
                      </Text>
                    </View>
                  </View>
                ))}
              </GlassCard>
            )}
          </ScrollView>
        </PageScaffold>
      </RequireVerification>
    </Gate>
  );
}

const s = StyleSheet.create({
  fallbackTitle: { fontFamily: 'Inter_800ExtraBold', fontSize: 16, marginTop: 12 },
  fallbackBody: { fontFamily: 'Inter_500Medium', fontSize: 12, marginTop: 6, textAlign: 'center' },
  hero: { padding: 18, marginBottom: 16, borderWidth: StyleSheet.hairlineWidth },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroLabel: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1 },
  heroAmount: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 28, marginTop: 8 },
  heroMetaRow: { flexDirection: 'row', gap: 16, marginTop: 12 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroMetaText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  tileRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  tile: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    position: 'relative',
  },
  tileBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginBottom: 10,
  },
  tileBadgeText: { fontFamily: 'Inter_800ExtraBold', fontSize: 12 },
  tileTitle: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  tileSub: { fontFamily: 'Inter_500Medium', fontSize: 11, marginTop: 2 },
  tileChev: { position: 'absolute', top: 14, right: 12 },
  empty: { fontFamily: 'Inter_500Medium', fontSize: 12, padding: 16, textAlign: 'center' },
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  txnIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txnName: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  txnSub: { fontFamily: 'Inter_500Medium', fontSize: 10, marginTop: 2 },
  txnAmount: { fontFamily: 'Inter_800ExtraBold', fontSize: 13 },
  memRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  memName: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  memSub: { fontFamily: 'Inter_500Medium', fontSize: 11, marginTop: 2 },
  memBalance: { fontFamily: 'Inter_800ExtraBold', fontSize: 13 },
  memStatus: { fontFamily: 'Inter_600SemiBold', fontSize: 10, marginTop: 2 },
});
