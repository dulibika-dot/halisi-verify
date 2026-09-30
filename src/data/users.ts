import type { SystemSettings, User } from '../types';
import { DEFAULT_SUSPICIOUS_THRESHOLD } from './generated';

/**
 * Demo accounts for the mock login. In production, users are stored by the
 * backend (e.g. Supabase Auth) and passwords are NEVER kept in frontend code.
 */
export const DEMO_ACCOUNTS: Array<User & { password: string }> = [
  {
    id: 'u1',
    name: 'Grace Wanjiku',
    email: 'manufacturer@xyz.demo',
    phone: '+254 712 000 101',
    role: 'manufacturer',
    manufacturerId: 'm1',
    title: 'Quality Assurance Lead, XYZ Ltd',
    password: 'demo1234',
  },
  {
    id: 'u2',
    name: 'Daniel Kamau',
    email: 'admin@halisi.demo',
    phone: '+254 700 000 900',
    role: 'admin',
    title: 'System Administrator',
    password: 'admin1234',
  },
];

export const DEFAULT_SETTINGS: SystemSettings = {
  suspiciousThreshold: DEFAULT_SUSPICIOUS_THRESHOLD,
  highRiskThreshold: 20,
  smsShortcode: '22384',
  verifyKeyword: 'VERIFY',
  reportKeyword: 'REPORT',
  autoFlagSuspicious: true,
  notifyManufacturers: true,
  emailAlerts: false,
  dataRetentionDays: 365,
};
