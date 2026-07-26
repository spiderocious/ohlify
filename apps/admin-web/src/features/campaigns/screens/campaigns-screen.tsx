import { PageHeader } from '../../../shared/parts/page-header.js';
import { QueryView } from '../../../shared/parts/empty-or-error.js';
import { useCampaigns } from '../api/use-campaigns.js';
import { CampaignComposer } from '../parts/campaign-composer.js';
import { CampaignRow } from '../parts/campaign-row.js';

/**
 * Compose a campaign, see who it reaches, send it — with five minutes to
 * change your mind.
 */
export function CampaignsScreen() {
  const campaigns = useCampaigns();
  const items = campaigns.data?.items ?? [];

  return (
    <>
      <PageHeader
        title="Campaigns"
        subtitle="Send a notification to a group of users. Every send waits 5 minutes so it can be cancelled."
      />

      <div className="flex flex-col gap-5">
        <CampaignComposer />

        <QueryView
          isLoading={campaigns.isLoading}
          error={campaigns.error}
          isEmpty={items.length === 0}
          emptyTitle="No campaigns yet"
          emptyDescription="Anything you compose above shows up here as a draft."
        >
          <section className="rounded-2xl border border-slate-200 bg-white">
            {items.map((campaign) => (
              <CampaignRow key={campaign.id} campaign={campaign} />
            ))}
          </section>
        </QueryView>
      </div>
    </>
  );
}
