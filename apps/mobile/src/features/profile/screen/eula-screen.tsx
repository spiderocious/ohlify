import { LegalDocumentScreen } from './parts/legal-document-screen';

export function EulaScreen() {
  return <LegalDocumentScreen kind="eula" fallbackTitle="End user license agreement" />;
}
