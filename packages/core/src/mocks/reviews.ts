import type { Review } from '../types/index.js';

export const MOCK_REVIEWS: Review[] = [
  {
    id: 'rv-001',
    authorName: 'Adaeze Umeh',
    rating: 5.0,
    comment:
      'Excellent session! He gave me very actionable advice on pricing and positioning. Will definitely book again.',
    timeAgo: '2 days ago',
  },
  {
    id: 'rv-002',
    authorName: 'Tunde Bakare',
    rating: 4.8,
    comment:
      'Very knowledgeable and patient. Answered all my questions clearly and gave me a roadmap I can actually follow.',
    timeAgo: '1 week ago',
  },
  {
    id: 'rv-003',
    authorName: 'Sarah Johnson',
    rating: 4.9,
    comment: 'Great call. Felt like talking to a mentor who genuinely cares. Worth every naira.',
    timeAgo: '3 weeks ago',
  },
];
