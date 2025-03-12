import autocannon from 'autocannon';
import * as TestDatabase from '../utils/TestDatabase';

/**
 * This script sends requests to multiple endpoints (users, profiles, map, etc.)
 * in one Autocannon test run. Each request is repeated in a "round-robin" style.
 *
 * Make sure your server is running on http://localhost:3001 (or adjust as needed).
 */

async function runTest() {
  // 1) Connect to the DB
  await TestDatabase.connect();

  try {
    // 2) Configure Autocannon
    // concurrency = number of simultaneous connections
    // duration = test length in seconds
    // overallRate = approximate RPS
    // The `requests` array below targets multiple endpoints & methods.

    const result = await autocannon({
      url: 'http://localhost:3001', // Base URL, WITHOUT /api/*, we set paths in requests array
      connections: 5,
      duration: 30,
      overallRate: 5, // ~5 RPS

      // The `requests` array allows multiple endpoints in a round-robin style.
      requests: [
        // ========== USERS ROUTER ENDPOINTS ==========
        {
          method: 'GET',
          path: '/api/incidents',
        },
      ],
    });

    // 3) Log the results
    console.log('Autocannon test completed. Results:');
    console.log(result);

  } catch (error) {
    console.error('Autocannon error:', error);
  } finally {
    // 4) Close DB
    await TestDatabase.close();
  }
}

runTest();
