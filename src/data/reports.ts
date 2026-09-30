import type { CounterfeitReport, ReportStatus } from '../types';
import { daysAgo } from '../utils/dates';
import { PRODUCTS } from './products';

export const REPORT_REASONS = [
  'Code already used',
  'Packaging looks different',
  'Broken or missing seal',
  'Spelling errors on label',
  'Unusual taste or smell',
  'Price too low',
  'Product not registered',
  'Other',
] as const;

// [productId | null, code, reason, description, location, daysAgo, status, phone]
const rows: Array<[string | null, string, string, string, string, number, ReportStatus, string]> = [
  ['p1', '839274615', 'Code already used', 'SMS reply said this code was already verified many times. Bought from a roadside kiosk.', 'Nairobi', 0.1, 'pending', '0712 *** 481'],
  ['p13', '462918305', 'Packaging looks different', 'Blister pack colour is lighter and the batch print is smudged.', 'Garissa', 0.6, 'investigating', '0722 *** 139'],
  ['p10', '375620194', 'Price too low', 'Sold at half the usual price in a market stall near Kongowea.', 'Mombasa', 1.2, 'confirmed', '0745 *** 902'],
  ['p1', '839274615', 'Unusual taste or smell', 'Oil has a strange smell and is cloudy.', 'Thika', 1.8, 'investigating', '0701 *** 557'],
  ['p8', '914283570', 'Broken or missing seal', 'Milk pack seal was loose and date stamp missing.', 'Kisumu', 2.4, 'pending', '0768 *** 274'],
  ['p15', '603175928', 'Code already used', 'Fertilizer bag code came back as already used. Bought from agro-dealer.', 'Nakuru', 3.1, 'pending', '0790 *** 610'],
  [null, '123456789', 'Product not registered', 'SMS reply said code is invalid. Product label says "Afya Soap".', 'Garissa', 3.7, 'investigating', '0110 *** 845'],
  ['p6', '281946037', 'Spelling errors on label', 'Label reads "Afia Soap" instead of Afya.', 'Mombasa', 4.5, 'confirmed', '0733 *** 318'],
  ['p13', '462918305', 'Code already used', 'Pharmacy sold tablets with a code other customers had used.', 'Nairobi', 5.2, 'confirmed', '0757 *** 066'],
  ['p3', '157392846', 'Packaging looks different', 'Bottle cap is a different shade of yellow.', 'Nyeri', 6.0, 'resolved', '0708 *** 721'],
  ['p10', '375620194', 'Code already used', 'Second report from the same market.', 'Malindi', 7.3, 'resolved', '0712 *** 993'],
  ['p12', '640172853', 'Unusual taste or smell', 'Flour has a sour smell. Code verified fine.', 'Eldoret', 8.9, 'resolved', '0722 *** 404'],
  ['p1', '839274615', 'Price too low', 'Supermarket in Machakos selling 1L at KES 150.', 'Machakos', 9.6, 'confirmed', '0745 *** 212'],
  ['p8', '914283570', 'Code already used', 'Several packs in one crate had the same code.', 'Kakamega', 11.2, 'investigating', '0701 *** 381'],
  ['p14', '520384719', 'Broken or missing seal', 'Syrup bottle had no tamper ring.', 'Kisumu', 13.4, 'resolved', '0768 *** 557'],
  [null, '771204598', 'Product not registered', 'Code on fake "Safi" detergent not found.', 'Mombasa', 15.0, 'resolved', '0733 *** 150'],
  ['p6', '728194632', 'Other', 'Wanted to confirm if soap from new supplier is genuine.', 'Mombasa', 18.2, 'resolved', '0110 *** 339'],
  ['p5', '905126374', 'Packaging looks different', 'Wrapper print is blurry.', 'Nakuru', 22.5, 'resolved', '0790 *** 128'],
];

export const REPORTS: CounterfeitReport[] = rows.map(
  ([productId, code, reason, description, location, age, status, phone], i) => {
    const product = PRODUCTS.find((p) => p.id === productId);
    return {
      id: `r${i + 1}`,
      reference: `CR-${String(2640 - i).padStart(5, '0')}`,
      code,
      productId,
      productName: product?.name ?? 'Unknown product',
      manufacturerId: product?.manufacturerId ?? null,
      reason,
      description,
      location,
      reporterPhone: phone,
      createdAt: daysAgo(age),
      status,
      notes: status === 'pending' ? [] : ['Report received via SMS and logged automatically.'],
    };
  },
);
