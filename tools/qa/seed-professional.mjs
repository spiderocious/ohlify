// QA harness — take a freshly registered user all the way to an APPROVED professional.
//
// Registration → role → KYC items → rate → bank account → submit → admin approve.
// Everything goes through the real API so the seeded professional is
// indistinguishable from one who signed up normally.
//
// The bank step is the fiddly one: Paystack resolves the account to its real
// owner, and `putBankAccount` requires the profile name to match that within
// `bank_account.min_name_match_percent` (45% by default). So we set the profile
// name to the resolved name before the PUT rather than guessing at a match.
//
// CLI: node tools/qa/seed-professional.mjs <email> <phone> <handle> [account_number] [bank_code]
import { pool } from './db.mjs';

const BASE = process.env.OHLIFY_BASE_URL ?? 'http://localhost:8082/api/v1';
const PASSWORD = 'Password123!';
const ADMIN_EMAIL = process.env.QA_ADMIN_EMAIL ?? 'admin-qa@ohlify.dev';

const [email, phone, handle, accountNumber = '0000000000', bankCode = '057'] =
  process.argv.slice(2);

if (!email || !phone || !handle) {
  console.error(
    'usage: node tools/qa/seed-professional.mjs <email> <phone> <handle> [account_number] [bank_code]',
  );
  process.exit(1);
}

const api = async (path, { method = 'GET', token, body } = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ...json };
};

const login = async (mail) => {
  const r = await api('/auth/login', { method: 'POST', body: { email: mail, password: PASSWORD } });
  if (!r.data?.access_token) throw new Error(`login failed for ${mail}: ${JSON.stringify(r)}`);
  return r.data.access_token;
};

const step = (label, r) => {
  if (r.status >= 400) throw new Error(`${label} failed: ${JSON.stringify(r)}`);
  console.log(`  ✓ ${label}`);
  return r;
};

// Upload keys must look like `<uuid>.<ext>` — the schema rejects anything else.
const uploadKey = (ext) => `${crypto.randomUUID()}.${ext}`;

const main = async () => {
  console.log(`seeding professional ${email} (@${handle})`);

  // 1. The user must already exist — `register-user.mjs` is a CLI script, not a
  //    module, so importing it here would re-run registration as a side effect.
  let token;
  try {
    token = await login(email);
    console.log('  ✓ user exists, logged in');
  } catch {
    throw new Error(`register ${email} first: node tools/qa/register-user.mjs ${email} ${phone}`);
  }

  // 2. Role. This mints a NEW token carrying role=professional — the old one is stale.
  const role = await api('/onboarding/role', {
    method: 'POST',
    token,
    body: { role: 'professional' },
  });
  if (role.status >= 400 && role.reason !== 'role_already_set') {
    throw new Error(`set role failed: ${JSON.stringify(role)}`);
  }
  console.log('  ✓ role professional');
  token = await login(email);

  // 3. Text KYC items.
  step(
    'kyc text fields',
    await api('/onboarding/kyc/professional', {
      method: 'PATCH',
      token,
      body: {
        full_name: 'QA Seeded Professional',
        handle,
        occupation: 'Consultant',
        description: 'QA seeded professional for automated testing.',
        interests: ['business'],
      },
    }),
  );

  // 4. Identity + selfie.
  step(
    'identity + selfie',
    await api('/onboarding/kyc/professional', {
      method: 'PATCH',
      token,
      body: {
        identity: {
          type: 'nin',
          number: '12345678901',
          document_upload_key: uploadKey('jpg'),
        },
        selfie: { upload_key: uploadKey('jpg') },
      },
    }),
  );

  // 5. Rates — one per channel.
  for (const call_type of ['audio', 'video']) {
    const r = await api('/me/rates', {
      method: 'POST',
      token,
      body: { call_type, duration_minutes: 10, price_kobo: 200000 },
    });
    if (r.status >= 400 && r.reason !== 'conflict') {
      throw new Error(`rate ${call_type} failed: ${JSON.stringify(r)}`);
    }
    console.log(`  ✓ rate ${call_type} @ ₦200/min`);
  }

  // 6. Bank account. Resolve first, then align the profile name so the
  //    similarity check passes, then restore a readable name afterwards.
  const resolved = await api(
    `/banks/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
    { token },
  );
  const resolvedName = resolved.data?.account_name;
  if (!resolvedName) throw new Error(`bank resolve failed: ${JSON.stringify(resolved)}`);
  console.log(`  · resolved to "${resolvedName}"`);

  const userRow = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  const userId = userRow.rows[0]?.id;
  if (!userId) throw new Error(`no user row for ${email}`);

  await pool.query('UPDATE users SET full_name = $1 WHERE id = $2', [resolvedName, userId]);
  step(
    'bank account',
    await api('/me/bank-account', {
      method: 'PUT',
      token,
      body: { account_number: accountNumber, bank_code: bankCode },
    }),
  );

  // 7. Submit for review.
  step('kyc submit', await api('/onboarding/kyc/complete', { method: 'POST', token }));

  // 8. Admin approve.
  const adminToken = await (async () => {
    const r = await api('/admin/auth/login', {
      method: 'POST',
      body: { email: ADMIN_EMAIL, password: PASSWORD },
    });
    if (!r.data?.access_token) throw new Error(`admin login failed: ${JSON.stringify(r)}`);
    return r.data.access_token;
  })();

  const queue = await api('/admin/kyc/submissions?status=pending_review', { token: adminToken });
  const submission = (queue.data ?? []).find((s) => s.user_id === userId);
  if (!submission) throw new Error(`no pending submission for ${userId}`);

  step(
    'admin approve',
    await api(`/admin/kyc/submissions/${submission.id}/approve`, {
      method: 'POST',
      token: adminToken,
      body: {},
    }),
  );

  const final = await pool.query(
    'SELECT email, role, handle, status, kyc_status, is_available FROM users WHERE id = $1',
    [userId],
  );
  console.log(JSON.stringify({ user_id: userId, ...final.rows[0] }, null, 2));
  await pool.end();
};

main().catch(async (err) => {
  console.error(err.message);
  await pool.end().catch(() => {});
  process.exit(1);
});
