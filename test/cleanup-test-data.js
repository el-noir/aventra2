/**
 * Cleans up test data from the database so identity resolution
 * can be tested fresh.
 * 
 * Usage: node test/cleanup-test-data.js
 */
const { Client } = require('pg');

async function cleanup() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'aventra_db',
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Delete signals from test runs (keep only the original real hubspot data)
    const signals = await client.query('DELETE FROM signals WHERE id >= 15 RETURNING id');
    console.log(`Deleted ${signals.rowCount} test signals`);

    // Delete test contacts (keep contact #8 which is real hubspot data)
    const contacts = await client.query('DELETE FROM contacts WHERE id >= 9 RETURNING id');
    console.log(`Deleted ${contacts.rowCount} test contacts`);

    // Delete test accounts (keep account #1 which is real hubspot data)
    const accounts = await client.query('DELETE FROM accounts WHERE id >= 2 RETURNING id');
    console.log(`Deleted ${accounts.rowCount} test accounts`);

    console.log('\nCleanup complete! You can now re-run the identity resolution test.');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

cleanup();
