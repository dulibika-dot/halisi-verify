/**
 * Shared TypeScript types.
 * These describe the shape of data the future backend (Node.js/Express + Supabase/PostgreSQL)
 * should return, so the UI keeps working when the mock layer is replaced.
 */

export type UserRole = 'manufacturer' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  /** Only set for manufacturer accounts */
  manufacturerId?: string;
  title?: string;
}

export type ManufacturerStatus = 'active' | 'pending' | 'suspended';

export interface Manufacturer {
  id: string;
  name: string;
  registrationNo: string;
  contactPerson: string;
  email: string;
  phone: string;
  county: string;
  address: string;
  industry: string;
  status: ManufacturerStatus;
  joinedAt: string; // ISO date
}

export type ProductStatus = 'active' | 'discontinued';

export interface Product {
  id: string;
  manufacturerId: string;
  name: string;
  category: string;
  description: string;
  sku: string;
  status: ProductStatus;
  createdAt: string;
}

export type BatchStatus = 'active' | 'pending' | 'recalled' | 'expired';
export type CodeGenerationStatus = 'generated' | 'generating' | 'failed';

export interface ProductBatch {
  id: string;
  productId: string;
  manufacturerId: string;
  batchNumber: string;
  quantity: number;
  manufacturingDate: string;
  expiryDate: string;
  codesGenerated: number;
  codeStatus: CodeGenerationStatus;
  /** First and last code issued, for display only (codes are random, not sequential) */
  codeRange: { first: string; last: string } | null;
  status: BatchStatus;
  createdAt: string;
}

export type CodeStatus = 'active' | 'deactivated';

export interface VerificationCode {
  code: string;
  batchId: string;
  productId: string;
  manufacturerId: string;
  status: CodeStatus;
  /** Admin decision on a suspicious code; null = decided automatically from the count */
  reviewStatus: Exclude<SuspiciousStatus, 'suspicious'> | null;
  verificationCount: number;
  createdAt: string;
  lastVerifiedAt: string | null;
}

export type VerificationResult = 'verified' | 'suspicious' | 'invalid';
export type VerificationChannel = 'sms' | 'simulator';

export interface Verification {
  id: string;
  code: string;
  productId: string | null;
  batchId: string | null;
  manufacturerId: string | null;
  /** Masked phone number of the customer, e.g. 0712 *** 481 */
  phone: string;
  location: string;
  timestamp: string;
  result: VerificationResult;
  /** How many times the code had been checked, including this one */
  countAtTime: number;
  channel: VerificationChannel;
}

export type ReportStatus = 'pending' | 'investigating' | 'confirmed' | 'resolved';

export interface CounterfeitReport {
  id: string;
  reference: string;
  code: string;
  productId: string | null;
  productName: string;
  manufacturerId: string | null;
  reason: string;
  description: string;
  location: string;
  reporterPhone: string;
  createdAt: string;
  status: ReportStatus;
  notes: string[];
}

export type RiskLevel = 'high' | 'medium' | 'low';
export type SuspiciousStatus = 'suspicious' | 'normal' | 'investigating' | 'blocked';

export interface SuspiciousActivity {
  code: string;
  productId: string;
  productName: string;
  manufacturerName: string;
  batchNumber: string;
  verificationCount: number;
  primaryLocation: string;
  locations: string[];
  uniquePhones: number;
  firstSeen: string;
  lastSeen: string;
  riskLevel: RiskLevel;
  status: SuspiciousStatus;
}

export interface KenyaLocation {
  name: string;
  county: string;
  lat: number;
  lng: number;
}

export interface Hotspot extends KenyaLocation {
  totalVerifications: number;
  suspicious: number;
  invalid: number;
  reports: number;
  topProduct: string | null;
}

/* ---------- Joined rows (what list endpoints return) ---------- */

export interface ManufacturerWithStats extends Manufacturer {
  productCount: number;
  batchCount: number;
  verificationCount: number;
  suspiciousCount: number;
  /** Email of the manufacturer's login account, or null if nobody can sign in for it yet */
  loginEmail: string | null;
}

export interface ProductWithStats extends Product {
  manufacturerName: string;
  batchCount: number;
  totalUnits: number;
  verificationCount: number;
  suspiciousCount: number;
}

export interface BatchWithProduct extends ProductBatch {
  productName: string;
  category: string;
  manufacturerName: string;
}

export interface CodeWithDetails extends VerificationCode {
  productName: string;
  batchNumber: string;
}

export interface VerificationWithDetails extends Verification {
  productName: string | null;
  manufacturerName: string | null;
  batchNumber: string | null;
}

export interface SystemSettings {
  suspiciousThreshold: number;
  highRiskThreshold: number;
  smsShortcode: string;
  verifyKeyword: string;
  reportKeyword: string;
  autoFlagSuspicious: boolean;
  notifyManufacturers: boolean;
  emailAlerts: boolean;
  dataRetentionDays: number;
}

/* ---------- Aggregates returned by dashboard endpoints ---------- */

export interface DashboardStats {
  manufacturers: number;
  products: number;
  batches: number;
  verifications: number;
  verified: number;
  suspicious: number;
  invalid: number;
  reports: number;
  /** % change vs previous period, used for the small trend chips */
  verificationsChange: number;
  suspiciousChange: number;
}

export interface TrendPoint {
  date: string; // ISO date (day)
  label: string; // e.g. "Sep 21"
  verified: number;
  suspicious: number;
  invalid: number;
}

export interface ProductActivity {
  productId: string;
  productName: string;
  verified: number;
  suspicious: number;
  invalid: number;
  total: number;
}

export interface ActivityItem {
  id: string;
  productName: string;
  code: string;
  result: VerificationResult;
  location: string;
  timestamp: string;
}

/* ---------- Inputs ---------- */

export interface CreateBatchInput {
  productName: string;
  category: string;
  description: string;
  batchNumber: string;
  quantity: number;
  manufacturingDate: string;
  expiryDate: string;
}

/** Admin "Add manufacturer" form — company details */
export interface NewManufacturerInput {
  name: string;
  registrationNo: string;
  industry: string;
  county: string;
  address: string;
  phone: string;
  email: string;
  contactPerson: string;
  status: 'active' | 'pending';
}

/** Login account the admin creates for a manufacturer (temporary password, changed later in Profile) */
export interface NewLoginInput {
  name: string;
  email: string;
  password: string;
}

/** Public "Register your company" form (account always starts as pending) */
export interface RegisterManufacturerInput {
  company: Omit<NewManufacturerInput, 'status' | 'email' | 'contactPerson'>;
  login: NewLoginInput;
  /** Anti-spam trap: an invisible field only bots fill in */
  website?: string;
}

/** What the SMS gateway reply would contain */
export interface SmsVerificationResponse {
  result: VerificationResult | 'deactivated';
  code: string;
  replyText: string;
  verificationCount: number;
  product?: { name: string; category: string };
  manufacturer?: string;
  batchNumber?: string;
  expiryDate?: string;
  location: string;
  timestamp: string;
}

export interface SmsReportResponse {
  reference: string;
  replyText: string;
}
