import { Fragment } from 'react';
import { Linking, Text, View } from 'react-native';

import { colors } from '../../theme/colors';

/**
 * Renders the small slice of markdown admins actually write in release notes,
 * banner copy, and legal blurbs: paragraphs, bullets, bold, italic, and links.
 *
 * Hand-rolled rather than pulled from a library because the alternative is a
 * full CommonMark parser and its transitive tree for five constructs — and
 * because anything unrecognised here degrades to plain text, which is the
 * right failure for operator-authored copy. Nothing is ever dropped silently.
 */

const INLINE_PATTERN = /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_)/g;
const LINK_PATTERN = /^\[([^\]]+)\]\(([^)]+)\)$/;

interface InlineProps {
  text: string;
  color: string;
  size: number;
}

function InlineMarkdown({ text, color, size }: InlineProps) {
  const segments = text.split(INLINE_PATTERN).filter((s) => s.length > 0);

  return (
    <>
      {segments.map((segment, index) => {
        const key = `${index}-${segment.slice(0, 12)}`;

        const link = LINK_PATTERN.exec(segment);
        if (link) {
          const [, label, href] = link;
          return (
            <Text
              key={key}
              onPress={() => void Linking.openURL(href!)}
              style={{
                fontFamily: 'MonaSans-Medium',
                fontSize: size,
                color: colors.primary,
                textDecorationLine: 'underline',
              }}
            >
              {label}
            </Text>
          );
        }

        if (segment.startsWith('**') && segment.endsWith('**')) {
          return (
            <Text key={key} style={{ fontFamily: 'MonaSans-Bold', fontSize: size, color }}>
              {segment.slice(2, -2)}
            </Text>
          );
        }

        const italic =
          (segment.startsWith('*') && segment.endsWith('*')) ||
          (segment.startsWith('_') && segment.endsWith('_'));
        if (italic && segment.length > 2) {
          return (
            <Text
              key={key}
              style={{ fontFamily: 'MonaSans-Regular', fontSize: size, color, fontStyle: 'italic' }}
            >
              {segment.slice(1, -1)}
            </Text>
          );
        }

        return (
          <Text key={key} style={{ fontFamily: 'MonaSans-Regular', fontSize: size, color }}>
            {segment}
          </Text>
        );
      })}
    </>
  );
}

export interface AppMarkdownProps {
  source: string;
  color?: string;
  size?: number;
  align?: 'left' | 'center';
}

export function AppMarkdown({
  source,
  color = colors.textMuted,
  size = 15,
  align = 'left',
}: AppMarkdownProps) {
  const lines = source.split('\n');

  return (
    <View>
      {lines.map((line, index) => {
        const trimmed = line.trim();
        const key = `${index}-${trimmed.slice(0, 12)}`;

        if (trimmed.length === 0) return <View key={key} style={{ height: 8 }} />;

        const bullet = /^[-*]\s+(.*)$/.exec(trimmed);
        if (bullet) {
          return (
            <View key={key} style={{ flexDirection: 'row', paddingVertical: 3 }}>
              <Text style={{ fontFamily: 'MonaSans-Regular', fontSize: size, color }}>{'• '}</Text>
              <Text style={{ flex: 1, lineHeight: size * 1.5, textAlign: 'left' }}>
                <InlineMarkdown text={bullet[1]!} color={color} size={size} />
              </Text>
            </View>
          );
        }

        return (
          <Fragment key={key}>
            <Text style={{ lineHeight: size * 1.5, textAlign: align, paddingVertical: 2 }}>
              <InlineMarkdown text={trimmed} color={color} size={size} />
            </Text>
          </Fragment>
        );
      })}
    </View>
  );
}
