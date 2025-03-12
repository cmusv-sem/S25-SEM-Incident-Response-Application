import * as TestDatabase from '../../utils/TestDatabase';

const options = {
  url: 'http://localhost:3000/api/channels',
  concurrency: 5,
  method: 'GET' as 'GET',
  requestsPerSecond: 5,
  maxSeconds: 30,
};

const before = async () => {
  await TestDatabase.connect();
};

const after = async () => {
  await TestDatabase.close();
};

const runTest = async () => {
  try {
    await before();

    // ✅ Fix: Use dynamic import() for loadtest
    const loadTestModule = await import('loadtest');
    const loadTest = loadTestModule.default; // Required for ESM compatibility

    loadTest(options, async (error, result) => {
      if (error) {
        console.error('Got an error:', error);
      } else {
        console.log(result);
        console.log('Tests run successfully');
      }
      await after();
    });
  } catch (error) {
    console.error('Setup failed:', error);
  }
};

runTest();
