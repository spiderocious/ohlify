import { useState } from 'react';

import {
  HawkActiveFilters,
  HawkAdminPageHeader,
  HawkAdminPanel,
  HawkAuditLog,
  HawkAuditLogSkeleton,
  HawkBalanceCheck,
  HawkBulkActionBar,
  HawkButton,
  HawkConfigDiff,
  HawkConfigField,
  HawkConfigSection,
  HawkDataState,
  HawkDetailDrawer,
  HawkDrawer,
  HawkDropdown,
  HawkFilterBar,
  HawkFilterGroup,
  HawkFilterRail,
  HawkJournalComposer,
  HawkKpiCard,
  HawkKpiStrip,
  HawkModerationItem,
  HawkRegister,
  HawkRegisterScope,
  HawkSwitch,
  HawkTextInput,
  HawkCurrencyInput,
  HawkText,
  IconAlertTriangle,
  IconPhone,
  IconReceipt,
  IconWallet,
  type HawkJournalLine,
} from '@ohlify/hawk-ui';

import {
  PreviewGrid,
  PreviewPage,
  PreviewSection,
  PreviewStage,
  PreviewState,
  PreviewStates,
} from './preview-shell.js';

const KPIS = [
  {
    key: 'revenue',
    label: 'Net revenue',
    valueKobo: 84_200_000,
    icon: IconWallet,
    basis: 'net' as const,
    delta: { percent: 12.4, period: 'vs last week' },
    trend: [4, 9, 6, 12, 8, 18, 22],
    semantic: 'success' as const,
  },
  {
    key: 'volume',
    label: 'Gross volume',
    valueKobo: 412_800_000,
    icon: IconReceipt,
    basis: 'gross' as const,
    delta: { percent: 8.2, period: 'vs last week' },
    trend: [12, 14, 11, 18, 21, 24, 28],
  },
  {
    key: 'calls',
    label: 'Calls',
    value: '1,284',
    icon: IconPhone,
    delta: { percent: -3.1, period: 'vs last week' },
    trend: [22, 20, 21, 18, 17, 15, 14],
  },
  {
    key: 'refunds',
    label: 'Refunds',
    valueKobo: 2_400_000,
    icon: IconAlertTriangle,
    delta: { percent: 8.1, period: 'vs last week', riseIsGood: false },
    semantic: 'caution' as const,
    trend: [1, 2, 2, 3, 4, 6, 8],
  },
];

/**
 * @HawkPage slug=A02-kpi-strip name=KPI strip group=Board
 * @HawkStates default loading gross net
 *
 * Hairline verticals, not gaps.
 */
