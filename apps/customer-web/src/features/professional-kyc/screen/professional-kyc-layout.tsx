import { Outlet } from 'react-router-dom';

/**
 * Layout for the professional-kyc routes. The provider that previously held
 * volatile draft state has been retired — KYC progress is now fully
 * server-backed via GET /onboarding/kyc/spec, so each screen reads what it
 * needs directly. This layout exists purely to keep the route nesting stable.
 */
export function ProfessionalKycLayout() {
  return <Outlet />;
}
