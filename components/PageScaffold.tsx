/**
 * Kilimo AI — Shared Page Scaffold
 *
 * Glass-morphism background + animated orbs + standardized header so every
 * feature page has the same premium feel without 300 lines of boilerplate.
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Dimensions,
  StatusBar,
  Platform,
  RefreshControl,
} from 'react-native';
import { ChevronLeft, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../constants/Theme';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';

const { width: SW, height: SH } = Dimensions.get('window');

const NeuralOrb = ({ color, size, x, y, delay }: any) => {
  const progress = useSharedValue(0);
  useEffect(() => {
    const duration = 22000 + delay;
    progress.value = withRepeat(
      withSequence(
        withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x + progress.value * 28 },
      { translateY: y - progress.value * 36 },
      { scale: 0.92 + progress.value * 0.12 },
    ] as any,
    opacity: 0.04 + progress.value * 0.06,
  }));
  return (
    <Animated.View
      style={[
        styles.orb,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        Platform.OS === 'web' && { filter: 'blur(80px)' as any },
        animatedStyle,
      ]}
    />
  );
};

export interface PageScaffoldProps {
  title: string;
  subtitle?: string;
  badge?: string;
  headerRight?: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  children: React.ReactNode;
}

export default function PageScaffold({
  title,
  subtitle,
  badge,
  headerRight,
  scroll = true,
  refreshing,
  onRefresh,
  children,
}: PageScaffoldProps) {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const body = (
    <>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <View
            style={[
              styles.iconBtn,
              {
                borderColor: colors.border,
                backgroundColor: isDark ? 'rgba(60, 74, 42,0.08)' : 'rgba(60, 74, 42,0.06)',
              },
            ]}
          >
            <ChevronLeft size={22} color={colors.text} />
          </View>
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: 'center' }}>
          {badge ? (
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: colors.primary + '18',
                  borderColor: colors.primary + '50',
                },
              ]}
            >
              <Sparkles size={11} color={colors.primary} />
              <Text style={[styles.badgeText, { color: colors.primary }]}>{badge}</Text>
            </View>
          ) : null}
        </View>

        <View style={{ width: 44 }}>{headerRight}</View>
      </View>

      <View style={styles.titleBlock}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {subtitle ? (
          <View style={styles.subtitleRow}>
            <View style={[styles.subtitleDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.subtitle, { color: colors.textMute }]}>{subtitle}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>{children}</View>
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Subtle ambient orbs */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <NeuralOrb color={colors.primary} size={360} x={-80} y={-60} delay={0} />
        <NeuralOrb color={colors.primary} size={240} x={SW - 140} y={SH * 0.45} delay={3000} />
        <LinearGradient
          colors={[colors.background + 'FF', colors.background + '00']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: SH * 0.4 }}
        />
      </View>

      <SafeAreaView style={{ flex: 1 }}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={{ paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  refreshing={!!refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.primary}
                />
              ) : undefined
            }
          >
            {body}
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>{body}</View>
        )}
      </SafeAreaView>
    </View>
  );
}

/** Glass card — richer green-tinted border for brand cohesion. */
export function GlassCard({ children, style }: { children: React.ReactNode; style?: any }) {
  const { isDark, colors } = useTheme();
  return (
    <BlurView
      intensity={isDark ? 30 : 75}
      tint={isDark ? 'dark' : 'light'}
      style={[
        scStyles.glass,
        {
          borderColor: isDark ? colors.primary + '28' : colors.primary + '22',
          backgroundColor: isDark ? 'rgba(14,22,14,0.65)' : 'rgba(255,255,255,0.82)',
        },
        style,
      ]}
    >
      {children}
    </BlurView>
  );
}

/** Standardised section header. */
export function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={scStyles.sectionHeader}>
      <View style={scStyles.sectionTitleRow}>
        <View style={[scStyles.sectionAccent, { backgroundColor: colors.primary }]} />
        <Text style={[scStyles.sectionTitle, { color: colors.textMute }]}>
          {title.toUpperCase()}
        </Text>
      </View>
      {action ? (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
          <Text style={[scStyles.sectionAction, { color: colors.primary }]}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/** Standardised empty state. */
export function EmptyState({
  icon,
  title,
  body,
  cta,
  onCta,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  cta?: string;
  onCta?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <GlassCard style={{ padding: 32, alignItems: 'center', marginHorizontal: 24, marginTop: 16 }}>
      <View style={{ marginBottom: 12, opacity: 0.6 }}>{icon}</View>
      <Text style={[scStyles.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[scStyles.emptyBody, { color: colors.textMute }]}>{body}</Text>
      {cta ? (
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onCta?.();
          }}
          style={[scStyles.emptyCta, { backgroundColor: colors.primary }]}
          activeOpacity={0.85}
        >
          <Text style={scStyles.emptyCtaText}>{cta}</Text>
        </TouchableOpacity>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  orb: { position: 'absolute' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontFamily: 'Inter_900Black', letterSpacing: 1.5 },
  titleBlock: { paddingHorizontal: 24, paddingTop: 18, paddingBottom: 8 },
  title: {
    fontSize: 34,
    fontFamily: 'InstrumentSerif_400Regular',
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  subtitleDot: { width: 5, height: 5, borderRadius: 3 },
  subtitle: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  body: { flex: 1, paddingTop: 8 },
});

const scStyles = StyleSheet.create({
  glass: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionAccent: { width: 3, height: 12, borderRadius: 2 },
  sectionTitle: { fontSize: 11, fontFamily: 'Inter_900Black', letterSpacing: 1.5 },
  sectionAction: { fontSize: 12, fontFamily: 'Inter_700Bold', letterSpacing: 0.3 },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'InstrumentSerif_400Regular',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 260,
  },
  emptyCta: { marginTop: 18, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  emptyCtaText: { color: '#fff', fontSize: 13, fontFamily: 'Inter_900Black', letterSpacing: 0.5 },
});
