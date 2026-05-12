import type {
  CallDetail,
  CallStats,
  CompletedCallGroup,
  CompletedCallItem,
  ScheduledCall,
  ScheduledCallItem,
} from '../types/index.js';

export const MOCK_SCHEDULED_CALL_BANNER: ScheduledCall = {
  id: 'call-001',
  calleeName: 'Chinedu Okezie',
  scheduledTime: '5 mins',
};

export const MOCK_SCHEDULED_CALLS: ScheduledCallItem[] = [
  {
    id: 'sc-001',
    name: 'Chinonso Eze',
    role: 'Senior sales manager',
    rating: 4.9,
    callType: 'video',
    time: '12:00PM',
    date: '23 Feb, 2026',
    duration: '25 mins',
    canReschedule: true,
  },
  {
    id: 'sc-002',
    name: 'Chinonso Eze',
    role: 'Senior sales manager',
    rating: 4.9,
    callType: 'video',
    time: '12:00PM',
    date: '23 Feb, 2026',
    duration: '25 mins',
    canReschedule: false,
  },
  {
    id: 'sc-003',
    name: 'Chinonso Eze',
    role: 'Senior sales manager',
    rating: 4.9,
    callType: 'audio',
    time: '12:00PM',
    date: '23 Feb, 2026',
    duration: '25 mins',
    canReschedule: false,
  },
];

const COMPLETED_FEB_2: CompletedCallItem[] = [
  {
    id: 'cc-001',
    name: 'Chinonso Eze',
    callType: 'video',
    time: '03:02 PM',
    duration: '25 mins',
    amount: '₦20,000.00',
  },
  {
    id: 'cc-002',
    name: 'Brandon Baptista',
    callType: 'audio',
    time: '03:02 PM',
    duration: '25 mins',
    amount: '₦20,000.00',
  },
  {
    id: 'cc-003',
    name: 'Skylar Rosser',
    callType: 'video',
    time: '03:02 PM',
    duration: '25 mins',
    amount: '₦20,000.00',
  },
  {
    id: 'cc-004',
    name: 'Wilson Vaccaro',
    callType: 'audio',
    time: '03:02 PM',
    duration: '25 mins',
    amount: '₦20,000.00',
  },
  {
    id: 'cc-005',
    name: 'Kaiya Carder',
    callType: 'video',
    time: '03:02 PM',
    duration: '25 mins',
    amount: '₦20,000.00',
  },
  {
    id: 'cc-006',
    name: 'Giana Dokidis',
    callType: 'audio',
    time: '03:02 PM',
    duration: '25 mins',
    amount: '₦20,000.00',
  },
];

export const MOCK_COMPLETED_CALL_GROUPS: CompletedCallGroup[] = [
  { date: 'FEBRUARY 2, 2023', calls: COMPLETED_FEB_2 },
];

export const MOCK_CALL_STATS: CallStats = { total: 47, thisMonth: 47, thisWeek: 18 };

/**
 * Mirror of mobile MockService.getCallById — looks across scheduled calls,
 * upcoming calls, and completed calls to find a single call by id.
 */
export function findMockCallById(id: string): CallDetail | null {
  for (const c of MOCK_SCHEDULED_CALLS) {
    if (c.id === id) {
      return {
        id: c.id,
        professionalId: 'p-007',
        name: c.name,
        role: c.role,
        rating: c.rating,
        callType: c.callType,
        status: 'upcoming',
        time: c.time,
        date: c.date,
        duration: c.duration,
        canJoin: !c.canReschedule,
        canReschedule: c.canReschedule,
        ...(c.avatarKey ? { avatarKey: c.avatarKey } : {}),
      };
    }
  }
  for (const group of MOCK_COMPLETED_CALL_GROUPS) {
    for (const c of group.calls) {
      if (c.id === id) {
        return {
          id: c.id,
          professionalId: 'p-007',
          name: c.name,
          role: 'Senior sales manager',
          rating: 4.9,
          callType: c.callType,
          status: 'completed',
          time: c.time,
          date: group.date,
          duration: c.duration,
          canJoin: false,
          canReschedule: false,
          amount: c.amount,
          ...(c.avatarKey ? { avatarKey: c.avatarKey } : {}),
        };
      }
    }
  }
  return null;
}

export const MOCK_CALL_HISTORY_WITH_PRO: CompletedCallItem[] = [
  {
    id: 'h-001',
    name: 'Previous video call',
    callType: 'video',
    time: '03:02 PM',
    duration: '25 mins',
    amount: '₦20,000.00',
  },
  {
    id: 'h-002',
    name: 'Previous audio call',
    callType: 'audio',
    time: '11:15 AM',
    duration: '10 mins',
    amount: '₦10,800.00',
  },
  {
    id: 'h-003',
    name: 'Previous video call',
    callType: 'video',
    time: '05:40 PM',
    duration: '25 mins',
    amount: '₦20,000.00',
  },
];
