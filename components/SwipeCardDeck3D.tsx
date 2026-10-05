/**
 * SwipeCardDeck3D — CRED InduslInd-style 3D snap card interaction
 *
 * Physics:
 *  - PanResponder captures horizontal swipes; vertical passes through to ScrollView
 *  - translateX Animated.Value drives the entire deck
 *  - Per-card rotateY, scale, opacity interpolated from translateX
 *  - Animated.spring snap on release (stiffness 320, damping 28, mass 0.85)
 *  - Haptic feedback on every snap transition
 *
 * 3D details:
 *  - perspective: 900 on each card wrapper
 *  - rotateY: 0° at rest → ±14° at full offset (one card away)
 *  - scale: 1.0 active → 0.91 adjacent
 *  - opacity: 1.0 active → 0.5 adjacent
 *  - elliptical shadow beneath each card, scaleX tracks card activity
 */
import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
  TouchableOpacity,
  Text,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

const { width: SW } = Dimensions.get('window');

const CARD_W = Math.min(SW - 64, 360);
const CARD_H = 200;
const GAP = 14;
const STEP = CARD_W + GAP;
const SIDE = (SW - CARD_W) / 2;

export interface SwipeCard {
  id: string;
  label: string;
  desc: string;
  emoji: string;
  gradientColors: [string, string];
  route: string;
  icon: React.ReactNode;
}

interface Props {
  cards: SwipeCard[];
}

