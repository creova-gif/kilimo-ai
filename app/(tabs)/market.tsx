/**
 * Market & Intel — Price Feed, Price Alerts, Make Offer, Sell Listing,
 * and comprehensive Agricultural Inputs Store (Pembejeo) with categories,
 * comparison overlays, cart drawer, and seller reviews.
 */
import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  SafeAreaView,
  Platform,
  StatusBar,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import RemoteImage from '../../components/RemoteImage';
import Animated, { FadeInDown, FadeInUp, FadeOut } from 'react-native-reanimated';
import {
  Globe,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  ArrowUpRight,
  Sparkles,
  Cpu,
  ShoppingBag,
  Leaf,
  Search,
  ChevronLeft,
  Bell,
  Filter,
  ArrowRight,
  Layers,
  FileSignature,
  Wallet,
  Plus,
  X,
  Check,
  Package,
  Tag,
  MapPin,
  ShoppingCart,
  Star,
  Scale,
  Clock,
  MessageSquare,
  CheckCircle2,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../constants/Theme';
import { useKilimoStore } from '../../store/useKilimoStore';
import { GlassCard } from '../../components/PageScaffold';
import { useMarketIntelligence } from '../../hooks/useMarketIntelligence';
import { getSupabase } from '../../lib/supabase';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Data ─────────────────────────────────────────────────────────────────────
const MARKET_DATA = [
  {
    id: '1',
    nameSw: 'Mahindi (Meupe)',
    nameEn: 'White Maize',
    price: 85_000,
    unitSw: 'Mfuko wa 100kg',
    unitEn: '100kg Bag',
    trend: '+2.4%',
    positive: true,
    market: 'Tandale Market',
    region: 'Dar es Salaam',
    emoji: '🌽',
    category: 'grains',
    volatilitySw: 'Chini',
    volatilityEn: 'Low',
    demandSw: 'Juu',
    demandEn: 'High',
    outlookSw: 'Kupanda',
    outlookEn: 'Bullish',
    priceNum: 85_000,
  },
  {
    id: '2',
    nameSw: 'Mchele (Daraja A)',
    nameEn: 'Rice (Grade A)',
    price: 120_000,
    unitSw: 'Mfuko wa 100kg',
    unitEn: '100kg Bag',
    trend: '-1.2%',
    positive: false,
    market: 'Mbagala Market',
    region: 'Dar es Salaam',
    emoji: '🌾',
    category: 'grains',
    volatilitySw: 'Kati',
    volatilityEn: 'Medium',
    demandSw: 'Imara',
    demandEn: 'Stable',
    outlookSw: 'Kawaida',
    outlookEn: 'Neutral',
    priceNum: 120_000,
  },
  {
    id: '3',
    nameSw: 'Maharage (Soya)',
    nameEn: 'Soya Beans',
    price: 210_000,
    unitSw: 'Mfuko wa 100kg',
    unitEn: '100kg Bag',
    trend: '+0.8%',
    positive: true,
    market: 'Kariakoo Market',
    region: 'Dar es Salaam',
    emoji: '🫘',
    category: 'grains',
    volatilitySw: 'Chini',
    volatilityEn: 'Low',
    demandSw: 'Juu',
    demandEn: 'High',
    outlookSw: 'Kupanda',
    outlookEn: 'Bullish',
    priceNum: 210_000,
  },
  {
    id: '4',
    nameSw: 'Vitunguu (Vyekundu)',
    nameEn: 'Red Onions',
    price: 45_000,
    unitSw: 'Net 20kg',
    unitEn: '20kg Net',
    trend: '+5.1%',
    positive: true,
    market: 'Tandale Market',
    region: 'Dar es Salaam',
    emoji: '🧅',
    category: 'veg',
    volatilitySw: 'Juu',
    volatilityEn: 'High',
    demandSw: 'Kubwa',
    demandEn: 'Surging',
    outlookSw: 'Kuyumba',
    outlookEn: 'Volatile',
    priceNum: 45_000,
  },
  {
    id: '5',
    nameSw: 'Nyanya (Beefsteak)',
    nameEn: 'Tomatoes',
    price: 38_000,
    unitSw: 'Tenga la 15kg',
    unitEn: '15kg Crate',
    trend: '+1.8%',
    positive: true,
    market: 'Kilombero Market',
    region: 'Morogoro',
    emoji: '🍅',
    category: 'veg',
    volatilitySw: 'Juu',
    volatilityEn: 'High',
    demandSw: 'Juu',
    demandEn: 'High',
    outlookSw: 'Kupanda',
    outlookEn: 'Bullish',
    priceNum: 38_000,
  },
  {
    id: '6',
    nameSw: 'Kahawa (AA)',
    nameEn: 'Coffee (AA)',
    price: 680_000,
    unitSw: 'Mfuko wa 100kg',
    unitEn: '100kg Bag',
    trend: '+3.2%',
    positive: true,
    market: 'Moshi Co-op',
    region: 'Kilimanjaro',
    emoji: '☕',
    category: 'trending',
    volatilitySw: 'Chini',
    volatilityEn: 'Low',
    demandSw: 'Juu',
    demandEn: 'High',
    outlookSw: 'Kupanda',
    outlookEn: 'Bullish',
    priceNum: 680_000,
  },
  {
    id: '7',
    nameSw: 'Alizeti (Mbegu)',
    nameEn: 'Sunflower Seeds',
    price: 95_000,
    unitSw: 'Mfuko wa 100kg',
    unitEn: '100kg Bag',
    trend: '-0.5%',
    positive: false,
    market: 'Singida Market',
    region: 'Singida',
    emoji: '🌻',
    category: 'trending',
    volatilitySw: 'Kati',
    volatilityEn: 'Medium',
    demandSw: 'Imara',
    demandEn: 'Stable',
    outlookSw: 'Kawaida',
    outlookEn: 'Neutral',
    priceNum: 95_000,
  },
];

const CROPS_SELL = [
  'Mahindi',
  'Mchele',
  'Maharage',
  'Nyanya',
  'Vitunguu',
  'Kahawa',
  'Alizeti',
  'Soya',
  'Mpunga',
  'Kabichi',
];
// English names for CROPS_SELL, used when creating a real market_listings
// row (cropName) — CROPS_SELL itself only carries the Swahili label shown
// in the picker (cropNameSw).
const CROP_EN: Record<string, string> = {
  Mahindi: 'Maize',
  Mchele: 'Rice',
  Maharage: 'Beans',
  Nyanya: 'Tomatoes',
  Vitunguu: 'Onions',
  Kahawa: 'Coffee',
  Alizeti: 'Sunflower',
  Soya: 'Soybeans',
  Mpunga: 'Paddy Rice',
  Kabichi: 'Cabbage',
};
const fmt = (n: number) => new Intl.NumberFormat('en-US').format(n);
const timeAgo = (iso: string, sw: boolean) => {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return sw ? `${mins}dk` : `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return sw ? `${hrs}saa` : `${hrs}h`;
  return sw ? `${Math.round(hrs / 24)}siku` : `${Math.round(hrs / 24)}d`;
};

// ─── Pembejeo Store Data ──────────────────────────────────────────────────────
interface Product {
  id: string;
  name: string;
  nameSw: string;
  category: 'seeds' | 'fertilizers' | 'tools';
  price: number;
  rating: number;
  reviewsCount: number;
  stock: number;
  seller: string;
  spec: string;
  specSw: string;
  suitability: string;
  suitabilitySw: string;
  image: string;
}

const STORE_PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'PAN 53 Hybrid Maize Seeds',
    nameSw: 'Mbegu za Mahindi Chotara PAN 53',
    category: 'seeds',
    price: 12500,
    rating: 4.8,
    reviewsCount: 24,
    stock: 15,
    seller: 'Pannar Seeds Tanzania',
    spec: '2kg bag · High germination',
    specSw: 'Mfuko wa 2kg · Uotaji wa 98%',
    suitability: 'Low-to-medium altitude fields',
    suitabilitySw: 'Nyanda za chini hadi za kati',
    image:
      'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&q=80&w=300',
  },
  {
    id: 'p2',
    name: 'DK 8031 Highland Maize Seeds',
    nameSw: 'Mbegu za Mahindi DK 8031 (Nyanda za Juu)',
    category: 'seeds',
    price: 14000,
    rating: 4.9,
    reviewsCount: 18,
    stock: 45,
    seller: 'Dekalb Tanzania',
    spec: '2kg bag · Drought-tolerant',
    specSw: 'Mfuko wa 2kg · Inastahimili ukame',
    suitability: 'High-altitude/cold regions',
    suitabilitySw: 'Maeneo ya baridi / nyanda za juu',
    image:
      'https://images.unsplash.com/photo-1530026405186-ed1ea0ac7a63?auto=format&fit=crop&q=80&w=300',
  },
  {
    id: 'p3',
    name: 'YaraMila CEREAL Fertilizer',
    nameSw: 'Mbolea ya YaraMila CEREAL',
    category: 'fertilizers',
    price: 75000,
    rating: 4.7,
    reviewsCount: 35,
    stock: 10,
    seller: 'Yara East Africa',
    spec: '50kg bag · NPK balanced',
    specSw: 'Mfuko wa 50kg · Mchanganyiko wa NPK',
    suitability: 'Maize, wheat, and rice topdressing',
    suitabilitySw: 'Kuzia mahindi, ngano na mpunga',
    image:
      'https://images.unsplash.com/photo-1592982537447-6f2334208f0a?auto=format&fit=crop&q=80&w=300',
  },
  {
    id: 'p4',
    name: 'Minjingu Organic Fertilizer',
    nameSw: 'Mbolea ya Asili ya Minjingu',
    category: 'fertilizers',
    price: 45000,
    rating: 4.2,
    reviewsCount: 12,
    stock: 100,
    seller: 'Minjingu Mines & Fertilizers',
    spec: '50kg bag · High phosphate',
    specSw: 'Mfuko wa 50kg · Phosphate ya kutosha',
    suitability: 'All crops during planting',
    suitabilitySw: 'Mazao yote wakati wa kupanda',
    image:
      'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&q=80&w=300',
  },
  {
    id: 'p5',
    name: 'Solar Drip Irrigation Kit',
    nameSw: 'Mfumo wa Umwagiliaji wa Drip wa Solar',
    category: 'tools',
    price: 380000,
    rating: 4.5,
    reviewsCount: 8,
    stock: 3,
    seller: 'Gadget Farm Tanzania',
    spec: '1/4 Acre capacity · Solar controller',
    specSw: 'Uwezo wa robo ekari · Mdhibiti wa jua',
    suitability: 'Horticulture, tomatoes & onions',
    suitabilitySw: 'Mbogamboga, nyanya na vitunguu',
    image:
      'https://images.unsplash.com/photo-1590682680695-43b964a3ae17?auto=format&fit=crop&q=80&w=300',
  },
  {
    id: 'p6',
    name: 'Knapsack Sprayer 16L',
    nameSw: 'Bomba la Kupuliza Dawa 16L',
    category: 'tools',
    price: 48000,
    rating: 4.6,
    reviewsCount: 14,
    stock: 25,
    seller: 'Pembejeo Hub Tanzania',
    spec: '16 Liter · Ergonomic straps',
    specSw: 'Lita 16 · Mikanda laini ya mgongoni',
    suitability: 'Pesticide & liquid fertilizer spraying',
    suitabilitySw: 'Kupulizia dawa na mbolea ya maji',
    image:
      'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&q=80&w=300',
  },
];

const STORE_REVIEWS = [
  {
    id: '1',
    author: 'Juma S. (Dodoma)',
    rating: 5,
    comment: 'Mbegu hizi ziliota haraka na kuvumilia ukame mkubwa wa Dodoma! Kupata magunia 12.',
    commentEn: 'These seeds germinated fast and survived the dry Dodoma season! Harvested 12 bags.',
  },
  {
    id: '2',
    author: 'Maria K. (Mbeya)',
    rating: 4,
    comment: 'Mbolea nzuri sana. Bei ipo juu kidogo lakini matokeo yanaonekana kwa macho.',
    commentEn: 'Great fertilizer. Price is a bit high but results are visible to the eye.',
  },
];

type PriceAlert = {
  id: string;
  crop: string;
  direction: 'above' | 'below';
  threshold: number;
  active: boolean;
};

// ─── Sparkline ─────────────────────────────────────────────────────────────────
function sparkPath(data: number[], w: number, h: number): { line: string; area: string } {
  if (!data || data.length < 2) return { line: '', area: '' };
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const toY = (v: number) => h * 0.9 - ((v - min) / range) * h * 0.78;
  let d = `M0 ${toY(data[0]).toFixed(1)}`;
  for (let i = 1; i < data.length; i++) {
    const prevX = (i - 1) * step;
    const currX = i * step;
    const cpx = (prevX + currX) / 2;
    d += ` C${cpx.toFixed(1)} ${toY(data[i - 1]).toFixed(1)},${cpx.toFixed(1)} ${toY(data[i]).toFixed(1)},${currX.toFixed(1)} ${toY(data[i]).toFixed(1)}`;
  }
  return { line: d, area: `${d} L${((data.length - 1) * step).toFixed(1)} ${h} L0 ${h} Z` };
}

const NeuralSparkline = ({ data, positive }: { data: number[]; positive: boolean }) => {
  const { colors } = useTheme();
  const color = positive ? colors.primary : '#ef4444';
  const W = 80;
  const H = 28;
  const { line, area } = sparkPath(data, W, H);
  if (!line) return null;
  return (
    <View style={styles.sparklineOuter}>
      <Svg width={W} height={H}>
        <Defs>
          <SvgLinearGradient id={`sg${positive ? 'p' : 'n'}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity="0.45" />
            <Stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </SvgLinearGradient>
        </Defs>
        <Path d={area} fill={`url(#sg${positive ? 'p' : 'n'})`} />
        <Path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
};

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function MarketScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const addNotification = useKilimoStore((s) => s.addNotification);
  const language = useKilimoStore((s) => s.language);
  const agroId = useKilimoStore((s) => s.agroId);
  const {
    listings,
    loading: listingsLoading,
    createListing,
    refresh: refreshListings,
  } = useMarketIntelligence();

  // market_listings.seller_id is the Supabase auth user id, distinct from
  // agroId.id (the app's own Agro-ID string) — resolved separately here so
  // the "your listing" badge compares the right identifier.
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  React.useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    sb.auth.getUser().then(({ data }: any) => setAuthUserId(data?.user?.id ?? null));
  }, []);

  // Tab State
  const [activeTab, setActiveTab] = useState<'prices' | 'store' | 'orders'>('store');
  const [activeStoreCat, setActiveStoreCat] = useState<'all' | 'seeds' | 'fertilizers' | 'tools'>(
    'all'
  );

  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [showSell, setShowSell] = useState(false);
  const [offerItem, setOfferItem] = useState<(typeof MARKET_DATA)[0] | null>(null);
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);

  // Cart State
  const [cart, setCart] = useState<{ product: Product; qty: number }[]>([]);
  const [showCartDrawer, setShowCartDrawer] = useState(false);

  // Comparison State
  const [comparedIds, setComparedIds] = useState<string[]>([]);
  const [showCompModal, setShowCompModal] = useState(false);

  // Reviews Modal State
  const [reviewProduct, setReviewProduct] = useState<Product | null>(null);

  // Mocks Order History
  const [orders, setOrders] = useState([
    {
      id: 'KIL-9901',
      date: '28 Mei 2026',
      total: 89000,
      status: 'On the Way',
      items: 'PAN 53 Seeds x2, Fertilizer x1',
    },
    {
      id: 'KIL-9812',
      date: '10 Apr 2026',
      total: 48000,
      status: 'Delivered',
      items: 'Knapsack Sprayer 16L x1',
    },
  ]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    refreshListings().finally(() => setTimeout(() => setRefreshing(false), 800));
  }, [refreshListings]);

  const filteredPrices = MARKET_DATA.filter((item) => {
    const itemName = language === 'sw' ? item.nameSw : item.nameEn;
    return (
      !searchQuery.trim() ||
      itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.market.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const filteredProducts = STORE_PRODUCTS.filter((item) => {
    const catMatch = activeStoreCat === 'all' || item.category === activeStoreCat;
    const itemName = language === 'sw' ? item.nameSw : item.name;
    const queryMatch =
      !searchQuery.trim() ||
      itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.seller.toLowerCase().includes(searchQuery.toLowerCase());
    return catMatch && queryMatch;
  });

  // Cart operations
  const addToCart = (product: Product) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCart((prev) => {
      const idx = prev.findIndex((x) => x.product.id === product.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx].qty += 1;
        return copy;
      }
      return [...prev, { product, qty: 1 }];
    });
    addNotification({
      title: language === 'sw' ? '🛒 Kikapu Kimeongezwa' : '🛒 Item Added to Cart',
      body:
        language === 'sw'
          ? `${product.nameSw} imeongezwa kwenye kikapu.`
          : `${product.name} added to cart.`,
      type: 'success',
    });
  };

  const updateCartQty = (id: string, next: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCart((prev) => {
      if (next <= 0) return prev.filter((x) => x.product.id !== id);
      return prev.map((x) => (x.product.id === id ? { ...x, qty: next } : x));
    });
  };

  const checkoutTotal = cart.reduce((sum, item) => sum + item.product.price * item.qty, 0);

  const handleCheckout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const newOrder = {
      id: `KIL-${Math.floor(Math.random() * 9000 + 1000)}`,
      date: 'Leo',
      total: checkoutTotal,
      status: 'On the Way',
      items: cart.map((c) => `${c.product.nameSw} x${c.qty}`).join(', '),
    };
    setOrders((prev) => [newOrder, ...prev]);
    setCart([]);
    setShowCartDrawer(false);
    setActiveTab('orders');
    Alert.alert(
      language === 'sw' ? 'Agizo Limetumwa!' : 'Order Placed!',
      language === 'sw'
        ? 'Utapokea ujumbe wa uthibitisho hivi karibuni kwenye simu yako.'
        : 'You will receive a confirmation message shortly.'
    );
  };

  // Comparison operations
  const toggleComparison = (id: string) => {
    Haptics.selectionAsync();
    setComparedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) {
        Alert.alert(
          language === 'sw' ? 'Ukomo wa Kulinganisha' : 'Comparison Limit',
          language === 'sw'
            ? 'Unaweza kulinganisha bidhaa 2 tu kwa wakati mmoja.'
            : 'You can only compare 2 products at once.'
        );
        return prev;
      }
      return [...prev, id];
    });
  };

  const getComparedProducts = useMemo(() => {
    return STORE_PRODUCTS.filter((p) => comparedIds.includes(p.id));
  }, [comparedIds]);

  return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

        <View style={StyleSheet.absoluteFill}>
          <LinearGradient
            colors={[
              isDark ? '#020617' : '#ffffff',
              isDark ? '#020617ee' : '#ffffffee',
              'transparent',
            ]}
            style={styles.bgOverlay}
          />
        </View>

        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={language === 'sw' ? 'Rudi nyuma' : 'Go back'}
            >
              <BlurView
                intensity={isDark ? 30 : 60}
                tint={isDark ? 'dark' : 'light'}
                style={[styles.iconButton, { borderColor: colors.border }]}
              >
                <ChevronLeft size={24} color={colors.text} />
              </BlurView>
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                {language === 'sw' ? 'Soko la Pembejeo' : 'Pembejeo Marketplace'}
              </Text>
              <View style={styles.locationContainer}>
                <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
                <Text style={[styles.locationText, { color: colors.textMute }]}>
                  EAST AFRICA FEED
                </Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                Haptics.selectionAsync();
                setShowAlerts(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={language === 'sw' ? 'Fungua arifa za bei' : 'Open price alerts'}
            >
              <BlurView
                intensity={isDark ? 30 : 60}
                tint={isDark ? 'dark' : 'light'}
                style={[styles.iconButton, { borderColor: colors.border }]}
              >
                <Bell size={20} color={colors.text} />
                {priceAlerts.length > 0 && (
                  <View style={[styles.notifDot, { backgroundColor: colors.error }]} />
                )}
              </BlurView>
            </TouchableOpacity>
          </View>

          {/* Sub Navigation Tabs */}
          <View style={styles.tabBar}>
            {[
              { id: 'store', label: language === 'sw' ? 'Duka la Pembejeo' : 'Store' },
              { id: 'prices', label: language === 'sw' ? 'Bei za Mazao' : 'Crop Prices' },
              { id: 'orders', label: language === 'sw' ? 'Oda Zangu' : 'My Orders' },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setActiveTab(tab.id as any);
                  }}
                  accessibilityRole="tab"
                  accessibilityLabel={tab.label}
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.tabItem,
                    active && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
                  ]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color: active ? colors.text : colors.textMute,
                        fontWeight: active ? '700' : '500',
                      },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
            contentContainerStyle={styles.scrollContent}
          >
            {/* Search container */}
            <View style={[styles.searchContainer, searchFocused && styles.searchContainerFocused]}>
              <View
                style={[
                  styles.searchBar,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.card,
                    borderColor: searchFocused ? colors.primary : colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.searchIconWrap,
                    { backgroundColor: (searchFocused ? colors.primary : colors.textMute) + '18' },
                  ]}
                >
                  <Search size={17} color={searchFocused ? colors.primary : colors.textMute} />
                </View>
                <TextInput
                  placeholder={
                    activeTab === 'store'
                      ? language === 'sw'
                        ? 'Tafuta mbegu, mbolea, vifaa...'
                        : 'Search seeds, fertilizers, tools...'
                      : language === 'sw'
                        ? 'Tafuta bidhaa, masoko, mikoa...'
                        : 'Search crops, markets, regions...'
                  }
                  placeholderTextColor={colors.textMute}
                  style={[styles.searchInput, { color: colors.text }]}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onFocus={() => {
                    setSearchFocused(true);
                    Haptics.selectionAsync();
                  }}
                  onBlur={() => setSearchFocused(false)}
                />
              </View>
            </View>

            {/* Store Tab Content */}
            {activeTab === 'store' && (
              <View style={{ gap: 16 }}>
                {/* Store categories selector */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {[
                    { id: 'all', label: language === 'sw' ? 'Yote' : 'All' },
                    { id: 'seeds', label: language === 'sw' ? 'Mbegu' : 'Seeds' },
                    { id: 'fertilizers', label: language === 'sw' ? 'Mbolea' : 'Fertilizers' },
                    { id: 'tools', label: language === 'sw' ? 'Zana' : 'Tools' },
                  ].map((cat) => {
                    const selected = activeStoreCat === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => {
                          Haptics.selectionAsync();
                          setActiveStoreCat(cat.id as any);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={cat.label}
                        accessibilityState={{ selected: selected }}
                        style={[
                          styles.storeCatPill,
                          {
                            borderColor: selected ? colors.primary : colors.border,
                            backgroundColor: selected ? colors.primary + '15' : 'transparent',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.storeCatTxt,
                            { color: selected ? colors.primary : colors.textMute },
                          ]}
                        >
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Product Catalog Grid */}
                <View style={styles.storeGrid}>
                  {filteredProducts.map((prod) => {
                    const isCompared = comparedIds.includes(prod.id);
                    return (
                      <GlassCard key={prod.id} style={styles.prodCard}>
                        <View style={styles.prodImageContainer}>
                          <RemoteImage
                            uri={prod.image}
                            style={styles.prodImage}
                            resizeMode="cover"
                            accessibilityLabel={prod.name}
                          />
                          <TouchableOpacity
                            onPress={() => toggleComparison(prod.id)}
                            style={[
                              styles.compareIconBtn,
                              { backgroundColor: isCompared ? colors.primary : 'rgba(0,0,0,0.5)' },
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={
                              language === 'sw'
                                ? `Linganisha ${prod.nameSw}`
                                : `Compare ${prod.name}`
                            }
                            accessibilityState={{ selected: isCompared }}
                          >
                            <Scale size={12} color={isCompared ? '#000' : '#fff'} />
                          </TouchableOpacity>
                        </View>
                        <View style={{ padding: 12, gap: 4 }}>
                          <Text style={[styles.prodName, { color: colors.text }]} numberOfLines={1}>
                            {language === 'sw' ? prod.nameSw : prod.name}
                          </Text>
                          <Text style={[styles.prodSeller, { color: colors.textMute }]}>
                            {prod.seller}
                          </Text>
                          <Text style={[styles.prodSpec, { color: colors.textMute }]}>
                            {language === 'sw' ? prod.specSw : prod.spec}
                          </Text>

                          {/* Ratings and reviews click */}
                          <TouchableOpacity
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              setReviewProduct(prod);
                            }}
                            style={styles.ratingRow}
                            accessibilityRole="button"
                            accessibilityLabel={
                              language === 'sw'
                                ? `Soma maoni ya ${prod.nameSw}`
                                : `Read reviews for ${prod.name}`
                            }
                          >
                            <Star size={10} color="#f59e0b" fill="#f59e0b" />
                            <Text style={styles.ratingText}>
                              {prod.rating} ({prod.reviewsCount} reviews)
                            </Text>
                          </TouchableOpacity>

                          <View style={styles.prodCardFooter}>
                            <Text style={[styles.prodPrice, { color: colors.text }]}>
                              TSh {fmt(prod.price)}
                            </Text>
                            <TouchableOpacity
                              onPress={() => addToCart(prod)}
                              style={styles.addToCartBtn}
                              accessibilityRole="button"
                              accessibilityLabel={
                                language === 'sw'
                                  ? `Ongeza ${prod.nameSw} kwenye kikapu`
                                  : `Add ${prod.name} to cart`
                              }
                            >
                              <ShoppingCart size={12} color="#fff" />
                              <Text style={styles.addToCartText}>
                                {language === 'sw' ? 'Ongeza' : 'Add'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </GlassCard>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Crop Prices Tab Content */}
            {activeTab === 'prices' && (
              <View style={{ gap: 20 }}>
                {/* Live Listings — real farmer-posted sell listings, backed by
                    market_listings via useMarketIntelligence. Distinct from
                    the price-benchmark cards below (MARKET_DATA), which are
                    reference market-index content, not individual offers. */}
                <View>
                  <View style={styles.liveListingsHeaderRow}>
                    <Text style={[styles.sectionHeading, { color: colors.text }]}>
                      {language === 'sw' ? 'Wanaouza Sasa' : 'Live Sell Listings'}
                    </Text>
                    {listingsLoading && listings.length > 0 && (
                      <Activity size={14} color={colors.textMute} />
                    )}
                  </View>

                  {listingsLoading && listings.length === 0 ? (
                    <View style={[styles.listingsEmpty, { borderColor: colors.border }]}>
                      <Text style={{ color: colors.textMute, fontFamily: 'Inter_500Medium' }}>
                        {language === 'sw' ? 'Inapakia matangazo...' : 'Loading listings...'}
                      </Text>
                    </View>
                  ) : listings.length === 0 ? (
                    <View style={[styles.listingsEmpty, { borderColor: colors.border }]}>
                      <Package size={22} color={colors.textMute} />
                      <Text
                        style={{
                          color: colors.textMute,
                          fontFamily: 'Inter_600SemiBold',
                          fontSize: 12,
                          textAlign: 'center',
                        }}
                      >
                        {language === 'sw'
                          ? 'Hakuna tangazo bado. Kuwa wa kwanza kuuza!'
                          : 'No listings yet. Be the first to sell!'}
                      </Text>
                    </View>
                  ) : (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 10, paddingVertical: 4 }}
                    >
                      {listings.map((l) => {
                        const isMine = !!authUserId && l.sellerId === authUserId;
                        return (
                          <View
                            key={l.id}
                            style={[
                              styles.listingCard,
                              {
                                borderColor: isMine ? colors.primary : colors.border,
                                backgroundColor: colors.card,
                              },
                            ]}
                          >
                            <View
                              style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                              }}
                            >
                              <Text
                                style={{
                                  fontFamily: 'Inter_800ExtraBold',
                                  fontSize: 13,
                                  color: colors.text,
                                }}
                                numberOfLines={1}
                              >
                                {language === 'sw' ? l.cropNameSw : l.cropName}
                              </Text>
                              <View
                                style={{
                                  paddingHorizontal: 6,
                                  paddingVertical: 2,
                                  borderRadius: 6,
                                  backgroundColor: colors.primary + '15',
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 9,
                                    fontFamily: 'Inter_700Bold',
                                    color: colors.primary,
                                  }}
                                >
                                  {l.qualityGrade}
                                </Text>
                              </View>
                            </View>
                            <Text
                              style={{
                                fontFamily: 'Inter_700Bold',
                                fontSize: 15,
                                color: colors.primary,
                                marginTop: 4,
                              }}
                            >
                              {l.currency} {fmt(l.pricePerKg)}/kg
                            </Text>
                            <Text
                              style={{
                                fontFamily: 'Inter_500Medium',
                                fontSize: 11,
                                color: colors.textMute,
                                marginTop: 2,
                              }}
                            >
                              {fmt(l.quantityKg)}kg
                            </Text>
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 4,
                                marginTop: 8,
                              }}
                            >
                              <MapPin size={11} color={colors.textMute} />
                              <Text
                                style={{
                                  fontSize: 10,
                                  fontFamily: 'Inter_500Medium',
                                  color: colors.textMute,
                                }}
                                numberOfLines={1}
                              >
                                {l.location || (language === 'sw' ? 'Haijulikani' : 'Unknown')}
                              </Text>
                              <Clock size={11} color={colors.textMute} style={{ marginLeft: 4 }} />
                              <Text style={{ fontSize: 10, color: colors.textMute }}>
                                {timeAgo(l.createdAt, language === 'sw')}
                              </Text>
                            </View>
                            {isMine && (
                              <Text
                                style={{
                                  marginTop: 6,
                                  fontSize: 9,
                                  fontFamily: 'Inter_700Bold',
                                  color: colors.primary,
                                }}
                              >
                                {language === 'sw' ? 'TANGAZO LAKO' : 'YOUR LISTING'}
                              </Text>
                            )}
                          </View>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>

                {/* Price-benchmark cards below (MARKET_DATA) are a static
                    reference index, not a live market-price feed — no such
                    backend exists in this app yet. Disclosed honestly rather
                    than presented as current market data, since a farmer
                    could otherwise base a real sell/hold decision on it. */}
                <View style={styles.liveListingsHeaderRow}>
                  <Text style={[styles.sectionHeading, { color: colors.text }]}>
                    {language === 'sw' ? 'Rejea ya Bei · Sampuli' : 'Price Reference · Sample'}
                  </Text>
                </View>
                <Text
                  style={{
                    fontSize: 11,
                    fontFamily: 'Inter_500Medium',
                    color: '#b45309',
                    marginBottom: 10,
                  }}
                >
                  {language === 'sw'
                    ? 'Bei hizi ni mfano wa onyesho — si data ya soko ya moja kwa moja. Angalia "Wanaouza Sasa" hapo juu kwa matangazo halisi.'
                    : 'These prices are illustrative sample data, not a live market feed. See "Live Sell Listings" above for real offers.'}
                </Text>

                <View style={styles.marketGrid}>
                {filteredPrices.map((item) => {
                  const isExpanded = expandedId === item.id;
                  const sparkData = [40, 45, 42, 48, 52, 50, 58, 62, 60, 65].map((v) =>
                    item.positive ? v : 100 - v
                  );
                  const itemName = language === 'sw' ? item.nameSw : item.nameEn;
                  const itemUnit = language === 'sw' ? item.unitSw : item.unitEn;
                  const itemVol = language === 'sw' ? item.volatilitySw : item.volatilityEn;
                  const itemOutlook = language === 'sw' ? item.outlookSw : item.outlookEn;
                  const itemDemand = language === 'sw' ? item.demandSw : item.demandEn;

                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => {
                        setExpandedId(isExpanded ? null : item.id);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      activeOpacity={0.9}
                      accessibilityRole="button"
                      accessibilityLabel={
                        language === 'sw'
                          ? `${itemName}, bonyeza kupanua maelezo ya bei`
                          : `${itemName}, press to expand price details`
                      }
                      accessibilityState={{ expanded: isExpanded }}
                    >
                      <BlurView
                        intensity={isDark ? 20 : 60}
                        tint={isDark ? 'dark' : 'light'}
                        style={[
                          styles.premiumCard,
                          { borderColor: colors.border },
                          isExpanded && { borderColor: colors.primary + '40', borderWidth: 2 },
                        ]}
                      >
                        <View style={styles.cardHeader}>
                          <View
                            style={[
                              styles.emojiContainer,
                              {
                                backgroundColor: isDark
                                  ? 'rgba(255,255,255,0.05)'
                                  : 'rgba(0,0,0,0.05)',
                              },
                            ]}
                          >
                            <Text style={styles.cardEmoji}>{item.emoji}</Text>
                          </View>
                          <View style={styles.cardMeta}>
                            <Text style={[styles.itemName, { color: colors.text }]}>
                              {itemName}
                            </Text>
                            <Text style={[styles.itemMarket, { color: colors.textMute }]}>
                              {item.market} · {item.region}
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.volatilityBadge,
                              {
                                backgroundColor:
                                  item.volatilitySw === 'High' || item.volatilityEn === 'High'
                                    ? colors.error + '15'
                                    : colors.success + '15',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.volatilityText,
                                {
                                  color:
                                    item.volatilitySw === 'High' || item.volatilityEn === 'High'
                                      ? colors.error
                                      : colors.success,
                                },
                              ]}
                            >
                              {itemVol}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.cardBody}>
                          <View style={styles.priceContainer}>
                            <Text style={[styles.priceLabel, { color: colors.textMute }]}>
                              {language === 'sw' ? 'Wastani wa Bei' : 'Average Price'}
                            </Text>
                            <Text style={[styles.priceBig, { color: colors.text }]}>
                              TZS {fmt(item.priceNum)}
                            </Text>
                          </View>
                          <View style={styles.trendArea}>
                            <NeuralSparkline data={sparkData} positive={item.positive} />
                            <View
                              style={[
                                styles.trendPill,
                                {
                                  backgroundColor: item.positive
                                    ? colors.success + '20'
                                    : colors.error + '20',
                                },
                              ]}
                            >
                              {item.positive ? (
                                <TrendingUp size={12} color={colors.success} />
                              ) : (
                                <TrendingDown size={12} color={colors.error} />
                              )}
                              <Text
                                style={[
                                  styles.trendPercent,
                                  { color: item.positive ? colors.success : colors.error },
                                ]}
                              >
                                {item.trend}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {isExpanded && (
                          <Animated.View entering={FadeInDown} style={styles.expandedContent}>
                            <View
                              style={[styles.intelDivider, { backgroundColor: colors.border }]}
                            />
                            <View style={styles.analysisRow}>
                              <View style={styles.analysisItem}>
                                <Text style={[styles.analysisLabel, { color: colors.textMute }]}>
                                  AI Outlook
                                </Text>
                                <View style={styles.outlookBadge}>
                                  <Sparkles size={12} color={colors.primary} />
                                  <Text style={[styles.outlookText, { color: colors.primary }]}>
                                    {itemOutlook}
                                  </Text>
                                </View>
                              </View>
                              <View style={styles.analysisItem}>
                                <Text style={[styles.analysisLabel, { color: colors.textMute }]}>
                                  {language === 'sw' ? 'Mahitaji' : 'Demand'}
                                </Text>
                                <Text style={[styles.analysisValue, { color: colors.text }]}>
                                  {itemDemand}
                                </Text>
                              </View>
                              <View style={styles.analysisItem}>
                                <Text style={[styles.analysisLabel, { color: colors.textMute }]}>
                                  {language === 'sw' ? 'Kipimo' : 'Unit'}
                                </Text>
                                <Text style={[styles.analysisValue, { color: colors.text }]}>
                                  {itemUnit}
                                </Text>
                              </View>
                            </View>
                            <View style={styles.actionGrid}>
                              <TouchableOpacity
                                style={[styles.contractBtn, { backgroundColor: colors.primary }]}
                                onPress={() => {
                                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                  setExpandedId(null);
                                  setOfferItem(item);
                                }}
                                accessibilityRole="button"
                                accessibilityLabel={
                                  language === 'sw'
                                    ? `Toa ofa kwa ajili ya ${itemName}`
                                    : `Make offer for ${itemName}`
                                }
                              >
                                <Wallet size={16} color="#000" />
                                <Text style={[styles.contractBtnText, { color: '#000' }]}>
                                  {language === 'sw' ? 'Toa Ofa' : 'Make Offer'}
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[
                                  styles.contractBtn,
                                  {
                                    backgroundColor: isDark
                                      ? 'rgba(255,255,255,0.1)'
                                      : 'rgba(0,0,0,0.05)',
                                  },
                                ]}
                                onPress={() => {
                                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                  router.push('/contracts');
                                }}
                                accessibilityRole="button"
                                accessibilityLabel={
                                  language === 'sw'
                                    ? 'Fungua mkataba mwerevu'
                                    : 'Open smart contract'
                                }
                              >
                                <FileSignature size={16} color={colors.text} />
                                <Text style={[styles.contractBtnText, { color: colors.text }]}>
                                  Smart Contract
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </Animated.View>
                        )}
                      </BlurView>
                    </TouchableOpacity>
                  );
                })}
                </View>
              </View>
            )}

            {/* My Orders Tab Content */}
            {activeTab === 'orders' && (
              <View style={{ gap: 12 }}>
                {orders.map((ord) => (
                  <GlassCard key={ord.id} style={{ padding: 16 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: 'Inter_800ExtraBold',
                          fontSize: 13,
                          color: colors.text,
                        }}
                      >
                        Order: #{ord.id}
                      </Text>
                      <View
                        style={{
                          backgroundColor: ord.status === 'Delivered' ? '#2E6F4020' : '#f59e0b20',
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontFamily: 'Inter_700Bold',
                            color: ord.status === 'Delivered' ? '#2E6F40' : '#f59e0b',
                          }}
                        >
                          {ord.status}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={{
                        color: colors.textMute,
                        fontSize: 12,
                        fontFamily: 'Inter_600SemiBold',
                        marginTop: 4,
                      }}
                    >
                      Date: {ord.date}
                    </Text>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 12,
                        fontFamily: 'Inter_600SemiBold',
                        marginTop: 8,
                      }}
                      numberOfLines={1}
                    >
                      {ord.items}
                    </Text>
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 13,
                        fontFamily: 'Inter_800ExtraBold',
                        marginTop: 8,
                        textAlign: 'right',
                      }}
                    >
                      Total: TSh {fmt(ord.total)}
                    </Text>
                  </GlassCard>
                ))}
              </View>
            )}

            <View style={{ height: 120 }} />
          </ScrollView>

          {/* Cart Floating Button (Only on Store Tab) */}
          {activeTab === 'store' && cart.length > 0 && (
            <Animated.View entering={FadeInDown} style={styles.cartFab}>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                  setShowCartDrawer(true);
                }}
                style={styles.cartFabBtn}
                accessibilityRole="button"
                accessibilityLabel={
                  language === 'sw' ? 'Fungua kikapu cha ununuzi' : 'Open shopping cart'
                }
              >
                <ShoppingCart size={18} color="#fff" />
                <View style={styles.cartCountBadge}>
                  <Text style={styles.cartCountBadgeTxt}>
                    {cart.reduce((sum, c) => sum + c.qty, 0)}
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Comparison Bar (Only when comparedIds has items) */}
          {comparedIds.length > 0 && (
            <Animated.View entering={FadeInUp} style={styles.compBar}>
              <View style={styles.compBarInner}>
                <Text style={{ color: '#fff', fontSize: 12, fontFamily: 'Inter_700Bold' }}>
                  {comparedIds.length} {language === 'sw' ? 'kulinganisha' : 'to compare'}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => setComparedIds([])}
                    style={{
                      padding: 8,
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      minHeight: 44,
                      justifyContent: 'center',
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={language === 'sw' ? 'Futa ulinganisho' : 'Clear comparison'}
                  >
                    <Text style={{ color: '#fff', fontSize: 12, fontFamily: 'Inter_600SemiBold' }}>
                      Clear
                    </Text>
                  </TouchableOpacity>
                  {comparedIds.length === 2 && (
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        setShowCompModal(true);
                      }}
                      style={{
                        padding: 8,
                        backgroundColor: colors.primary,
                        borderRadius: 8,
                        minHeight: 44,
                        justifyContent: 'center',
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={
                        language === 'sw' ? 'Linganisha bidhaa' : 'Compare products'
                      }
                    >
                      <Text style={{ color: '#000', fontSize: 12, fontFamily: 'Inter_700Bold' }}>
                        {language === 'sw' ? 'Linganisha' : 'Compare'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </Animated.View>
          )}

          {/* Sell FAB (Only on Crop Prices Tab) */}
          {activeTab === 'prices' && (
            <Animated.View entering={FadeInDown} style={styles.fab}>
              <TouchableOpacity
                onPress={() => {
                  setShowSell(true);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                }}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={
                  language === 'sw' ? 'Weka tangazo la kuza mazao' : 'Sell your crops'
                }
              >
                <LinearGradient colors={[colors.success, '#0a3d18']} style={styles.fabGrad}>
                  <Package size={20} color="#fff" />
                  <Text style={styles.fabText}>{language === 'sw' ? 'UZA' : 'SELL'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}
        </SafeAreaView>

        {/* Modals and Sheets */}
        <PriceAlertsModal
          visible={showAlerts}
          onClose={() => setShowAlerts(false)}
          alerts={priceAlerts}
          colors={colors}
          isDark={isDark}
          language={language}
          onAdd={(a: PriceAlert) => {
            setPriceAlerts((p) => [a, ...p]);
            addNotification({
              title: language === 'sw' ? '🔔 Arifa Imewekwa' : '🔔 Alert Set',
              body:
                language === 'sw'
                  ? `${a.crop} — ikifika ${a.direction === 'above' ? 'zaidi ya' : 'chini ya'} TZS ${fmt(a.threshold)}, utaarifiwa.`
                  : `${a.crop} — when price goes ${a.direction === 'above' ? 'above' : 'below'} TZS ${fmt(a.threshold)}, you will be notified.`,
              type: 'info',
            });
          }}
          onDelete={(id: string) => setPriceAlerts((p) => p.filter((a) => a.id !== id))}
        />

        {offerItem && (
          <MakeOfferModal
            item={offerItem}
            onClose={() => setOfferItem(null)}
            colors={colors}
            isDark={isDark}
            addNotification={addNotification}
            language={language}
          />
        )}

        <SellListingModal
          visible={showSell}
          onClose={() => setShowSell(false)}
          colors={colors}
          isDark={isDark}
          addNotification={addNotification}
          language={language}
          createListing={createListing}
          defaultLocation={agroId?.location ?? ''}
        />

        {/* Product Comparison Modal */}
        <Modal
          visible={showCompModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCompModal(false)}
        >
          <View style={styles.modalOverlay}>
            <BlurView
              intensity={isDark ? 40 : 60}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
            <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {language === 'sw' ? 'Ulinganisho wa Bidhaa' : 'Product Comparison'}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowCompModal(false)}
                  style={styles.closeBtn}
                  accessibilityRole="button"
                  accessibilityLabel={language === 'sw' ? 'Funga ulinganisho' : 'Close comparison'}
                >
                  <X size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              {getComparedProducts.length === 2 && (
                <View style={styles.compGrid}>
                  <View style={styles.compCol}>
                    <Text style={[styles.compHead, { color: colors.text }]}>
                      {language === 'sw'
                        ? getComparedProducts[0].nameSw
                        : getComparedProducts[0].name}
                    </Text>
                    <Text style={[styles.compValue, { color: colors.primary }]}>
                      TSh {fmt(getComparedProducts[0].price)}
                    </Text>
                    <Text style={[styles.compLabel, { color: colors.textMute }]}>Rating</Text>
                    <Text style={[styles.compValue, { color: colors.text }]}>
                      {getComparedProducts[0].rating}
                    </Text>
                    <Text style={[styles.compLabel, { color: colors.textMute }]}>
                      Specification
                    </Text>
                    <Text style={[styles.compValue, { color: colors.text }]}>
                      {language === 'sw'
                        ? getComparedProducts[0].specSw
                        : getComparedProducts[0].spec}
                    </Text>
                    <Text style={[styles.compLabel, { color: colors.textMute }]}>Suitability</Text>
                    <Text style={[styles.compValue, { color: colors.text }]}>
                      {language === 'sw'
                        ? getComparedProducts[0].suitabilitySw
                        : getComparedProducts[0].suitability}
                    </Text>
                  </View>

                  <View style={[styles.compDivider, { backgroundColor: colors.border }]} />

                  <View style={styles.compCol}>
                    <Text style={[styles.compHead, { color: colors.text }]}>
                      {language === 'sw'
                        ? getComparedProducts[1].nameSw
                        : getComparedProducts[1].name}
                    </Text>
                    <Text style={[styles.compValue, { color: colors.primary }]}>
                      TSh {fmt(getComparedProducts[1].price)}
                    </Text>
                    <Text style={[styles.compLabel, { color: colors.textMute }]}>Rating</Text>
                    <Text style={[styles.compValue, { color: colors.text }]}>
                      {getComparedProducts[1].rating}
                    </Text>
                    <Text style={[styles.compLabel, { color: colors.textMute }]}>
                      Specification
                    </Text>
                    <Text style={[styles.compValue, { color: colors.text }]}>
                      {language === 'sw'
                        ? getComparedProducts[1].specSw
                        : getComparedProducts[1].spec}
                    </Text>
                    <Text style={[styles.compLabel, { color: colors.textMute }]}>Suitability</Text>
                    <Text style={[styles.compValue, { color: colors.text }]}>
                      {language === 'sw'
                        ? getComparedProducts[1].suitabilitySw
                        : getComparedProducts[1].suitability}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        </Modal>

        {/* Product Reviews Modal */}
        <Modal
          visible={!!reviewProduct}
          transparent
          animationType="slide"
          onRequestClose={() => setReviewProduct(null)}
        >
          <View style={styles.modalOverlay}>
            <BlurView
              intensity={isDark ? 40 : 60}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
            <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {language === 'sw' ? 'Maoni ya Wakulima' : 'Farmer Reviews'}
                </Text>
                <TouchableOpacity
                  onPress={() => setReviewProduct(null)}
                  style={styles.closeBtn}
                  accessibilityRole="button"
                  accessibilityLabel={language === 'sw' ? 'Funga maoni' : 'Close reviews'}
                >
                  <X size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 13, color: colors.text }}>
                {reviewProduct
                  ? language === 'sw'
                    ? reviewProduct.nameSw
                    : reviewProduct.name
                  : ''}
              </Text>

              <ScrollView contentContainerStyle={{ gap: 12 }}>
                {STORE_REVIEWS.map((rev) => (
                  <GlassCard key={rev.id} style={{ padding: 14 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 6,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontFamily: 'Inter_800ExtraBold',
                          color: colors.text,
                        }}
                      >
                        {rev.author}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 2 }}>
                        {Array.from({ length: rev.rating }).map((_, i) => (
                          <Star key={i} size={10} color="#f59e0b" fill="#f59e0b" />
                        ))}
                      </View>
                    </View>
                    <Text
                      style={{
                        fontSize: 12,
                        fontFamily: 'Inter_500Medium',
                        color: colors.textMute,
                        lineHeight: 18,
                      }}
                    >
                      {language === 'sw' ? rev.comment : rev.commentEn}
                    </Text>
                  </GlassCard>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Cart Drawer Checkout Sheet */}
        <Modal
          visible={showCartDrawer}
          transparent
          animationType="slide"
          onRequestClose={() => setShowCartDrawer(false)}
        >
          <View style={styles.modalOverlay}>
            <BlurView
              intensity={isDark ? 40 : 60}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
            <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {language === 'sw' ? 'Kikapu Changu' : 'My Shopping Cart'}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowCartDrawer(false)}
                  style={styles.closeBtn}
                  accessibilityRole="button"
                  accessibilityLabel={language === 'sw' ? 'Funga kikapu' : 'Close cart'}
                >
                  <X size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 240 }} contentContainerStyle={{ gap: 10 }}>
                {cart.map((item) => (
                  <View
                    key={item.product.id}
                    style={[styles.cartRowItem, { borderColor: colors.border }]}
                  >
                    <RemoteImage
                      uri={item.product.image}
                      style={styles.cartRowImg}
                      resizeMode="cover"
                      accessibilityLabel={item.product.name}
                    />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text
                        style={{ fontFamily: 'Inter_700Bold', fontSize: 12, color: colors.text }}
                        numberOfLines={1}
                      >
                        {language === 'sw' ? item.product.nameSw : item.product.name}
                      </Text>
                      <Text
                        style={{
                          fontFamily: 'Inter_800ExtraBold',
                          fontSize: 12,
                          color: colors.primary,
                        }}
                      >
                        TSh {fmt(item.product.price)}
                      </Text>
                    </View>
                    <View style={styles.qtyControlRow}>
                      <TouchableOpacity
                        onPress={() => updateCartQty(item.product.id, item.qty - 1)}
                        style={styles.qtyBtn}
                        accessibilityRole="button"
                        accessibilityLabel={
                          language === 'sw' ? 'Punguza idadi' : 'Decrease quantity'
                        }
                      >
                        <Text style={{ color: colors.text, fontFamily: 'Inter_700Bold' }}>-</Text>
                      </TouchableOpacity>
                      <Text
                        style={{ fontFamily: 'Inter_700Bold', fontSize: 12, color: colors.text }}
                      >
                        {item.qty}
                      </Text>
                      <TouchableOpacity
                        onPress={() => updateCartQty(item.product.id, item.qty + 1)}
                        style={styles.qtyBtn}
                        accessibilityRole="button"
                        accessibilityLabel={
                          language === 'sw' ? 'Ongeza idadi' : 'Increase quantity'
                        }
                      >
                        <Text style={{ color: colors.text, fontFamily: 'Inter_700Bold' }}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>

              <View style={[styles.cartTotalSection, { borderColor: colors.border }]}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Text
                    style={{ color: colors.textMute, fontFamily: 'Inter_700Bold', fontSize: 12 }}
                  >
                    {language === 'sw' ? 'Jumla Kuu' : 'Grand Total'}
                  </Text>
                  <Text
                    style={{ color: colors.text, fontFamily: 'Inter_800ExtraBold', fontSize: 18 }}
                  >
                    TSh {fmt(checkoutTotal)}
                  </Text>
                </View>

                {/* Mobile Money Integration Note */}
                <View style={styles.mobiMoneyNote}>
                  <CheckCircle2 size={12} color="#2E6F40" />
                  <Text style={styles.mobiMoneyText}>
                    {language === 'sw'
                      ? 'Lipa salama kupitia M-Pesa / TigoPesa'
                      : 'Pay securely using M-Pesa or TigoPesa'}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={handleCheckout}
                  style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                  accessibilityRole="button"
                  accessibilityLabel={
                    language === 'sw' ? 'Agiza sasa na ufanye malipo' : 'Place order checkout'
                  }
                >
                  <Text style={styles.saveBtnText}>
                    {language === 'sw' ? 'Agiza Sasa (Checkout)' : 'Place Order (Checkout)'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
  );
}

// ─── Price Alerts Modal ───────────────────────────────────────────────────────
function PriceAlertsModal({
  visible,
  onClose,
  alerts,
  onAdd,
  onDelete,
  colors,
  isDark,
  language,
}: any) {
  const [crop, setCrop] = useState('Mahindi');
  const [direction, setDirection] = useState<'above' | 'below'>('above');
  const [threshold, setThreshold] = useState('');
  const [adding, setAdding] = useState(false);

  function save() {
    if (!threshold || parseFloat(threshold) <= 0) {
      Alert.alert(language === 'sw' ? 'Bei inahitajika' : 'Price required');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onAdd({
      id: Date.now().toString(),
      crop,
      direction,
      threshold: parseFloat(threshold),
      active: true,
    });
    setThreshold('');
    setAdding(false);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" presentationStyle="overFullScreen">
      <BlurView
        intensity={isDark ? 40 : 60}
        tint={isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'flex-end' }}
      >
        <View
          style={[
            pm.sheet,
            { backgroundColor: colors.card, borderTopColor: colors.border, borderTopWidth: 1 },
          ]}
        >
          <View style={[pm.handle, { backgroundColor: colors.border }]} />
          <View style={pm.row}>
            <Text style={[pm.title, { color: colors.text }]}>
              {language === 'sw' ? 'Arifa za Bei' : 'Price Alerts'}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={[pm.closeBtn, { backgroundColor: colors.background }]}
            >
              <X size={16} color={colors.textMute} />
            </TouchableOpacity>
          </View>
          {alerts.length === 0 && !adding ? (
            <View style={{ alignItems: 'center', padding: 32 }}>
              <Bell size={36} color={colors.textMute} />
              <Text style={[pm.empty, { color: colors.textMute }]}>
                {language === 'sw' ? 'Hakuna arifa bado' : 'No alerts set yet'}
              </Text>
            </View>
          ) : (
            <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
              {alerts.map((a: PriceAlert) => (
                <View key={a.id} style={[pm.alertRow, { borderColor: colors.border }]}>
                  <View
                    style={[
                      pm.alertDot,
                      { backgroundColor: a.direction === 'above' ? colors.success : colors.error },
                    ]}
                  />
                  <Text style={[pm.alertText, { color: colors.text }]}>
                    {a.crop} —{' '}
                    {a.direction === 'above'
                      ? language === 'sw'
                        ? 'zaidi ya'
                        : 'above'
                      : language === 'sw'
                        ? 'chini ya'
                        : 'below'}{' '}
                    TZS {fmt(a.threshold)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.selectionAsync();
                      onDelete(a.id);
                    }}
                  >
                    <X size={16} color={colors.textMute} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
          {adding ? (
            <View style={{ gap: 12, marginTop: 8 }}>
              <Text style={[pm.label, { color: colors.textMute }]}>
                {language === 'sw' ? 'ZAO' : 'CROP'}
              </Text>
              <ScrollView
                showsVerticalScrollIndicator={false}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {CROPS_SELL.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => {
                      setCrop(c);
                      Haptics.selectionAsync();
                    }}
                    style={[
                      pm.pill,
                      {
                        borderColor: crop === c ? colors.primary : colors.border,
                        backgroundColor: crop === c ? colors.primary + '18' : 'transparent',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        pm.pillText,
                        { color: crop === c ? colors.primary : colors.textMute },
                      ]}
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={[pm.label, { color: colors.textMute }]}>
                {language === 'sw' ? 'MWELEKEO' : 'DIRECTION'}
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {(['above', 'below'] as const).map((d) => (
                  <TouchableOpacity
                    key={d}
                    onPress={() => {
                      setDirection(d);
                      Haptics.selectionAsync();
                    }}
                    style={{ flex: 1 }}
                  >
                    <View
                      style={[
                        pm.dirBtn,
                        {
                          borderColor:
                            direction === d
                              ? d === 'above'
                                ? colors.success
                                : colors.error
                              : colors.border,
                          backgroundColor:
                            direction === d
                              ? d === 'above'
                                ? colors.success + '18'
                                : colors.error + '18'
                              : 'transparent',
                        },
                      ]}
                    >
                      {d === 'above' ? (
                        <TrendingUp
                          size={14}
                          color={direction === d ? colors.success : colors.textMute}
                        />
                      ) : (
                        <TrendingDown
                          size={14}
                          color={direction === d ? colors.error : colors.textMute}
                        />
                      )}
                      <Text
                        style={{
                          fontFamily: 'Inter_800ExtraBold',
                          fontSize: 12,
                          color:
                            direction === d
                              ? d === 'above'
                                ? colors.success
                                : colors.error
                              : colors.textMute,
                        }}
                      >
                        {d === 'above'
                          ? language === 'sw'
                            ? 'Zaidi ya'
                            : 'Above'
                          : language === 'sw'
                            ? 'Chini ya'
                            : 'Below'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[pm.label, { color: colors.textMute }]}>
                {language === 'sw' ? 'BEI (TZS)' : 'PRICE (TZS)'}
              </Text>
              <View
                style={[
                  pm.inputWrap,
                  { borderColor: colors.border, backgroundColor: colors.background },
                ]}
              >
                <TextInput
                  value={threshold}
                  onChangeText={setThreshold}
                  keyboardType="decimal-pad"
                  style={[pm.input, { color: colors.text }]}
                  placeholderTextColor={colors.textMute}
                  placeholder="e.g. 90000"
                />
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  onPress={() => setAdding(false)}
                  style={[pm.cancelBtn, { borderColor: colors.border }]}
                >
                  <Text style={{ color: colors.textMute, fontFamily: 'Inter_700Bold' }}>
                    {language === 'sw' ? 'Ghairi' : 'Cancel'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={save}
                  style={[pm.saveBtn, { backgroundColor: colors.primary, flex: 1 }]}
                >
                  <Check size={16} color={isDark ? '#000' : '#fff'} />
                  <Text
                    style={{
                      color: isDark ? '#000' : '#fff',
                      fontFamily: 'InstrumentSerif_400Regular',
                    }}
                  >
                    {language === 'sw' ? 'Hifadhi Arifa' : 'Save Alert'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setAdding(true)}
              style={[pm.addBtn, { backgroundColor: colors.primary }]}
            >
              <Plus size={18} color={isDark ? '#000' : '#fff'} />
              <Text
                style={{
                  color: isDark ? '#000' : '#fff',
                  fontFamily: 'InstrumentSerif_400Regular',
                }}
              >
                {language === 'sw' ? 'Ongeza Arifa Mpya' : 'Add New Alert'}
              </Text>
            </TouchableOpacity>
          )}
          <View style={{ height: 16 }} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Make Offer Modal ─────────────────────────────────────────────────────────
function MakeOfferModal({ item, onClose, colors, isDark, addNotification, language }: any) {
  const [qty, setQty] = useState('');
  const [offerPrice, setOfferPrice] = useState(item ? String(item.price) : '');
  const [delivery, setDelivery] = useState('Wiki 1');
  const [message, setMessage] = useState('');

  if (!item) return null;

  function sendOffer() {
    if (!qty || parseFloat(qty) <= 0) {
      Alert.alert(language === 'sw' ? 'Kiasi kinahitajika' : 'Quantity required');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addNotification({
      title: language === 'sw' ? '✅ Ofa Imetumwa' : '✅ Offer Sent',
      body:
        language === 'sw'
          ? `Ofa yako ya ${item.nameSw} (${qty}kg @ TZS ${fmt(parseFloat(offerPrice))} / mfuko) imetumwa kwa muuzaji.`
          : `Your offer for ${item.nameEn} (${qty}kg @ TZS ${fmt(parseFloat(offerPrice))} / bag) was sent to the seller.`,
      type: 'info',
    });
    onClose();
  }

  const total =
    parseFloat(qty) > 0 && parseFloat(offerPrice) > 0
      ? (parseFloat(qty) * parseFloat(offerPrice)) / 100
      : 0;
  const deliveryOptions =
    language === 'sw' ? ['Siku 3', 'Wiki 1', 'Wiki 2'] : ['3 Days', '1 Week', '2 Weeks'];

  return (
    <Modal visible animationType="slide" transparent presentationStyle="overFullScreen">
      <BlurView
        intensity={isDark ? 40 : 60}
        tint={isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'flex-end' }}
      >
        <View
          style={[
            pm.sheet,
            { backgroundColor: colors.card, borderTopColor: colors.border, borderTopWidth: 1 },
          ]}
        >
          <View style={[pm.handle, { backgroundColor: colors.border }]} />
          <View style={pm.row}>
            <View>
              <Text style={[pm.title, { color: colors.text }]}>
                {language === 'sw' ? 'Toa Ofa' : 'Make Offer'}
              </Text>
              <Text style={{ color: colors.textMute, fontFamily: 'Inter_500Medium', fontSize: 12 }}>
                {item.emoji} {language === 'sw' ? item.nameSw : item.nameEn} · {item.market}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[pm.closeBtn, { backgroundColor: colors.background }]}
            >
              <X size={16} color={colors.textMute} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={[pm.label, { color: colors.textMute }]}>
              {language === 'sw' ? 'KIASI UNACHOTAKA (kg)' : 'QUANTITY REQUIRED (kg)'}
            </Text>
            <View
              style={[
                pm.inputWrap,
                { borderColor: colors.border, backgroundColor: colors.background },
              ]}
            >
              <TextInput
                value={qty}
                onChangeText={setQty}
                keyboardType="decimal-pad"
                style={[pm.input, { color: colors.text }]}
                placeholderTextColor={colors.textMute}
                placeholder="e.g. 500"
              />
            </View>
            <Text style={[pm.label, { color: colors.textMute }]}>
              {language === 'sw' ? 'BEI UNAYOTOA (TZS kwa mfuko)' : 'OFFER PRICE (TZS per bag)'}
            </Text>
            <View
              style={[
                pm.inputWrap,
                { borderColor: colors.border, backgroundColor: colors.background },
              ]}
            >
              <TextInput
                value={offerPrice}
                onChangeText={setOfferPrice}
                keyboardType="decimal-pad"
                style={[pm.input, { color: colors.text }]}
                placeholderTextColor={colors.textMute}
                placeholder={String(item.price)}
              />
            </View>
            <Text style={[pm.label, { color: colors.textMute }]}>
              {language === 'sw' ? 'MUDA WA UWASILISHAJI' : 'DELIVERY TIME'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {deliveryOptions.map((d) => (
                <TouchableOpacity
                  key={d}
                  onPress={() => {
                    setDelivery(d);
                    Haptics.selectionAsync();
                  }}
                  style={[
                    pm.pill,
                    {
                      flex: 1,
                      justifyContent: 'center',
                      borderColor: delivery === d ? colors.primary : colors.border,
                      backgroundColor: delivery === d ? colors.primary + '18' : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={[
                      pm.pillText,
                      { color: delivery === d ? colors.primary : colors.textMute },
                    ]}
                  >
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[pm.label, { color: colors.textMute }]}>
              {language === 'sw' ? 'UJUMBE (HIARI)' : 'MESSAGE (OPTIONAL)'}
            </Text>
            <View
              style={[
                pm.inputWrap,
                { borderColor: colors.border, backgroundColor: colors.background, height: 80 },
              ]}
            >
              <TextInput
                value={message}
                onChangeText={setMessage}
                multiline
                style={[pm.input, { color: colors.text }]}
                placeholderTextColor={colors.textMute}
                placeholder={language === 'sw' ? 'Maelezo ya ziada...' : 'Additional details...'}
              />
            </View>
            {total > 0 && (
              <View
                style={[
                  pm.preview,
                  { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' },
                ]}
              >
                <Text
                  style={{ color: colors.textMute, fontFamily: 'Inter_600SemiBold', fontSize: 11 }}
                >
                  {language === 'sw' ? 'Jumla ya ofa' : 'Total offer'}
                </Text>
                <Text
                  style={{
                    color: colors.primary,
                    fontFamily: 'InstrumentSerif_400Regular',
                    fontSize: 18,
                  }}
                >
                  TZS {fmt(Math.round(total))}
                </Text>
              </View>
            )}
            <TouchableOpacity
              onPress={sendOffer}
              style={[pm.saveBtn, { backgroundColor: colors.primary, marginTop: 16 }]}
            >
              <Check size={16} color={isDark ? '#000' : '#fff'} />
              <Text
                style={{
                  color: isDark ? '#000' : '#fff',
                  fontFamily: 'InstrumentSerif_400Regular',
                  fontSize: 15,
                }}
              >
                {language === 'sw' ? 'Tuma Ofa' : 'Send Offer'}
              </Text>
            </TouchableOpacity>
            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Sell Listing Modal ───────────────────────────────────────────────────────
function SellListingModal({
  visible,
  onClose,
  colors,
  isDark,
  addNotification,
  language,
  createListing,
  defaultLocation,
}: any) {
  const [crop, setCrop] = useState('Mahindi');
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function publish() {
    if (!qty || parseFloat(qty) <= 0) {
      Alert.alert(language === 'sw' ? 'Kiasi kinahitajika' : 'Quantity required');
      return;
    }
    if (!price || parseFloat(price) <= 0) {
      Alert.alert(language === 'sw' ? 'Bei inahitajika' : 'Price required');
      return;
    }
    setSubmitting(true);
    try {
      await createListing({
        cropName: CROP_EN[crop] ?? crop,
        cropNameSw: crop,
        quantityKg: parseFloat(qty),
        pricePerKg: parseFloat(price),
        currency: 'TZS',
        location: defaultLocation || '',
        qualityGrade: 'A',
        status: 'active',
        // No real escrow/smart-contract enforcement exists anywhere in the
        // codebase yet (checked app/contracts/*, lib/*) — never let a
        // listing claim protection that isn't actually backed by anything.
        smartContract: false,
        escrowFunded: false,
        notes: notes.trim() || null,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      addNotification({
        title: language === 'sw' ? '📦 Tangazo Limewekwa' : '📦 Listing Posted',
        body:
          language === 'sw'
            ? `${crop} ${qty}kg @ TZS ${fmt(parseFloat(price))}/kg limetangazwa kwenye soko.`
            : `${crop} ${qty}kg @ TZS ${fmt(parseFloat(price))}/kg listed on the marketplace.`,
        type: 'success',
      });
      setQty('');
      setPrice('');
      setNotes('');
      onClose();
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        language === 'sw' ? 'Imeshindikana' : 'Failed',
        language === 'sw'
          ? 'Imeshindwa kuchapisha tangazo. Jaribu tena.'
          : 'Failed to publish listing. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" presentationStyle="overFullScreen">
      <BlurView
        intensity={isDark ? 40 : 60}
        tint={isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'flex-end' }}
      >
        <View
          style={[
            pm.sheet,
            { backgroundColor: colors.card, borderTopColor: colors.border, borderTopWidth: 1 },
          ]}
        >
          <View style={[pm.handle, { backgroundColor: colors.border }]} />
          <View style={pm.row}>
            <View>
              <Text style={[pm.title, { color: colors.text }]}>
                {language === 'sw' ? 'Uza Mazao' : 'Sell Crops'}
              </Text>
              <Text style={{ color: colors.textMute, fontFamily: 'Inter_500Medium', fontSize: 12 }}>
                {language === 'sw'
                  ? 'Weka tangazo kwenye soko'
                  : 'List your crops on the marketplace'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[pm.closeBtn, { backgroundColor: colors.background }]}
            >
              <X size={16} color={colors.textMute} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={[pm.label, { color: colors.textMute }]}>
              {language === 'sw' ? 'ZAO' : 'CROP'}
            </Text>
            <ScrollView
              showsVerticalScrollIndicator={false}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
            >
              {CROPS_SELL.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => {
                    setCrop(c);
                    Haptics.selectionAsync();
                  }}
                  style={[
                    pm.pill,
                    {
                      borderColor: crop === c ? colors.success : colors.border,
                      backgroundColor: crop === c ? colors.success + '18' : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={[pm.pillText, { color: crop === c ? colors.success : colors.textMute }]}
                  >
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={[pm.label, { color: colors.textMute }]}>
                  {language === 'sw' ? 'KIASI (kg) *' : 'QUANTITY (kg) *'}
                </Text>
                <View
                  style={[
                    pm.inputWrap,
                    { borderColor: colors.border, backgroundColor: colors.background },
                  ]}
                >
                  <TextInput
                    value={qty}
                    onChangeText={setQty}
                    keyboardType="decimal-pad"
                    style={[pm.input, { color: colors.text }]}
                    placeholderTextColor={colors.textMute}
                    placeholder="500"
                  />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[pm.label, { color: colors.textMute }]}>
                  {language === 'sw' ? 'BEI/kg (TZS) *' : 'PRICE/kg (TZS) *'}
                </Text>
                <View
                  style={[
                    pm.inputWrap,
                    { borderColor: colors.border, backgroundColor: colors.background },
                  ]}
                >
                  <TextInput
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="decimal-pad"
                    style={[pm.input, { color: colors.text }]}
                    placeholderTextColor={colors.textMute}
                    placeholder="850"
                  />
                </View>
              </View>
            </View>
            <Text style={[pm.label, { color: colors.textMute }]}>
              {language === 'sw' ? 'MAELEZO ZAIDI (HIARI)' : 'MORE DETAILS (OPTIONAL)'}
            </Text>
            <View
              style={[
                pm.inputWrap,
                { borderColor: colors.border, backgroundColor: colors.background, height: 72 },
              ]}
            >
              <TextInput
                value={notes}
                onChangeText={setNotes}
                multiline
                style={[pm.input, { color: colors.text }]}
                placeholderTextColor={colors.textMute}
                placeholder={
                  language === 'sw' ? 'Hali ya mazao, mahali..."' : 'Crop condition, location...'
                }
              />
            </View>
            {qty && price && parseFloat(qty) > 0 && parseFloat(price) > 0 && (
              <View
                style={[
                  pm.preview,
                  { backgroundColor: colors.success + '12', borderColor: colors.success + '30' },
                ]}
              >
                <Text
                  style={{ color: colors.textMute, fontFamily: 'Inter_600SemiBold', fontSize: 11 }}
                >
                  {language === 'sw' ? 'Thamani ya tangazo' : 'Listing value'}
                </Text>
                <Text
                  style={{
                    color: colors.success,
                    fontFamily: 'InstrumentSerif_400Regular',
                    fontSize: 18,
                  }}
                >
                  TZS {fmt(parseFloat(qty) * parseFloat(price))}
                </Text>
              </View>
            )}
            <TouchableOpacity
              onPress={publish}
              disabled={submitting}
              style={[
                pm.saveBtn,
                { backgroundColor: colors.success, marginTop: 16, opacity: submitting ? 0.6 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={language === 'sw' ? 'Chapisha tangazo' : 'Publish listing'}
              accessibilityState={{ disabled: submitting, busy: submitting }}
            >
              <Globe size={16} color={isDark ? '#000' : '#fff'} />
              <Text
                style={{
                  color: isDark ? '#000' : '#fff',
                  fontFamily: 'InstrumentSerif_400Regular',
                  fontSize: 15,
                }}
              >
                {submitting
                  ? language === 'sw'
                    ? 'Inachapisha...'
                    : 'Publishing...'
                  : language === 'sw'
                    ? 'Chapisha Tangazo'
                    : 'Publish Listing'}
              </Text>
            </TouchableOpacity>
            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  bgOverlay: { position: 'absolute', top: 0, left: 0, right: 0, height: SCREEN_HEIGHT },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    zIndex: 100,
  },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 24, fontFamily: 'InstrumentSerif_400Regular', letterSpacing: -1 },
  locationContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  locationText: { fontSize: 12, fontFamily: 'Inter_800ExtraBold', letterSpacing: 1 },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  notifDot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 16 },
  searchContainer: { marginBottom: 16 },
  searchContainerFocused: { zIndex: 50 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 26,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    gap: 10,
  },
  searchIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_500Medium' },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  tabItem: { flex: 1, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  tabText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  storeCatPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    minHeight: 44,
    justifyContent: 'center',
  },
  storeCatTxt: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  storeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingVertical: 10 },
  prodCard: { width: '48%', padding: 0, borderRadius: 20, overflow: 'hidden', borderWidth: 1 },
  prodImageContainer: { position: 'relative' },
  prodImage: { width: '100%', height: 110 },
  compareIconBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prodName: { fontSize: 12.5, fontFamily: 'Inter_700Bold', marginTop: 4 },
  prodSeller: { fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 1 },
  prodSpec: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  ratingText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#f59e0b' },
  prodCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
    paddingTop: 6,
  },
  prodPrice: { fontSize: 12.5, fontFamily: 'Inter_800ExtraBold' },
  addToCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2E6F40',
    paddingHorizontal: 8,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  addToCartText: { fontSize: 12, fontFamily: 'Inter_800ExtraBold', color: '#fff' },
  cartFab: { position: 'absolute', bottom: 32, right: 24, zIndex: 100 },
  cartFabBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2E6F40',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  cartCountBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#000',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartCountBadgeTxt: { color: '#fff', fontSize: 12, fontFamily: 'Inter_800ExtraBold' },
  compBar: { position: 'absolute', bottom: 32, left: 24, right: 24, zIndex: 90 },
  compBarInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#000',
    borderRadius: 16,
    padding: 12,
  },
  compGrid: { flexDirection: 'row', paddingVertical: 14, gap: 10 },
  compCol: { flex: 1, gap: 6 },
  compHead: { fontSize: 12.5, fontFamily: 'Inter_700Bold' },
  compLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold', marginTop: 8 },
  compValue: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  compDivider: { width: 1, backgroundColor: 'rgba(0,0,0,0.08)' },
  cartRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cartRowImg: { width: 44, height: 44, borderRadius: 8 },
  qtyControlRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartTotalSection: { borderTopWidth: 1, paddingTop: 16, marginTop: 10, gap: 10 },
  mobiMoneyNote: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mobiMoneyText: { fontSize: 12, fontFamily: 'Inter_500Medium' },

  // Live Listings (real market_listings data)
  liveListingsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionHeading: { fontSize: 16, fontFamily: 'InstrumentSerif_400Regular' },
  listingsEmpty: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  listingCard: {
    width: 160,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },

  // Original Feed Styling
  marketGrid: { gap: 16 },
  premiumCard: { borderRadius: 28, padding: 20, borderWidth: 1, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  emojiContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardEmoji: { fontSize: 20 },
  cardMeta: { flex: 1, marginLeft: 12 },
  itemName: { fontSize: 16, fontFamily: 'Inter_800ExtraBold', letterSpacing: -0.3 },
  itemMarket: { fontSize: 12, fontFamily: 'Inter_500Medium', opacity: 0.7 },
  volatilityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  volatilityText: { fontSize: 12, fontFamily: 'Inter_800ExtraBold' },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  priceContainer: { flex: 1 },
  priceLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold', marginBottom: 4 },
  priceBig: { fontSize: 24, fontFamily: 'InstrumentSerif_400Regular', letterSpacing: -1 },
  trendArea: { alignItems: 'flex-end', gap: 8 },
  sparklineOuter: { width: 80, height: 28, overflow: 'hidden' },
  trendPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  trendPercent: { fontSize: 12, fontFamily: 'Inter_800ExtraBold' },
  expandedContent: { overflow: 'hidden', marginTop: 8 },
  intelDivider: { height: 1, marginVertical: 16 },
  analysisRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  analysisItem: { flex: 1 },
  analysisLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold', marginBottom: 8 },
  outlookBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(46, 111, 64, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  outlookText: { fontSize: 12, fontFamily: 'InstrumentSerif_400Regular', letterSpacing: 0.5 },
  analysisValue: { fontSize: 14, fontFamily: 'Inter_800ExtraBold' },
  actionGrid: { flexDirection: 'row', gap: 12 },
  contractBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
    minHeight: 44,
  },
  contractBtnText: { fontSize: 13, fontFamily: 'Inter_800ExtraBold' },
  fab: { position: 'absolute', bottom: 32, right: 24 },
  fabGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 28,
    minHeight: 44,
  },
  fabText: {
    color: '#fff',
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 14,
    letterSpacing: 0.5,
  },

  // Modals Overlay and Sheets
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 44 : 24,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: { fontSize: 18, fontFamily: 'InstrumentSerif_400Regular' },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 44,
  },
  saveBtnText: { fontSize: 14, fontFamily: 'Inter_700Bold', color: '#000' },
});

const pm = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 16,
    maxHeight: '88%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  title: { fontSize: 18, fontFamily: 'InstrumentSerif_400Regular' },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  empty: { fontFamily: 'Inter_600SemiBold', fontSize: 13, marginTop: 12 },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  alertDot: { width: 8, height: 8, borderRadius: 4 },
  alertText: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  label: {
    fontSize: 12,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 1.5,
    marginTop: 14,
    marginBottom: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  pillText: { fontFamily: 'Inter_800ExtraBold', fontSize: 12 },
  dirBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    minHeight: 44,
  },
  inputWrap: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 4 },
  input: { fontSize: 15, fontFamily: 'Inter_600SemiBold', paddingVertical: 10 },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    minHeight: 44,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
    minHeight: 44,
  },
  preview: {
    marginTop: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
