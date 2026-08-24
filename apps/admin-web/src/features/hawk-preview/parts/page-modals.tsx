import { useState } from 'react';

import {
  HawkBottomSheet,
  HawkButton,
  HawkCaption,
  HawkConfirmModal,
  HawkDelayedSendModal,
  HawkDrawer,
  HawkFeedbackModal,
  HawkFormModal,
  HawkKeyValue,
  HawkSideSheet,
  HawkTakeover,
  HawkText,
  HawkTextInput,
  HawkTypedConfirmModal,
  hawkToast,
} from '@ohlify/hawk-ui';

import {
  PreviewPage,
  PreviewSection,
  PreviewStage,
  PreviewState,
  PreviewStates,
} from './preview-shell.js';

/**
 * @HawkPage slug=160-modals-primitives name=Modals & sheets group=Modals
 * @HawkStates feedback confirm form typed delayed
 *
 * The four primitives, the two critical idioms, and the sheets.
 */
export function PageModals() {
  const [open, setOpen] = useState<string | null>(null);
  const close = () => setOpen(null);

  return (
    <PreviewPage
      title="Modals & sheets"
      kicker="Modals · 111–115, 160–163"
      intro="Every overlay shares one contract: open / onOpenChange / trigger / portal / content. Surfaces differ only in anchor and viewport coverage, never in how open and close work."
    >
      <PreviewSection
        title="The four primitives"
        rule="Scrim/content timing is part of the contract, not a per-surface choice: scrim 0 → 0.5 over 200ms; content scale .96 → 1 over 280ms easeOutCubic, trailing the scrim by 40ms. The pre-Hawk app had 13 overlay surfaces with no shared contract, each managing its own visibility."
      >
        <PreviewStage>
          <div className="flex flex-wrap gap-hawk-4">
            <HawkButton label="Feedback" variant="outline" onClick={() => setOpen('feedback')} />
            <HawkButton label="Confirm" variant="outline" onClick={() => setOpen('confirm')} />
            <HawkButton label="Form" variant="outline" onClick={() => setOpen('form')} />
            <HawkButton label="Bottom sheet" variant="outline" onClick={() => setOpen('bottom')} />
            <HawkButton label="Side sheet" variant="outline" onClick={() => setOpen('side')} />
            <HawkButton label="Takeover" variant="outline" onClick={() => setOpen('takeover')} />
          </div>
        </PreviewStage>
      </PreviewSection>

      <PreviewSection
        title="Typed confirm — irreversible and immediate"
        rule="For approving or rejecting a withdrawal, posting a manual journal, blocking a user, rejecting KYC, deleting an account. The button stays disabled until the typed text matches exactly, case-sensitively. The point is not friction for its own sake — it is that a misclick and a deliberate decision should not be the same gesture."
      >
        <PreviewStage>
          <HawkButton label="Approve withdrawal" destructive onClick={() => setOpen('typed')} />
        </PreviewStage>
      </PreviewSection>

      <PreviewSection
        title="Delayed send — irreversible once sent"
        rule="For campaigns. A typed confirm is the wrong tool here: the danger is not that the operator did not mean to press it, but that they will realise the copy was wrong ninety seconds later. So the action commits immediately from the operator's point of view and stays cancellable for the countdown."
      >
        <PreviewStage>
          <HawkButton label="Send campaign" onClick={() => setOpen('delayed')} />
        </PreviewStage>
      </PreviewSection>

      <HawkFeedbackModal
        open={open === 'feedback'}
        onClose={close}
        title="Rate saved"
        message="Clients will see your new rate immediately."
      />

      <HawkConfirmModal
        open={open === 'confirm'}
        onClose={close}
        onConfirm={close}
        title="Cancel this call?"
        message="Chidi will be notified and refunded in full."
        confirmLabel="Cancel call"
        destructive
      />

      <HawkFormModal
        open={open === 'form'}
        onClose={close}
        onSubmit={close}
        title="Add a rate"
        description="Clients see this on your profile."
      >
        <HawkTextInput label="Label" placeholder="Standard consultation" />
        <HawkTextInput label="Amount per minute" placeholder="2,500" />
      </HawkFormModal>

      <HawkTypedConfirmModal
        open={open === 'typed'}
        onClose={close}
        onConfirm={close}
        title="Approve this withdrawal?"
        message="This moves money out of the platform account and cannot be reversed."
        phrase="APPROVE"
        confirmLabel="Approve withdrawal"
        summary={
          <div className="flex flex-col divide-y divide-hawk-line">
            <HawkKeyValue label="Professional" value="Adaeze Okonkwo" />
            <HawkKeyValue label="Amount" value="₦84,200.00" record />
            <HawkKeyValue label="Bank" value="GTBank ••••4821" record />
          </div>
        }
      />

      <HawkDelayedSendModal
        open={open === 'delayed'}
        onClose={close}
        onSend={() => hawkToast.success('Campaign sent.')}
        title="Send to 4,281 users?"
        message="Once sent, a campaign cannot be recalled."
        delaySeconds={45}
        summary={
          <div className="flex flex-col gap-hawk-2">
            <HawkText variant="label" ink="strong">
              Your wallet just got faster
            </HawkText>
            <HawkCaption>Withdrawals now land within an hour. Nothing for you to do.</HawkCaption>
          </div>
        }
      />

      <HawkBottomSheet open={open === 'bottom'} onClose={close} title="Choose a payment method">
        <div className="flex flex-col gap-hawk-4 pb-hawk-5">
          <HawkText variant="body">Card ending 4821</HawkText>
          <HawkText variant="body">Bank transfer</HawkText>
        </div>
      </HawkBottomSheet>

      <HawkSideSheet open={open === 'side'} onClose={close} title="Withdrawal · OHL-4821">
        <div className="flex flex-col divide-y divide-hawk-line">
          <HawkKeyValue label="Professional" value="Adaeze Okonkwo" />
          <HawkKeyValue label="Amount" value="₦84,200.00" record />
          <HawkKeyValue label="Requested" value="22 Aug 2026 · 14:22" record />
        </div>
      </HawkSideSheet>

      <HawkTakeover open={open === 'takeover'} onClose={close} title="Verify your identity">
        <div className="p-hawk-pad">
          <HawkText variant="body" ink="muted">
            Full-screen coverage, same overlay contract.
          </HawkText>
        </div>
      </HawkTakeover>

      <PreviewStates columns={3}>
        <PreviewState name="feedback">
          <HawkButton
            label="Open"
            size="sm"
            variant="outline"
            onClick={() => setOpen('feedback')}
          />
        </PreviewState>
        <PreviewState name="confirm">
          <HawkButton label="Open" size="sm" variant="outline" onClick={() => setOpen('confirm')} />
        </PreviewState>
        <PreviewState name="form">
          <HawkButton label="Open" size="sm" variant="outline" onClick={() => setOpen('form')} />
        </PreviewState>
        <PreviewState name="typed">
          <HawkButton label="Open" size="sm" variant="outline" onClick={() => setOpen('typed')} />
        </PreviewState>
        <PreviewState name="delayed">
          <HawkButton label="Open" size="sm" variant="outline" onClick={() => setOpen('delayed')} />
        </PreviewState>
      </PreviewStates>
    </PreviewPage>
  );
}

