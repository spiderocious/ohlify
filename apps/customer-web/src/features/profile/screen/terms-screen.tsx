import { useLegalDocument } from '../api/use-legal-document.js';
import { LegalDocumentScreen } from './parts/legal-document-screen.js';

/** Mirrors mobile/lib/features/profile/screen/terms_screen.dart. */
export function TermsScreen() {
  const { data, isLoading } = useLegalDocument('terms');
  return <LegalDocumentScreen title="Terms of service" blocks={data?.blocks} isLoading={isLoading} />;
}
