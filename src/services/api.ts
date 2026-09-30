/**
 * THE API LAYER — the only file pages and components import data functions from.
 *
 * It picks one data source (see config.ts):
 *   • mock      → src/services/mock/mockApi.ts          (demo data in the browser)
 *   • Supabase  → src/services/supabase/supabaseApi.ts  (real database)
 * Both implement exactly the same functions, so no page changes when you switch.
 *
 * Note: `manufacturerId` narrows results for the manufacturer app. In Supabase mode the
 * database rules (Row Level Security) already restrict a manufacturer to its own rows.
 */
import type {
  ActivityItem,
  BatchWithProduct,
  CodeWithDetails,
  CounterfeitReport,
  CreateBatchInput,
  DashboardStats,
  Hotspot,
  Manufacturer,
  ManufacturerStatus,
  ManufacturerWithStats,
  NewLoginInput,
  NewManufacturerInput,
  ProductActivity,
  RegisterManufacturerInput,
  ProductBatch,
  ProductWithStats,
  ReportStatus,
  SuspiciousActivity,
  SuspiciousStatus,
  SystemSettings,
  TrendPoint,
  VerificationCode,
  VerificationWithDetails,
} from '../types';
import { USE_MOCK_API } from './config';
import * as mock from './mock/mockApi';
import * as live from './supabase/supabaseApi';

const source = USE_MOCK_API ? mock : live;

/* ---------- Dashboard ---------- */
export const getDashboardStats = (manufacturerId?: string): Promise<DashboardStats> => source.getDashboardStats(manufacturerId);
export const getVerificationTrend = (days: number, manufacturerId?: string): Promise<TrendPoint[]> =>
  source.getVerificationTrend(days, manufacturerId);
export const getProductActivity = (manufacturerId?: string): Promise<ProductActivity[]> => source.getProductActivity(manufacturerId);
export const getRecentActivity = (limit = 8, manufacturerId?: string): Promise<ActivityItem[]> =>
  source.getRecentActivity(limit, manufacturerId);

/* ---------- Manufacturers ---------- */
export const getManufacturers = (): Promise<ManufacturerWithStats[]> => source.getManufacturers();
export const getManufacturer = (id: string): Promise<Manufacturer> => source.getManufacturer(id);
export const updateManufacturer = (id: string, patch: Partial<Manufacturer>): Promise<Manufacturer> => source.updateManufacturer(id, patch);
export const updateManufacturerStatus = (id: string, status: ManufacturerStatus): Promise<Manufacturer> =>
  source.updateManufacturerStatus(id, status);
/** Admin only: registers a company and creates its login in one step */
export const createManufacturer = (input: NewManufacturerInput, login: NewLoginInput): Promise<Manufacturer> =>
  source.createManufacturer(input, login);
/** Public: a company registers itself; it stays "pending" until an admin approves it */
export const registerManufacturer = (input: RegisterManufacturerInput): Promise<void> => source.registerManufacturer(input);
/** Admin only: creates a login for a company that doesn't have one */
export const createManufacturerLogin = (manufacturerId: string, login: NewLoginInput): Promise<void> =>
  source.createManufacturerLogin(manufacturerId, login);

/* ---------- Products & batches ---------- */
export const getProducts = (manufacturerId?: string): Promise<ProductWithStats[]> => source.getProducts(manufacturerId);
export const getBatches = (manufacturerId?: string): Promise<BatchWithProduct[]> => source.getBatches(manufacturerId);
/** Creates a batch and generates its verification codes */
export const createProductBatch = (manufacturerId: string, input: CreateBatchInput): Promise<ProductBatch> =>
  source.createProductBatch(manufacturerId, input);

/* ---------- Verification codes ---------- */
export const getVerificationCodes = (manufacturerId?: string): Promise<CodeWithDetails[]> => source.getVerificationCodes(manufacturerId);
export const deactivateCode = (code: string): Promise<VerificationCode> => source.setCodeStatus(code, 'deactivated');
export const reactivateCode = (code: string): Promise<VerificationCode> => source.setCodeStatus(code, 'active');

/* ---------- Verification logs ---------- */
export const getVerificationLogs = (manufacturerId?: string): Promise<VerificationWithDetails[]> =>
  source.getVerificationLogs(manufacturerId);

/* ---------- Counterfeit tracking ---------- */
export const getSuspiciousActivity = (manufacturerId?: string): Promise<SuspiciousActivity[]> =>
  source.getSuspiciousActivity(manufacturerId);
export const updateSuspiciousStatus = (code: string, status: SuspiciousStatus): Promise<void> => source.updateSuspiciousStatus(code, status);
export const getReports = (manufacturerId?: string): Promise<CounterfeitReport[]> => source.getReports(manufacturerId);
export const updateReportStatus = (id: string, status: ReportStatus, note?: string): Promise<CounterfeitReport> =>
  source.updateReportStatus(id, status, note);
export const getHotspots = (): Promise<Hotspot[]> => source.getHotspots();

/* ---------- Settings ---------- */
export const getSettings = (): Promise<SystemSettings> => source.getSettings();
export const updateSettings = (settings: SystemSettings): Promise<SystemSettings> => source.updateSettings(settings);
