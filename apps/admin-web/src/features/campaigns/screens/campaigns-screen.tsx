import {
  HawkAdminPageHeader,
  HawkAdminPanel,
  HawkCallout,
  HawkEmptyState,
  HawkSemantic,
} from '@ohlify/hawk-ui';

import { RowsSkeleton } from '../../../shared/parts/board-skeletons.js';
import { useCampaigns } from '../api/use-campaigns.js';
import { CampaignComposer } from '../parts/campaign-composer.js';
import { CampaignRow } from '../parts/campaign-row.js';

/**
 * Campaigns (A29) — compose, see the reach, send.
 *
 * The five-minute delay is the design: a campaign reaches everyone at once and
 * cannot be recalled, so the send is deliberately not instant. The banner says
 * that up front rather than leaving it as a surprise in the row's countdown.
 */
export function CampaignsScreen() {
  const campaigns = useCampaigns();
  const items = campaigns.data?.items ?? [];

  return (
    <>
      <HawkAdminPageHeader title="Campaigns" subtitle="Send a notification to a group of users." />

      <div className="flex flex-col gap-hawk-6 px-hawk-pad pb-hawk-9">
        <HawkCallout
          semantic={HawkSemantic.INFO}
          title="Every send waits five minutes"
          message="A campaign reaches its whole audience at once and cannot be recalled. The delay is the only window to change your mind — cancel from the row below."
        />

        <CampaignComposer />

        {campaigns.isLoading ? (
          <RowsSkeleton rows={4} />
        ) : items.length === 0 ? (
          <HawkEmptyState
            title="No campaigns yet"
            description="Anything you compose above shows up here as a draft."
          />
        ) : (
          <HawkAdminPanel title="Campaigns" flush>
            <div className="flex flex-col">
              {items.map((campaign) => (
                <CampaignRow key={campaign.id} campaign={campaign} />
              ))}
            </div>
          </HawkAdminPanel>
        )}
      </div>
    </>
  );
}