export function PageKpi() {
  return (
    <PreviewPage
      title="KPI strip"
      kicker="Admin · A02, A27"
      intro="From the reference dashboards: cells divided by hairline verticals, not gaps — one continuous band rather than a row of floating cards."
    >
      <PreviewSection
        title="The band"
        rule="That is the BOARD register's whole thesis — rules carry structure, not surfaces — and it is what stops a dashboard header from reading as six unrelated widgets."
      >
        <PreviewStage ground className="p-hawk-5">
          <HawkKpiStrip items={KPIS} />
        </PreviewStage>
      </PreviewSection>

      <PreviewSection
        title="Gross vs net is explicit"
        rule="On a revenue dashboard, gross volume and net revenue are different numbers that look identical in a cell, and an operator reading the wrong one draws the wrong conclusion. The basis tag is not decoration."
      >
        <PreviewGrid columns={2}>
          <HawkKpiCard kpi={KPIS[0]!} />
          <HawkKpiCard kpi={KPIS[1]!} />
        </PreviewGrid>
      </PreviewSection>

      <PreviewSection
        title="Polarity is explicit too"
        note="Refunds rising is bad. riseIsGood: false is what stops the delta rendering green because the number grew."
      >
        <PreviewStage ground className="p-hawk-5">
          <HawkKpiStrip items={[KPIS[3]!, KPIS[2]!]} />
        </PreviewStage>
      </PreviewSection>

      <PreviewStates columns={2}>
        <PreviewState name="default">
          <HawkKpiStrip items={KPIS.slice(0, 2)} />
        </PreviewState>
        <PreviewState name="loading">
          <HawkKpiStrip items={KPIS.slice(0, 2)} dataState={HawkDataState.LOADING} />
        </PreviewState>
        <PreviewState name="gross">
          <HawkKpiCard kpi={KPIS[1]!} />
        </PreviewState>
        <PreviewState name="net">
          <HawkKpiCard kpi={KPIS[0]!} />
        </PreviewState>
      </PreviewStates>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=A04-detail-drawer name=Detail drawer group=Board
 * @HawkStates match mismatch unchecked skeleton
 *
 * The admin's most-used overlay, and the name-match check.
 */
export function PageDetailDrawer() {
  const [open, setOpen] = useState<'match' | 'mismatch' | null>(null);

  const drawer = (match: boolean) => (
    <HawkDetailDrawer.Root
      open={open === (match ? 'match' : 'mismatch')}
      onClose={() => setOpen(null)}
      title="Withdrawal"
      subtitle="OHL-4821-XQ"
      actions={
        <div className="flex w-full items-center justify-end gap-hawk-3">
          <HawkButton label="Reject" variant="outline" destructive size="sm" onClick={() => setOpen(null)} />
          <HawkButton
            label="Approve"
            size="sm"
            onClick={async () => {
              const ok = await HawkDrawer.typedConfirm({
                title: 'Approve this withdrawal?',
                message: 'This moves money out of the platform account and cannot be reversed.',
                phrase: 'APPROVE',
              });
              if (ok) setOpen(null);
            }}
          />
        </div>
      }
    >
      <HawkDetailDrawer.NameMatch
        accountName={match ? 'Adaeze Okonkwo' : 'A. O. Enterprises'}
        verifiedName="Adaeze Okonkwo"
        match={match}
      />
      <HawkDetailDrawer.Section title="Payout">
        <HawkDetailDrawer.Row label="Amount" value="₦84,200.00" record />
        <HawkDetailDrawer.Row label="Fee" value="₦50.00" record />
        <HawkDetailDrawer.Row label="Bank" value="GTBank" />
        <HawkDetailDrawer.Row label="Account number" value="0123456789" record />
      </HawkDetailDrawer.Section>
      <HawkDetailDrawer.Section title="Requested by">
        <HawkDetailDrawer.Row label="Professional" value="Adaeze Okonkwo" />
        <HawkDetailDrawer.Row label="KYC" value="Verified · 12 Jun 2026" />
        <HawkDetailDrawer.Row label="Prior withdrawals" value="14" record />
      </HawkDetailDrawer.Section>
    </HawkDetailDrawer.Root>
  );

  return (
    <PreviewPage
      title="Detail drawer"
      kicker="Admin · A04"
      intro="Its job is to make approval safe. Amount, bank, account number and the verified-identity match are all on screen before the operator can act."
    >
      <PreviewSection
        title="The name-match check is the point"
        rule="Approving a payout to a name that does not match the KYC identity is how a marketplace loses money it cannot recover. The drawer states the verdict rather than showing two strings and hoping the operator compares them. `match` is a three-state, not a boolean — 'not checked' must never render as 'matches'."
      >
        <PreviewStage>
          <div className="flex gap-hawk-4">
            <HawkButton label="Names match" variant="outline" onClick={() => setOpen('match')} />
            <HawkButton label="Names do not match" variant="outline" destructive onClick={() => setOpen('mismatch')} />
          </div>
        </PreviewStage>
      </PreviewSection>

      {drawer(true)}
      {drawer(false)}

      <PreviewStates columns={2}>
        <PreviewState name="match">
          <HawkDetailDrawer.NameMatch
            accountName="Adaeze Okonkwo"
            verifiedName="Adaeze Okonkwo"
            match
          />
        </PreviewState>
        <PreviewState name="mismatch">
          <HawkDetailDrawer.NameMatch
            accountName="A. O. Enterprises"
            verifiedName="Adaeze Okonkwo"
            match={false}
          />
        </PreviewState>
        <PreviewState name="unchecked" note="Never renders as a match.">
          <HawkDetailDrawer.NameMatch
            accountName="A. O. Enterprises"
            verifiedName="Adaeze Okonkwo"
          />
        </PreviewState>
        <PreviewState name="skeleton">
          <HawkDetailDrawer.Skeleton />
        </PreviewState>
      </PreviewStates>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=A06-manual-journal name=Manual journal group=Board
 * @HawkStates balanced unbalanced empty
 *
 * The highest-gravity surface in the product.
 */
export function PageJournal() {
  const [lines, setLines] = useState<HawkJournalLine[]>([
    { id: 'l1', account: '1000', debitKobo: 500_000, memo: 'Correcting a mis-posted top-up' },
    { id: 'l2', account: '2100', creditKobo: 500_000, memo: '' },
  ]);

  const ACCOUNTS = [
    { value: '1000', label: '1000 · Platform cash', description: 'Asset' },
    { value: '2100', label: '2100 · User wallet liability', description: 'Liability' },
    { value: '4000', label: '4000 · Platform revenue', description: 'Income' },
    { value: '5000', label: '5000 · Payment processing fees', description: 'Expense' },
  ];

  return (
    <PreviewPage
      title="Manual journal"
      kicker="Admin · A06"
      intro="This posts directly to a double-entry ledger. Two rules are enforced in the component rather than left to the operator or the backend."
    >
      <PreviewSection
        title="Unbalanced blocks submission"
        rule="Debits must equal credits, to the kobo. The submit button is disabled and the imbalance is stated as a figure, not as 'invalid'. An operator who knows they are ₦2,500 out can find the line; one told 'invalid' cannot."
      >
        <PreviewStage className="p-hawk-5">
          <HawkJournalComposer
            lines={lines}
            onChange={setLines}
            accounts={ACCOUNTS}
            narration="Correcting a mis-posted top-up from 18 Aug"
            onPost={async () => {
              const ok = await HawkDrawer.typedConfirm({
                title: 'Post this journal?',
                message: 'It will be written to the ledger and cannot be edited or deleted.',
                phrase: 'POST',
                confirmLabel: 'Post journal',
              });
              if (ok) HawkDrawer.feedback({ title: 'Journal posted', semantic: 'success' });
            }}
            onCancel={() => {}}
          />
        </PreviewStage>
      </PreviewSection>

      <PreviewSection
        title="Guards"
        note="A line is a debit or a credit, never both — typing in one column clears the other rather than letting a line carry two amounts the ledger would reject downstream. And posting requires a typed confirmation: an irreversible action that is one keystroke away from confirm() will eventually be written as confirm()."
      >
        <PreviewGrid columns={3}>
          <HawkBalanceCheck difference={0} balanced />
          <HawkBalanceCheck difference={250_000} balanced={false} />
          <HawkBalanceCheck difference={-250_000} balanced={false} />
        </PreviewGrid>
      </PreviewSection>

      <PreviewStates columns={3}>
        <PreviewState name="balanced">
          <HawkBalanceCheck difference={0} balanced />
        </PreviewState>
        <PreviewState name="unbalanced">
          <HawkBalanceCheck difference={250_000} balanced={false} />
        </PreviewState>
        <PreviewState name="empty">
          <HawkBalanceCheck difference={0} balanced={false} />
        </PreviewState>
      </PreviewStates>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=A08-filters name=Filters group=Board
 * @HawkStates none active rail
 *
 * Tabs and filters on separate lines, always visible.
 */
export function PageFilters() {
  const [tab, setTab] = useState('pending');
  const [query, setQuery] = useState('');
  const [bank, setBank] = useState<string | undefined>('gtb');

  return (
    <PreviewPage
      title="Filters"
      kicker="Admin · A08"
      intro="Two rules the specimen is explicit about, and both are about collisions."
    >
      <PreviewSection
        title="Tabs and filters on separate lines"
        rule="Crowding them onto one line is what makes an admin queue's header collapse the moment a status gains a longer label. The filter row sits on its own line beneath — the reference does this, and it is why nothing collides."
      >
        <PreviewStage className="p-0">
          <HawkFilterBar
            tabs={[
              { value: 'pending', label: 'Pending', count: 12 },
              { value: 'approved', label: 'Approved', count: 248 },
              { value: 'auto_approved', label: 'Auto-approved', count: 1_042 },
              { value: 'rejected', label: 'Rejected', count: 3 },
            ]}
            activeTab={tab}
            onTabChange={setTab}
            query={query}
            onQueryChange={setQuery}
            searchPlaceholder="Search by name or reference"
            actions={<HawkButton label="Export" variant="outline" size="sm" onClick={() => {}} />}
          >
            <div className="w-48">
              <HawkDropdown
                options={[
                  { value: 'gtb', label: 'GTBank' },
                  { value: 'zenith', label: 'Zenith Bank' },
                ]}
                value={bank}
                onChange={setBank}
                placeholder="Any bank"
              />
            </div>
          </HawkFilterBar>
          <HawkActiveFilters
            filters={[
              { key: 'bank', label: 'Bank', value: 'GTBank', onRemove: () => setBank(undefined) },
              { key: 'amount', label: 'Amount', value: '> ₦50,000', onRemove: () => {} },
            ]}
            onClearAll={() => setBank(undefined)}
          />
        </PreviewStage>
      </PreviewSection>

      <PreviewSection
        title="Active filters are always visible"
        rule="A filter applied behind a panel the operator has closed is how a queue comes to look empty and gets escalated as a bug."
      >
        <PreviewStage className="p-0">
          <HawkActiveFilters
            filters={[{ key: 'status', label: 'Status', value: 'Pending', onRemove: () => {} }]}
          />
        </PreviewStage>
      </PreviewSection>

      <PreviewSection
        title="Filter rail — for many dimensions"
        note="A rail keeps the table's own width stable as filters are added, which a wrapping bar does not."
      >
        <PreviewStage className="p-0">
          <div className="flex h-96">
            <HawkFilterRail activeCount={2} onClearAll={() => {}}>
              <HawkFilterGroup title="Status">
                <HawkSwitch label="Pending" checked onChange={() => {}} />
                <HawkSwitch label="Approved" onChange={() => {}} />
              </HawkFilterGroup>
              <HawkFilterGroup title="Bank">
                <HawkDropdown
                  options={[{ value: 'gtb', label: 'GTBank' }]}
                  value={bank}
                  onChange={setBank}
                />
              </HawkFilterGroup>
              <HawkFilterGroup title="Amount">
                <HawkCurrencyInput value={5_000_000} onChange={() => {}} />
              </HawkFilterGroup>
            </HawkFilterRail>
            <div className="flex flex-1 items-center justify-center bg-hawk-ground">
              <HawkText variant="caption" ink="disabled">
                The table sits here, at a stable width.
              </HawkText>
            </div>
          </div>
        </PreviewStage>
      </PreviewSection>

      <PreviewStates columns={3}>
        <PreviewState name="none" note="Renders nothing — an empty 'Filters:' label is chrome that says nothing.">
          <HawkActiveFilters filters={[]} />
        </PreviewState>
        <PreviewState name="active">
          <HawkActiveFilters
            filters={[{ key: 'a', label: 'Status', value: 'Pending', onRemove: () => {} }]}
          />
        </PreviewState>
        <PreviewState name="rail">
          <div className="h-40 overflow-hidden">
            <HawkFilterRail activeCount={1}>
              <HawkFilterGroup title="Status">
                <HawkSwitch label="Pending" checked onChange={() => {}} />
              </HawkFilterGroup>
            </HawkFilterRail>
          </div>
        </PreviewState>
      </PreviewStates>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=A09-audit-log name=Audit, config & moderation group=Board
 * @HawkStates default high-gravity skeleton dirty
 *
 * The operator-action record and the config editor.
 */
export function PageAudit() {
  const [fee, setFee] = useState(500);

  return (
    <PreviewPage
      title="Audit, config & moderation"
      kicker="Admin · A09, A12, A18"
      intro="An audit entry with no actor is not an audit entry, and 'changed the withdrawal limit' is not auditable — '₦50,000 → ₦200,000' is."
    >
      <PreviewSection
        title="Audit log"
        rule="High-gravity actions are marked. A manual journal or a KYC rejection is visually distinct from a login, because an operator scanning for the consequential entries should not have to read every row."
      >
        <PreviewStage className="p-0">
          <HawkAuditLog
            entries={[
              {
                id: '1',
                actor: 'Feranmi Adeniji',
                actorRole: 'Admin',
                action: 'posted a manual journal',
                target: 'JNL-4821',
                timestamp: '22 Aug 2026 · 14:22',
                highGravity: true,
                origin: '102.89.44.12',
                changes: [{ field: 'Amount', after: '₦5,000.00' }],
              },
              {
                id: '2',
                actor: 'Ngozi Eze',
                actorRole: 'Finance',
                action: 'changed',
                target: 'Withdrawal limit',
                timestamp: '22 Aug 2026 · 11:04',
                highGravity: true,
                changes: [{ field: 'Daily limit', before: '₦50,000', after: '₦200,000' }],
              },
              {
                id: '3',
                actor: 'Segun Adeyemi',
                actorRole: 'Support',
                action: 'signed in',
                timestamp: '22 Aug 2026 · 09:15',
                origin: '41.58.120.9',
              },
            ]}
          />
        </PreviewStage>
      </PreviewSection>

      <PreviewSection
        title="Config"
        rule="Shows the live value beside the editor whenever the field is dirty. An operator changing a platform fee needs to see what it is while typing what it will become — a config screen that hides the current value invites exactly the mistake it is being edited to fix."
      >
        <PreviewStage>
          <HawkConfigSection
            title="Fees"
            description="Applied to every completed call."
          >
            <HawkConfigField
              label="Platform fee"
              description="A percentage of the call value, taken at settlement."
              dirty={fee !== 500}
              currentValue="5.00%"
              highImpact
            >
              <HawkTextInput
                value={String(fee / 100)}
                onChange={(v) => setFee(Math.round(Number(v || 0) * 100))}
              />
            </HawkConfigField>
            <HawkConfigField label="Withdrawal fee" description="Flat, per transfer.">
              <HawkCurrencyInput value={5_000} onChange={() => {}} />
            </HawkConfigField>
          </HawkConfigSection>
        </PreviewStage>
      </PreviewSection>

      <PreviewSection
        title="The save diff"
        note="Lists exactly what is about to change before a config save commits — paired with a typed confirm on any high-impact field."
      >
        <PreviewStage>
          <HawkConfigDiff
            changes={[
              { field: 'Platform fee', before: '5.00%', after: '7.50%', highImpact: true },
              { field: 'Withdrawal fee', before: '₦50', after: '₦50' },
            ]}
          />
        </PreviewStage>
      </PreviewSection>

      <PreviewSection
        title="Moderation queue"
        rule="Shows prior strikes beside the report. A moderator deciding on a first offence and a fourth needs to know which one this is before they act, not after opening a second screen — the queue is where the decision happens."
      >
        <PreviewStage className="p-0">
          <HawkModerationItem
            subject="Chidi Nwosu"
            reason="Abusive language"
            content="The reported message would appear here, quoted verbatim."
            reporter="Adaeze Okonkwo"
            timestamp="22 Aug · 14:22"
            priorStrikes={2}
            onUphold={() => {}}
            onDismiss={() => {}}
          />
          <HawkModerationItem
            subject="Fatima Bello"
            reason="Spam"
            reporter="System"
            timestamp="21 Aug · 09:11"
            priorStrikes={0}
            onUphold={() => {}}
            onDismiss={() => {}}
          />
        </PreviewStage>
      </PreviewSection>

      <PreviewStates columns={2}>
        <PreviewState name="default">
          <HawkAuditLog
            entries={[
              { id: '1', actor: 'Segun Adeyemi', action: 'signed in', timestamp: '09:15' },
            ]}
          />
        </PreviewState>
        <PreviewState name="high-gravity">
          <HawkAuditLog
            entries={[
              {
                id: '1',
                actor: 'Feranmi Adeniji',
                action: 'posted a manual journal',
                target: 'JNL-4821',
                timestamp: '14:22',
                highGravity: true,
              },
            ]}
          />
        </PreviewState>
        <PreviewState name="skeleton">
          <HawkAuditLogSkeleton rows={2} />
        </PreviewState>
        <PreviewState name="dirty">
          <HawkConfigField label="Platform fee" dirty currentValue="5.00%" highImpact>
            <HawkTextInput value="7.5" onChange={() => {}} />
          </HawkConfigField>
        </PreviewState>
      </PreviewStates>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=A16-board-primitives name=Board primitives group=Board
 * @HawkStates pass board
 *
 * The same components, denser.
 */
export function PageBoardPrimitives() {
  return (
    <PreviewPage
      title="Board primitives"
      kicker="Admin · A16–A17"
      intro="Nothing here is a new component. Every control is the consumer component rendered inside a BOARD register zone — radius, height and rhythm resolve automatically."
    >
      <PreviewSection
        title="The register split, proved"
        rule="This page exists to prove the register split works, not to introduce a second design system. If a component only looks right in one register, the register is not doing its job."
      >
        <PreviewGrid columns={2}>
          {([HawkRegister.PASS, HawkRegister.BOARD] as const).map((register) => (
            <div key={register} className="flex flex-col gap-hawk-3">
              <HawkText variant="overline" ink="muted">
                {register}
              </HawkText>
              <HawkRegisterScope
                value={register}
                className="rounded-hawk-fixed-md border border-hawk-line bg-hawk-paper p-hawk-6"
              >
                <div className="flex flex-col gap-hawk-4">
                  <HawkTextInput label="Account name" placeholder="Adaeze Okonkwo" />
                  <HawkDropdown
                    label="Bank"
                    options={[{ value: 'gtb', label: 'GTBank' }]}
                    onChange={() => {}}
                  />
                  <div className="flex gap-hawk-3">
                    <HawkButton label="Approve" size="md" onClick={() => {}} />
                    <HawkButton label="Reject" variant="outline" destructive size="md" onClick={() => {}} />
                  </div>
                  <HawkAdminPanel title="A panel">
                    <HawkText variant="caption" ink="muted">
                      Resolving its radius from the zone.
                    </HawkText>
                  </HawkAdminPanel>
                </div>
              </HawkRegisterScope>
            </div>
          ))}
        </PreviewGrid>
      </PreviewSection>

      <PreviewSection
        title="Page header, panels & bulk actions"
        rule="A bulk action that does not say how many records it will touch is how an operator approves forty withdrawals meaning to approve four."
      >
        <PreviewStage ground className="p-0">
          <HawkRegisterScope value={HawkRegister.BOARD}>
            <HawkAdminPageHeader
              title="Withdrawals"
              subtitle="12 pending · ₦1,284,000 in total"
              actions={<HawkButton label="Export" variant="outline" size="sm" onClick={() => {}} />}
            />
            <HawkBulkActionBar count={4} onClear={() => {}}>
              <HawkButton label="Approve selected" size="sm" onClick={() => {}} />
              <HawkButton label="Reject selected" variant="outline" destructive size="sm" onClick={() => {}} />
            </HawkBulkActionBar>
          </HawkRegisterScope>
        </PreviewStage>
      </PreviewSection>

      <PreviewStates columns={2}>
        <PreviewState name="pass">
          <HawkRegisterScope value={HawkRegister.PASS}>
            <HawkButton label="Approve" size="md" onClick={() => {}} />
          </HawkRegisterScope>
        </PreviewState>
        <PreviewState name="board">
          <HawkRegisterScope value={HawkRegister.BOARD}>
            <HawkButton label="Approve" size="md" onClick={() => {}} />
          </HawkRegisterScope>
        </PreviewState>
      </PreviewStates>
    </PreviewPage>
  );
}
