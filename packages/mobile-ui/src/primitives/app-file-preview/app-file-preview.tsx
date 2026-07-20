import { Image, type ImageContentFit } from 'expo-image';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AppIcon } from '../../icons/app-icons';
import { colors } from '../../theme/colors';

/**
 * Renders a file-service-backed image given only the opaque storage `key`.
 * 1:1 with mobile/lib/ui/widgets/app_file_preview/app_file_preview.dart —
 * expo-image provides the same disk-cache-by-key role
 * `cached_network_image` plays in the Dart source.
 *
 * Unlike the Dart version, key resolution (key -> presigned URI) is injected
 * via `resolveUri` rather than read from a DI container — this package
 * (@ohlify/mobile-ui) must stay app-agnostic; apps/mobile's fileService
 * (shared/services/file-service.ts) is the real implementation passed in by
 * callers (see AppAvatar in this package, and any screen rendering a raw
 * file-backed image).
 */
export interface AppFilePreviewProps {
  fileKey?: string;
  resolveUri: (key: string) => Promise<string>;
  contentFit?: ImageContentFit;
  borderRadius?: number;
  placeholder?: ReactNode;
  errorWidget?: ReactNode;
  width?: number;
  height?: number;
}

export function AppFilePreview({
  fileKey,
  resolveUri,
  contentFit = 'cover',
  borderRadius,
  placeholder,
  errorWidget,
  width,
  height,
}: AppFilePreviewProps) {
  const [resolvedUri, setResolvedUri] = useState<string>();
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    setResolvedUri(undefined);
    setError(undefined);
    if (!fileKey) return;
    let cancelled = false;
    resolveUri(fileKey)
      .then((uri) => {
        if (!cancelled) setResolvedUri(uri);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      });
    return () => {
      cancelled = true;
    };
  }, [fileKey, resolveUri]);

  let content: ReactNode;
  if (!fileKey) {
    content = placeholder ?? <DefaultPlaceholder />;
  } else if (error) {
    content = errorWidget ?? <DefaultPlaceholder />;
  } else if (!resolvedUri) {
    content = <Loading />;
  } else {
    content = (
      <Image
        source={{ uri: resolvedUri }}
        contentFit={contentFit}
        style={{ width: width ?? '100%', height: height ?? '100%' }}
        // Cache key uses the file-service `key`, not the (rotating) presigned
        // URI — so a URI refresh doesn't re-download the bytes.
        cachePolicy="disk"
        recyclingKey={fileKey}
      />
    );
  }

  return (
    <View
      style={{
        width,
        height,
        borderRadius,
        overflow: borderRadius ? 'hidden' : undefined,
      }}
    >
      {content}
    </View>
  );
}

function Loading() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ActivityIndicator size="small" />
    </View>
  );
}

function DefaultPlaceholder() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AppIcon name="person" size={24} color={colors.textSlate} />
    </View>
  );
}
