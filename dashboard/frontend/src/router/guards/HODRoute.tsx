import React from 'react';
import { RoleRoute } from './RoleRoute';

export function HODRoute({ children }: { children: React.ReactNode }) {
  return <RoleRoute allowedRoles={['HOD']}>{children}</RoleRoute>;
}
