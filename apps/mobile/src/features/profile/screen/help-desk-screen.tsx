import { AppButton, AppIcon, AppText, AppTextInput, colors, showCustomModal, showToast, type AppIconName } from '@ohlify/mobile-ui';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, View } from 'react-native';

import { apiErrorMessage, ApiError } from '@shared/types/api-error';

import { helpApi } from '@features/help/api/help-api';
import type { FaqItem, HelpContact } from '@features/help/types/help-models';
import { ProfileSubscreenScaffold } from './parts/profile-subscreen-scaffold';

/** Mirrors mobile/lib/features/profile/screen/help_desk_screen.dart. */
export function HelpDeskScreen() {
  const [contact, setContact] = useState<HelpContact | undefined>(undefined);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([helpApi.getContact(), helpApi.getFaqs()])
      .then(([c, f]) => {
        if (!cancelled) {
          setContact(c);
          setFaqs(f);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function openSubmitTicket() {
    let dismiss: () => void = () => undefined;
    showCustomModal(
      'Send us a message',
      (onDismiss) => {
        dismiss = onDismiss;
        return (
          <SubmitTicketForm
            onSubmit={async (subject, message) => {
              try {
                await helpApi.submitTicket({ subject, message });
                dismiss();
                showToast("Thanks — we'll get back to you shortly.", { type: 'success' });
              } catch (e) {
                showToast(apiErrorMessage(e instanceof ApiError ? e : ApiError.network), { type: 'error' });
              }
            }}
          />
        );
      },
      { position: 'center' },
    );
  }

  async function openWhatsapp() {
    const url = contact?.whatsappDeeplink;
    if (!url) return;
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      showToast(`Open WhatsApp at ${contact?.whatsapp}`, { type: 'info' });
      return;
    }
    await Linking.openURL(url);
  }

  function openFaqs() {
    showCustomModal(
      'FAQs',
      () => (
        <View>
          {faqs.map((f) => (
            <FaqRow key={f.question} faq={f} />
          ))}
          {faqs.length === 0 ? (
            <View style={{ paddingVertical: 16 }}>
              <AppText variant="body" color={colors.textMuted} align="center">
                No FAQs available right now.
              </AppText>
            </View>
          ) : null}
        </View>
      ),
      { position: 'center' },
    );
  }

  const body = (
    <View>
      <AppText variant="body" color={colors.textMuted} align="left">
        Need help? Our customer service team is ready to assist you.
      </AppText>
      <View style={{ height: 24 }} />
      <ContactRow
        icon="send"
        iconBg="#E0E7FF"
        iconColor={colors.primary}
        title="Send us a message"
        subtitle="Have feedback or need support? Drop us a quick note."
        actionLabel={contact?.email ?? 'Contact us'}
        onAction={openSubmitTicket}
      />
      <View style={{ height: 16 }} />
      <ContactRow icon="headsetMic" iconBg="#E0F2FE" iconColor="#0284C7" title="FAQs" subtitle="See frequently asked questions" onAction={openFaqs} />
      {contact?.whatsapp ? (
        <>
          <View style={{ height: 16 }} />
          <ContactRow
            icon="chat"
            iconBg="#DCFCE7"
            iconColor="#16A34A"
            title="WhatsApp"
            subtitle="Chat with our support team"
            actionLabel={contact.whatsapp}
            onAction={() => void openWhatsapp()}
          />
        </>
      ) : null}
      {loading ? (
        <View style={{ paddingVertical: 24, alignItems: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}
    </View>
  );

  return <ProfileSubscreenScaffold title="Help desk" body={body} />;
}

function FaqRow({ faq }: { faq: FaqItem }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ marginBottom: 4 }}>
      <Pressable onPress={() => setOpen((v) => !v)}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
          <View style={{ flex: 1 }}>
            <AppText variant="body" color={colors.textJet} weight="600" align="left">
              {faq.question}
            </AppText>
          </View>
          <AppIcon name={open ? 'chevronDown' : 'chevronRight'} size={18} color={colors.textMuted} />
        </View>
      </Pressable>
      {open ? (
        <View style={{ paddingBottom: 12 }}>
          <AppText variant="body" color={colors.textMuted} align="left">
            {faq.answer}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

function SubmitTicketForm({ onSubmit }: { onSubmit: (subject: string, message: string) => Promise<void> }) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const canSubmit = !busy && subject.trim().length > 0 && message.trim().length >= 5;

  async function go() {
    if (!canSubmit) return;
    setBusy(true);
    await onSubmit(subject.trim(), message.trim());
    setBusy(false);
  }

  return (
    <View>
      <AppTextInput label="Subject" placeholder="How can we help?" value={subject} onChangeText={setSubject} />
      <View style={{ height: 12 }} />
      <AppTextInput label="Message" placeholder="Tell us what is going on…" maxLength={1000} value={message} onChangeText={setMessage} />
      <View style={{ height: 16 }} />
      <AppButton label={busy ? 'Sending…' : 'Send'} expanded radius={100} isDisabled={!canSubmit} onPress={!canSubmit ? undefined : go} />
    </View>
  );
}

function ContactRow({
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  icon: AppIconName;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction: () => void;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: iconBg, alignItems: 'center', justifyContent: 'center' }}>
        <AppIcon name={icon} size={20} color={iconColor} />
      </View>
      <View style={{ width: 14 }} />
      <View style={{ flex: 1 }}>
        <AppText variant="body" color={colors.textJet} weight="700" align="left">
          {title}
        </AppText>
        <View style={{ height: 4 }} />
        <AppText variant="bodyNormal" color={colors.textMuted} align="left">
          {subtitle}
        </AppText>
        {actionLabel ? (
          <>
            <View style={{ height: 6 }} />
            <Pressable onPress={onAction}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AppText variant="body" color={colors.primary} weight="600" align="left">
                  {actionLabel}
                </AppText>
              </View>
            </Pressable>
          </>
        ) : null}
      </View>
    </View>
  );
}