export default function SwipeCardDeck3D({ cards }: Props) {
  const router = useRouter();
  const activeIndexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;

  // ── Hint animation — brief tease on mount ─────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.sequence([
        Animated.spring(translateX, {
          toValue: -STEP * 0.18,
          stiffness: 180,
          damping: 18,
          mass: 0.7,
          useNativeDriver: true,
        }),
        Animated.spring(translateX, {
          toValue: 0,
          stiffness: 260,
          damping: 26,
          mass: 0.8,
          useNativeDriver: true,
        }),
      ]).start();
    }, 900);
    return () => clearTimeout(timer);
  }, []);

  // ── Per-card derived transforms ────────────────────────────────────────────
  function rotateYFor(i: number) {
    return translateX.interpolate({
      inputRange: [-(i + 1) * STEP, -i * STEP, -(i - 1) * STEP],
      outputRange: ['-14deg', '0deg', '14deg'],
      extrapolate: 'clamp',
    });
  }

  function scaleFor(i: number) {
    return translateX.interpolate({
      inputRange: [-(i + 1) * STEP, -i * STEP, -(i - 1) * STEP],
      outputRange: [0.91, 1.0, 0.91],
      extrapolate: 'clamp',
    });
  }

  function opacityFor(i: number) {
    return translateX.interpolate({
      inputRange: [-(i + 1) * STEP, -i * STEP, -(i - 1) * STEP],
      outputRange: [0.48, 1.0, 0.48],
      extrapolate: 'clamp',
    });
  }

  function shadowScaleFor(i: number) {
    return translateX.interpolate({
      inputRange: [-(i + 1) * STEP, -i * STEP, -(i - 1) * STEP],
      outputRange: [0.55, 1.0, 0.55],
      extrapolate: 'clamp',
    });
  }

  function shadowOpacityFor(i: number) {
    return translateX.interpolate({
      inputRange: [-(i + 1) * STEP, -i * STEP, -(i - 1) * STEP],
      outputRange: [0.06, 0.22, 0.06],
      extrapolate: 'clamp',
    });
  }

  // ── Gesture ────────────────────────────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 6,

      onPanResponderGrant: () => {
        translateX.setOffset(-activeIndexRef.current * STEP);
        translateX.setValue(0);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      },

      onPanResponderMove: (_, { dx }) => {
        translateX.setValue(dx * 0.88);
      },

      onPanResponderRelease: (_, { dx, vx }) => {
        translateX.flattenOffset();
        const cur = activeIndexRef.current;
        let next = cur;

        if (vx < -0.55 || dx < -(STEP * 0.28)) {
          next = Math.min(cards.length - 1, cur + 1);
        } else if (vx > 0.55 || dx > STEP * 0.28) {
          next = Math.max(0, cur - 1);
        }

        if (next !== cur) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        activeIndexRef.current = next;
        setActiveIndex(next);

        Animated.spring(translateX, {
          toValue: -next * STEP,
          stiffness: 320,
          damping: 28,
          mass: 0.85,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  // ── Dot tap handler ────────────────────────────────────────────────────────
  function goTo(i: number) {
    activeIndexRef.current = i;
    setActiveIndex(i);
    Haptics.selectionAsync();
    Animated.spring(translateX, {
      toValue: -i * STEP,
      stiffness: 320,
      damping: 28,
      mass: 0.85,
      useNativeDriver: true,
    }).start();
  }

  return (
    <View style={s.root}>
      {/* ── Deck ── */}
      <View style={s.deckClip}>
        <Animated.View
          style={[s.deck, { transform: [{ translateX }] }]}
          {...panResponder.panHandlers}
        >
          {cards.map((card, i) => (
            <View key={card.id} style={[s.cardSlot, i < cards.length - 1 && { marginRight: GAP }]}>
              {/* Floating elliptical shadow */}
              <Animated.View
                style={[
                  s.shadow,
                  {
                    transform: [{ scaleX: shadowScaleFor(i) }],
                    opacity: shadowOpacityFor(i),
                  },
                ]}
              />

              {/* 3D card */}
              <Animated.View
                style={[
                  s.cardWrap,
                  {
                    opacity: opacityFor(i),
                    transform: [
                      { perspective: 900 },
                      { rotateY: rotateYFor(i) as any },
                      { scale: scaleFor(i) },
                    ],
                  },
                ]}
              >
                <TouchableOpacity
                  activeOpacity={0.93}
                  onPress={() => {
                    if (activeIndexRef.current === i) {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      router.push(card.route as any);
                    } else {
                      goTo(i);
                    }
                  }}
                >
                  <LinearGradient
                    colors={card.gradientColors}
                    style={s.card}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {/* Inner highlight stripe — gives depth */}
                    <View style={s.innerHighlight} />

                    {/* Decorative circles */}
                    <View style={s.circleA} />
                    <View style={s.circleB} />

                    {/* Top row */}
                    <View style={s.topRow}>
                      <View style={s.iconCircle}>{card.icon}</View>
                      <View style={s.badge}>
                        <Text style={s.badgeText}>KILIMO AI</Text>
                      </View>
                    </View>

                    {/* Content */}
                    <View style={s.content}>
                      <Text style={s.cardLabel} numberOfLines={1}>
                        {card.label}
                      </Text>
                      <Text style={s.cardDesc} numberOfLines={1}>
                        {card.desc}
                      </Text>
                    </View>

                    {/* Bottom row */}
                    <View style={s.bottomRow}>
                      <Text style={s.emoji}>{card.emoji}</Text>
                      <View style={s.ctaBtn}>
                        <ArrowRight size={16} color="#000" strokeWidth={2.5} />
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            </View>
          ))}
        </Animated.View>
      </View>

      {/* ── Dot pagination ── */}
      <View style={s.dots}>
        {cards.map((_, i) => {
          const isActive = i === activeIndex;
          return (
            <TouchableOpacity
              key={i}
              onPress={() => goTo(i)}
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              <View style={[s.dot, isActive && s.dotActive]} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    marginBottom: 4,
  },
  deckClip: {
    width: SW,
    overflow: 'hidden',
  },
  deck: {
    flexDirection: 'row',
    paddingLeft: SIDE,
    paddingRight: SIDE,
    paddingBottom: 28,
    paddingTop: 4,
  },
  cardSlot: {
    width: CARD_W,
  },
  shadow: {
    position: 'absolute',
    bottom: -8,
    left: 20,
    right: 20,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,1)',
    ...(Platform.OS === 'web' ? ({ filter: 'blur(14px)' } as object) : {}),
  },
  cardWrap: {
    borderRadius: 26,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' } as object)
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.15,
          shadowRadius: 16,
          elevation: 10,
        }),
  },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 26,
    padding: 22,
    paddingBottom: 18,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  innerHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: CARD_H * 0.42,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.13)',
  },
  circleA: {
    position: 'absolute',
    right: -40,
    top: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  circleB: {
    position: 'absolute',
    right: 20,
    bottom: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 9,
    fontFamily: 'Inter_800ExtraBold',
    letterSpacing: 1.5,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  cardLabel: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'Inter_900Black',
    letterSpacing: -0.5,
    lineHeight: 26,
  },
  cardDesc: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginTop: 3,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 26,
    lineHeight: 32,
  },
  ctaBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.14)',
  },
  dotActive: {
    width: 20,
    backgroundColor: '#3C4A2A',
    borderRadius: 3,
  },
});
