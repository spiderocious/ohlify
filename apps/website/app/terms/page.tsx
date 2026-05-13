import type { Metadata } from 'next';

import { LegalPageShell } from '@/components/marketing/legal-page-shell';

export const metadata: Metadata = {
  title: 'Terms of service',
  description: 'The rules and expectations that govern your use of Ohlify.',
};

export default function TermsPage() {
  return (
    <LegalPageShell title="Terms of service" effectiveDate="May 2026">
      <p>
        These Terms of Service (&ldquo;<strong>Terms</strong>&rdquo;) govern your use of
        Ohlify (the &ldquo;<strong>Service</strong>&rdquo;). By using the Service, you
        agree to these Terms.
      </p>

      <h2>Who can use Ohlify</h2>
      <p>
        You must be at least 18 years old to book or take paid calls. You
        must provide accurate information during sign-up and KYC.
        Professionals must hold real-world credentials for the categories
        they advertise; misrepresentation results in removal.
      </p>

      <h2>Bookings, payments, and refunds</h2>
      <ul>
        <li>
          You agree to pay the price displayed at booking. Funds are held
          in escrow by Ohlify until the call is delivered.
        </li>
        <li>
          If your professional fails to join within the grace window, you
          receive a full automatic refund. If you fail to join, you may be
          charged a partial fee per the booking&apos;s cancellation policy.
        </li>
        <li>
          Cancelling outside the cancellation window results in a full
          refund. Cancelling inside the window may incur a penalty.
        </li>
      </ul>

      <h2>Conduct</h2>
      <p>
        You agree not to: (a) harass, threaten, or defraud another user;
        (b) misuse Ohlify to collect data from professionals; (c) attempt
        to bypass platform payments; or (d) record calls without all
        parties&apos; consent.
      </p>

      <h2>Strikes and suspension</h2>
      <p>
        Ohlify maintains a strike system for missed calls, mid-call drops,
        and fraud. Repeated strikes lead to account suspension. Strikes can
        be disputed within 7 days of issuance.
      </p>

      <h2>Disclaimer</h2>
      <p>
        Ohlify is a marketplace. The professionals on the platform are
        independent and their advice is their own. We do not provide
        medical, legal, financial, or other professional advice through the
        Service.
      </p>

      <h2>Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. We&apos;ll notify you
        of material changes by email or in-app banner before they take
        effect.
      </p>

      <h2>Contact</h2>
      <p>
        Questions? Reach us at{' '}
        <a href="mailto:legal@ohlify.com">legal@ohlify.com</a>.
      </p>
    </LegalPageShell>
  );
}
