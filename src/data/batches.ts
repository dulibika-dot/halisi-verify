import type { BatchStatus, ProductBatch } from '../types';
import { addDays, daysAgo } from '../utils/dates';
import { PRODUCTS } from './products';

// [id, productId, batchNumber, quantity, createdDaysAgo, shelfLifeDays, status]
const rows: Array<[string, string, string, number, number, number, BatchStatus]> = [
  ['b1', 'p1', 'B2026-001', 5000, 150, 540, 'active'],
  ['b2', 'p1', 'B2026-014', 8000, 62, 540, 'active'],
  ['b3', 'p1', 'B2026-027', 6000, 9, 540, 'active'],
  ['b4', 'p2', 'B2026-005', 2500, 130, 540, 'active'],
  ['b5', 'p2', 'B2026-019', 3000, 40, 540, 'active'],
  ['b6', 'p3', 'B2026-008', 4000, 110, 480, 'active'],
  ['b7', 'p3', 'B2026-022', 4000, 25, 480, 'pending'],
  ['b8', 'p4', 'B2026-011', 7000, 95, 180, 'active'],
  ['b9', 'p5', 'B2026-017', 10000, 55, 720, 'active'],
  ['b10', 'p6', 'AF-2026-031', 12000, 140, 720, 'active'],
  ['b11', 'p6', 'AF-2026-044', 12000, 35, 720, 'active'],
  ['b12', 'p7', 'AF-2026-039', 6000, 70, 540, 'active'],
  ['b13', 'p8', 'RD-2026-102', 20000, 45, 180, 'active'],
  ['b14', 'p8', 'RD-2026-118', 20000, 12, 180, 'active'],
  ['b15', 'p9', 'RD-2026-110', 8000, 28, 30, 'expired'],
  ['b16', 'p10', 'SC-2026-207', 9000, 120, 900, 'active'],
  ['b17', 'p10', 'SC-2026-231', 9000, 30, 900, 'active'],
  ['b18', 'p11', 'SC-2026-219', 5000, 80, 720, 'recalled'],
  ['b19', 'p12', 'TF-2026-058', 15000, 60, 180, 'active'],
  ['b20', 'p13', 'MW-2026-A12', 3000, 100, 1080, 'active'],
  ['b21', 'p13', 'MW-2026-A19', 3000, 18, 1080, 'active'],
  ['b22', 'p14', 'MW-2026-C04', 2000, 50, 720, 'active'],
  ['b23', 'p15', 'KA-2026-003', 1500, 15, 720, 'active'],
  ['b24', 'p16', 'JB-2026-066', 7000, 200, 270, 'active'],
];

export const BATCHES: ProductBatch[] = rows.map(([id, productId, batchNumber, quantity, age, shelfLife, status]) => {
  const product = PRODUCTS.find((p) => p.id === productId)!;
  const manufacturingDate = daysAgo(age + 3);
  return {
    id,
    productId,
    manufacturerId: product.manufacturerId,
    batchNumber,
    quantity,
    manufacturingDate,
    expiryDate: addDays(manufacturingDate, shelfLife),
    codesGenerated: quantity,
    codeStatus: 'generated',
    codeRange: null, // filled in by the seed generator
    status,
    createdAt: daysAgo(age),
  };
});
