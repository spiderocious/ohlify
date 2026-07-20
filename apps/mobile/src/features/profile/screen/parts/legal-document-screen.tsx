import { AppText, colors } from '@ohlify/mobile-ui';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { apiErrorMessage, ApiError } from '@shared/types/api-error';

import { legalApi } from '@features/legal/api/legal-api';
import type { LegalDoc, LegalDocKind } from '@features/legal/types/legal-models';
import { ProfileSubscreenScaffold } from './profile-subscreen-scaffold';

export interface LegalDocumentScreenProps {
  kind: LegalDocKind;
  /** Shown in the scaffold header until the document loads. */
  fallbackTitle: string;
}

/**
 * Generic renderer for the privacy / EULA / terms screens. Backed by GET
 * /legal/{kind}. Body is rendered as a single block of plain text. Mirrors
 * mobile/lib/features/profile/screen/parts/legal_document_screen.dart.
 */
export function LegalDocumentScreen({ kind, fallbackTitle }: LegalDocumentScreenProps) {
  const [doc, setDoc] = useState<LegalDoc | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    legalApi
      .getDoc(kind)
      .then((d) => {
        if (!cancelled) setDoc(d);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof ApiError ? e : ApiError.network);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [kind]);

  let body;
  if (loading) {
    body = (
      <View style={{ paddingVertical: 32, alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  } else if (error) {
    body = (
      <View style={{ paddingVertical: 32 }}>
        <AppText variant="body" color={colors.textMuted} align="center">
          {apiErrorMessage(error)}
        </AppText>
      </View>
    );
  } else {
    body = (
      <View>
        {doc?.updatedAt ? (
          <>
            <AppText variant="body" color={colors.textJet} weight="700" align="left">
              {`Effective: ${new Date(doc.updatedAt).toLocaleDateString()}`}
            </AppText>
            <View style={{ height: 14 }} />
          </>
        ) : null}
        <AppText variant="body" color={colors.textCharcoal} align="left">
          {doc?.body ?? ''}
        </AppText>
      </View>
    );
  }

  return <ProfileSubscreenScaffold title={doc?.title ?? fallbackTitle} body={body} />;
}
