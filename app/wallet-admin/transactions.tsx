/**
 * Wallet Admin — Transactions ledger with filters
 */
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Platform } from 'react-native';
import {
  ArrowDownRight,
  ArrowUpRight,
  Receipt,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import PageScaffold, { GlassCard, EmptyState } from '../../components/PageScaffold';
import { useTheme } from '../../constants/Theme';
import { Gate } from '../../lib/access';
import { useWalletAdminStore, Transaction, TxnType } from '../../store/useWalletAdminStore';

const FILTERS: { key: 'all' | TxnType; label: string; symbol: string }[] = [
  { key: 'all', label: 'Yote', symbol: '●' },
  { key: 'deposit', label: 'Mapokezi', symbol: '↓' },
  { key: 'payout', label: 'Malipo', symbol: '↑' },
  { key: 'fee', label: 'Ada', symbol: '%' },
  { key: 'transfer', label: 'Uhamishaji', symbol: '⇄' },
];

const TYPE_LABELS: Record<TxnType, string> = {
  deposit: 'MAPOKEZI',
  payout: 'MALIPO',
  fee: 'ADA',
  transfer: 'HAMISHA',
};

const STATUS_COLORS: Record<string, string> = {
  completed: '#2E6F40',
  pending: '#f59e0b',
  failed: '#ef4444',
  reversed: '#94a3b8',
};

const fmt = (n: number) => `TSh ${new Intl.NumberFormat('en-US').format(n)}`;

// ─────────────────────────────────────────
//  Summary Banner
// ─────────────────────────────────────────
function SummaryBanner({ items }: { items: Transaction[] }) {
  const { colors, isDark } = useTheme();

  const totalIn = items
    .filter((t) => t.type === 'deposit' || t.type === 'transfer')
    .reduce((sum, t) => sum + t.amountTZS, 0);
  const totalOut = items
    .filter((t) => t.type === 'payout' || t.type === 'fee')
    .reduce((sum, t) => sum + t.amountTZS, 0);

  return (
    <View
      style={[
        bn.wrap,
        {
          backgroundColor: isDark ? 'rgba(9,20,11,0.97)' : colors.card,
          borderColor: colors.primary + '26',
        },
      ]}
    >
      <LinearGradient
        colors={[colors.primary + '17', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={bn.shimmer}
      />

      {/* Total in */}
      <View style={bn.col}>
        <View style={bn.iconBox}>
          <TrendingDown size={13} color={colors.primary} />
        </View>
        <View>
          <Text style={bn.label}>MAPOKEZI</Text>
          <Text style={[bn.val, { color: colors.primary }]}>+{fmt(totalIn)}</Text>
        </View>
      </View>

      <View style={bn.divider} />

      {/* Total out */}
      <View style={bn.col}>
        <View style={[bn.iconBox, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
          <TrendingUp size={13} color="#ef4444" />
        </View>
        <View>
          <Text style={bn.label}>MATUMIZI</Text>
          <Text style={[bn.val, { color: '#ef4444' }]}>−{fmt(totalOut)}</Text>
        </View>
      </View>

      <View style={bn.divider} />

      {/* Count */}
      <View style={bn.col}>
        <View style={[bn.iconBox, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
          <Receipt size={13} color="#f59e0b" />
        </View>
        <View>
          <Text style={bn.label}>MIAMALA</Text>
          <Text style={[bn.val, { color: isDark ? 'rgba(255,255,255,0.8)' : colors.text }]}>
            {items.length}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────
//  Transaction Card
// ─────────────────────────────────────────
function TxnCard({ item, index }: { item: Transaction; index: number }) {
  const { colors, isDark } = useTheme();

  const isOut = item.type === 'payout' || item.type === 'fee';
  const isFailed = item.status === 'failed' || item.status === 'reversed';
  const accent = isFailed ? '#94a3b8' : isOut ? '#ef4444' : colors.primary;
  const statusClr = STATUS_COLORS[item.status] ?? '#94a3b8';

  const dateStr = new Date(item.createdAt).toLocaleDateString('sw-TZ', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <Animated.View entering={FadeInDown.delay(index * 45).springify()}>
      <View
        style={[
          cd.wrap,
          {
            backgroundColor: isDark ? 'rgba(9,20,11,0.97)' : colors.card,
            borderColor: isDark ? 'rgba(255,255,255,0.05)' : colors.border,
            borderLeftColor: accent,
          },
        ]}
      >
        {/* Shimmer strip */}
        <LinearGradient
          colors={[`${accent}20`, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={cd.shimmer}
        />

        {/* Icon */}
        <View style={[cd.iconBox, { backgroundColor: `${accent}18` }]}>
          {isOut ? (
            <ArrowUpRight size={17} color={accent} />
          ) : (
            <ArrowDownRight size={17} color={accent} />
          )}
        </View>

        {/* Details */}
        <View style={cd.body}>
          <View style={cd.nameRow}>
            <Text style={[cd.name, { color: isDark ? '#fff' : colors.text }]} numberOfLines={1}>
              {item.memberName}
            </Text>
            <View
              style={[
                cd.badge,
                {
                  backgroundColor: `${accent}15`,
                  borderColor: `${accent}35`,
                },
              ]}
            >
              <Text style={[cd.badgeText, { color: accent }]}>{TYPE_LABELS[item.type]}</Text>
            </View>
          </View>

          <Text style={[cd.ref, { color: colors.textMute }]} numberOfLines={1}>
            {item.reference}
            {item.note ? ` · ${item.note}` : ''}
          </Text>

          <View style={cd.metaRow}>
            <View style={[cd.statusDot, { backgroundColor: statusClr }]} />
            <Text style={[cd.meta, { color: colors.textMute }]}>{item.status}</Text>
            <Text style={[cd.metaSep, { color: colors.textMute }]}>·</Text>
            <Text style={[cd.meta, { color: colors.textMute }]}>{dateStr}</Text>
          </View>
        </View>

        {/* Amount */}
        <Text style={[cd.amount, { color: accent }]}>
          {isOut ? '−' : '+'}
          {fmt(item.amountTZS)}
        </Text>
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────
//  Screen
// ─────────────────────────────────────────
export default function TransactionsScreen() {
  const { colors, isDark } = useTheme();
  const transactions = useWalletAdminStore((s) => s.transactions);
  const [filter, setFilter] = useState<'all' | TxnType>('all');

  const filtered = useMemo(
    () => (filter === 'all' ? transactions : transactions.filter((t) => t.type === filter)),
    [transactions, filter]
  );

  return (
    <Gate
      feature="wallet_admin"
      fallback={
        <PageScaffold title="Daftari la Miamala" badge="ENTERPRISE">
          <GlassCard style={{ margin: 24, padding: 24, alignItems: 'center' as const, gap: 12 }}>
            <ShieldCheck size={32} color="#64748b" />
            <Text
              style={{
                fontFamily: 'Inter_700Bold',
                fontSize: 16,
                color: '#64748b',
                textAlign: 'center',
              }}
            >
              Hairuhusiwi{'\n'}Daftari hili ni kwa Viongozi wa Ushirika na Wasimamizi pekee.
            </Text>
          </GlassCard>
        </PageScaffold>
      }
    >
      <PageScaffold
        title="Daftari la Miamala"
        // useWalletAdminStore no longer seeds fake members/transactions
        // (see the store's own header comment) — this now genuinely starts
        // empty and only shows real entries an admin has recorded.
        subtitle="Ledger"
        badge="ENTERPRISE"
      >
        {/* ── Filter pills ── */}
        <View style={s.filterRow}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[
                  s.pill,
                  {
                    backgroundColor: active
                      ? colors.primary
                      : isDark
                        ? 'rgba(255,255,255,0.04)'
                        : colors.card,
                    borderColor: active
                      ? colors.primary
                      : isDark
                        ? 'rgba(255,255,255,0.1)'
                        : colors.border,
                  },
                ]}
              >
                <Text style={[s.pillSymbol, { color: active ? '#fff' : colors.primary }]}>
                  {f.symbol}
                </Text>
                <Text style={[s.pillText, { color: active ? '#fff' : colors.text }]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Summary banner ── */}
        {filtered.length > 0 && <SummaryBanner items={filtered} />}

        {/* ── List ── */}
        {filtered.length === 0 ? (
          <View style={{ padding: 24 }}>
            <EmptyState
              icon={<Receipt size={32} color={colors.textMute} />}
              title="Hakuna miamala"
              body="Hakuna miamala kwa kichujio ulichochagua."
            />
          </View>
        ) : (
          <FlatList
            showsVerticalScrollIndicator={false}
            data={filtered}
            keyExtractor={(i) => i.id}
            renderItem={({ item, index }) => <TxnCard item={item} index={index} />}
            contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
          />
        )}
      </PageScaffold>
    </Gate>
  );
}

// ─────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────
const s = StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  pillSymbol: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
  },
  pillText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
  },
});

const bn = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 16,
    alignItems: 'center',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 44,
  },
  col: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(46, 111, 64,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 8,
    fontFamily: 'Inter_700Bold',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 0.8,
  },
  val: {
    fontSize: 13,
    fontFamily: 'InstrumentSerif_400Regular',
    letterSpacing: -0.2,
    marginTop: 1,
  },
  divider: {
    width: 1,
    height: 34,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginHorizontal: 8,
  },
});

const cd = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 3,
    overflow: 'hidden',
    paddingVertical: 13,
    paddingRight: 14,
    paddingLeft: 12,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 32,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  name: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    flex: 1,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 7,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.7,
  },
  ref: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    marginTop: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  meta: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
  },
  metaSep: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    opacity: 0.4,
  },
  amount: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 19,
    letterSpacing: -0.5,
  },
});
