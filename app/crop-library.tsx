/**
 * Crop Library — expanded crop catalog with botanical names, soil conditions (pH),
 * pests, price trends, category filters, and Gemini-based crop guides.
 */
import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import RemoteImage from '../components/RemoteImage';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  ChevronLeft,
  Leaf,
  Droplets,
  Sun,
  TrendingUp,
  Clock,
  Sparkles,
  X,
  BookOpen,
  Award,
  Zap,
  BarChart3,
  ShieldAlert,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTheme } from '../constants/Theme';
import { chat, aiConfigured } from '../lib/ai';
import { useKilimoStore } from '../store/useKilimoStore';

const { width: SW } = Dimensions.get('window');

// ─── Categories ──────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'all', title: 'Yote', color: '#3C4A2A' },
  { id: 'staple', title: 'Nafaka & Mizizi', color: '#f59e0b' },
  { id: 'cash', title: 'Biashara', color: '#3b82f6' },
  { id: 'horticulture', title: 'Matunda & Mboga', color: '#a855f7' },
];

// 21 Tanzanian Crops Database
const CROPS = [
  {
    id: 'maize',
    nameEn: 'Maize',
    nameSw: 'Mahindi',
    botanical: 'Zea mays',
    category: 'staple',
    img: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&q=80&w=400',
    duration: 'Miezi 3–4',
    difficulty: 'Kati',
    profit: 'Kati',
    profitScore: 2,
    water: 'Wastani',
    sun: 'Jua Kamili',
    phOptimal: '5.8 - 7.0',
    pests: 'Funza wa Kijeshi (Fall Armyworm), Dumuzi',
    priceTrend: 'Bei Inaongezeka (+12% msimu huu)',
    desc: 'Zao kuu la chakula Tanzania. Hustawi maeneo mengi yenye mvua za kutosha, hasa nyanda za juu kusini.',
  },
  {
    id: 'rice',
    nameEn: 'Rice',
    nameSw: 'Mpunga',
    botanical: 'Oryza sativa',
    category: 'staple',
    img: 'https://images.unsplash.com/photo-1530335032608-f40445a6c1e9?auto=format&fit=crop&q=80&w=400',
    duration: 'Miezi 4–5',
    difficulty: 'Nguvu',
    profit: 'Juu',
    profitScore: 3,
    water: 'Mingi Sana',
    sun: 'Jua Kamili',
    phOptimal: '5.5 - 6.5',
    pests: 'Funza wa shina, Ndege wekundu',
    priceTrend: 'Mahitaji Makubwa (Bei ipo Imara)',
    desc: 'Hulimwa sana mabondeni Mbeya (Kyela), Morogoro (Kilombero), na Shinyanga. Hulipa sana kibiashara.',
  },
  {
    id: 'beans',
    nameEn: 'Beans',
    nameSw: 'Maharage',
    botanical: 'Phaseolus vulgaris',
    category: 'staple',
    img: 'https://images.unsplash.com/photo-1551608674-d4b3ff2efbb7?auto=format&fit=crop&q=80&w=400',
    duration: 'Siku 60–90',
    difficulty: 'Rahisi',
    profit: 'Kati',
    profitScore: 2,
    water: 'Wastani',
    sun: 'Jua Kamili',
    phOptimal: '6.0 - 7.0',
    pests: 'Inzi wa Maharage, Vidukari (Aphids)',
    priceTrend: 'Kubadilika (Msimu kulingana na mvua)',
    desc: 'Hulimwa sana nyanda za juu. Husaidia kurudisha nitrojeni kwenye udongo, zao zuri la mzunguko.',
  },
  {
    id: 'cassava',
    nameEn: 'Cassava',
    nameSw: 'Muhogo',
    botanical: 'Manihot esculenta',
    category: 'staple',
    img: 'https://images.unsplash.com/photo-1599839619722-39751411ea63?auto=format&fit=crop&q=80&w=400',
    duration: 'Miezi 9–12',
    difficulty: 'Rahisi',
    profit: 'Kati',
    profitScore: 2,
    water: 'Kidogo',
    sun: 'Jua Kamili',
    phOptimal: '5.5 - 6.5',
    pests: 'Ugonjwa wa Batobato (CMD), Inzi weupe',
    priceTrend: 'Imara (Inatumika sana kwa unga na viwanda)',
    desc: 'Zao linalostahimili ukame. Hulimwa sana Kanda ya Ziwa, mikoa ya Pwani na Kusini.',
  },
  {
    id: 'sorghum',
    nameEn: 'Sorghum',
    nameSw: 'Mtama',
    botanical: 'Sorghum bicolor',
    category: 'staple',
    img: 'https://images.unsplash.com/photo-1597816001099-0158bc56184a?auto=format&fit=crop&q=80&w=400',
    duration: 'Miezi 3–4',
    difficulty: 'Rahisi',
    profit: 'Chini',
    profitScore: 1,
    water: 'Kidogo Sana',
    sun: 'Jua Kali',
    phOptimal: '6.0 - 7.5',
    pests: 'Ndege (Kwelea kwelea), Kinyausi',
    priceTrend: 'Wastani (Soko kubwa la viwanda vya vinywaji)',
    desc: 'Ustahimili ukame wa hali ya juu sana. Zao zuri kwa kanda kame kama Dodoma na Singida.',
  },
  {
    id: 'potato',
    nameEn: 'Irish Potato',
    nameSw: 'Viazi Mviringo',
    botanical: 'Solanum tuberosum',
    category: 'staple',
    img: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&q=80&w=400',
    duration: 'Miezi 3',
    difficulty: 'Kati',
    profit: 'Juu',
    profitScore: 3,
    water: 'Wastani',
    sun: 'Jua Kiasi',
    phOptimal: '5.2 - 6.0',
    pests: 'Bakata (Late Blight), Minyoo ya kinyundo',
    priceTrend: 'Imara sana kwenye miji mikubwa',
    desc: 'Hustawi vizuri nyanda za juu baridi kama Mbeya, Njombe, na Iringa. Huhitaji udongo tifutifu na usiotuwesha maji.',
  },
  {
    id: 'wheat',
    nameEn: 'Wheat',
    nameSw: 'Ngano',
    botanical: 'Triticum aestivum',
    category: 'staple',
    img: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=400',
    duration: 'Miezi 4',
    difficulty: 'Kati',
    profit: 'Kati',
    profitScore: 2,
    water: 'Wastani',
    sun: 'Jua Kamili',
    phOptimal: '6.0 - 7.0',
    pests: 'Kutu ya ngano (Stem Rust), Vidukari',
    priceTrend: 'Inapanda (Nchi inatafuta rasilimali ya ndani)',
    desc: 'Hulimwa katika maeneo ya Hanang, Mbeya, na baadhi ya sehemu za kaskazini baridi kama Kilimanjaro.',
  },
  {
    id: 'cashew',
    nameEn: 'Cashew Nuts',
    nameSw: 'Korosho',
    botanical: 'Anacardium occidentale',
    category: 'cash',
    img: 'https://images.unsplash.com/photo-1533742468351-4d40abcb6478?auto=format&fit=crop&q=80&w=400',
    duration: 'Miaka 3+',
    difficulty: 'Kati',
    profit: 'Juu Sana',
    profitScore: 4,
    water: 'Kidogo',
    sun: 'Jua Kamili',
    phOptimal: '5.0 - 6.5',
    pests: 'Magonjwa ya fungus (Anthracnose), Kunguni wa korosho',
    priceTrend: 'Juu (Soko la kimataifa, mnada wa ushirika)',
    desc: 'Zao la kimkakati linaloingiza fedha za kigeni kwa wingi Kusini mwa Tanzania (Mtwara, Lindi, Ruvuma).',
  },
  {
    id: 'coffee',
    nameEn: 'Coffee',
    nameSw: 'Kahawa',
    botanical: 'Coffea arabica / robusta',
    category: 'cash',
    img: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=400',
    duration: 'Miaka 3–5',
    difficulty: 'Nguvu',
    profit: 'Juu',
    profitScore: 3,
    water: 'Mingi',
    sun: 'Kivuli',
    phOptimal: '5.3 - 6.0',
    pests: 'Kiwavi wa kahawa (Berry Borer), Kutu ya majani',
    priceTrend: 'Imara (Inategemea soko la hisa la New York/London)',
    desc: 'Kahawa ya Arabica hustawi kaskazini (Kilimanjaro/Arusha) na kusini (Mbeya/Songwe). Robusta hustawi Kagera.',
  },
  {
    id: 'cotton',
    nameEn: 'Cotton',
    nameSw: 'Pamba',
    botanical: 'Gossypium hirsutum',
    category: 'cash',
    img: 'https://images.unsplash.com/photo-1502472458406-8d62dcce474f?auto=format&fit=crop&q=80&w=400',
    duration: 'Miezi 5–6',
    difficulty: 'Nguvu',
    profit: 'Kati',
    profitScore: 2,
    water: 'Wastani',
    sun: 'Jua Kamili',
    phOptimal: '5.8 - 8.0',
    pests: 'Funza mwekundu wa pamba, Vidukari',
    priceTrend: 'Imedhibitiwa na bodi ya pamba ya serikali',
    desc: 'Inajulikana kama "Dhahabu Nyeupe". Hulimwa sana Kanda ya Ziwa (Mwanza, Shinyanga, Simiyu, Geita).',
  },
  {
    id: 'sunflower',
    nameEn: 'Sunflower',
    nameSw: 'Alizeti',
    botanical: 'Helianthus annuus',
    category: 'cash',
    img: 'https://images.unsplash.com/photo-1558500259-22a868427ce2?auto=format&fit=crop&q=80&w=400',
    duration: 'Siku 90–120',
    difficulty: 'Rahisi',
    profit: 'Kati',
    profitScore: 2,
    water: 'Kidogo',
    sun: 'Jua Kamili',
    phOptimal: '6.0 - 7.5',
    pests: 'Ndege waharibifu, Dumuzi wa mbegu',
    priceTrend: 'Inapanda (Kutokana na upungufu wa mafuta ya kula)',
    desc: 'Zao rahisi kulima na linalostahimili ukame. Mikoa mikuu ni Singida, Dodoma na mikoa ya kati.',
  },
  {
    id: 'tea',
    nameEn: 'Tea',
    nameSw: 'Chai',
    botanical: 'Camellia sinensis',
    category: 'cash',
    img: 'https://images.unsplash.com/photo-1596637373007-9304a3f3a8b4?auto=format&fit=crop&q=80&w=400',
    duration: 'Miaka 3+',
    difficulty: 'Nguvu',
    profit: 'Juu',
    profitScore: 3,
    water: 'Mingi Sana',
    sun: 'Jua Kiasi',
    phOptimal: '4.5 - 5.5',
    pests: 'Utitiri mwekundu, Vidukari wa chai',
    priceTrend: 'Thabiti (Soko la mnada wa Mombasa)',
    desc: 'Huhitaji udongo wenye asidi ya juu na baridi kali. Hulimwa Iringa (Mufindi), Njombe, na Tanga (Lushoto).',
  },
  {
    id: 'coconut',
    nameEn: 'Coconut',
    nameSw: 'Nazi',
    botanical: 'Cocos nucifera',
    category: 'cash',
    img: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&q=80&w=400',
    duration: 'Miaka 4–6',
    difficulty: 'Rahisi',
    profit: 'Juu',
    profitScore: 3,
    water: 'Wastani',
    sun: 'Jua Kamili',
    phOptimal: '5.0 - 8.0',
    pests: 'Mende wa Nazi (Rhinoceros Beetle)',
    priceTrend: 'Imara katika maeneo ya utalii na miji mikubwa',
    desc: 'Hustawi sana pwani ya bahari ya Hindi na visiwani Zanzibar. Zao la muda mrefu lenye matumizi mengi.',
  },
  {
    id: 'ginger',
    nameEn: 'Ginger',
    nameSw: 'Tangawizi',
    botanical: 'Zingiber officinale',
    category: 'cash',
    img: 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&q=80&w=400',
    duration: 'Miezi 9',
    difficulty: 'Kati',
    profit: 'Juu Sana',
    profitScore: 4,
    water: 'Mingi',
    sun: 'Jua Kiasi',
    phOptimal: '5.5 - 6.5',
    pests: 'Kuoza kwa mizizi (Soft Rot), Minyoo ya udongo',
    priceTrend: 'Inapanda juu sana (Soko kubwa la ndani na Kenya)',
    desc: 'Hulimwa sana nyanda za juu zenye unyevunyevu kama wilaya ya Rungwe (Mbeya) na Same (Kilimanjaro).',
  },
  {
    id: 'tomato',
    nameEn: 'Tomatoes',
    nameSw: 'Nyanya',
    botanical: 'Solanum lycopersicum',
    category: 'horticulture',
    img: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=400',
    duration: 'Miezi 2–3',
    difficulty: 'Nguvu',
    profit: 'Juu',
    profitScore: 3,
    water: 'Mingi',
    sun: 'Jua Kamili',
    phOptimal: '6.0 - 6.8',
    pests: 'Tuta Absoluta, Ubwiri chini (Late Blight)',
    priceTrend: 'Inabadilika sana (Volatile, soko linapishana)',
    desc: 'Zao la biashara la haraka. Linahitaji matunzo ya hali ya juu sana, dawa za kuzuia magonjwa, na maji ya kutosha.',
  },
  {
    id: 'onion',
    nameEn: 'Onions',
    nameSw: 'Vitunguu',
    botanical: 'Allium cepa',
    category: 'horticulture',
    img: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&q=80&w=400',
    duration: 'Miezi 3–4',
    difficulty: 'Kati',
    profit: 'Juu Sana',
    profitScore: 4,
    water: 'Wastani',
    sun: 'Jua Kamili',
    phOptimal: '6.0 - 7.0',
    pests: 'Ubwiri vumbi, Wadudu wa Thrips',
    priceTrend: "Juu sana (Hasa vitunguu vya Mang'ola na Singida)",
    desc: "Vitunguu vya Singida na Karatu (Mang'ola) vina soko kubwa sana Afrika Mashariki (hasa nchi jirani ya Kenya).",
  },
  {
    id: 'avocado',
    nameEn: 'Avocado',
    nameSw: 'Parachichi',
    botanical: 'Persea americana',
    category: 'horticulture',
    img: 'https://images.unsplash.com/photo-1517666005606-1eb8a614d95b?auto=format&fit=crop&q=80&w=400',
    duration: 'Miaka 3+',
    difficulty: 'Kati',
    profit: 'Juu Sana',
    profitScore: 4,
    water: 'Wastani',
    sun: 'Jua Kamili',
    phOptimal: '5.5 - 6.5',
    pests: 'Kuoza kwa mizizi ya mmea, Thrips wa matunda',
    priceTrend: 'Juu sana kimataifa (Aina za Hass na Fuerte)',
    desc: 'Hujulikana kama "Dhahabu ya Kijani". Uzalishaji unakua sana maeneo ya Njombe, Mbeya, na Kilimanjaro kwa ajili ya kuuza nje.',
  },
  {
    id: 'banana',
    nameEn: 'Banana',
    nameSw: 'Ndizi',
    botanical: 'Musa acuminata',
    category: 'horticulture',
    img: 'https://images.unsplash.com/photo-1601002888204-5838cc518e38?auto=format&fit=crop&q=80&w=400',
    duration: 'Miezi 9–12',
    difficulty: 'Kati',
    profit: 'Juu',
    profitScore: 3,
    water: 'Mingi',
    sun: 'Kiasi',
    phOptimal: '5.5 - 6.5',
    pests: 'Ugonjwa wa Mnyauko wa Panama, Mchwa',
    priceTrend: 'Imara (Zao la chakula na fedha kila mwezi)',
    desc: 'Chakula kikuu Kilimanjaro, Kagera na Mbeya. Inahitaji unyevu mwingi na mbolea ya samadi au mboji.',
  },
  {
    id: 'cloves',
    nameEn: 'Cloves',
    nameSw: 'Karafuu',
    botanical: 'Syzygium aromaticum',
    category: 'horticulture',
    img: 'https://images.unsplash.com/photo-1606822263435-0ce1b88e0018?auto=format&fit=crop&q=80&w=400',
    duration: 'Miaka 5+',
    difficulty: 'Kati',
    profit: 'Juu Sana',
    profitScore: 4,
    water: 'Mingi',
    sun: 'Jua Kamili',
    phOptimal: '5.0 - 6.0',
    pests: 'Ugonjwa wa Sudden Death wa karafuu',
    priceTrend: 'Juu sana (Soko imara la viungo duniani)',
    desc: 'Zao la kihistoria la Zanzibar na Pemba. Nchi inasafirisha tani nyingi kwa viwanda vya dawa na vipodozi.',
  },
  {
    id: 'mango',
    nameEn: 'Mango',
    nameSw: 'Embe',
    botanical: 'Mangifera indica',
    category: 'horticulture',
    img: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&q=80&w=400',
    duration: 'Miaka 3',
    difficulty: 'Rahisi',
    profit: 'Kati',
    profitScore: 2,
    water: 'Wastani',
    sun: 'Jua Kamili',
    phOptimal: '5.5 - 7.0',
    pests: 'Inzi wa matunda (Fruit Fly), Ubwiri unga',
    priceTrend: 'Wastani wakati wa msimu, juu nje ya msimu',
    desc: 'Hustawi vizuri mikoa ya Pwani, Tanga, na Morogoro. Aina za kisasa za kupandikizwa (dodo, kent, keitt) hulipa vizuri.',
  },
  {
    id: 'pineapple',
    nameEn: 'Pineapple',
    nameSw: 'Nanasi',
    botanical: 'Ananas comosus',
    category: 'horticulture',
    img: 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?auto=format&fit=crop&q=80&w=400',
    duration: 'Miezi 12–15',
    difficulty: 'Rahisi',
    profit: 'Juu',
    profitScore: 3,
    water: 'Kidogo',
    sun: 'Jua Kamili',
    phOptimal: '4.5 - 5.5',
    pests: 'Kunguni wa nanasi (Mealybugs), Kuoza kwa moyo',
    priceTrend: 'Imara (Hasa kwa matumizi ya viwanda vya juisi)',
    desc: 'Hustawi maeneo ya joto yenye udongo wa kichanga na asidi. Lindi, Pwani (Bagamoyo), na Geita ni wazalishaji wakuu.',
  },
];

