import {
  Barcode,
  Building2,
  FileWarning,
  Layers,
  LayoutDashboard,
  ListChecks,
  MapPinned,
  MessageSquareText,
  Package,
  Settings,
  ShieldAlert,
  UserCircle,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  tag?: string;
  /** exact match for index routes */
  end?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const MANUFACTURER_NAV: NavSection[] = [
  { title: 'Overview', items: [{ label: 'Dashboard', to: '/manufacturer', icon: LayoutDashboard, end: true }] },
  {
    title: 'Catalogue',
    items: [
      { label: 'Products', to: '/manufacturer/products', icon: Package },
      { label: 'Product Batches', to: '/manufacturer/batches', icon: Layers },
      { label: 'Verification Codes', to: '/manufacturer/codes', icon: Barcode },
    ],
  },
  {
    title: 'Monitoring',
    items: [
      { label: 'Verification Activity', to: '/manufacturer/activity', icon: ListChecks },
      { label: 'Reports', to: '/manufacturer/reports', icon: FileWarning },
    ],
  },
  { title: 'Tools', items: [{ label: 'SMS Simulator', to: '/manufacturer/simulator', icon: MessageSquareText, tag: 'Demo' }] },
  { title: 'Account', items: [{ label: 'Profile', to: '/manufacturer/profile', icon: UserCircle }] },
];

export const ADMIN_NAV: NavSection[] = [
  { title: 'Overview', items: [{ label: 'Dashboard', to: '/admin', icon: LayoutDashboard, end: true }] },
  {
    title: 'Registry',
    items: [
      { label: 'Manufacturers', to: '/admin/manufacturers', icon: Building2 },
      { label: 'Products', to: '/admin/products', icon: Package },
    ],
  },
  {
    title: 'Counterfeit tracking',
    items: [
      { label: 'Verification Logs', to: '/admin/logs', icon: ListChecks },
      { label: 'Suspicious Activity', to: '/admin/suspicious', icon: ShieldAlert },
      { label: 'Counterfeit Reports', to: '/admin/reports', icon: FileWarning },
      { label: 'Hotspots', to: '/admin/hotspots', icon: MapPinned },
    ],
  },
  { title: 'Tools', items: [{ label: 'SMS Simulator', to: '/admin/simulator', icon: MessageSquareText, tag: 'Demo' }] },
  { title: 'System', items: [{ label: 'System Settings', to: '/admin/settings', icon: Settings }] },
];

export function findNavItem(sections: NavSection[], pathname: string): NavItem | undefined {
  const items = sections.flatMap((s) => s.items);
  return items.find((i) => i.to === pathname) ?? items.filter((i) => !i.end && pathname.startsWith(i.to)).sort((a, b) => b.to.length - a.to.length)[0];
}
