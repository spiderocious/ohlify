import type { Metadata } from 'next';

import { LegalPageShell } from '@/components/marketing/legal-page-shell';

export const metadata: Metadata = {
  title: 'End user license agreement',
  description: "Ohlify's End User License Agreement for mobile and web clients.",
};

export default function EulaPage() {
  return (
    <LegalPageShell title="End user license agreement" effectiveDate="May 2026">
      <p>
        This End User License Agreement (&ldquo;<strong>EULA</strong>&rdquo;) is a binding
        contract between you and Ohlify. By installing or using the Ohlify
        mobile or web application (&ldquo;<strong>App</strong>&rdquo;) you agree to be bound
        by this EULA.
      </p>

      <h2>License</h2>
      <p>
        Ohlify grants you a limited, non-exclusive, non-transferable license
        to use the App on devices you own or control, for your personal
        non-commercial use of the Service.
      </p>

      <h2>Restrictions</h2>
      <ul>
        <li>You may not reverse engineer, decompile, or disassemble the App.</li>
        <li>You may not redistribute, sublicense, or resell the App.</li>
        <li>You may not use the App to build a competing service.</li>
      </ul>

      <h2>Ownership</h2>
      <p>
        The App and all related intellectual property remain the property
        of Ohlify and its licensors. No rights are granted to you other
        than as expressly set forth in this EULA.
      </p>

      <h2>Termination</h2>
      <p>
        This EULA continues until terminated. We may terminate it if you
        breach its terms. Upon termination you must stop using and delete
        the App.
      </p>

      <h2>Disclaimer of warranties</h2>
      <p>
        THE APP IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo;
        WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED.
      </p>

      <h2>Contact</h2>
      <p>
        Questions? Reach us at{' '}
        <a href="mailto:legal@ohlify.com">legal@ohlify.com</a>.
      </p>
    </LegalPageShell>
  );
}
