import { Outlet } from 'react-router-dom';

import { ProfileProvider } from '../providers/profile-provider.js';

/** Layout that owns ProfileProvider so all profile sub-screens share state. */
export function ProfileLayout() {
  return (
    <ProfileProvider>
      <Outlet />
    </ProfileProvider>
  );
}
