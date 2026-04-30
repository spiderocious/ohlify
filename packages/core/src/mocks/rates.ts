import type { ProfessionalRate } from '../types/index.js';

export const MOCK_PROFESSIONAL_RATES: ProfessionalRate[] = [
  { callType: 'audio', durationMinutes: 10, price: '₦ 10,800' },
  { callType: 'audio', durationMinutes: 25, price: '₦ 10,800' },
  { callType: 'video', durationMinutes: 10, price: '₦ 10,800' },
  { callType: 'video', durationMinutes: 25, price: '₦ 10,800' },
];
