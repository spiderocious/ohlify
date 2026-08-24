import { useState } from 'react';

import {
  HawkAvatar,
  HawkAvatarStack,
  HawkBadge,
  HawkBarChart,
  HawkCaption,
  HawkChatBubble,
  HawkChatComposer,
  HawkCountBadge,
  HawkDataState,
  HawkDonutChart,
  HawkDot,
  HawkFigure,
  HawkIdentity,
  HawkKeyValue,
  HawkLineChart,
  HawkLiveMeter,
  HawkMeter,
  HawkPass,
  HawkPresenceIndicator,
  HawkPrice,
  HawkProgressBar,
  HawkProgressRing,
  HawkSparkline,
  HawkStat,
  HawkStatCompact,
  HawkStatIcon,
  HawkStatusBadge,
  HawkTable,
  HawkTag,
  HawkText,
  HAWK_LIFECYCLE,
  HAWK_LIFECYCLE_COUNT,
  HAWK_LIFECYCLE_FAMILIES,
  IconWallet,
  formatKobo,
  lookupStatus,
} from '@ohlify/hawk-ui';

import {
  PreviewGrid,
  PreviewPage,
  PreviewRow,
  PreviewSection,
  PreviewStage,
  PreviewState,
  PreviewStates,
} from './preview-shell.js';

/**
 * @HawkPage slug=70-status-call name=Lifecycle & badges group=Status & lifecycle
 * @HawkStates soft outline solid dot
 *
 * Every named state the product has, with its tone.
 */
