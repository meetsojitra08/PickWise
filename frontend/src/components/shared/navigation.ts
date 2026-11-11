export interface NavItem {
  label: string;
  to: string;
}

export const PRIMARY_NAV_ITEMS: readonly NavItem[] = [
  { label: 'Browse', to: '/products' },
  { label: 'Compare', to: '/compare' },
  { label: 'Assistant', to: '/assistant' },
];
