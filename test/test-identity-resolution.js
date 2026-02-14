/**
 * Identity Resolution Test Script
 * 
 * Tests that signals from HubSpot and Stripe resolve to the same Contact/Account.
 * 
 * Scenario:
 *   1. HubSpot sends a contact.creation event for "jane@acme.com" at company "Acme Corp"
 *   2. HubSpot sends a company.creation event for "Acme Corp"
 *   3. Stripe sends a customer.created event for the same "jane@acme.com"
 *   4. Stripe sends an invoice.paid event for that customer
 *   5. We query signals, contacts, and accounts to verify identity resolution linked them
 * 
 * Usage:
 *   node test/test-identity-resolution.js [BASE_URL]
 *   Default BASE_URL: http://localhost:3000
 */

const BASE_URL = process.argv[2] || 'http://localhost:3000';

// Shared identifiers to simulate cross-tool identity
const HUBSPOT_CONTACT_ID = '10051';
const HUBSPOT_COMPANY_ID = '20051';
const STRIPE_CUSTOMER_ID = 'cus_test_jane_acme';
const EMAIL = 'jane@acme.com';
const COMPANY_NAME = 'Acme Corp';

async function post(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function get(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  const data = await res.json();
  return { status: res.status, data };
}

function log(label, obj) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${label}`);
  console.log('='.repeat(60));
  if (typeof obj === 'object') {
    console.log(JSON.stringify(obj, null, 2));
  } else {
    console.log(obj);
  }
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Test Events ──────────────────────────────────────────────

const hubspotContactCreation = [
  {
    eventId: 100001,
    subscriptionId: 1,
    portalId: 12345,
    appId: 1,
    occurredAt: Date.now(),
    subscriptionType: 'contact.creation',
    attemptNumber: 0,
    objectId: parseInt(HUBSPOT_CONTACT_ID),
    sourceId: HUBSPOT_CONTACT_ID,
    properties: {
      email: EMAIL,
      firstname: 'Jane',
      lastname: 'Doe',
    },
    companyId: HUBSPOT_COMPANY_ID,
    companyName: COMPANY_NAME,
  },
];

const hubspotCompanyCreation = [
  {
    eventId: 100002,
    subscriptionId: 2,
    portalId: 12345,
    appId: 1,
    occurredAt: Date.now(),
    subscriptionType: 'company.creation',
    attemptNumber: 0,
    objectId: parseInt(HUBSPOT_COMPANY_ID),
    sourceId: HUBSPOT_CONTACT_ID,
    propertyName: 'name',
    propertyValue: COMPANY_NAME,
    properties: {
      name: COMPANY_NAME,
    },
  },
];

const stripeCustomerCreated = {
  id: 'evt_test_001',
  object: 'event',
  type: 'customer.created',
  created: Math.floor(Date.now() / 1000),
  data: {
    object: {
      id: STRIPE_CUSTOMER_ID,
      object: 'customer',
      email: EMAIL,
      name: 'Jane Doe',
      metadata: {
        company_id: `stripe_acme_001`,
      },
    },
  },
};

const stripeInvoicePaid = {
  id: 'evt_test_002',
  object: 'event',
  type: 'invoice.paid',
  created: Math.floor(Date.now() / 1000) + 60,
  data: {
    object: {
      id: 'in_test_001',
      object: 'invoice',
      customer: STRIPE_CUSTOMER_ID,
      email: EMAIL,
      amount_paid: 9900,
      currency: 'usd',
      status: 'paid',
      metadata: {
        company_id: `stripe_acme_001`,
      },
    },
  },
};

// ─── Main Test Runner ─────────────────────────────────────────

async function runTests() {
  console.log('\n🧪 Identity Resolution Test');
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   Email: ${EMAIL}`);
  console.log(`   HubSpot Contact ID: ${HUBSPOT_CONTACT_ID}`);
  console.log(`   HubSpot Company ID: ${HUBSPOT_COMPANY_ID}`);
  console.log(`   Stripe Customer ID: ${STRIPE_CUSTOMER_ID}`);
  console.log('');

  // ── Step 1: Send HubSpot contact.creation ──
  console.log('\n📤 Step 1: Sending HubSpot contact.creation webhook...');
  const hs1 = await post('/integrations/hubspot', hubspotContactCreation);
  log('HubSpot contact.creation response', hs1);

  await sleep(500);

  // ── Step 2: Send HubSpot company.creation ──
  console.log('\n📤 Step 2: Sending HubSpot company.creation webhook...');
  const hs2 = await post('/integrations/hubspot', hubspotCompanyCreation);
  log('HubSpot company.creation response', hs2);

  await sleep(500);

  // ── Step 3: Send Stripe customer.created ──
  console.log('\n📤 Step 3: Sending Stripe customer.created webhook...');
  const st1 = await post('/integrations/stripe', stripeCustomerCreated);
  log('Stripe customer.created response', st1);

  await sleep(500);

  // ── Step 4: Send Stripe invoice.paid ──
  console.log('\n📤 Step 4: Sending Stripe invoice.paid webhook...');
  const st2 = await post('/integrations/stripe', stripeInvoicePaid);
  log('Stripe invoice.paid response', st2);

  await sleep(1000);

  // ── Step 5: Query results ──
  console.log('\n\n🔍 Querying results...\n');

  // 5a: Get all recent signals
  const signals = await get('/signals?limit=20');
  log('Recent Signals', signals.data);

  // 5b: Get signals by source
  const hubspotSignals = await get('/signals/source/hubspot?limit=10');
  log('HubSpot Signals', hubspotSignals.data);

  const stripeSignals = await get('/signals/source/stripe?limit=10');
  log('Stripe Signals', stripeSignals.data);

  // 5c: Get signal stats
  const stats = await get('/signals/stats');
  log('Signal Stats', stats.data);

  // 5d: Get contacts (scoped to organization 1)
  const contacts = await get('/contacts/organization/1');
  log('All Contacts (org 1)', contacts.data);

  // 5e: Get accounts
  const accounts = await get('/accounts');
  log('All Accounts', accounts.data);

  // ── Step 6: Verify identity resolution ──
  console.log('\n\n✅ Identity Resolution Verification');
  console.log('='.repeat(60));

  const allSignals = Array.isArray(signals.data) ? signals.data : [];
  const allContacts = Array.isArray(contacts.data) ? contacts.data : [];
  const allAccounts = Array.isArray(accounts.data) ? accounts.data : [];

  // Find signals from both sources
  const hsSignals = allSignals.filter((s) => s.source === 'hubspot');
  const stSignals = allSignals.filter((s) => s.source === 'stripe');

  console.log(`\n  HubSpot signals: ${hsSignals.length}`);
  console.log(`  Stripe signals:  ${stSignals.length}`);
  console.log(`  Total contacts:  ${allContacts.length}`);
  console.log(`  Total accounts:  ${allAccounts.length}`);

  // Check if HubSpot and Stripe signals share the same contactId
  const hsContactIds = [...new Set(hsSignals.map((s) => s.contactId).filter(Boolean))];
  const stContactIds = [...new Set(stSignals.map((s) => s.contactId).filter(Boolean))];
  const sharedContactIds = hsContactIds.filter((id) => stContactIds.includes(id));

  console.log(`\n  HubSpot contactIds: [${hsContactIds.join(', ')}]`);
  console.log(`  Stripe contactIds:  [${stContactIds.join(', ')}]`);
  console.log(`  Shared contactIds:  [${sharedContactIds.join(', ')}]`);

  // Check if HubSpot and Stripe signals share the same accountId
  const hsAccountIds = [...new Set(hsSignals.map((s) => s.accountId).filter(Boolean))];
  const stAccountIds = [...new Set(stSignals.map((s) => s.accountId).filter(Boolean))];
  const sharedAccountIds = hsAccountIds.filter((id) => stAccountIds.includes(id));

  console.log(`\n  HubSpot accountIds: [${hsAccountIds.join(', ')}]`);
  console.log(`  Stripe accountIds:  [${stAccountIds.join(', ')}]`);
  console.log(`  Shared accountIds:  [${sharedAccountIds.join(', ')}]`);

  // Summary
  console.log('\n' + '='.repeat(60));
  if (sharedContactIds.length > 0) {
    console.log('  ✅ PASS: HubSpot & Stripe signals resolved to the SAME contact');
  } else if (hsContactIds.length > 0 && stContactIds.length > 0) {
    console.log('  ⚠️  PARTIAL: Both sources created contacts, but they are DIFFERENT');
    console.log('     This is expected when there is no shared identifier (email/externalId)');
    console.log('     between sources. To merge, implement email-based dedup in identity resolution.');
  } else {
    console.log('  ❌ FAIL: Contacts not properly resolved from one or both sources');
  }

  if (sharedAccountIds.length > 0) {
    console.log('  ✅ PASS: HubSpot & Stripe signals resolved to the SAME account');
  } else if (hsAccountIds.length > 0 && stAccountIds.length > 0) {
    console.log('  ⚠️  PARTIAL: Both sources created accounts, but they are DIFFERENT');
  } else if (hsAccountIds.length > 0 || stAccountIds.length > 0) {
    console.log('  ⚠️  PARTIAL: Only one source resolved an account');
  } else {
    console.log('  ❌ FAIL: No accounts resolved from either source');
  }

  // Check contact externalIds to see cross-source linking
  console.log('\n  Contact externalIds:');
  for (const contact of allContacts) {
    if (contact.externalIds) {
      console.log(`    Contact #${contact.id} (${contact.email || 'no email'}): ${JSON.stringify(contact.externalIds)}`);
    }
  }

  console.log('\n  Account externalIds:');
  for (const account of allAccounts) {
    if (account.externalIds) {
      console.log(`    Account #${account.id} (${account.name || 'unnamed'}): ${JSON.stringify(account.externalIds)}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('  Test complete.\n');
}

runTests().catch((err) => {
  console.error('Test failed:', err.message);
  process.exit(1);
});