export function PageLifecycle() {
  return (
    <PreviewPage
      title="Lifecycle & badges"
      kicker="Status & lifecycle · 70–79"
      intro={`${HAWK_LIFECYCLE_COUNT} named states across ${HAWK_LIFECYCLE_FAMILIES.length} families. The database defines 63+; the pre-Hawk app shipped four status-pill files and flattened all of them into success/warning/error.`}
    >
      <PreviewSection
        title="The registry"
        rule="The mapping lives in one file rather than in each screen, so two surfaces can never disagree about what 'pending' looks like. Some tones are deliberately counter-intuitive: a completed call is neutral, not success — finishing a call is the normal case, and a green badge on every row makes the exceptional ones invisible."
      >
        <div className="flex flex-col gap-hawk-6">
          {HAWK_LIFECYCLE_FAMILIES.map((family) => (
            <div key={family} className="flex flex-col gap-hawk-3">
              <HawkText variant="overline" ink="muted">
                {family} · {HAWK_LIFECYCLE[family].length}
              </HawkText>
              <div className="flex flex-wrap gap-hawk-3">
                {HAWK_LIFECYCLE[family].map((status) => (
                  <HawkStatusBadge key={status.key} status={status} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </PreviewSection>

      <PreviewSection
        title="Badge vs tag"
        rule="A badge reports a state and takes a tone. A tag carries no tone at all — an interest ('Tax law') is not success or caution, and forcing it through the semantic enum would mean picking a colour that implies something about content it knows nothing about."
      >
        <div className="flex flex-col gap-hawk-4">
          <PreviewRow label="badge">
            {(['neutral', 'info', 'success', 'caution', 'critical'] as const).map((semantic) => (
              <HawkBadge key={semantic} label={semantic} semantic={semantic} dot />
            ))}
          </PreviewRow>
          <PreviewRow label="hazard">
            <HawkBadge label="Running low" hazard dot />
          </PreviewRow>
          <PreviewRow label="tag">
            <HawkTag label="Tax law" />
            <HawkTag label="Property" />
            <HawkTag label="Featured" accent />
          </PreviewRow>
          <PreviewRow label="count">
            <HawkCountBadge count={3} />
            <HawkCountBadge count={128} />
            <HawkCountBadge count={0} />
          </PreviewRow>
          <PreviewRow label="presence">
            {(['online', 'busy', 'away', 'offline'] as const).map((presence) => (
              <HawkPresenceIndicator key={presence} presence={presence} withLabel />
            ))}
          </PreviewRow>
        </div>
      </PreviewSection>

      <PreviewStates columns={4}>
        <PreviewState name="soft">
          <HawkBadge label="Pending" semantic="caution" />
        </PreviewState>
        <PreviewState name="outline">
          <HawkBadge label="Pending" semantic="caution" variant="outline" />
        </PreviewState>
        <PreviewState name="solid">
          <HawkBadge label="Pending" semantic="caution" variant="solid" />
        </PreviewState>
        <PreviewState name="dot">
          <HawkDot semantic="success" pulse label="Online" />
        </PreviewState>
      </PreviewStates>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=80-pass name=Pass group=Data display
 * @HawkStates default skeleton
 *
 * The system's signature compound, and the evidence rule.
 */
export function PagePass() {
  return (
    <PreviewPage
      title="Pass"
      kicker="Data display · 80"
      intro="Root + named slots reading shared context — never a props bag. The signature compound the whole system is named for."
    >
      <PreviewSection
        title="The evidence rule"
        rule="Pass.Stub is a required slot: a pass without its stub does not render. A marketplace that sells time by the second must never show an entitlement without showing what it costs and what record backs it. In Flutter the compiler enforces this; React children cannot be constrained that way, so Pass.Root inspects its children and throws in development — real enforcement, one build step later."
      >
        <PreviewStage ground>
          <div className="max-w-sm">
            <HawkPass.Root>
              <HawkPass.Body>
                <HawkIdentity
                  name="Adaeze Okonkwo"
                  subtitle="Tax & corporate law"
                  size="lg"
                  verified
                />
                <HawkFigure value={842_000} size="lg" />
                <HawkCaption>Earned this month</HawkCaption>
              </HawkPass.Body>
              <HawkPass.Perforation />
              <HawkPass.Stub>
                <HawkCaption>Rate</HawkCaption>
                <HawkPrice amountKobo={250_000} />
              </HawkPass.Stub>
              <HawkPass.Meta>
                <span>REF · OHL-4821</span>
                <span>22 Aug 2026</span>
              </HawkPass.Meta>
            </HawkPass.Root>
          </div>
        </PreviewStage>
      </PreviewSection>

      <PreviewStates columns={2}>
        <PreviewState name="default">
          <HawkPass.Root>
            <HawkPass.Body>
              <HawkFigure value={842_000} size="md" />
            </HawkPass.Body>
            <HawkPass.Perforation />
            <HawkPass.Stub>
              <HawkCaption>Rate</HawkCaption>
              <HawkPrice amountKobo={250_000} size="sm" />
            </HawkPass.Stub>
          </HawkPass.Root>
        </PreviewState>
        <PreviewState
          name="skeleton"
          note="Includes the stub band — omitting it would imply a shorter card and then jump."
        >
          <HawkPass.Skeleton />
        </PreviewState>
      </PreviewStates>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=81-meter name=Meter & progress group=Data display
 * @HawkStates normal warning hazard indeterminate
 *
 * The live figure, and the hazard escalation.
 */
export function PageMeter() {
  return (
    <PreviewPage
      title="Meter & progress"
      kicker="Data display · 81, 116–117"
      intro="The live meter flips rather than tweens, renders in the record face with tabular figures, and honours global masking like any other money figure."
    >
      <PreviewSection
        title="Severity escalates through hazard, not critical"
        rule="Running low on minutes is something the system reports, not an irreversible action the user took, so it belongs in the warm family. Critical red stays reserved for operator actions that cannot be undone."
      >
        <PreviewGrid columns={3}>
          <PreviewStage label="normal">
            <HawkMeter seconds={137} ratePerSecondKobo={4167} remainingSeconds={900} />
          </PreviewStage>
          <PreviewStage label="warning — under 5 min">
            <HawkMeter seconds={137} ratePerSecondKobo={4167} remainingSeconds={240} />
          </PreviewStage>
          <PreviewStage label="hazard — under 2 min">
            <HawkMeter seconds={137} ratePerSecondKobo={4167} remainingSeconds={90} />
          </PreviewStage>
        </PreviewGrid>
      </PreviewSection>

      <PreviewSection title="Live — ticking on its own">
        <PreviewStage dark>
          <HawkLiveMeter startSeconds={58} ratePerSecondKobo={4167} onDark />
        </PreviewStage>
      </PreviewSection>

      <PreviewSection title="Progress">
        <PreviewGrid columns={2}>
          <div className="flex flex-col gap-hawk-5">
            <HawkProgressBar value={0.62} label="KYC" showValue />
            <HawkProgressBar value={0.28} semantic="caution" label="Storage" showValue />
            <HawkProgressBar label="Indeterminate" />
          </div>
          <div className="flex gap-hawk-6">
            <HawkProgressRing value={0.62}>
              <HawkText variant="label" record className="font-bold">
                62%
              </HawkText>
            </HawkProgressRing>
            <HawkProgressRing value={0.9} semantic="success" />
          </div>
        </PreviewGrid>
      </PreviewSection>

      <PreviewStates columns={4}>
        <PreviewState name="normal">
          <HawkMeter seconds={137} remainingSeconds={900} />
        </PreviewState>
        <PreviewState name="warning">
          <HawkMeter seconds={137} remainingSeconds={240} />
        </PreviewState>
        <PreviewState name="hazard">
          <HawkMeter seconds={137} remainingSeconds={60} />
        </PreviewState>
        <PreviewState name="indeterminate">
          <HawkProgressBar />
        </PreviewState>
      </PreviewStates>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=82-stat-display name=Stats, avatars & key-values group=Data display
 * @HawkStates fresh stale loading
 *
 * The figure-with-a-label shapes.
 */
export function PageStat() {
  return (
    <PreviewPage
      title="Stats, avatars & key-values"
      kicker="Data display · 82–88"
      intro="Three stat shapes because the density genuinely differs, plus the identity block used across every row."
    >
      <PreviewSection
        title="Deltas know which way is good"
        rule="riseIsGood defaults to true, but refunds and failed calls are metrics where up is bad — colouring those green because the number grew would be actively misleading on an operator dashboard."
      >
        <PreviewGrid columns={3}>
          <PreviewStage label="revenue — up is good">
            <HawkStat
              label="Revenue"
              valueKobo={84_200_000}
              delta={{ percent: 12.4, period: 'vs last week' }}
            />
          </PreviewStage>
          <PreviewStage label="refunds — up is bad">
            <HawkStat
              label="Refunds"
              valueKobo={2_400_000}
              delta={{ percent: 8.1, period: 'vs last week', riseIsGood: false }}
            />
          </PreviewStage>
          <PreviewStage label="stale">
            <HawkStat
              label="Revenue"
              valueKobo={84_200_000}
              dataState={HawkDataState.STALE}
              ageMs={4 * 60_000}
            />
          </PreviewStage>
        </PreviewGrid>
      </PreviewSection>

      <PreviewSection title="Compact and icon variants">
        <PreviewGrid columns={2}>
          <PreviewStage label="compact">
            <div className="flex gap-hawk-8">
              <HawkStatCompact label="Calls" value="1,284" />
              <HawkStatCompact label="Minutes" value="18,420" />
              <HawkStatCompact label="Earned" valueKobo={84_200_000} />
            </div>
          </PreviewStage>
          <PreviewStage label="with a glyph">
            <HawkStatIcon
              label="Wallet balance"
              valueKobo={842_000}
              icon={IconWallet}
              semantic="success"
            />
          </PreviewStage>
        </PreviewGrid>
      </PreviewSection>

      <PreviewSection title="Avatars">
        <div className="flex flex-col gap-hawk-5">
          <PreviewRow label="sizes">
            {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size) => (
              <HawkAvatar key={size} name="Adaeze Okonkwo" size={size} />
            ))}
          </PreviewRow>
          <PreviewRow label="presence">
            <HawkAvatar name="Adaeze Okonkwo" presence="online" />
            <HawkAvatar name="Chidi Nwosu" presence="busy" />
            <HawkAvatar name="Fatima Bello" presence="offline" />
          </PreviewRow>
          <PreviewRow label="verified">
            <HawkAvatar name="Adaeze Okonkwo" verified size="lg" />
          </PreviewRow>
          <PreviewRow label="stack">
            <HawkAvatarStack
              people={[
                { name: 'Adaeze Okonkwo' },
                { name: 'Chidi Nwosu' },
                { name: 'Fatima Bello' },
                { name: 'Segun Adeyemi' },
                { name: 'Ngozi Eze' },
              ]}
              max={3}
            />
          </PreviewRow>
        </div>
      </PreviewSection>

      <PreviewSection
        title="Key-value"
        note="The label takes the space it needs and the value takes the rest, rather than a fixed split — 'Reference' and 'Bank account number' are very different widths."
      >
        <PreviewStage>
          <div className="max-w-md divide-y divide-hawk-line">
            <HawkKeyValue label="Reference" value="OHL-4821-XQ" record />
            <HawkKeyValue label="Bank" value="GTBank" />
            <HawkKeyValue label="Account number" value="0123456789" record />
            <HawkKeyValue label="Amount" value={<HawkFigure value={842_000} size="sm" />} />
          </div>
        </PreviewStage>
      </PreviewSection>

      <PreviewStates columns={3}>
        <PreviewState name="fresh">
          <HawkStat label="Revenue" valueKobo={84_200_000} />
        </PreviewState>
        <PreviewState name="stale">
          <HawkStat
            label="Revenue"
            valueKobo={84_200_000}
            dataState={HawkDataState.STALE}
            ageMs={240_000}
          />
        </PreviewState>
        <PreviewState name="loading">
          <HawkStat label="Revenue" dataState={HawkDataState.LOADING} />
        </PreviewState>
      </PreviewStates>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=91-chart-bar name=Charts group=Data display
 * @HawkStates bar line donut sparkline
 *
 * SVG, no charting library.
 */
export function PageChart() {
  const WEEK = [
    { label: 'Mon', value: 12 },
    { label: 'Tue', value: 19 },
    { label: 'Wed', value: 8 },
    { label: 'Thu', value: 24 },
    { label: 'Fri', value: 31 },
    { label: 'Sat', value: 17 },
    { label: 'Sun', value: 6 },
  ];

  return (
    <PreviewPage
      title="Charts"
      kicker="Data display · 91–94"
      intro="Drawn as SVG. Adding a charting library would be a new runtime dependency for the whole admin app, and these shapes are a few dozen lines of path maths each."
    >
      <PreviewSection
        title="Bar"
        rule="A zero-value bar still gets 2px, so 'nothing happened' reads as a measured zero rather than a missing column."
      >
        <PreviewGrid columns={2}>
          <PreviewStage label="vertical">
            <HawkBarChart data={WEEK} />
          </PreviewStage>
          <PreviewStage label="horizontal — for long labels">
            <HawkBarChart
              horizontal
              data={[
                { label: 'Withdrawals', value: 48 },
                { label: 'Refunds', value: 12, semantic: 'caution' },
                { label: 'Reversals', value: 3, semantic: 'critical' },
              ]}
            />
          </PreviewStage>
        </PreviewGrid>
      </PreviewSection>

      <PreviewSection title="Line & donut">
        <PreviewGrid columns={2}>
          <PreviewStage label="line">
            <HawkLineChart data={WEEK} />
          </PreviewStage>
          <PreviewStage label="donut">
            <HawkDonutChart
              data={[
                { label: 'Completed', value: 812 },
                { label: 'Missed', value: 96 },
                { label: 'Cancelled', value: 48 },
              ]}
              centre={
                <>
                  <HawkText variant="body-title" record className="font-bold">
                    956
                  </HawkText>
                  <HawkCaption>calls</HawkCaption>
                </>
              }
            />
          </PreviewStage>
        </PreviewGrid>
      </PreviewSection>

      <PreviewSection
        title="Sparkline"
        note="Scaled to its own min/max rather than from zero: at this size the shape of the movement is the entire signal, and anchoring to zero would flatten every interesting series."
      >
        <PreviewStage>
          <div className="flex items-center gap-hawk-6">
            <HawkSparkline values={[4, 9, 6, 12, 8, 18, 22]} />
            <HawkSparkline values={[22, 18, 19, 12, 9, 7, 4]} semantic="critical" />
          </div>
        </PreviewStage>
      </PreviewSection>

      <PreviewStates columns={4}>
        <PreviewState name="bar">
          <HawkBarChart data={WEEK.slice(0, 4)} height={80} />
        </PreviewState>
        <PreviewState name="line">
          <HawkLineChart data={WEEK.slice(0, 4)} height={80} />
        </PreviewState>
        <PreviewState name="donut">
          <HawkDonutChart
            data={[
              { label: 'A', value: 3 },
              { label: 'B', value: 1 },
            ]}
            size={80}
            thickness={14}
          />
        </PreviewState>
        <PreviewState name="sparkline">
          <HawkSparkline values={[4, 9, 6, 12, 8]} />
        </PreviewState>
      </PreviewStates>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=95-table name=Table group=Data display
 * @HawkStates default loading empty error stale
 *
 * The BOARD register's centrepiece.
 */
export function PageTable() {
  const [sort, setSort] = useState({ key: 'amount', direction: 'desc' as const });
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const ROWS = [
    { id: '1', name: 'Adaeze Okonkwo', bank: 'GTBank', amount: 8_420_000, status: 'pending' },
    { id: '2', name: 'Chidi Nwosu', bank: 'Zenith Bank', amount: 1_250_000, status: 'approved' },
    { id: '3', name: 'Fatima Bello', bank: 'Access Bank', amount: 640_000, status: 'rejected' },
  ];

  const columns = [
    {
      key: 'name',
      header: 'Professional',
      render: (r: (typeof ROWS)[number]) => r.name,
      width: '30%',
    },
    { key: 'bank', header: 'Bank', render: (r: (typeof ROWS)[number]) => r.bank },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right' as const,
      sortable: true,
      render: (r: (typeof ROWS)[number]) => formatKobo(r.amount),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r: (typeof ROWS)[number]) => {
        const status = lookupStatus('withdrawal', r.status);
        return status ? <HawkStatusBadge status={status} /> : r.status;
      },
    },
  ];

  return (
    <PreviewPage
      title="Table"
      kicker="Data display · 95 · Admin · A03"
      intro="Owns loading, empty, error and stale rendering so feature code never reimplements those four."
    >
      <PreviewSection
        title="Columns are fixed-width with truncation"
        rule="A long Nigerian name must ellipsis rather than push the amount column out of alignment. A board whose columns move between rows is not scannable, and scanning is the only thing a board is for."
      >
        <PreviewStage className="p-0">
          <HawkTable
            columns={columns}
            rows={ROWS}
            rowKey={(r) => r.id}
            sort={sort}
            onSortChange={(next) => setSort(next as typeof sort)}
            selectable={(r) => r.status === 'pending'}
            selectedKeys={selected}
            onSelectionChange={setSelected}
          />
        </PreviewStage>
      </PreviewSection>

      <PreviewSection
        title="Stale is a banner, not a replacement"
        rule="With cached data present the error is a thin banner over data the user keeps — never a full-screen error that discards readable rows. A full error state belongs only to a cold cache."
      >
        <PreviewStage className="p-0">
          <HawkTable
            columns={columns}
            rows={ROWS}
            rowKey={(r) => r.id}
            dataState={HawkDataState.STALE}
            ageMs={4 * 60_000}
            onRetry={() => {}}
          />
        </PreviewStage>
      </PreviewSection>

      <PreviewStates columns={2}>
        <PreviewState name="default">
          <HawkTable columns={columns.slice(0, 2)} rows={ROWS.slice(0, 2)} rowKey={(r) => r.id} />
        </PreviewState>
        <PreviewState name="loading" note="Skeleton rows mirror the real row shape.">
          <HawkTable
            columns={columns.slice(0, 2)}
            rows={[]}
            rowKey={(r) => r.id}
            dataState={HawkDataState.LOADING}
            skeletonRows={3}
          />
        </PreviewState>
        <PreviewState name="empty">
          <HawkTable columns={columns.slice(0, 2)} rows={[]} rowKey={(r) => r.id} />
        </PreviewState>
        <PreviewState name="error" note="Cold cache only.">
          <HawkTable
            columns={columns.slice(0, 2)}
            rows={[]}
            rowKey={(r) => r.id}
            error="The server did not respond."
            onRetry={() => {}}
          />
        </PreviewState>
      </PreviewStates>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=89-chat-bubble name=Chat group=Data display
 * @HawkStates sending sent delivered read failed
 *
 * Bubbles, the composer, and delivery state.
 */
export function PageChat() {
  const [draft, setDraft] = useState('');

  return (
    <PreviewPage
      title="Chat"
      kicker="Data display · 89–90"
      intro="Delivery status sits on the viewer's own messages only. On a received message it would be meaningless — the sender's read receipt is not the recipient's business."
    >
      <PreviewSection title="A thread">
        <PreviewStage>
          <div className="flex max-w-lg flex-col gap-hawk-4">
            <HawkChatBubble
              message="Good afternoon. I saw your profile — do you handle property disputes?"
              author="Chidi Nwosu"
              timestamp="14:02"
            />
            <HawkChatBubble
              own
              message="Yes, that is most of my practice. Happy to talk it through."
              timestamp="14:04"
              status="read"
            />
            <HawkChatBubble
              own
              message="Are you free at 15:00?"
              timestamp="14:04"
              status="delivered"
            />
            <HawkChatBubble
              own
              message="This one did not send."
              timestamp="14:05"
              status="failed"
              onRetry={() => {}}
            />
          </div>
        </PreviewStage>
      </PreviewSection>

      <PreviewSection
        title="Composer"
        note="Enter sends; Shift+Enter breaks the line. The reverse would make every multi-line message an accident."
      >
        <PreviewStage className="p-0">
          <HawkChatComposer
            value={draft}
            onChange={setDraft}
            onSend={() => setDraft('')}
            onAttach={() => {}}
          />
        </PreviewStage>
      </PreviewSection>

      <PreviewSection title="Closed thread">
        <PreviewStage className="p-0">
          <HawkChatComposer
            disabled
            disabledReason="This conversation ended when the call finished."
          />
        </PreviewStage>
      </PreviewSection>

      <PreviewStates columns={4}>
        {(['sending', 'sent', 'delivered', 'read', 'failed'] as const).map((status) => (
          <PreviewState key={status} name={status}>
            <HawkChatBubble own message="Hello" timestamp="14:04" status={status} />
          </PreviewState>
        ))}
      </PreviewStates>
    </PreviewPage>
  );
}
