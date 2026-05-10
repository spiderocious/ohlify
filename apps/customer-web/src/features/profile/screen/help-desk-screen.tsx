import { IconChat, IconMail } from '@icons';
import { useState } from 'react';

import { AppButton, AppText, AppTextAreaInput, AppTextInput, DrawerService } from '@ohlify/ui';

import { useHelpContact } from '../api/use-help-contact.js';
import { useFaqs } from '../api/use-faqs.js';
import { useSubmitTicket } from '../api/use-submit-ticket.js';
import { ProfileSubscreenScaffold } from './parts/profile-subscreen-scaffold.js';

/** Mirrors mobile/lib/features/profile/screen/help_desk_screen.dart. */
export function HelpDeskScreen() {
  const { data: contact } = useHelpContact();
  const { data: faqs } = useFaqs();
  const submitTicket = useSubmitTicket();

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const contactRows = contact
    ? [
        {
          Icon: IconMail,
          label: 'Email support',
          value: contact.support_email,
          href: `mailto:${contact.support_email}`,
        },
        {
          Icon: IconChat,
          label: 'Chat on WhatsApp',
          value: contact.whatsapp_number,
          href: contact.whatsapp_deeplink,
        },
      ]
    : [];

  const handleSubmitTicket = () => {
    if (!subject.trim() || !message.trim()) return;
    submitTicket.mutate(
      { subject: subject.trim(), message: message.trim() },
      {
        onSuccess: () => {
          setSubject('');
          setMessage('');
          DrawerService.toast('Your message has been sent. We will get back to you shortly.', {
            type: 'success',
          });
        },
        onError: () => {
          DrawerService.toast('Could not send message. Please try again.', { type: 'error' });
        },
      },
    );
  };

  return (
    <ProfileSubscreenScaffold title="Help desk">
      <AppText variant="body" align="start" color="var(--ohl-text-muted)">
        We are here to help. Reach us through any of the channels below.
      </AppText>

      {contactRows.length > 0 && (
        <div className="mt-4 space-y-3">
          {contactRows.map((c) => (
            <a
              key={c.label}
              href={c.href}
              className="flex items-center gap-3 rounded-2xl bg-background p-4"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-surface-dark text-primary">
                <c.Icon size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <AppText variant="body" weight={600} align="start" color="var(--ohl-text-jet)">
                  {c.label}
                </AppText>
                <AppText
                  variant="bodyNormal"
                  align="start"
                  color="var(--ohl-text-muted)"
                  className="mt-0.5"
                >
                  {c.value}
                </AppText>
              </div>
            </a>
          ))}
        </div>
      )}

      {(faqs ?? []).length > 0 && (
        <div className="mt-6">
          <AppText variant="header" weight={700} align="start" color="var(--ohl-text-jet)">
            FAQs
          </AppText>
          <div className="mt-3 space-y-2">
            {(faqs ?? []).map((faq) => (
              <div key={faq.id} className="rounded-2xl bg-background p-4">
                <AppText variant="body" weight={600} align="start" color="var(--ohl-text-jet)">
                  {faq.question}
                </AppText>
                <AppText
                  variant="bodyNormal"
                  align="start"
                  color="var(--ohl-text-muted)"
                  className="mt-1"
                >
                  {faq.answer}
                </AppText>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <AppText variant="header" weight={700} align="start" color="var(--ohl-text-jet)">
          Send a message
        </AppText>
        <div className="mt-3 space-y-3">
          <AppTextInput
            label="Subject"
            placeholder="What is your issue about?"
            value={subject}
            onChange={setSubject}
          />
          <AppTextAreaInput
            label="Message"
            placeholder="Describe your issue in detail"
            value={message}
            onChange={setMessage}
          />
          <AppButton
            label="Send message"
            expanded
            radius={100}
            height={52}
            isDisabled={!subject.trim() || !message.trim() || submitTicket.isPending}
            isLoading={submitTicket.isPending}
            onPressed={handleSubmitTicket}
          />
        </div>
      </div>
    </ProfileSubscreenScaffold>
  );
}
