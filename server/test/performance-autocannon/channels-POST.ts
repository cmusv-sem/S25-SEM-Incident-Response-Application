import autocannon from 'autocannon';
import { Types } from 'mongoose';
import * as TestDatabase from '../utils/TestDatabase';


// Function to generate random user IDs for test requests
function generateRandomUserIds(count: number): string[] {
  return Array.from({ length: count }, () => new Types.ObjectId().toString());
}

async function runPostChannelTest() {
  // 1️⃣ Connect to Test Database
  await TestDatabase.connect();

  try {
    console.log("🚀 Starting POST /api/channels Performance Test...");

    const result = await autocannon({
      url: 'http://localhost:3001/api/channels',
      connections: 5,        // 5 concurrent users
      duration: 30,          // Run for 30 seconds
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `TestChannel-${Date.now()}`,
        users: generateRandomUserIds(3), // Assign 3 random users
        description: "Performance test channel",
        owner: new Types.ObjectId().toString(),
        closed: false
      }),
      overallRate: 5          // If you want ~5 requests per second
    });

    console.log('✅ POST /api/channels Test Complete:', result);
  } catch (error) {
    console.error('❌ Autocannon error:', error);
  } finally {
    // 3️⃣ Close DB Connection
    await TestDatabase.close();
  }
}

runPostChannelTest();
