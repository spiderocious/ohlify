import { useState } from 'react';

import {
  HawkActiveFilters,
  HawkAdminPageHeader,
  HawkAdminPanel,
  HawkAdminShell,
  HawkAuditLog,
  HawkBarChart,
  HawkBreadcrumb,
  HawkBulkActionBar,
  HawkButton,
  HawkCaption,
  HawkDataState,
  HawkDetailDrawer,
  HawkDonutChart,
  HawkDrawer,
  HawkFigure,
  HawkFilterBar,
  HawkKpiStrip,
  HawkLineChart,
  HawkMediaStrip,
  HawkPagination,
  HawkRegister,
  HawkRegisterScope,
  HawkSearchInput,
  HawkStatusBadge,
  HawkStepperVertical,
  HawkTable,
  HawkText,
  HawkTrustBadge,
  IconAlertTriangle,
  IconBank,
  IconBroadcast,
  IconFlag,
  IconHome,
  IconIdCard,
  IconLedger,
  IconPhone,
  IconReceipt,
  IconSettings,
  IconUsers,
  IconWallet,
  formatKobo,
  lookupStatus,
} from '@ohlify/hawk-ui';

import { PreviewPage, PreviewSection, PreviewStage } from './preview-shell.js';

const withdrawal = (k: string) => lookupStatus('withdrawal', k)!;
const kycStatus = (k: string) => lookupStatus('kyc', k)!;
const txn = (k: string) => lookupStatus('transaction', k)!;

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: IconHome },
  { key: 'users', label: 'Users', icon: IconUsers, group: 'People' },
  { key: 'kyc', label: 'KYC', icon: IconIdCard, group: 'People', badge: <HawkStatusBadge status={kycStatus('under_review')} size="sm" /> },
  { key: 'calls', label: 'Calls', icon: IconPhone, group: 'Activity' },
  { key: 'reports', label: 'Reports', icon: IconFlag, group: 'Activity' },
  { key: 'withdrawals', label: 'Withdrawals', icon: IconBank, group: 'Money' },
  { key: 'refunds', label: 'Refunds', icon: IconReceipt, group: 'Money' },
  { key: 'wallets', label: 'Wallets', icon: IconWallet, group: 'Money' },
  { key: 'journals', label: 'Journals', icon: IconLedger, group: 'Money' },
  { key: 'campaigns', label: 'Campaigns', icon: IconBroadcast, group: 'Platform' },
  { key: 'config', label: 'Config', icon: IconSettings, group: 'Platform' },
];

/** A desktop-sized frame, so admin scenes read at the size they ship at. */
function Board({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-[42rem] w-full overflow-hidden rounded-hawk-fixed-md border border-hawk-line">
      {children}
    </div>
  );
}

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

const WEEK = [
  { label: 'Mon', value: 12 },
  { label: 'Tue', value: 19 },
  { label: 'Wed', value: 8 },
  { label: 'Thu', value: 24 },
  { label: 'Fri', value: 31 },
  { label: 'Sat', value: 17 },
  { label: 'Sun', value: 6 },
];

/**
 * @HawkPage slug=A22-scene-dashboard name=Dashboard group=Scenes — admin
 * @HawkStates default loading
 *
 * The operator's landing surface.
 */
