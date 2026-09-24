import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface Props {
  name?: string | null;
  avatarUrl?: string | null;
  size?: number;
  fontSize?: number;
  primaryColor?: string;
}

function nameToColor(name: string): string {
  const COLORS = [
    '#3C4A2A',
    '#3b82f6',
    '#f59e0b',
    '#8b5cf6',
    '#ec4899',
    '#06b6d4',
    '#ef4444',
    '#3C4A2A',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

function getInitials(name?: string | null): string {
  if (!name) return 'M';
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function InitialsAvatar({ name, avatarUrl, size = 68, fontSize, primaryColor }: Props) {
  const initials = getInitials(name);
  const color = primaryColor ?? nameToColor(initials);
  const fSize = fontSize ?? Math.round(size * 0.34);

  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={{ width: size, height: size, borderRadius: size * 0.32 }}
      />
    );
  }

  return (
    <View
      style={[
        s.circle,
        {
          width: size,
          height: size,
          borderRadius: size * 0.32,
          backgroundColor: color + '22',
          borderColor: color + '40',
        },
      ]}
    >
      <Text style={[s.text, { fontSize: fSize, color }]}>{initials}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  text: { fontFamily: 'Inter_900Black' },
});
