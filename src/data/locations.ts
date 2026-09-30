import type { KenyaLocation } from '../types';

/** Kenyan towns used for demo verification locations (approximate coordinates). */
export const KENYA_LOCATIONS: KenyaLocation[] = [
  { name: 'Nairobi', county: 'Nairobi', lat: -1.29, lng: 36.82 },
  { name: 'Mombasa', county: 'Mombasa', lat: -4.04, lng: 39.67 },
  { name: 'Kisumu', county: 'Kisumu', lat: -0.09, lng: 34.76 },
  { name: 'Nakuru', county: 'Nakuru', lat: -0.3, lng: 36.07 },
  { name: 'Eldoret', county: 'Uasin Gishu', lat: 0.51, lng: 35.27 },
  { name: 'Garissa', county: 'Garissa', lat: -0.45, lng: 39.65 },
  { name: 'Thika', county: 'Kiambu', lat: -1.03, lng: 37.07 },
  { name: 'Machakos', county: 'Machakos', lat: -1.52, lng: 37.26 },
  { name: 'Nyeri', county: 'Nyeri', lat: -0.42, lng: 36.95 },
  { name: 'Meru', county: 'Meru', lat: 0.05, lng: 37.65 },
  { name: 'Kakamega', county: 'Kakamega', lat: 0.28, lng: 34.75 },
  { name: 'Malindi', county: 'Kilifi', lat: -3.22, lng: 40.12 },
  { name: 'Kitale', county: 'Trans Nzoia', lat: 1.02, lng: 35.0 },
  { name: 'Lodwar', county: 'Turkana', lat: 3.12, lng: 35.6 },
];

export const LOCATION_NAMES = KENYA_LOCATIONS.map((l) => l.name);

/** Rough population weighting so Nairobi gets most traffic */
export const LOCATION_WEIGHTS = [30, 14, 9, 8, 6, 4, 6, 4, 3, 3, 3, 2, 2, 1];
