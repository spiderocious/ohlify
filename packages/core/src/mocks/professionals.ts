import type { Professional, UpcomingCall } from '../types/index.js';

export const MOCK_PROFESSIONALS: Professional[] = [
  {
    id: 'p-001',
    name: 'Jocelyn Aminoff',
    role: 'Senior sales manager',
    rating: 4.9,
    reviewCount: 187,
    basePrice: 10800,
  },
  {
    id: 'p-002',
    name: 'Lindsey Saris',
    role: 'Senior sales manager',
    rating: 4.7,
    reviewCount: 142,
    basePrice: 8500,
  },
  {
    id: 'p-003',
    name: 'Charlie Mango',
    role: 'Senior sales manager',
    rating: 4.8,
    reviewCount: 203,
    basePrice: 12500,
  },
  {
    id: 'p-004',
    name: 'Adaeze Umeh',
    role: 'Brand strategist',
    rating: 4.6,
    reviewCount: 98,
    basePrice: 7200,
  },
  {
    id: 'p-005',
    name: 'Tunde Bakare',
    role: 'Financial advisor',
    rating: 4.9,
    reviewCount: 256,
    basePrice: 15000,
  },
  {
    id: 'p-006',
    name: 'Sarah Johnson',
    role: 'Career coach',
    rating: 4.5,
    reviewCount: 74,
    basePrice: 6500,
  },
  {
    id: 'p-007',
    name: 'Kehinde Osinbajo',
    role: 'Senior sales manager',
    rating: 4.9,
    reviewCount: 312,
    basePrice: 11000,
  },
  {
    id: 'p-008',
    name: 'Morenike Adeyemi',
    role: 'Product designer',
    rating: 4.7,
    reviewCount: 165,
    basePrice: 9200,
  },
];

export const MOCK_UPCOMING_CALLS: UpcomingCall[] = [
  {
    id: 'uc-001',
    name: 'Tatiana Saris',
    role: 'Senior sales manager',
    rating: 4.9,
    reviewCount: 187,
  },
  {
    id: 'uc-002',
    name: 'Zaire Vetrovs',
    role: 'Senior sales manager',
    rating: 4.9,
    reviewCount: 187,
  },
  {
    id: 'uc-003',
    name: 'Carter Workman',
    role: 'Senior sales manager',
    rating: 4.9,
    reviewCount: 187,
  },
];

export const MOCK_PROFESSIONAL_BIO =
  'Horem ipsum dolor sit amet, consectetur adipiscing elit. ' +
  'Etiam eu turpis molestie, dictum est a, mattis tellus. Sed dignissim, ' +
  'metus nec fringilla accumsan, risus sem lacus, ut interdum tellus ' +
  'elit sed risus. Maecenas condimentum velit, sit amet feugiat lectus. ' +
  'Class aptent taciti sociosqu ad litora torquent per conubia nostra, ' +
  'per inceptos himenaeos. Praesent auctor purus luctus enim egestas, ' +
  'ac scelerisque ante pulvinar.';
