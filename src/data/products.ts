import type { Product } from '../types';
import { daysAgo } from '../utils/dates';

export const PRODUCT_CATEGORIES = [
  'Edible Oils',
  'Spreads',
  'Household',
  'Personal Care',
  'Dairy',
  'Flour & Grains',
  'Pharmaceuticals',
  'Agro-inputs',
  'Beverages',
] as const;

// [id, manufacturerId, name, category, description, sku, createdDaysAgo]
const rows: Array<[string, string, string, string, string, string, number]> = [
  ['p1', 'm1', 'XYZ Cooking Oil 1L', 'Edible Oils', 'Refined vegetable cooking oil, 1 litre bottle.', 'XYZ-CO-1L', 380],
  ['p2', 'm1', 'XYZ Cooking Oil 5L', 'Edible Oils', 'Refined vegetable cooking oil, 5 litre jerrycan.', 'XYZ-CO-5L', 372],
  ['p3', 'm1', 'XYZ Sunflower Oil 2L', 'Edible Oils', 'Pure sunflower oil, 2 litre bottle.', 'XYZ-SF-2L', 240],
  ['p4', 'm1', 'XYZ Margarine 500g', 'Spreads', 'Vitamin-fortified table margarine, 500 g tub.', 'XYZ-MG-500', 200],
  ['p5', 'm1', 'XYZ Bar Soap 800g', 'Household', 'Multipurpose laundry bar soap, 800 g.', 'XYZ-BS-800', 120],
  ['p6', 'm2', 'Afya Soap 250g', 'Personal Care', 'Antibacterial bathing soap, 250 g.', 'AFY-SP-250', 330],
  ['p7', 'm2', 'Afya Hand Wash 500ml', 'Personal Care', 'Liquid hand wash with aloe, 500 ml.', 'AFY-HW-500', 150],
  ['p8', 'm3', 'Raha Milk 500ml', 'Dairy', 'Long-life UHT whole milk, 500 ml pack.', 'RAH-MK-500', 290],
  ['p9', 'm3', 'Raha Yoghurt 250ml', 'Dairy', 'Strawberry drinking yoghurt, 250 ml.', 'RAH-YG-250', 110],
  ['p10', 'm4', 'Safi Detergent 1kg', 'Household', 'Laundry powder detergent, 1 kg.', 'SAF-DT-1KG', 250],
  ['p11', 'm4', 'Safi Bleach 750ml', 'Household', 'Regular household bleach, 750 ml.', 'SAF-BL-750', 140],
  ['p12', 'm5', 'Tamu Maize Flour 2kg', 'Flour & Grains', 'Fortified sifted maize meal, 2 kg.', 'TMU-MF-2KG', 180],
  ['p13', 'm6', 'Mwanga Paracetamol 500mg', 'Pharmaceuticals', 'Pain relief tablets, pack of 100.', 'MWP-PC-500', 150],
  ['p14', 'm6', 'Mwanga Cough Syrup 100ml', 'Pharmaceuticals', 'Non-drowsy cough syrup, 100 ml.', 'MWP-CS-100', 90],
  ['p15', 'm7', 'Kilele DAP Fertilizer 50kg', 'Agro-inputs', 'Di-ammonium phosphate planting fertilizer, 50 kg bag.', 'KLA-DAP-50', 20],
  ['p16', 'm8', 'Jua Mango Juice 1L', 'Beverages', 'Mango juice drink, 1 litre.', 'JUA-MJ-1L', 220],
];

export const PRODUCTS: Product[] = rows.map(([id, manufacturerId, name, category, description, sku, age]) => ({
  id,
  manufacturerId,
  name,
  category,
  description,
  sku,
  status: id === 'p16' ? 'discontinued' : 'active',
  createdAt: daysAgo(age),
}));
