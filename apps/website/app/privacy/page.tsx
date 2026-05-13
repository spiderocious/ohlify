import type { Metadata } from 'next';

import { LegalPageShell } from '@/components/marketing/legal-page-shell';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description:
    "How Ohlify collects, uses, and protects your data when you book or take paid calls on our platform.",
};

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy policy" effectiveDate="May 2026">
      <p>
        This Privacy Policy describes how Ohlify (&ldquo;<strong>we</strong>,&rdquo;
        &ldquo;<strong>us</strong>,&rdquo; or &ldquo;<strong>our</strong>&rdquo;) collects,
        uses, and shares information when you use our products and services
        (the &ldquo;<strong>Service</strong>&rdquo;).
      </p>

      <h2>Information we collect</h2>
      <p>
        We collect information you give us directly, information collected as
        you use the Service, and information from trusted partners (payment
        processors, identity verifiers, RTC providers).
      </p>
      <ul>
        <li>
          <strong>Account data:</strong> name, email, phone number, password
          hash, role, and the contents of your profile.
        </li>
        <li>
          <strong>KYC data:</strong> the identity document type and number
          you submit, a selfie, and our admin review status. We never share
          these with other users.
        </li>
        <li>
          <strong>Bookings &amp; calls:</strong> who you called, when, and for
          how long. Audio and video streams are not recorded by Ohlify.
        </li>
        <li>
          <strong>Wallet &amp; payments:</strong> the funds we hold in escrow
          on your behalf, payouts, refunds, and the corresponding journal
          entries. Card numbers are tokenized by Paystack — we never touch
          your raw PAN.
        </li>
      </ul>

      <h2>How we use information</h2>
      <ul>
        <li>To match callers with professionals and fulfill bookings.</li>
        <li>To process payments, payouts, and refunds.</li>
        <li>To meet legal, regulatory, and tax obligations.</li>
        <li>To prevent fraud and enforce our Terms of Service.</li>
        <li>To improve and personalize the Service.</li>
      </ul>

      <h2>How we share information</h2>
      <p>
        We share data with payment processors (Paystack), real-time
        communication providers (Agora), notification providers (Resend,
        Firebase), and cloud infrastructure providers strictly to deliver
        the Service. We do not sell your personal data.
      </p>

      <h2>Data retention</h2>
      <p>
        We retain account data while your account is active. Financial
        records are retained as required by law. You may request deletion
        of your account at any time — see &ldquo;Your rights&rdquo; below.
      </p>

      <h2>Your rights</h2>
      <ul>
        <li>Access, correct, or delete your personal information.</li>
        <li>Export your booking and wallet history.</li>
        <li>Withdraw consent for non-essential processing.</li>
      </ul>
      <p>
        To exercise any of these, email us at{' '}
        <a href="mailto:privacy@ohlify.com">privacy@ohlify.com</a>.
      </p>

      <h2>Contact</h2>
      <p>
        Questions? Reach us at{' '}
        <a href="mailto:privacy@ohlify.com">privacy@ohlify.com</a>.
      </p>
    </LegalPageShell>
  );
}
