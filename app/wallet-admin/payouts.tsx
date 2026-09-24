/**
 * Wallet Admin — Payout queue with approve / reject / settle actions.
 *
 * State machine: requested → approved → settled.
 * From requested: admin can approve or reject (with a reason).
 * From approved: admin marks settled once M-Pesa receipt is captured (manual
 * until T205 Daraja STK push wires this end-to-end).
 *
 * Each action mirrors to in-app notifications and the SMS stub so the user
 * can rehearse the channel matrix.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Alert } from 'react-native';
import { Check, X, Send, Clock, ShieldCheck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import PageScaffold, { GlassCard, EmptyState } from '../../components/PageScaffold';
import { useTheme } from '../../constants/Theme';
import { Gate, useHasFullAccess } from '../../lib/access';
import { useWalletAdminStore, PayoutRequest, PayoutStatus } from '../../store/useWalletAdminStore';
import { useKilimoStore } from '../../store/useKilimoStore';

const FILTERS: { key: 'all' | PayoutStatus; label: string }[] = [
  { key: 'all', label: 'Yote' },
  { key: 'requested', label: 'Kusubiri' },
  { key: 'approved', label: 'Imeidhinishwa' },
  { key: 'settled', label: 'Imelipwa' },
  { key: 'rejected', label: 'Imekataliwa' },
];

const fmt = (n: number) => `TSh ${new Intl.NumberFormat('en-US').format(n)}`;

const STATUS_COLOR: Record<PayoutStatus, string> = {
  requested: '#f59e0b',
  approved: '#3b82f6',
  settled: '#3C4A2A',
  rejected: '#ef4444',
};

const STATUS_LABEL: Record<PayoutStatus, string> = {
  requested: 'Kusubiri',
  approved: 'Imeidhinishwa',
  settled: 'Imelipwa',
  rejected: 'Imekataliwa',
};

export default function PayoutsScreen() {
  const { colors } = useTheme();
  const payouts = useWalletAdminStore((s) => s.payouts);
  const approvePayout = useWalletAdminStore((s) => s.approvePayout);
  const rejectPayout = useWalletAdminStore((s) => s.rejectPayout);
  const markSettled = useWalletAdminStore((s) => s.markSettled);
  const adminName = useKilimoStore((s) => s.agroId?.name ?? 'admin');
  // Only `full` wallet_admin access (commercial_admin / coop_leader) may make
  // payout decisions; `basic` roles see read-only queue.
  const canDecide = useHasFullAccess('wallet_admin');
  const [filter, setFilter] = useState<'all' | PayoutStatus>('requested');
  const [rejecting, setRejecting] = useState<{ id: string; reason: string } | null>(null);
  const [settling, setSettling] = useState<{ id: string; receipt: string } | null>(null);

  const filtered = useMemo(
    () => (filter === 'all' ? payouts : payouts.filter((p) => p.status === filter)),
    [payouts, filter]
  );

  function onApprove(p: PayoutRequest) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    approvePayout(p.id, adminName);
  }
  function onConfirmReject() {
    if (!rejecting) return;
    const reason = rejecting.reason.trim();
    if (!reason) {
      Alert.alert('Sababu inahitajika', 'Tafadhali andika sababu fupi ya kukataa malipo.');
      return;
    }
    rejectPayout(rejecting.id, adminName, reason);
    setRejecting(null);
  }
  function onConfirmSettle() {
    if (!settling) return;
    const receipt = settling.receipt.trim();
    if (!receipt) {
      Alert.alert('Risiti inahitajika', 'Tafadhali andika namba ya risiti ya M-Pesa.');
      return;
    }
    markSettled(settling.id, receipt);
    setSettling(null);
  }

  const renderItem = ({ item }: { item: PayoutRequest }) => {
    const color = STATUS_COLOR[item.status];
    return (
      <GlassCard style={s.card}>
        <View style={s.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[s.name, { color: colors.text }]}>{item.memberName}</Text>
            <Text style={[s.sub, { color: colors.textMute }]}>{item.mpesaPhone}</Text>
          </View>
          <View style={[s.statusPill, { backgroundColor: `${color}22` }]}>
            <Text style={[s.statusText, { color }]}>{STATUS_LABEL[item.status]}</Text>
          </View>
        </View>

        <Text style={[s.amount, { color: colors.text }]}>{fmt(item.amountTZS)}</Text>
        <Text style={[s.reason, { color: colors.textMute }]}>{item.reason}</Text>

        <View style={s.metaRow}>
          <Clock size={12} color={colors.textMute} />
          <Text style={[s.metaText, { color: colors.textMute }]}>
            {new Date(item.requestedAt).toLocaleString()}
          </Text>
        </View>

        {item.status === 'rejected' && item.rejectionReason && (
          <View
            style={[
              s.note,
              {
                backgroundColor: `${STATUS_COLOR.rejected}11`,
                borderColor: `${STATUS_COLOR.rejected}55`,
              },
            ]}
          >
            <Text style={[s.noteLabel, { color: STATUS_COLOR.rejected }]}>
              Sababu ya kukataliwa
            </Text>
            <Text style={[s.noteBody, { color: colors.text }]}>{item.rejectionReason}</Text>
          </View>
        )}

        {/* Action row */}
        {canDecide && item.status === 'requested' && (
          <View style={s.actions}>
            <TouchableOpacity
              style={[s.btn, { backgroundColor: STATUS_COLOR.rejected, opacity: 0.9 }]}
              onPress={() => setRejecting({ id: item.id, reason: '' })}
            >
              <X size={16} color="#fff" />
              <Text style={s.btnText}>Kataa</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btn, { backgroundColor: STATUS_COLOR.settled }]}
              onPress={() => onApprove(item)}
            >
              <Check size={16} color="#fff" />
              <Text style={[s.btnText, { color: '#fff' }]}>Idhinisha</Text>
            </TouchableOpacity>
          </View>
        )}
        {canDecide && item.status === 'approved' && (
          <View style={s.actions}>
            <TouchableOpacity
              style={[s.btn, { backgroundColor: STATUS_COLOR.approved }]}
              onPress={() => setSettling({ id: item.id, receipt: '' })}
            >
              <Send size={16} color="#fff" />
              <Text style={s.btnText}>Weka Risiti ya M-Pesa</Text>
            </TouchableOpacity>
          </View>
        )}
      </GlassCard>
    );
  };

  return (
    <Gate
      feature="wallet_admin"
      fallback={
        <PageScaffold title="Foleni ya Malipo" badge="ENTERPRISE">
          <View style={{ padding: 24 }}>
            <GlassCard style={{ padding: 24, alignItems: 'center' }}>
              <ShieldCheck size={32} color={colors.textMute} />
              <Text style={[s.fallbackTitle, { color: colors.text }]}>Hairuhusiwi</Text>
              <Text style={[s.fallbackBody, { color: colors.textMute }]}>
                Foleni ya malipo inapatikana kwa wasimamizi tu.
              </Text>
            </GlassCard>
          </View>
        </PageScaffold>
      }
    >
      <PageScaffold title="Foleni ya Malipo" subtitle="Payout Queue" badge="ENTERPRISE">
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
                    backgroundColor: active ? colors.primary : colors.card,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[s.pillText, { color: active ? '#000' : colors.text }]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {!canDecide && (
          <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
            <Text style={[s.readonly, { color: colors.textMute }]}>
              Mtazamo wa kusoma tu — wewe huwezi kuidhinisha malipo.
            </Text>
          </View>
        )}

        {filtered.length === 0 ? (
          <View style={{ padding: 24 }}>
            <EmptyState
              icon={<Clock size={32} color={colors.textMute} />}
              title="Hakuna maombi"
              body="Hakuna ombi la malipo kwenye hali hii kwa sasa."
            />
          </View>
        ) : (
          <FlatList
            showsVerticalScrollIndicator={false}
            data={filtered}
            keyExtractor={(i) => i.id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 80 }}
          />
        )}

        {/* Reject modal (inline sheet) */}
        {rejecting && (
          <View
            style={[s.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}
          >
            <Text style={[s.sheetTitle, { color: colors.text }]}>Kataa malipo</Text>
            <TextInput
              value={rejecting.reason}
              onChangeText={(t) => setRejecting({ ...rejecting, reason: t })}
              placeholder="Sababu ya kukataa"
              placeholderTextColor={colors.textMute}
              style={[s.input, { color: colors.text, borderColor: colors.border }]}
              multiline
            />
            <View style={s.sheetActions}>
              <TouchableOpacity
                style={[
                  s.btn,
                  { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
                ]}
                onPress={() => setRejecting(null)}
              >
                <Text style={[s.btnText, { color: colors.text }]}>Ghairi</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btn, { backgroundColor: STATUS_COLOR.rejected }]}
                onPress={onConfirmReject}
              >
                <Text style={s.btnText}>Thibitisha</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Settle modal */}
        {settling && (
          <View
            style={[s.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}
          >
            <Text style={[s.sheetTitle, { color: colors.text }]}>Weka risiti ya M-Pesa</Text>
            <TextInput
              value={settling.receipt}
              onChangeText={(t) => setSettling({ ...settling, receipt: t })}
              placeholder="Mfano: NHJ4K9ZQX1"
              placeholderTextColor={colors.textMute}
              autoCapitalize="characters"
              style={[s.input, { color: colors.text, borderColor: colors.border }]}
            />
            <View style={s.sheetActions}>
              <TouchableOpacity
                style={[
                  s.btn,
                  { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 },
                ]}
                onPress={() => setSettling(null)}
              >
                <Text style={[s.btnText, { color: colors.text }]}>Ghairi</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btn, { backgroundColor: STATUS_COLOR.settled }]}
                onPress={onConfirmSettle}
              >
                <Text style={[s.btnText, { color: '#fff' }]}>Thibitisha</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </PageScaffold>
    </Gate>
  );
}

