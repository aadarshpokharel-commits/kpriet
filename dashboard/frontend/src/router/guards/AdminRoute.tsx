import React from 'react';
import { RoleRoute } from './RoleRoute';

export function AdminRoute({ children }: { children: React.ReactNode }) {
  return <RoleRoute allowedRoles={['ADMIN', 'PRINCIPAL']}>{children}</RoleRoute>;
}