/**
 * @HawkPage slug=161-drawer-service name=Imperative overlays group=Modals
 * @HawkStates confirm typed prompt sheet
 *
 * The HawkDrawer singleton — every prompt returns its answer.
 */
export function PageDrawerService() {
  const [log, setLog] = useState<string[]>([]);
  const record = (line: string) => setLog((l) => [line, ...l].slice(0, 6));

  return (
    <PreviewPage
      title="Imperative overlays"
      kicker="Modals · the DrawerService equivalent"
      intro="Feature code needs to raise a modal from an event handler, a mutation's onError, a route guard — places where rendering <Modal open={…}> means threading state through components with no other reason to know about it."
    >
      <PreviewSection
        title="Every prompt returns its answer"
        rule="The v1 DrawerService took an onConfirm callback and returned a handle, so the caller's logic split across two places. Here the promise resolves to the answer, and a dismissed prompt resolves false rather than rejecting — the user changing their mind is an answer, not an exception, and forcing every call site into a try/catch is how unhandled rejections get shipped."
      >
        <PreviewStage>
          <pre className="mb-hawk-5 overflow-x-auto rounded-hawk-sm bg-hawk-stock p-hawk-5 text-hawk-caption text-hawk-ink">
            {`if (await HawkDrawer.confirm({ title: 'Cancel this call?' })) {
  await cancelCall();
}`}
          </pre>

          <div className="flex flex-wrap gap-hawk-3">
            <HawkButton
              label="confirm()"
              size="sm"
              variant="outline"
              onClick={async () => {
                const answer = await HawkDrawer.confirm({
                  title: 'Cancel this call?',
                  message: 'Chidi will be notified and refunded in full.',
                  confirmLabel: 'Cancel call',
                  destructive: true,
                });
                record(`confirm → ${answer}`);
              }}
            />
            <HawkButton
              label="typedConfirm()"
              size="sm"
              variant="outline"
              destructive
              onClick={async () => {
                const answer = await HawkDrawer.typedConfirm({
                  title: 'Block this user?',
                  message: 'They will lose access immediately.',
                  phrase: 'BLOCK',
                  confirmLabel: 'Block user',
                });
                record(`typedConfirm → ${answer}`);
              }}
            />
            <HawkButton
              label="prompt()"
              size="sm"
              variant="outline"
              onClick={async () => {
                const value = await HawkDrawer.prompt({
                  title: 'Why are you rejecting this?',
                  label: 'Reason',
                  placeholder: 'The document was unreadable',
                  multiline: true,
                  validate: (v) =>
                    v.trim().length < 10 ? 'Give at least ten characters' : undefined,
                });
                record(`prompt → ${value === null ? 'dismissed' : `"${value}"`}`);
              }}
            />
            <HawkButton
              label="feedback()"
              size="sm"
              variant="outline"
              onClick={async () => {
                await HawkDrawer.feedback({
                  title: 'Rate saved',
                  message: 'Clients will see it immediately.',
                });
                record('feedback → acknowledged');
              }}
            />
            <HawkButton
              label="bottomSheet()"
              size="sm"
              variant="outline"
              onClick={() => {
                HawkDrawer.bottomSheet(
                  (dismiss) => (
                    <div className="flex flex-col gap-hawk-4">
                      <HawkText variant="body">
                        The render function receives its own dismiss, so content can close itself
                        without the caller holding a handle.
                      </HawkText>
                      <HawkButton label="Close" block onClick={dismiss} />
                    </div>
                  ),
                  { title: 'A custom sheet' },
                );
              }}
            />
            <HawkButton
              label="toast"
              size="sm"
              variant="outline"
              onClick={() => hawkToast.success('hawkToast.success(…)')}
            />
          </div>

          {log.length > 0 && (
            <div className="mt-hawk-5 flex flex-col gap-hawk-2 rounded-hawk-sm bg-hawk-stock p-hawk-5">
              <HawkCaption>Resolved values</HawkCaption>
              {log.map((line, index) => (
                <span key={index} className="hawk-record text-hawk-caption text-hawk-ink">
                  {line}
                </span>
              ))}
            </div>
          )}
        </PreviewStage>
      </PreviewSection>

      <PreviewSection
        title="Teardown settles every pending promise"
        note="dismissAll() resolves every open prompt to the negative answer. A caller awaiting a confirm during a logout must not be left hanging on a promise that can never resolve — and it must certainly not receive true."
      >
        <PreviewStage>
          <HawkButton
            label="HawkDrawer.dismissAll()"
            variant="ghost"
            size="sm"
            onClick={() => HawkDrawer.dismissAll()}
          />
        </PreviewStage>
      </PreviewSection>

      <PreviewStates columns={4}>
        <PreviewState name="confirm">
          <HawkButton
            label="Raise"
            size="sm"
            variant="outline"
            onClick={() => void HawkDrawer.confirm({ title: 'Confirm?' })}
          />
        </PreviewState>
        <PreviewState name="typed">
          <HawkButton
            label="Raise"
            size="sm"
            variant="outline"
            onClick={() => void HawkDrawer.typedConfirm({ title: 'Post journal?', phrase: 'POST' })}
          />
        </PreviewState>
        <PreviewState name="prompt">
          <HawkButton
            label="Raise"
            size="sm"
            variant="outline"
            onClick={() => void HawkDrawer.prompt({ title: 'Reason?' })}
          />
        </PreviewState>
        <PreviewState name="sheet">
          <HawkButton
            label="Raise"
            size="sm"
            variant="outline"
            onClick={() =>
              HawkDrawer.bottomSheet((dismiss) => (
                <HawkButton label="Close" block onClick={dismiss} />
              ))
            }
          />
        </PreviewState>
      </PreviewStates>
    </PreviewPage>
  );
}