const s = StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pillText: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  readonly: { fontFamily: 'Inter_500Medium', fontSize: 11, fontStyle: 'italic' },
  card: { padding: 14, gap: 6 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  name: { fontFamily: 'Inter_800ExtraBold', fontSize: 14 },
  sub: { fontFamily: 'Inter_500Medium', fontSize: 11, marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  amount: { fontFamily: 'InstrumentSerif_400Regular', fontSize: 22, marginTop: 4 },
  reason: { fontFamily: 'Inter_500Medium', fontSize: 12, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  metaText: { fontFamily: 'Inter_500Medium', fontSize: 10 },
  note: { marginTop: 8, padding: 10, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  noteLabel: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 0.5 },
  noteBody: { fontFamily: 'Inter_500Medium', fontSize: 12, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  btnText: { fontFamily: 'Inter_800ExtraBold', fontSize: 12, color: '#fff' },
  sheet: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  sheetTitle: { fontFamily: 'Inter_800ExtraBold', fontSize: 14 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 10,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    minHeight: 44,
  },
  sheetActions: { flexDirection: 'row', gap: 8 },
  fallbackTitle: { fontFamily: 'Inter_800ExtraBold', fontSize: 16, marginTop: 12 },
  fallbackBody: { fontFamily: 'Inter_500Medium', fontSize: 12, marginTop: 6, textAlign: 'center' },
});
