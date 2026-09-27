import { paths } from '@/router/paths';

export interface NavItem {
  label: string;
  to: string;
  /**
   * Permission key required to see this item, checked against the
   * permissions the backend returns for the signed-in user (auth phase).
   * Hiding a link is a UX nicety; the API enforces access.
   */
  permission?: string;
}

export const primaryNav: NavItem[] = [{ label: 'System status', to: paths.systemStatus }];
