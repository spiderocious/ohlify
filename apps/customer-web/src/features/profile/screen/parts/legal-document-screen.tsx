import type { ContentBlock } from '@ohlify/api';
import { AppLoader, AppText } from '@ohlify/ui';

import { ProfileSubscreenScaffold } from './profile-subscreen-scaffold.js';

interface LegalDocumentScreenProps {
  title: string;
  blocks?: ContentBlock[];
  isLoading?: boolean;
}

/** Mirrors mobile/lib/features/profile/screen/parts/legal_document_screen.dart. */
export function LegalDocumentScreen({ title, blocks, isLoading }: LegalDocumentScreenProps) {
  return (
    <ProfileSubscreenScaffold title={title}>
      {isLoading ? (
        <div className="flex justify-center py-10">
          <AppLoader />
        </div>
      ) : (
        <div className="rounded-2xl bg-background p-4 space-y-3">
          {(blocks ?? []).map((block, i) => {
            if (block.type === 'title') {
              return (
                <AppText key={i} variant="header" weight={800} align="start" color="var(--ohl-text-jet)">
                  {block.content}
                </AppText>
              );
            }
            if (block.type === 'subtitle') {
              return (
                <AppText key={i} variant="header" weight={700} align="start" color="var(--ohl-text-jet)">
                  {block.content}
                </AppText>
              );
            }
            if (block.type === 'heading') {
              return (
                <AppText key={i} variant="body" weight={700} align="start" color="var(--ohl-text-jet)">
                  {block.content}
                </AppText>
              );
            }
            return (
              <AppText key={i} variant="body" align="start" color="var(--ohl-text-jet)" className="whitespace-pre-line">
                {block.content}
              </AppText>
            );
          })}
        </div>
      )}
    </ProfileSubscreenScaffold>
  );
}
