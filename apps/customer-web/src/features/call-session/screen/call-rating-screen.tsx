import { IconStar } from '@icons';
import { Repeat } from 'meemaw';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { ROUTES } from '@ohlify/core';
import { AppButton, AppText, AppTextAreaInput, DrawerService } from '@ohlify/ui';

import { useSubmitReview } from '../api/use-submit-review.js';
import { CallAvatar } from './parts/call-avatar.js';

const STARS = [1, 2, 3, 4, 5] as const;

/** Mirrors mobile/lib/features/call_session/screen/call_rating_screen.dart. */
export function CallRatingScreen() {
  const navigate = useNavigate();
  const [urlParams] = useSearchParams();
  const peerName = urlParams.get('name') ?? 'Professional';
  const peerAvatarKey = urlParams.get('avatar') ?? undefined;
  const peerId = urlParams.get('peerId') ?? '';
  const callId = urlParams.get('callId') ?? '';

  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const submitReview = useSubmitReview();

  const submit = () => {
    const done = () => {
      DrawerService.showFeedbackModal(
        'Thanks for the rating!',
        'Your feedback helps the community.',
        {
          kind: 'success',
          showCloseButton: false,
          confirmButtonText: 'Done',
          onConfirm: () => navigate(ROUTES.HOME.absPath, { replace: true }),
        },
      );
    };

    if (!peerId || !callId) {
      done();
      return;
    }

    submitReview.mutate(
      { callId, professionalId: peerId, stars: rating, comment: comment.trim() || undefined },
      {
        onSuccess: done,
        onError: done,
      },
    );
  };

  return (
    <main className="flex min-h-screen flex-col bg-surface-light">
      <div className="mx-auto w-full max-w-xl px-5 pb-6 pt-10 lg:max-w-2xl">
        <div className="flex flex-col items-center text-center">
          <CallAvatar fileKey={peerAvatarKey} size={88} />
          <AppText
            variant="bodyTitle"
            weight={700}
            align="center"
            color="var(--ohl-text-jet)"
            className="mt-4"
          >
            How was your call with {peerName}?
          </AppText>
          <AppText
            variant="body"
            align="center"
            color="var(--ohl-text-muted)"
            className="mt-1"
          >
            Rate the call to help us improve recommendations.
          </AppText>
          <div className="mt-6 flex items-center gap-2">
            <Repeat each={STARS as unknown as number[]}>
              {(s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRating(s)}
                  aria-label={`${s} star`}
                  aria-pressed={rating >= s}
                  className="p-1"
                >
                  <IconStar
                    size={32}
                    color={
                      rating >= s ? 'var(--ohl-text-amber)' : 'var(--ohl-border)'
                    }
                    fill={rating >= s ? 'var(--ohl-text-amber)' : 'transparent'}
                  />
                </button>
              )}
            </Repeat>
          </div>
        </div>

        <div className="mt-8">
          <AppTextAreaInput
            label="Share your experience"
            placeholder="Add an optional comment..."
            value={comment}
            onChange={setComment}
            maxLength={500}
          />
        </div>

        <div className="mt-6">
          <AppButton
            label="Submit rating"
            expanded
            radius={100}
            isDisabled={rating === 0}
            isLoading={submitReview.isPending}
            onPressed={rating === 0 ? undefined : submit}
          />
        </div>
      </div>
    </main>
  );
}
