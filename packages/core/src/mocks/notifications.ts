import type { AppNotification } from '../types/index.js';

export const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n-001',
    kind: 'missedCall',
    title: 'Missed call',
    message: 'Oops! You missed a call request from David Lee. They may try again.',
    timeLabel: 'Today',
    read: false,
    route: '/call/cc-001',
  },
  {
    id: 'n-002',
    kind: 'upcomingCall',
    title: 'Upcoming call reminder',
    message: 'You have a call with Robert Kim starting in 30 minutes',
    timeLabel: '21 Feb. 2024',
    read: false,
    route: '/call/sc-001',
  },
  {
    id: 'n-003',
    kind: 'paymentReceived',
    title: 'Payment received',
    message: 'You earned ₦30,000 from a call with John Doe.',
    timeLabel: '3 hours ago',
    read: true,
    route: '/wallet',
  },
];
