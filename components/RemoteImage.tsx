/**
 * RemoteImage — offline-resilient image for remote (http) sources.
 *
 * Why: several screens load hero/product photos from remote URLs. On low or no
 * connectivity (the common case for rural users) a bare RN <Image> shows a blank
 * or broken box. This wrapper:
 *   • caches to memory + disk via expo-image, so once seen an image works offline;
 *   • shows a blurhash placeholder while loading / when uncached;
 *   • falls back to a themed tile with a leaf glyph if the load ultimately fails.
 */
import React, { useState } from 'react';
import { View, StyleSheet, StyleProp, ImageStyle, ViewStyle } from 'react-native';
import { Image, ImageContentFit } from 'expo-image';
import { Leaf } from 'lucide-react-native';
import { useTheme } from '../constants/Theme';

// Soft neutral-green blurhash used as the loading placeholder.
const PLACEHOLDER_BLURHASH = 'L6Pj0^jE.AyE_3t7t7R**0o#DgR4';

type Props = {
  uri?: string | null;
  style?: StyleProp<ImageStyle>;
  /** Accepts RN resizeMode names for drop-in compatibility. */
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  contentFit?: ImageContentFit;
  transition?: number;
  accessibilityLabel?: string;
  /** Rendered instead of the default leaf tile when uri is missing/failed. */
  fallback?: React.ReactNode;
};

const RESIZE_TO_FIT: Record<NonNullable<Props['resizeMode']>, ImageContentFit> = {
  cover: 'cover',
  contain: 'contain',
  stretch: 'fill',
  center: 'none',
};

export default function RemoteImage({
  uri,
  style,
  resizeMode = 'cover',
  contentFit,
  transition = 250,
  accessibilityLabel,
  fallback,
}: Props) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);

  if (!uri || failed) {
    if (fallback !== undefined) return <>{fallback}</>;
    return (
      <View
        style={[
          styles.fallback,
          style as StyleProp<ViewStyle>,
          { backgroundColor: colors.primaryLight, borderColor: colors.border },
        ]}
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
      >
        <Leaf size={22} color={colors.primary} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      contentFit={contentFit ?? RESIZE_TO_FIT[resizeMode]}
      cachePolicy="memory-disk"
      transition={transition}
      placeholder={{ blurhash: PLACEHOLDER_BLURHASH }}
      onError={() => setFailed(true)}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
