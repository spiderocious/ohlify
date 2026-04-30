import type { BankDetails } from '../types/index.js';

export interface MockProfileSeed {
  fullName: string;
  email: string;
  phone: string;
  description: string;
  occupation: string;
  interests: string[];
  bankAccount: BankDetails;
  smsNotifications: boolean;
  emailNotifications: boolean;
}

export const MOCK_PROFILE_SEED: MockProfileSeed = {
  fullName: 'Adedeji Benson Bamidele',
  email: 'adedeji_fresh@gmail.com',
  phone: '0801 234 6789',
  description:
    'Senior sales manager with 10+ years of experience helping founders pitch better and close more deals.',
  occupation: 'Software engineer',
  interests: ['Relationship', 'Technology', 'Entertainment'],
  bankAccount: {
    accountNumber: '9654519113',
    bankName: 'Moniepoint MFB',
    accountName: 'Adekunle Ifeanyi Musa',
  },
  smsNotifications: false,
  emailNotifications: true,
};
