import React from 'react';
import { RoleRoute } from './RoleRoute';

export function StudentRoute({ children }: { children: React.ReactNode }) {
  return <RoleRoute allowedRoles={['STUDENT']}>{children}</RoleRoute>;
}
