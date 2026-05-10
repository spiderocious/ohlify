import { useParams } from 'react-router-dom';

import { AppText } from '@ohlify/ui';

import { DetailRow, DetailSection } from '../../../shared/parts/detail-row.js';
import { PageHeader } from '../../../shared/parts/page-header.js';
import { QueryView } from '../../../shared/parts/empty-or-error.js';
import { formatDateTime } from '../../../shared/format/datetime.js';
import { formatKobo } from '../../../shared/format/kobo.js';
import { UserLink } from '../../../shared/parts/user-link.js';
import { humanizeStatus, shortId } from '../../../shared/lib/labels.js';
import { useUserWallet } from '../api/use-wallet.js';

export function UserWalletScreen() {
  const { userId = '' } = useParams<{ userId: string }>();
  const wallet = useUserWallet(userId);

  return (
    <>
      <PageHeader title={`Wallet for ${shortId(userId, 18)}`} subtitle={userId} />
      <div className="px-6 py-6">
        <div className="max-w-xl rounded-lg border border-border bg-surface">
          <QueryView isLoading={wallet.isLoading} error={wallet.error}>
            {wallet.data && (
              <>
                <DetailSection title="Wallet">
                  <DetailRow label="User ID">
                    <UserLink userId={wallet.data.user_id} idLen={18} />
                  </DetailRow>
                  <DetailRow label="Account ID">{shortId(wallet.data.account_id, 18)}</DetailRow>
                  <DetailRow label="Available">
                    <AppText variant="header">{formatKobo(wallet.data.available_kobo)}</AppText>
                  </DetailRow>
                  <DetailRow label="Pending">{formatKobo(wallet.data.pending_kobo)}</DetailRow>
                  <DetailRow label="Currency">{wallet.data.currency}</DetailRow>
                </DetailSection>

                {wallet.data.recent_journals && wallet.data.recent_journals.length > 0 && (
                  <DetailSection title={`Recent journals (${wallet.data.recent_journals.length})`}>
                    <ul className="flex flex-col gap-1">
                      {wallet.data.recent_journals.map((j) => (
                        <li
                          key={j.id}
                          className="grid grid-cols-[auto_1fr_auto] items-baseline gap-3 text-xs"
                        >
                          <span className="text-text-muted">{humanizeStatus(j.kind)}</span>
                          <span className="truncate text-text-primary">{j.memo ?? '—'}</span>
                          <span className="text-text-muted">{formatDateTime(j.created_at)}</span>
                        </li>
                      ))}
                    </ul>
                  </DetailSection>
                )}
              </>
            )}
          </QueryView>
        </div>
      </div>
    </>
  );
}
