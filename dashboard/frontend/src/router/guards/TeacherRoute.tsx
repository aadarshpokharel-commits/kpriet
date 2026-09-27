import React from 'react';
import { RoleRoute } from './RoleRoute';

export function TeacherRoute({ children }: { children: React.ReactNode }) {
  return <RoleRoute allowedRoles={['TEACHER']}>{children}</RoleRoute>;
}
