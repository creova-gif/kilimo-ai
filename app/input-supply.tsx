/**
 * Input Supply — vetted suppliers + in-app ordering
 * Redesigned: dark glass cards, order tracker, category filters, delivery timeline
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import {
  Store,
  Star,
  ShieldCheck,
  Truck,
  Package,
  MapPin,
  AlertTriangle,
  ChevronLeft,
  Plus,
  Filter,
  Zap,
  CheckCircle2,
  Clock,
  XCircle,
  ShoppingCart,
  Leaf,
  FlaskConical,
  Sprout,
  Wrench,
  Box,
  ArrowRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTheme } from '../constants/Theme';
import { Gate } from '../lib/access';
import { useFarmDataStore, InputOrder, InputSupplier } from '../store/useFarmDataStore';
import { useKilimoStore } from '../store/useKilimoStore';

// No real supplier-ordering backend exists anywhere in this codebase — no
// order-placement edge function, no email/SMS/API call to any supplier.
// Before this fix, tapping "Order Sample" on a real named company (YARA,
// Bayer, Syngenta, etc. — see SEED_SUPPLIERS) silently created a fake
// order with a hardcoded price and immediately showed a "Placed" status,
// implying a real commercial transaction with that real business. Flip
// this to true only once a real supplier-ordering integration exists.
const SUPPLIER_ORDERING_LIVE = false;

const fmt = (n: number) => `TSh ${new Intl.NumberFormat('en-US').format(n)}`;

// ─── Constants ────────────────────────────────────────────────────────────────
const ORDER_STATUS: Record<string, { color: string; label: string; step: number }> = {
  cart: { color: '#94a3b8', label: 'Kikapu', step: 0 },
  placed: { color: '#3b82f6', label: 'Imewekwa', step: 1 },
  dispatched: { color: '#f59e0b', label: 'Inasafirishwa', step: 2 },
  delivered: { color: '#2E6F40', label: 'Imefika', step: 3 },
  cancelled: { color: '#ef4444', label: 'Imefutwa', step: -1 },
};

const CAT_FILTERS = [
  { key: 'all', label: 'Yote', icon: <Box size={13} color="#94a3b8" /> },
  { key: 'Fertilizer', label: 'Mbolea', icon: <Leaf size={13} color="#2E6F40" /> },
  { key: 'Seed', label: 'Mbegu', icon: <Sprout size={13} color="#f59e0b" /> },
  { key: 'Pesticide', label: 'Dawa', icon: <FlaskConical size={13} color="#ef4444" /> },
  { key: 'General', label: 'Jumla', icon: <Wrench size={13} color="#a855f7" /> },
];

const CAT_COLOR: Record<string, string> = {
  Fertilizer: '#2E6F40',
  Seed: '#f59e0b',
  Pesticide: '#ef4444',
  General: '#a855f7',
};

// ─── Delivery timeline strip ──────────────────────────────────────────────────
function DeliveryTimeline({ status }: { status: string }) {
  const steps = ['Imewekwa', 'Inasafirishwa', 'Imefika'];
  const current = ORDER_STATUS[status]?.step ?? 0;
  if (status === 'cancelled') return null;
  return (
    <View style={tl.row}>
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current - 1;
        const color = done || active ? '#2E6F40' : '#334155';
        return (
          <React.Fragment key={i}>
            <View style={tl.step}>
              <View style={[tl.dot, { backgroundColor: color, borderColor: color }]}>
                {done && <CheckCircle2 size={9} color="#000" />}
              </View>
              <Text
                style={[tl.label, { color: done || active ? '#2E6F40' : '#475569' }]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </View>
            {i < 2 && (
              <View
                style={[tl.line, { backgroundColor: i < current - 1 ? '#2E6F40' : '#1e293b' }]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const tl = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  step: { alignItems: 'center', gap: 4 },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  line: { flex: 1, height: 1.5, marginBottom: 14 },
  label: { fontSize: 8, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.3 },
});

// ─── Order card ───────────────────────────────────────────────────────────────
function OrderCard({
  order,
  index,
  onAdvance,
}: {
  order: InputOrder;
  index: number;
  onAdvance: (id: string, status: any) => void;
}) {
  const { colors, isDark } = useTheme();
  const meta = ORDER_STATUS[order.status];
  const isCancelled = order.status === 'cancelled';
  const canConfirm = order.status === 'dispatched';

  const dueStr = order.expectedDelivery
    ? new Date(order.expectedDelivery).toLocaleDateString('sw-TZ', {
        day: 'numeric',
        month: 'short',
      })
    : null;

  return (
    <View>
      <View
        style={[
          oc.wrap,
          {
            backgroundColor: isDark ? 'rgba(9,20,11,0.97)' : colors.card,
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
            borderLeftColor: meta.color,
            opacity: isCancelled ? 0.6 : 1,
          },
        ]}
      >
        <LinearGradient
          colors={[`${meta.color}14`, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* Header row */}
        <View style={oc.header}>
          <View style={[oc.iconBox, { backgroundColor: `${meta.color}18` }]}>
            <Truck size={16} color={meta.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[oc.name, { color: isDark ? '#fff' : colors.text }]} numberOfLines={1}>
              {order.itemName}
            </Text>
            <Text style={[oc.sub, { color: colors.textMute }]}>
              {order.qty} {order.unit} · {fmt(order.totalTZS)}
            </Text>
          </View>
          <View
            style={[
              oc.statusPill,
              { backgroundColor: `${meta.color}18`, borderColor: `${meta.color}40` },
            ]}
          >
            <View style={[oc.statusDot, { backgroundColor: meta.color }]} />
            <Text style={[oc.statusText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>

        {/* Delivery date */}
        {dueStr && !isCancelled && (
          <View style={oc.dateRow}>
            <Clock size={10} color={colors.textMute} />
            <Text style={[oc.dateText, { color: colors.textMute }]}>Inatarajiwa: {dueStr}</Text>
          </View>
        )}

        {/* Timeline */}
        {!isCancelled && <DeliveryTimeline status={order.status} />}

        {/* Confirm button */}
        {canConfirm && (
          <TouchableOpacity
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onAdvance(order.id, 'delivered');
            }}
            style={oc.confirmBtn}
            activeOpacity={0.8}
          >
            <CheckCircle2 size={15} color="#000" />
            <Text style={oc.confirmText}>Thibitisha Uwasilishaji</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const oc = StyleSheet.create({
  wrap: {
    borderRadius: 18,
    borderWidth: 1,
    borderLeftWidth: 3,
    overflow: 'hidden',
    padding: 14,
    gap: 6,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  sub: { fontSize: 11, fontFamily: 'Inter_500Medium', marginTop: 2 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  dateText: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 10,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#2E6F40',
  },
  confirmText: { fontSize: 13, fontFamily: 'Inter_700Bold', color: '#000' },
});

// ─── Supplier card ────────────────────────────────────────────────────────────
function SupplierCard({
  supplier,
  index,
  onOrder,
}: {
  supplier: InputSupplier;
  index: number;
  onOrder: (id: string) => void;
}) {
  const { colors, isDark } = useTheme();
  const accent = CAT_COLOR[supplier.category] ?? '#2E6F40';

  return (
    <View>
      <View
        style={[
          sc.wrap,
          {
            backgroundColor: isDark ? 'rgba(9,20,11,0.97)' : colors.card,
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : colors.border,
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(46, 111, 64,0.06)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <View style={sc.top}>
          {/* Logo box */}
          <View style={[sc.logo, { backgroundColor: `${accent}18` }]}>
            <Store size={20} color={accent} />
          </View>

          <View style={{ flex: 1 }}>
            <View style={sc.nameRow}>
              <Text style={[sc.name, { color: isDark ? '#fff' : colors.text }]} numberOfLines={1}>
                {supplier.name}
              </Text>
              {supplier.vetted && (
                <View style={sc.vetBadge}>
                  <ShieldCheck size={9} color="#2E6F40" />
                  <Text style={sc.vetText}>VERIFIED</Text>
                </View>
              )}
            </View>
            <View style={sc.meta}>
              <MapPin size={9} color={colors.textMute} />
              <Text style={[sc.metaText, { color: colors.textMute }]}>{supplier.region}</Text>
              <View
                style={[sc.catChip, { backgroundColor: `${accent}15`, borderColor: `${accent}35` }]}
              >
                <Text style={[sc.catText, { color: accent }]}>
                  {supplier.category.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          {/* Rating */}
          <View style={sc.ratingBox}>
            <Star size={11} color="#f59e0b" fill="#f59e0b" />
            <Text style={sc.ratingText}>{supplier.rating.toFixed(1)}</Text>
          </View>
        </View>

        {/* Stock indicator bars (decorative) */}
        <View style={sc.stockRow}>
          {[0.85, 0.6, 0.4].map((pct, i) => (
            <View key={i} style={sc.stockTrack}>
              <View
                style={[
                  sc.stockFill,
                  {
                    width: `${pct * 100}%` as any,
                    backgroundColor: accent,
                    opacity: 0.4 + i * 0.15,
                  },
                ]}
              />
            </View>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onOrder(supplier.id);
          }}
          activeOpacity={0.85}
          style={sc.orderBtn}
        >
          <LinearGradient
            colors={['#2E6F40', '#1C4A29']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={sc.orderBtnGrad}
          >
            <ShoppingCart size={14} color="#fff" />
            <Text style={sc.orderBtnText}>Agiza Sampuli</Text>
            <ArrowRight size={13} color="rgba(255,255,255,0.7)" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const sc = StyleSheet.create({
  wrap: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 16,
    gap: 12,
  },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  name: { fontSize: 14, fontFamily: 'Inter_700Bold', flex: 1 },
  vetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(46, 111, 64,0.12)',
  },
  vetText: { fontSize: 7, fontFamily: 'Inter_700Bold', color: '#2E6F40', letterSpacing: 0.5 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaText: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  catChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
    marginLeft: 4,
  },
  catText: { fontSize: 8, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  ratingBox: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 13, fontFamily: 'InstrumentSerif_400Regular', color: '#f59e0b' },
  stockRow: { flexDirection: 'row', gap: 4 },
  stockTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  stockFill: { height: '100%', borderRadius: 2 },
  orderBtn: { borderRadius: 12, overflow: 'hidden' },
  orderBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 12,
  },
  orderBtnText: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
});

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function InputSupplyScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const suppliers = useFarmDataStore((s) => s.suppliers);
  const orders = useFarmDataStore((s) => s.orders);
  const placeOrder = useFarmDataStore((s) => s.placeOrder);
  const advanceOrder = useFarmDataStore((s) => s.advanceOrder);
  const language = useKilimoStore((s) => s.language);
  const addNotification = useKilimoStore((s) => s.addNotification);

  const [catFilter, setCatFilter] = useState('all');

  const filteredSuppliers =
    catFilter === 'all' ? suppliers : suppliers.filter((s) => s.category === catFilter);

  const pendingOrders = orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled');
  const deliveredOrders = orders.filter((o) => o.status === 'delivered');

  function handleOrderSample(supplierId: string) {
    if (!SUPPLIER_ORDERING_LIVE) {
      const supplier = suppliers.find((s) => s.id === supplierId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      addNotification({
        title: language === 'sw' ? 'Bado Haipatikani' : 'Coming Soon',
        body:
          language === 'sw'
            ? `Kuagiza moja kwa moja kutoka ${supplier?.name ?? 'muuzaji'} bado hakujawezeshwa.`
            : `Direct ordering from ${supplier?.name ?? 'this supplier'} isn't live yet.`,
        type: 'warning',
      });
      return;
    }
    const supplier = suppliers.find((s) => s.id === supplierId);
    placeOrder({
      supplierId,
      itemName: `${supplier?.category ?? 'Item'} bundle`,
      qty: 4,
      unit: 'bag',
      totalTZS: 320_000,
      expectedDelivery: new Date(Date.now() + 3 * 86400_000).toISOString(),
    });
  }

  return (
    <Gate
      feature="input_supply"
      fallback={
        <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              padding: 40,
              gap: 12,
            }}
          >
            <AlertTriangle size={36} color="#f59e0b" />
            <Text
              style={{
                fontSize: 16,
                fontFamily: 'Inter_700Bold',
                color: colors.text,
                textAlign: 'center',
              }}
            >
              Haipatikani{'\n'}Input supply haipatikani kwa jukumu lako.
            </Text>
          </View>
        </SafeAreaView>
      }
    >
      <View style={[s.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

        {/* Background glow */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <View style={[s.glowTR, Platform.OS === 'web' && ({ filter: 'blur(90px)' } as any)]} />
        </View>

        <SafeAreaView style={{ flex: 1 }}>
          {/* Header */}
          <View style={s.header}>
            <TouchableOpacity
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              style={s.iconBtn}
            >
              <ChevronLeft size={22} color={isDark ? 'rgba(255,255,255,0.8)' : colors.text} />
            </TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
              <View style={s.commandBadge}>
                <Zap size={10} color="#2E6F40" />
                <Text style={s.commandText}>PEMBEJEO</Text>
              </View>
              <Text style={[s.headerTitle, { color: colors.text }]}>Hifadhi ya Pembejeo</Text>
            </View>
            <View style={{ width: 42 }} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 100 }}
          >
            {/* Summary banner */}
            <View>
              <View
                style={[
                  s.summaryCard,
                  {
                    backgroundColor: isDark ? 'rgba(9,20,11,0.97)' : colors.card,
                    borderColor: 'rgba(46, 111, 64,0.15)',
                  },
                ]}
              >
                <LinearGradient
                  colors={['rgba(46, 111, 64,0.1)', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
                <View style={s.summaryCol}>
                  <Text style={s.summaryVal}>{suppliers.length}</Text>
                  <Text style={[s.summaryLbl, { color: colors.textMute }]}>Wauzaji</Text>
                </View>
                <View style={s.summaryDiv} />
                <View style={s.summaryCol}>
                  <Text style={[s.summaryVal, { color: '#f59e0b' }]}>{pendingOrders.length}</Text>
                  <Text style={[s.summaryLbl, { color: colors.textMute }]}>Maagizo</Text>
                </View>
                <View style={s.summaryDiv} />
                <View style={s.summaryCol}>
                  <Text style={[s.summaryVal, { color: '#2E6F40' }]}>{deliveredOrders.length}</Text>
                  <Text style={[s.summaryLbl, { color: colors.textMute }]}>Zilizofika</Text>
                </View>
              </View>
            </View>

            {/* Active orders */}
            {pendingOrders.length > 0 && (
              <View style={{ gap: 10 }}>
                <Text style={[s.sectionTitle, { color: colors.text }]}>Maagizo Yangu</Text>
                {pendingOrders.map((o, i) => (
                  <OrderCard key={o.id} order={o} index={i} onAdvance={advanceOrder} />
                ))}
              </View>
            )}

            {/* Category filter */}
            <View style={{ gap: 10 }}>
              <Text style={[s.sectionTitle, { color: colors.text }]}>Wauzaji Waliothibitishwa</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8, paddingBottom: 2 }}>
                  {CAT_FILTERS.map((f) => {
                    const active = catFilter === f.key;
                    return (
                      <TouchableOpacity
                        key={f.key}
                        onPress={() => {
                          setCatFilter(f.key);
                          Haptics.selectionAsync();
                        }}
                        style={[
                          s.filterPill,
                          {
                            backgroundColor: active
                              ? 'rgba(46, 111, 64,0.12)'
                              : isDark
                                ? 'rgba(255,255,255,0.04)'
                                : colors.card,
                            borderColor: active
                              ? '#2E6F40'
                              : isDark
                                ? 'rgba(255,255,255,0.08)'
                                : colors.border,
                          },
                        ]}
                      >
                        {f.icon}
                        <Text
                          style={[s.filterText, { color: active ? '#2E6F40' : colors.textMute }]}
                        >
                          {f.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Supplier cards */}
              <View style={{ gap: 12 }}>
                {filteredSuppliers.map((sup, i) => (
                  <SupplierCard key={sup.id} supplier={sup} index={i} onOrder={handleOrderSample} />
                ))}
              </View>
            </View>

            {/* Delivered history */}
            {deliveredOrders.length > 0 && (
              <View style={{ gap: 10 }}>
                <Text style={[s.sectionTitle, { color: colors.text }]}>
                  Historia ya Uwasilishaji
                </Text>
                {deliveredOrders.map((o, i) => (
                  <OrderCard key={o.id} order={o} index={i} onAdvance={advanceOrder} />
                ))}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Gate>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  glowTR: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(46, 111, 64,0.07)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  commandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(46, 111, 64,0.1)',
    marginBottom: 4,
  },
  commandText: { fontSize: 9, fontFamily: 'Inter_700Bold', color: '#2E6F40', letterSpacing: 1 },
  headerTitle: { fontSize: 20, fontFamily: 'InstrumentSerif_400Regular', letterSpacing: -0.4 },
  sectionTitle: { fontSize: 18, fontFamily: 'InstrumentSerif_400Regular', letterSpacing: -0.3 },
  summaryCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  summaryCol: { flex: 1, alignItems: 'center' },
  summaryVal: {
    fontSize: 24,
    fontFamily: 'InstrumentSerif_400Regular',
    color: '#fff',
    letterSpacing: -0.5,
  },
  summaryLbl: { fontSize: 9, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5, marginTop: 2 },
  summaryDiv: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.08)' },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  filterText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
});