export function SceneDashboard() {
  return (
    <PreviewPage
      title="Dashboard"
      kicker="Admin scene · A22"
      intro="The whole shell opens a BOARD register zone, so every control inside resolves to the dense scale from one class rather than a prop threaded through every component."
    >
      <PreviewSection
        title="The full shell"
        rule="The sidebar preserves declaration order while grouping: a sidebar that reorders itself because a group name sorted differently is a sidebar operators re-learn."
      >
        <Board>
          <HawkAdminShell
            nav={NAV}
            activeKey="dashboard"
            brand={
              <HawkText variant="body" ink="strong" className="font-bold">
                Ohlify · Admin
              </HawkText>
            }
            user={{ name: 'Feranmi Adeniji', role: 'Admin' }}
            topbar={
              <>
                <HawkBreadcrumb items={[{ label: 'Dashboard' }]} />
                <div className="ml-auto w-64">
                  <HawkSearchInput placeholder="Search anything" />
                </div>
              </>
            }
          >
            <HawkAdminPageHeader
              title="Dashboard"
              subtitle="22 Aug 2026 · last 7 days"
              actions={<HawkButton label="Export" variant="outline" size="sm" onClick={() => {}} />}
            />
            <div className="flex flex-col gap-hawk-6 px-hawk-pad pb-hawk-9">
              <HawkKpiStrip items={KPIS} />
              <div className="grid gap-hawk-6 lg:grid-cols-3">
                <HawkAdminPanel title="Call volume" className="lg:col-span-2">
                  <HawkLineChart data={WEEK} height={200} />
                </HawkAdminPanel>
                <HawkAdminPanel title="Outcomes">
                  <HawkDonutChart
                    size={120}
                    thickness={18}
                    data={[
                      { label: 'Completed', value: 812 },
                      { label: 'Missed', value: 96 },
                      { label: 'Cancelled', value: 48 },
                    ]}
                  />
                </HawkAdminPanel>
              </div>
              <HawkAdminPanel title="Recent operator activity" flush>
                <HawkAuditLog
                  entries={[
                    {
                      id: '1',
                      actor: 'Feranmi Adeniji',
                      actorRole: 'Admin',
                      action: 'posted a manual journal',
                      target: 'JNL-4821',
                      timestamp: '14:22',
                      highGravity: true,
                    },
                    {
                      id: '2',
                      actor: 'Ngozi Eze',
                      actorRole: 'Finance',
                      action: 'approved a withdrawal',
                      target: 'OHL-4820',
                      timestamp: '11:04',
                    },
                  ]}
                />
              </HawkAdminPanel>
            </div>
          </HawkAdminShell>
        </Board>
      </PreviewSection>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=A20-scene-withdrawal name=Withdrawal approval group=Scenes — admin
 * @HawkStates queue selected drawer
 *
 * The queue, the bulk bar, and the safe-approval drawer.
 */
export function SceneWithdrawal() {
  const [selected, setSelected] = useState<Set<string>>(new Set(['1']));
  const [open, setOpen] = useState(false);

  const ROWS = [
    { id: '1', name: 'Adaeze Okonkwo', bank: 'GTBank', account: '0123456789', amount: 8_420_000, status: 'pending', match: true },
    { id: '2', name: 'Chidi Nwosu', bank: 'Zenith Bank', account: '2233445566', amount: 1_250_000, status: 'pending', match: false },
    { id: '3', name: 'Fatima Bello', bank: 'Access Bank', account: '9988776655', amount: 640_000, status: 'approved', match: true },
    { id: '4', name: 'Segun Adeyemi', bank: 'Kuda', account: '5544332211', amount: 210_000, status: 'rejected', match: true },
  ];

  const columns = [
    { key: 'name', header: 'Professional', width: '24%', render: (r: (typeof ROWS)[number]) => r.name },
    { key: 'bank', header: 'Bank', width: '18%', render: (r: (typeof ROWS)[number]) => r.bank },
    { key: 'account', header: 'Account', width: '18%', render: (r: (typeof ROWS)[number]) => r.account },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right' as const,
      sortable: true,
      render: (r: (typeof ROWS)[number]) => formatKobo(r.amount),
    },
    {
      key: 'match',
      header: 'Name match',
      render: (r: (typeof ROWS)[number]) =>
        r.match ? (
          <HawkTrustBadge label="Matches" />
        ) : (
          <HawkStatusBadge status={withdrawal('rejected')} size="sm" />
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r: (typeof ROWS)[number]) => <HawkStatusBadge status={withdrawal(r.status)} />,
    },
  ];

  return (
    <PreviewPage
      title="Withdrawal approval"
      kicker="Admin scene · A20"
      intro="The queue where money leaves the platform. Every guard the system has is on this screen."
    >
      <PreviewSection
        title="Queue → drawer → typed confirm"
        rule="Three gates in sequence: the table shows the name-match verdict in a column so a mismatch is visible before opening anything; the drawer restates it in full; and approving requires typing APPROVE. Each is cheap, and together they make a mis-approval a deliberate act rather than a slip."
      >
        <Board>
          <HawkRegisterScope value={HawkRegister.BOARD} className="flex h-full flex-col bg-hawk-paper">
            <HawkAdminPageHeader
              title="Withdrawals"
              subtitle="12 pending · ₦1,284,000 in total"
              actions={<HawkButton label="Export" variant="outline" size="sm" onClick={() => {}} />}
            />
            <HawkFilterBar
              tabs={[
                { value: 'pending', label: 'Pending', count: 12 },
                { value: 'approved', label: 'Approved', count: 248 },
                { value: 'rejected', label: 'Rejected', count: 3 },
              ]}
              activeTab="pending"
              onTabChange={() => {}}
              query=""
              onQueryChange={() => {}}
              searchPlaceholder="Search by name or reference"
            />
            <HawkActiveFilters
              filters={[{ key: 'amount', label: 'Amount', value: '> ₦50,000', onRemove: () => {} }]}
            />
            <HawkBulkActionBar count={selected.size} onClear={() => setSelected(new Set())}>
              <HawkButton
                label="Approve selected"
                size="sm"
                onClick={() =>
                  void HawkDrawer.typedConfirm({
                    title: `Approve ${selected.size} withdrawal${selected.size === 1 ? '' : 's'}?`,
                    message: 'This moves money out of the platform account and cannot be reversed.',
                    phrase: 'APPROVE',
                  })
                }
              />
              <HawkButton label="Reject selected" variant="outline" destructive size="sm" onClick={() => {}} />
            </HawkBulkActionBar>
            <div className="min-h-0 flex-1">
              <HawkTable
                columns={columns}
                rows={ROWS}
                rowKey={(r) => r.id}
                selectable={(r) => r.status === 'pending'}
                selectedKeys={selected}
                onSelectionChange={setSelected}
                onRowClick={() => setOpen(true)}
                footer={
                  <HawkPagination hasPrevious={false} hasNext onPrevious={() => {}} onNext={() => {}} summary="Showing 4" />
                }
              />
            </div>
          </HawkRegisterScope>
        </Board>

        <HawkDetailDrawer.Root
          open={open}
          onClose={() => setOpen(false)}
          title="Withdrawal"
          subtitle="OHL-4821-XQ"
          actions={
            <div className="flex w-full items-center justify-end gap-hawk-3">
              <HawkButton label="Reject" variant="outline" destructive size="sm" onClick={() => setOpen(false)} />
              <HawkButton
                label="Approve"
                size="sm"
                onClick={async () => {
                  const ok = await HawkDrawer.typedConfirm({
                    title: 'Approve this withdrawal?',
                    message: 'This moves money out of the platform account and cannot be reversed.',
                    phrase: 'APPROVE',
                  });
                  if (ok) setOpen(false);
                }}
              />
            </div>
          }
        >
          <HawkDetailDrawer.NameMatch
            accountName="Adaeze Okonkwo"
            verifiedName="Adaeze Okonkwo"
            match
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
            <HawkDetailDrawer.Row label="Wallet balance" value={<HawkFigure value={842_000} size="sm" />} />
          </HawkDetailDrawer.Section>
          <HawkDetailDrawer.Section title="Progress">
            {/* The vertical stepper's home case: each step carries a timestamp,
                which is what a reviewer needs to answer "where is my money?". */}
            <HawkStepperVertical
              current={2}
              steps={[
                { label: 'Requested', timestamp: '14 Aug · 11:20' },
                { label: 'Approved by admin', timestamp: '14 Aug · 14:02' },
                { label: 'Sent to bank', description: 'In progress' },
                { label: 'Settled' },
              ]}
            />
          </HawkDetailDrawer.Section>
        </HawkDetailDrawer.Root>
      </PreviewSection>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=A21-scene-kyc name=KYC review group=Scenes — admin
 * @HawkStates review approved rejected
 *
 * Documents beside the claim they support.
 */
export function SceneKycReview() {
  return (
    <PreviewPage
      title="KYC review"
      kicker="Admin scene · A21, A07"
      intro="The documents sit beside the claimed details, not on a separate tab. A reviewer comparing a name on an ID against a name in a field must not have to hold one of them in their head."
    >
      <PreviewSection title="The review panel">
        <Board>
          <HawkRegisterScope value={HawkRegister.BOARD} className="flex h-full flex-col overflow-y-auto bg-hawk-paper">
            <HawkAdminPageHeader
              title="Adaeze Okonkwo"
              subtitle="KYC · submitted 20 Aug 2026"
              breadcrumb={<HawkBreadcrumb items={[{ label: 'KYC', onClick: () => {} }, { label: 'Adaeze Okonkwo' }]} />}
              actions={
                <>
                  <HawkButton
                    label="Reject"
                    variant="outline"
                    destructive
                    size="sm"
                    onClick={() =>
                      void HawkDrawer.prompt({
                        title: 'Why are you rejecting this?',
                        label: 'Reason',
                        message: 'The professional will see this message.',
                        multiline: true,
                        validate: (v) => (v.trim().length < 10 ? 'Give at least ten characters' : undefined),
                      })
                    }
                  />
                  <HawkButton
                    label="Approve"
                    size="sm"
                    onClick={() =>
                      void HawkDrawer.typedConfirm({
                        title: 'Approve this identity?',
                        message: 'The professional will be able to set rates and withdraw.',
                        phrase: 'APPROVE',
                      })
                    }
                  />
                </>
              }
            />
            <div className="grid gap-hawk-6 px-hawk-pad pb-hawk-9 lg:grid-cols-2">
              <HawkAdminPanel title="Claimed details">
                <div className="flex flex-col divide-y divide-hawk-line">
                  <HawkDetailDrawer.Row label="Full name" value="Adaeze Chidinma Okonkwo" />
                  <HawkDetailDrawer.Row label="Date of birth" value="14 March 1991" record />
                  <HawkDetailDrawer.Row label="NIN" value="12345678901" record />
                  <HawkDetailDrawer.Row label="Address" value="12 Bourdillon Road, Ikoyi, Lagos" />
                  <HawkDetailDrawer.Row label="Occupation" value="Solicitor" />
                </div>
              </HawkAdminPanel>

              <HawkAdminPanel title="Documents">
                <div className="flex flex-col gap-hawk-4">
                  <HawkCaption>Tap a document to open it full-size.</HawkCaption>
                  <HawkMediaStrip
                    items={[
                      { id: '1', src: '', alt: 'NIN — front' },
                      { id: '2', src: '', alt: 'NIN — back' },
                      { id: '3', src: '', alt: 'Proof of address' },
                    ]}
                  />
                  <HawkDetailDrawer.NameMatch
                    accountName="Adaeze Chidinma Okonkwo"
                    verifiedName="Adaeze Chidinma Okonkwo"
                    match
                  />
                </div>
              </HawkAdminPanel>

              <HawkAdminPanel title="History" className="lg:col-span-2" flush>
                <HawkAuditLog
                  entries={[
                    {
                      id: '1',
                      actor: 'Ngozi Eze',
                      actorRole: 'Support',
                      action: 'requested a clearer document for',
                      target: 'Proof of address',
                      timestamp: '19 Aug · 10:02',
                    },
                    {
                      id: '2',
                      actor: 'Adaeze Okonkwo',
                      action: 'submitted KYC',
                      timestamp: '18 Aug · 16:40',
                    },
                  ]}
                />
              </HawkAdminPanel>
            </div>
          </HawkRegisterScope>
        </Board>
      </PreviewSection>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=A23-scene-transactions name=Transactions & ledger group=Scenes — admin
 * @HawkStates default stale loading
 *
 * The ledger view, and the freshness contract on a board.
 */
export function SceneTransactions() {
  const ROWS = [
    { id: '1', ref: 'TXN-9001', user: 'Adaeze Okonkwo', kind: 'Call settlement', amount: 301_000, direction: 'credit', status: 'completed' },
    { id: '2', ref: 'TXN-9002', user: 'Chidi Nwosu', kind: 'Wallet top-up', amount: 5_000_000, direction: 'credit', status: 'completed' },
    { id: '3', ref: 'TXN-9003', user: 'Fatima Bello', kind: 'Withdrawal', amount: 8_420_000, direction: 'debit', status: 'pending' },
    { id: '4', ref: 'TXN-9004', user: 'Segun Adeyemi', kind: 'Refund', amount: 82_000, direction: 'reversal', status: 'reversed' },
  ];

  const columns = [
    { key: 'ref', header: 'Reference', width: '16%', render: (r: (typeof ROWS)[number]) => r.ref },
    { key: 'user', header: 'User', width: '22%', render: (r: (typeof ROWS)[number]) => r.user },
    { key: 'kind', header: 'Type', width: '20%', render: (r: (typeof ROWS)[number]) => r.kind },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right' as const,
      sortable: true,
      render: (r: (typeof ROWS)[number]) => (
        <HawkFigure
          value={r.amount}
          size="sm"
          direction={r.direction as 'credit' | 'debit' | 'reversal'}
          decimals
          neverMasked
        />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r: (typeof ROWS)[number]) => <HawkStatusBadge status={txn(r.status)} />,
    },
  ];

  return (
    <PreviewPage
      title="Transactions"
      kicker="Admin scene · A23, A28"
      intro="Debits render as ink rather than red — red means failed, and a successful debit is not a failure. The status column carries whether it worked."
    >
      <PreviewSection
        title="Fresh"
        rule="Amounts opt out of masking here. Masking hides the viewer's own money from a shoulder-surfer; an operator reviewing the ledger needs to read every figure, and a masked audit surface is not an audit surface."
      >
        <Board>
          <HawkRegisterScope value={HawkRegister.BOARD} className="flex h-full flex-col bg-hawk-paper">
            <HawkAdminPageHeader title="Transactions" subtitle="Last 7 days" />
            <HawkFilterBar
              tabs={[
                { value: 'all', label: 'All', count: 1_284 },
                { value: 'pending', label: 'Pending', count: 12 },
                { value: 'reversed', label: 'Reversed', count: 8 },
              ]}
              activeTab="all"
              onTabChange={() => {}}
              query=""
              onQueryChange={() => {}}
            />
            <div className="min-h-0 flex-1">
              <HawkTable
                columns={columns}
                rows={ROWS}
                rowKey={(r) => r.id}
                onRowClick={() => {}}
                footer={<HawkPagination hasPrevious hasNext onPrevious={() => {}} onNext={() => {}} summary="Showing 4 of 1,284" />}
              />
            </div>
          </HawkRegisterScope>
        </Board>
      </PreviewSection>

      <PreviewSection
        title="Stale — rows kept, banner added"
        rule="With cached rows present the staleness is a thin banner over data the operator keeps. Replacing a readable ledger with a spinner because a refresh is in flight is how an operator loses their place mid-review."
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

      <PreviewSection title="Cold — the skeleton mirrors the row shape">
        <PreviewStage className="p-0">
          <HawkTable
            columns={columns}
            rows={[]}
            rowKey={(r) => r.id}
            dataState={HawkDataState.LOADING}
            skeletonRows={4}
          />
        </PreviewStage>
      </PreviewSection>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=A26-scene-platform name=Platform ops group=Scenes — admin
 * @HawkStates releases webhooks recon
 *
 * Releases, webhooks and reconciliation.
 */
export function ScenePlatform() {
  const WEBHOOKS = [
    { id: '1', event: 'charge.success', endpoint: 'paystack', attempts: 1, status: 'completed' },
    { id: '2', event: 'transfer.failed', endpoint: 'paystack', attempts: 4, status: 'failed' },
    { id: '3', event: 'charge.success', endpoint: 'paystack', attempts: 2, status: 'pending' },
  ];

  const columns = [
    { key: 'event', header: 'Event', render: (r: (typeof WEBHOOKS)[number]) => r.event },
    { key: 'endpoint', header: 'Source', render: (r: (typeof WEBHOOKS)[number]) => r.endpoint },
    {
      key: 'attempts',
      header: 'Attempts',
      align: 'right' as const,
      render: (r: (typeof WEBHOOKS)[number]) => r.attempts,
    },
    {
      key: 'status',
      header: 'Status',
      render: (r: (typeof WEBHOOKS)[number]) => <HawkStatusBadge status={txn(r.status)} />,
    },
  ];

  return (
    <PreviewPage
      title="Platform ops"
      kicker="Admin scene · A26, A11"
      intro="Releases, webhook deliveries and the reconciliation check — the surfaces that tell an operator whether the platform itself is healthy."
    >
      <PreviewSection
        title="Reconciliation"
        rule="The same balance check the manual journal uses, applied to the platform as a whole. Stating the discrepancy as a figure rather than a status is what makes it findable."
      >
        <PreviewStage>
          <div className="grid gap-hawk-6 lg:grid-cols-3">
            <HawkAdminPanel title="Ledger">
              <div className="flex flex-col gap-hawk-3">
                <HawkCaption>Sum of all wallet balances</HawkCaption>
                <HawkFigure value={412_800_000} size="md" neverMasked decimals />
              </div>
            </HawkAdminPanel>
            <HawkAdminPanel title="Processor">
              <div className="flex flex-col gap-hawk-3">
                <HawkCaption>Paystack settled balance</HawkCaption>
                <HawkFigure value={412_800_000} size="md" neverMasked decimals />
              </div>
            </HawkAdminPanel>
            <HawkAdminPanel title="Difference">
              <div className="flex flex-col gap-hawk-3">
                <HawkCaption>Must be zero</HawkCaption>
                <HawkFigure value={0} size="md" neverMasked decimals />
                <HawkTrustBadge label="Reconciled" />
              </div>
            </HawkAdminPanel>
          </div>
        </PreviewStage>
      </PreviewSection>

      <PreviewSection
        title="Webhook deliveries"
        note="Attempt counts are visible in the queue. A webhook on its fourth attempt is a different problem from one on its first, and an operator should not have to open a row to tell them apart."
      >
        <PreviewStage className="p-0">
          <HawkTable columns={columns} rows={WEBHOOKS} rowKey={(r) => r.id} onRowClick={() => {}} />
        </PreviewStage>
      </PreviewSection>

      <PreviewSection title="Release history & campaign volume">
        <div className="grid gap-hawk-6 lg:grid-cols-2">
          <HawkAdminPanel title="Deliveries this week">
            <HawkBarChart data={WEEK} height={160} />
          </HawkAdminPanel>
          <HawkAdminPanel title="Recent operator activity" flush>
            <HawkAuditLog
              entries={[
                {
                  id: '1',
                  actor: 'Feranmi Adeniji',
                  actorRole: 'Admin',
                  action: 'published',
                  target: 'v2.4.0',
                  timestamp: '22 Aug · 09:00',
                  changes: [{ field: 'Minimum version', before: '2.1.0', after: '2.3.0' }],
                  highGravity: true,
                },
                {
                  id: '2',
                  actor: 'Ngozi Eze',
                  actorRole: 'Finance',
                  action: 'replayed a webhook',
                  target: 'transfer.failed',
                  timestamp: '21 Aug · 17:22',
                },
              ]}
            />
          </HawkAdminPanel>
        </div>
      </PreviewSection>
    </PreviewPage>
  );
}
