import autocannon from 'autocannon';
import * as TestDatabase from '../utils/TestDatabase';

async function runTest() {
  // 1️⃣ Connect to DB
  await TestDatabase.connect();

  try {
    // 2️⃣ Configure Autocannon
    // concurrency = number of simultaneous connections
    // duration = test length in seconds
    // overallRate = limit RPS if you want an approximate RPS
    //   (by default, autocannon tries to max out concurrency)
    const result = await autocannon({
      url: 'http://localhost:3001/api/channels',
      connections: 5,       // concurrency
      duration: 30,         // seconds
      method: 'GET',
      overallRate: 5      // if you want ~5 RPS, you can set overallRate
    });

    console.log('Autocannon result:', result);
  } catch (error) {
    console.error('Autocannon error:', error);
  } finally {
    // 3️⃣ Close DB
    await TestDatabase.close();
  }
}

runTest();
