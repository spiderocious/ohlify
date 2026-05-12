import {
  MOCK_PROFESSIONALS,
  MOCK_CATEGORIES,
  MOCK_UPCOMING_CALLS,
  MOCK_NOTIFICATIONS,
  MOCK_PROFILE_SEED,
  MOCK_PROFESSIONAL_RATES,
} from '@ohlify/core';
import { registerMock } from '../mock-client.js';

// home
registerMock('home', () => ({
  upcoming_calls: MOCK_UPCOMING_CALLS,
  popular_professionals: MOCK_PROFESSIONALS.map((p) => ({
    id: p.id,
    name: p.name,
    occupation: p.role,
    avatar_url: p.avatarKey ?? null,
    rating: p.rating,
    review_count: p.reviewCount,
    base_price_kobo: p.basePrice ? p.basePrice * 100 : null,
    currency: 'NGN',
    is_available: true,
    categories: [],
  })),
  categories: MOCK_CATEGORIES.map((c) => ({
    value: c.value,
    label: c.label,
    icon_url: null,
  })),
  active_meeting: null,
}));

// discovery
registerMock('professionals', () => ({
  data: MOCK_PROFESSIONALS.map((p) => ({
    id: p.id,
    name: p.name,
    occupation: p.role,
    avatar_url: p.avatarKey ?? null,
    rating: p.rating,
    review_count: p.reviewCount,
    base_price_kobo: p.basePrice ? p.basePrice * 100 : null,
    currency: 'NGN',
    is_available: true,
    categories: [],
  })),
  meta: { next_cursor: null, has_more: false },
}));

registerMock('categories', () => ({
  data: MOCK_CATEGORIES.map((c) => ({ value: c.value, label: c.label, icon_url: null })),
}));

// bookings + calls
registerMock('bookings', () => ({ data: [], meta: { total: 0 } }));
registerMock('calls', () => ({ data: [], meta: { total: 0 } }));

// wallet
registerMock('wallet', () => ({
  data: {
    balance_kobo: 56_089_439_300,
    pending_balance_kobo: 0,
    withdrawable_balance_kobo: 56_089_439_300,
    currency: 'NGN',
  },
}));
registerMock('wallet-stats', () => ({
  data: { this_week_kobo: 1_800_000, this_month_kobo: 4_700_000, total_calls: 47 },
}));
registerMock('wallet-transactions', () => ({
  data: [],
  meta: { next_cursor: null, has_more: false },
}));

// legal
registerMock('legal', () => ({
  data: {
    kind: 'eula',
    version: '1.0',
    blocks: [
      { type: 'title', content: 'End User License Agreement' },
      { type: 'body', content: 'By using Ohlify you agree not to misuse the service.' },
    ],
    content_markdown: null,
    published_at: new Date().toISOString(),
  },
}));

// help
registerMock('faqs', () => ({ data: [] }));
registerMock('help-contact', () => ({
  data: {
    support_email: 'support@ohlify.com',
    whatsapp_number: '+234 800 000 0000',
    whatsapp_deeplink: 'https://wa.me/2348000000000',
  },
}));
registerMock('config-public', () => ({ data: { values: {}, fetched_at: new Date().toISOString() } }));

// profile / auth
registerMock('notifications', () => ({ data: MOCK_NOTIFICATIONS }));
registerMock('me', () => ({ data: MOCK_PROFILE_SEED }));
registerMock('me-rates', () => ({
  data: MOCK_PROFESSIONAL_RATES.map((r, i) => ({
    id: `rate-${i}`,
    call_type: r.callType,
    duration_minutes: r.durationMinutes,
    price_kobo: parseInt(r.price.replace(/[^0-9]/g, ''), 10) * 100,
    currency: 'NGN',
  })),
}));
registerMock('me-bank-account', () => ({ data: null }));
registerMock('banks', () => ({ data: [] }));
registerMock('onboarding-status', () => ({
  data: {
    step: 'complete',
    role: null,
    kyc_progress: { completed_items: [], total_items: 0, percent: 100 },
  },
}));
registerMock('notification-preferences', () => ({
  data: { calls: true, marketing: false, reminders: true },
}));
