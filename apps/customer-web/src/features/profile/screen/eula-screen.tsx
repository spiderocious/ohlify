import { useLegalDocument } from '../api/use-legal-document.js';
import { LegalDocumentScreen } from './parts/legal-document-screen.js';

/** Mirrors mobile/lib/features/profile/screen/eula_screen.dart. */
export function EulaScreen() {
  const { data, isLoading } = useLegalDocument('eula');
  return <LegalDocumentScreen title="EULA" blocks={data?.blocks} isLoading={isLoading} />;
}