const PROFIT_COLOR: Record<string, string> = {
  Chini: '#64748b',
  Kati: '#f59e0b',
  Juu: '#3C4A2A',
  'Juu Sana': '#3C4A2A',
};

const DIFF_COLOR: Record<string, string> = {
  Rahisi: '#3C4A2A',
  Kati: '#f59e0b',
  Nguvu: '#ef4444',
};

// ─── Profit score dots ───────────────────────────────────────────────────────
function ProfitDots({ score }: { score: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {[1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={{
            width: 5,
            height: 5,
            borderRadius: 3,
            backgroundColor: i <= score ? '#3C4A2A' : 'rgba(0,0,0,0.1)',
          }}
        />
      ))}
    </View>
  );
}

// ─── Crop card ────────────────────────────────────────────────────────────────
function CropCard({ crop, index, onPress }: { crop: any; index: number; onPress: () => void }) {
  const { colors, isDark } = useTheme();
  const isHighProfit = crop.profitScore >= 3;

  return (
    <Animated.View entering={FadeInDown.delay(index * 25).springify()}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={{ width: SW * 0.44 }}>
        <View
          style={[
            cc.wrap,
            {
              backgroundColor: colors.card,
              borderColor: isHighProfit ? 'rgba(60, 74, 42,0.25)' : colors.border,
              borderWidth: isHighProfit ? 1.5 : 1,
            },
          ]}
        >
          {/* Image */}
          <View style={cc.imgWrap}>
            <RemoteImage
              uri={crop.img}
              style={cc.img}
              resizeMode="cover"
              accessibilityLabel={crop.name}
            />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={cc.imgGrad} />
            {isHighProfit && (
              <View style={cc.hotChip}>
                <Zap size={8} color="#000" />
                <Text style={cc.hotText}>HOT</Text>
              </View>
            )}
          </View>

          {/* Body */}
          <View style={cc.body}>
            <Text style={[cc.name, { color: colors.text }]} numberOfLines={1}>
              {crop.nameSw}
            </Text>
            <Text style={[cc.sub, { color: colors.textMute }]} numberOfLines={1}>
              {crop.botanical} ({crop.nameEn})
            </Text>

            <View style={cc.badges}>
              {/* Profit */}
              <View style={[cc.badge, { backgroundColor: `${PROFIT_COLOR[crop.profit]}18` }]}>
                <TrendingUp size={9} color={PROFIT_COLOR[crop.profit]} />
                <Text style={[cc.badgeText, { color: PROFIT_COLOR[crop.profit] }]}>
                  {crop.profit}
                </Text>
              </View>
              {/* Duration */}
              <View style={[cc.badge, { backgroundColor: 'rgba(0,0,0,0.04)' }]}>
                <Clock size={9} color={colors.textMute} />
                <Text style={[cc.badgeText, { color: colors.textMute }]}>{crop.duration}</Text>
              </View>
            </View>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 6,
              }}
            >
              <ProfitDots score={crop.profitScore} />
              <View style={[cc.diffBadge, { backgroundColor: `${DIFF_COLOR[crop.difficulty]}15` }]}>
                <Text style={[cc.diffText, { color: DIFF_COLOR[crop.difficulty] }]}>
                  {crop.difficulty}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const cc = StyleSheet.create({
  wrap: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  imgWrap: { position: 'relative' },
  img: { width: '100%', height: 110 },
  imgGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 40 },
  hotChip: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: '#3C4A2A',
  },
  hotText: { fontSize: 7, fontFamily: 'Inter_700Bold', color: '#000' },
  body: { padding: 10, gap: 3 },
  name: { fontSize: 13.5, fontFamily: 'Inter_700Bold' },
  sub: { fontSize: 10, fontFamily: 'Inter_600SemiBold', fontStyle: 'italic' },
  badges: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', marginTop: 4 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: { fontSize: 8.5, fontFamily: 'Inter_700Bold' },
  diffBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  diffText: { fontSize: 8.5, fontFamily: 'Inter_700Bold' },
});

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function CropLibraryScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const language = useKilimoStore((s) => s.language);

  const [catFilter, setCatFilter] = useState('all');
  const [selectedCrop, setSelectedCrop] = useState<any>(null);
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);

  const displayed = catFilter === 'all' ? CROPS : CROPS.filter((c) => c.category === catFilter);

  const fetchDetails = async (crop: any) => {
    setSelectedCrop(crop);
    setDetails('');
    setLoading(true);
    try {
      if (aiConfigured()) {
        const res = await chat([
          {
            role: 'user',
            content: `Nipe mwongozo kamili wa kilimo cha ${crop.nameSw} nchini Tanzania. Jumuisha: 1. Maandalizi ya shamba na vipimo vya nafasi, 2. Aina bora za mbegu zinazostawi Tanzania, 3. Magonjwa na wadudu wakuu na jinsi ya kuwadhibiti, 4. Njia bora za kuvuna na kuhifadhi ili kuepuka sumukuvu (Aflatoxin). Fupisha kwa vipengele vifupi na Kiswahili kizuri.`,
          },
        ]);
        setDetails(res);
      } else {
        await new Promise((r) => setTimeout(r, 1000));
        setDetails(
          `Mwongozo wa Sankofa AI kwa ${crop.nameSw}:\n\n• Maandalizi ya Shamba: Andaa shamba mapema kabla ya mvua kuanza. Palilia na utayarishe udongo uwe na mfereji mzuri wa kutoa maji ya ziada. Tumia samadi na mbolea ya kupandia (DAP).\n• Umbali wa Kupanda: Kaa kati ya sentimita zilizopendekezwa ili mmea upate hewa na jua la kutosha.\n• Magonjwa Makubwa: Angalia dalili za kubadilika majani. Nyanya na viazi hudhibitiwa kwa kuvu kwa kutumia dawa sahihi za kilimo.\n• Uvunaji: Vuna mazao yakiwa kavu kabisa na epuka kuanika chini moja kwa moja kwenye udongo ili kuzuia sumukuvu (Aflatoxins).`
        );
      }
    } catch {
      setDetails('Kuna changamoto ya mtandao. Tafadhali jaribu tena baadaye.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Glow */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={[s.glow, Platform.OS === 'web' && ({ filter: 'blur(90px)' } as any)]} />
      </View>

      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            style={[s.iconBtn, { borderColor: colors.border }]}
          >
            <ChevronLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={{ alignItems: 'center' }}>
            <View style={s.badge}>
              <BookOpen size={10} color="#3C4A2A" />
              <Text style={s.badgeText}>MAKTABA</Text>
            </View>
            <Text style={[s.title, { color: colors.text }]}>Maktaba ya Mazao</Text>
          </View>
          <View style={{ width: 42 }} />
        </View>

        {/* Summary stats */}
        <Animated.View entering={FadeInDown} style={{ paddingHorizontal: 16, marginBottom: 14 }}>
          <View
            style={[
              s.statsBar,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <LinearGradient
              colors={['rgba(60, 74, 42,0.05)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <View style={s.statCol}>
              <Text style={[s.statNum, { color: colors.text }]}>{CROPS.length}</Text>
              <Text style={[s.statLbl, { color: colors.textMute }]}>Mazao Yote</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statCol}>
              <Text style={[s.statNum, { color: '#3C4A2A' }]}>
                {CROPS.filter((c) => c.profitScore >= 3).length}
              </Text>
              <Text style={[s.statLbl, { color: colors.textMute }]}>Faida Juu</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statCol}>
              <Text style={[s.statNum, { color: '#f59e0b' }]}>
                {CROPS.filter((c) => c.difficulty === 'Rahisi').length}
              </Text>
              <Text style={[s.statLbl, { color: colors.textMute }]}>Rahisi Kulima</Text>
            </View>
          </View>
        </Animated.View>

        {/* Category filters */}
        <View style={{ height: 48, marginBottom: 8 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8, height: 38 }}
          >
            {CATEGORIES.map((cat) => {
              const active = catFilter === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setCatFilter(cat.id)}
                  style={[
                    s.filterPill,
                    {
                      backgroundColor: active ? `${cat.color}15` : colors.card,
                      borderColor: active ? cat.color : colors.border,
                    },
                  ]}
                >
                  <Text style={[s.filterText, { color: active ? cat.color : colors.textMute }]}>
                    {cat.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Grid */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        >
          <View style={s.grid}>
            {displayed.map((crop, i) => (
              <CropCard key={crop.id} crop={crop} index={i} onPress={() => fetchDetails(crop)} />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Detail modal */}
      <Modal
        visible={!!selectedCrop}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedCrop(null)}
      >
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View
            style={[s.modal, { backgroundColor: colors.background, borderColor: colors.border }]}
          >
            {/* Handle */}
            <View style={s.modalHandle} />

            {/* Modal header */}
            <View style={s.modalTop}>
              <View>
                <Text style={[s.modalTitleText, { color: colors.text }]}>
                  {selectedCrop?.nameSw}
                </Text>
                <Text style={[s.modalSub, { color: colors.textMute }]}>
                  {selectedCrop?.botanical} · {selectedCrop?.nameEn}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedCrop(null)} style={s.closeBtn}>
                <X size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              {/* Hero image */}
              <View style={{ position: 'relative', marginBottom: 16 }}>
                <RemoteImage
                  uri={selectedCrop?.img}
                  style={s.modalImg}
                  resizeMode="cover"
                  accessibilityLabel={selectedCrop?.name}
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.5)']}
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 60,
                    borderRadius: 16,
                  }}
                />
              </View>

              <Text style={[s.modalDesc, { color: colors.text }]}>{selectedCrop?.desc}</Text>

              {/* Stats grid */}
              <View style={s.statsGrid}>
                {[
                  {
                    icon: <Clock size={16} color="#3C4A2A" />,
                    label: 'Kukomaa',
                    value: selectedCrop?.duration,
                  },
                  {
                    icon: <TrendingUp size={16} color="#f59e0b" />,
                    label: 'Kipato',
                    value: selectedCrop?.profit,
                  },
                  {
                    icon: <Leaf size={16} color="#3b82f6" />,
                    label: 'Ugumu',
                    value: selectedCrop?.difficulty,
                  },
                  {
                    icon: <Droplets size={16} color="#0ea5e9" />,
                    label: 'Maji',
                    value: selectedCrop?.water,
                  },
                  {
                    icon: <Sun size={16} color="#f97316" />,
                    label: 'Mwanga',
                    value: selectedCrop?.sun,
                  },
                  {
                    icon: <Award size={16} color="#a855f7" />,
                    label: 'Faida',
                    value: selectedCrop ? `${selectedCrop.profitScore}/4` : '-',
                  },
                ].map((item, i) => (
                  <View
                    key={i}
                    style={[
                      s.statBox,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    {item.icon}
                    <Text style={[s.statBoxVal, { color: colors.text }]} numberOfLines={1}>
                      {item.value}
                    </Text>
                    <Text style={[s.statBoxLbl, { color: colors.textMute }]}>{item.label}</Text>
                  </View>
                ))}
              </View>

              {/* Crop Growth Parameters Section */}
              <View style={{ marginBottom: 20 }}>
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}
                >
                  <BarChart3 size={18} color={colors.primary} />
                  <Text style={[s.sectionTitleText, { color: colors.text }]}>
                    Ukuaji na Hali ya Soko · Parameters
                  </Text>
                </View>
                <View
                  style={[
                    s.detailsBlock,
                    { borderColor: colors.border, backgroundColor: colors.card },
                  ]}
                >
                  <View style={s.paramRow}>
                    <Text
                      style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: colors.textMute }}
                    >
                      Optimal pH Range:
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Droplets size={12} color="#0ea5e9" />
                      <Text
                        style={{
                          fontSize: 12,
                          fontFamily: 'Inter_800ExtraBold',
                          color: colors.text,
                        }}
                      >
                        {selectedCrop?.phOptimal}
                      </Text>
                    </View>
                  </View>
                  <View style={s.divider} />
                  <View style={s.paramRow}>
                    <Text
                      style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: colors.textMute }}
                    >
                      Common Pests / Magonjwa:
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        flex: 1,
                        justifyContent: 'flex-end',
                      }}
                    >
                      <ShieldAlert size={12} color="#ef4444" />
                      <Text
                        style={{
                          fontSize: 11.5,
                          fontFamily: 'Inter_600SemiBold',
                          color: colors.text,
                          textAlign: 'right',
                        }}
                        numberOfLines={1}
                      >
                        {selectedCrop?.pests}
                      </Text>
                    </View>
                  </View>
                  <View style={s.divider} />
                  <View style={s.paramRow}>
                    <Text
                      style={{ fontSize: 12, fontFamily: 'Inter_700Bold', color: colors.textMute }}
                    >
                      Price Trend / Masoko:
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <TrendingUp size={12} color="#3C4A2A" />
                      <Text
                        style={{ fontSize: 12, fontFamily: 'Inter_800ExtraBold', color: '#3C4A2A' }}
                      >
                        {selectedCrop?.priceTrend}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* AI guide */}
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}
              >
                <Sparkles size={18} color="#3C4A2A" />
                <Text style={[s.sectionTitleText, { color: colors.text }]}>
                  Mwongozo wa Sankofa AI
                </Text>
              </View>

              <View
                style={[
                  s.aiBox,
                  {
                    backgroundColor: isDark ? 'rgba(60, 74, 42,0.06)' : 'rgba(60, 74, 42,0.04)',
                    borderColor: 'rgba(60, 74, 42,0.15)',
                  },
                ]}
              >
                {loading ? (
                  <View style={{ padding: 24, alignItems: 'center', gap: 12 }}>
                    <ActivityIndicator size="large" color="#3C4A2A" />
                    <Text
                      style={{
                        color: colors.textMute,
                        fontFamily: 'Inter_600SemiBold',
                        fontSize: 12.5,
                      }}
                    >
                      Sankofa AI inachambua na kuandaa mwongozo...
                    </Text>
                  </View>
                ) : (
                  <Text style={[s.aiText, { color: colors.text }]}>{details}</Text>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1 },
  glow: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(60, 74, 42,0.05)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderWidth: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(60, 74, 42,0.1)',
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 8.5,
    fontFamily: 'Inter_800ExtraBold',
    color: '#3C4A2A',
    letterSpacing: 1,
  },
  title: {
    fontSize: 20,
    fontFamily: 'InstrumentSerif_400Regular',
    letterSpacing: -0.4,
    fontWeight: 'bold',
  },

  statsBar: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 14,
  },
  statCol: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 22, fontFamily: 'InstrumentSerif_400Regular', fontWeight: 'bold' },
  statLbl: { fontSize: 8.5, fontFamily: 'Inter_700Bold', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: 'rgba(0,0,0,0.08)', marginHorizontal: 8 },

  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    height: 36,
  },
  filterText: { fontSize: 11, fontFamily: 'Inter_700Bold' },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 4,
  },

  // Modal
  modal: {
    height: '92%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 0,
    borderWidth: 1,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitleText: {
    fontSize: 24,
    fontFamily: 'InstrumentSerif_400Regular',
    letterSpacing: -0.5,
    fontWeight: 'bold',
  },
  modalSub: { fontSize: 12, fontFamily: 'Inter_600SemiBold', fontStyle: 'italic', marginTop: 2 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  modalImg: { width: '100%', height: 180, borderRadius: 16 },
  modalDesc: { fontSize: 13, fontFamily: 'Inter_500Medium', lineHeight: 20, marginBottom: 16 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  statBox: {
    width: '31%',
    padding: 10,
    borderRadius: 12,
    alignItems: 'flex-start',
    gap: 4,
    borderWidth: 1,
  },
  statBoxVal: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  statBoxLbl: { fontSize: 9.5, fontFamily: 'Inter_500Medium' },

  sectionTitleText: { fontSize: 16, fontFamily: 'InstrumentSerif_400Regular', fontWeight: 'bold' },
  detailsBlock: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  paramRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(0,0,0,0.08)' },

  aiBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  aiText: { fontSize: 13, fontFamily: 'Inter_500Medium', lineHeight: 22 },
});
