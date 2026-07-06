import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * BookCover
 *
 * Renders a book as a *book*. When a real cover image exists it's shown; when
 * it doesn't (most listings), we draw a jacket: a deterministic warm two-tone
 * gradient, a darker spine fold with a keyline down the left edge, and the
 * title set in Libre Baskerville — so a shelf of coverless books still reads as
 * a shelf, not a row of grey boxes.
 */

type Size = 'sm' | 'md' | 'lg';

// Earthy jacket pairs [face, shadow] — warm and varied, like a real shelf.
const JACKETS: [string, string][] = [
  ['#8B5E3C', '#5E3E27'], // coffee
  ['#A65A3A', '#7A3E27'], // terracotta
  ['#6E7A54', '#4C563A'], // olive
  ['#7A5568', '#573C4C'], // plum
  ['#B0813F', '#82602C'], // ochre
  ['#8C4A3C', '#642F26'], // brick
  ['#4F6B63', '#374E47'], // muted teal
  ['#9A6A34', '#6C4A22'], // sienna
];

function jacketFor(title: string): [string, string] {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) % 997;
  return JACKETS[h % JACKETS.length];
}

const SIZES: Record<Size, {
  w: number; h: number; title: number; author: number; pad: number; radius: number; spine: number; lines: number;
}> = {
  sm: { w: 64, h: 92, title: 9.5, author: 0, pad: 8, radius: 8, spine: 5, lines: 3 },
  md: { w: 96, h: 140, title: 12, author: 9.5, pad: 10, radius: 9, spine: 6, lines: 4 },
  lg: { w: 132, h: 190, title: 15, author: 10.5, pad: 13, radius: 12, spine: 7, lines: 4 },
};

const INK = '#FBF3E6';

export function BookCover({
  title,
  author,
  coverImage,
  size = 'sm',
  fill = false,
  style,
}: {
  title: string;
  author?: string;
  coverImage?: string;
  size?: Size;
  /** Fill the parent instead of using the fixed size box (parent controls the
   *  box + clipping + shadow). Typography still follows `size`. */
  fill?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  // If the remote cover fails to load (broken/blocked URL, missing Open Library
  // cover, network hiccup), fall back to the drawn jacket instead of a blank box.
  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => setImgFailed(false), [coverImage]);

  const s = SIZES[size];
  const dims = fill
    ? ({ width: '100%', height: '100%' } as const)
    : { width: s.w, height: s.h, borderRadius: s.radius };
  const radius = fill ? 0 : s.radius;

  const [face, shade] = jacketFor(title);
  // Only treat it as a cover if it's a real http(s) URL — an empty/malformed value
  // should draw the jacket, not a blank image.
  const hasCover = !!coverImage && /^https?:\/\/\S+/i.test(coverImage.trim());

  return (
    <View style={[dims, !fill && styles.shadow, style]}>
      {/* The drawn jacket is ALWAYS the base layer, so a missing, slow, or broken
          cover still reads as a book with its title — never a flat empty block. */}
      <LinearGradient
        colors={[face, shade]}
        start={{ x: 0.12, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[
          styles.fill,
          { borderRadius: radius, paddingVertical: s.pad, paddingRight: s.pad, paddingLeft: s.spine + s.pad },
        ]}
      >
        {/* spine fold */}
        <View
          style={[
            styles.spine,
            { width: s.spine, borderTopLeftRadius: radius, borderBottomLeftRadius: radius },
          ]}
        />
        <View style={[styles.keyline, { left: s.spine + 2 }]} />

        {/* jacket text */}
        <View style={styles.textWrap}>
          <Text
            style={[styles.title, { fontSize: s.title, lineHeight: s.title * 1.2 }]}
            numberOfLines={s.lines}
          >
            {title}
          </Text>
          {s.author > 0 && !!author && (
            <Text style={[styles.author, { fontSize: s.author }]} numberOfLines={1}>
              {author}
            </Text>
          )}
        </View>
      </LinearGradient>

      {/* A real cover overlays the jacket when it loads; on error we simply reveal
          the jacket underneath (no flat placeholder). */}
      {hasCover && !imgFailed && (
        <Image
          // iOS blocks insecure http image loads — upgrade to https.
          source={{ uri: coverImage!.replace(/^http:\/\//, 'https://') }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: radius }]}
          resizeMode="cover"
          onError={() => setImgFailed(true)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    backgroundColor: '#8B5E3C',
    shadowColor: '#3A2A1A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 4,
  },
  fill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  spine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.20)',
  },
  keyline: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  textWrap: {
    alignItems: 'center',
  },
  title: {
    fontFamily: 'LibreBaskerville-Regular',
    color: INK,
    textAlign: 'center',
  },
  author: {
    fontFamily: 'LibreBaskerville-Italic',
    color: 'rgba(251,243,230,0.72)',
    textAlign: 'center',
    marginTop: 5,
  },
});
