import { useLegalDocument } from '../api/use-legal-document.js';
import { LegalDocumentScreen } from './parts/legal-document-screen.js';

/** Mirrors mobile/lib/features/profile/screen/privacy_policy_screen.dart. */
export function PrivacyPolicyScreen() {
  const { data, isLoading } = useLegalDocument('privacy');
  return <LegalDocumentScreen title="Privacy policy" blocks={data?.blocks} isLoading={isLoading} />;
}
