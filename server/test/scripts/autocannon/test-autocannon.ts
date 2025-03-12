import autocannon from 'autocannon';
import axios from 'axios';

// Define an interface for expected API response data
interface MarkerResponse {
  id: string;
  type: string;
  latitude: number;
  longitude: number;
  description?: string;
}

const API_URL = 'http://localhost:3000/api/map'; // Update if needed

async function createMarker(): Promise<string | null> {
  try {
    const response = await axios.post<MarkerResponse>(API_URL, {
      type: 'pin',
      latitude: 37.7749,
      longitude: -122.4194,
      description: 'Test marker'
    });

    return response.data.id; // Now TypeScript knows data has an `id` field
  } catch (err) {
    const error = err as any; // Type assertion to handle Axios errors
    console.error('Error creating marker:', error.response?.data || error.message);
    return null;
  }
}

async function deleteMarker(markerId: string) {
  try {
    await axios.delete(`${API_URL}/${markerId}`);
    console.log(`Marker ${markerId} deleted successfully.`);
  } catch (err) {
    const error = err as any;
    console.error(`Error deleting marker ${markerId}:`, error.response?.data || error.message);
  }
}

async function runTest() {
  console.log('🚀 Starting Map API Performance Test...');

  // Step 1: Create a marker to test DELETE requests later
  const markerId = await createMarker();
  if (!markerId) {
    console.error('❌ Failed to create test marker. Exiting.');
    return;
  }

  try {
    // Step 2: Run the performance test
    const result = await autocannon({
      url: API_URL,
      connections: 10, // Number of concurrent connections
      duration: 20, // Test duration in seconds
      requests: [
        {
          method: 'POST',
          path: '/',
          body: JSON.stringify({
            type: 'fire hydrant',
            latitude: 40.7128,
            longitude: -74.0060,
            description: 'Hydrant near station'
          }),
          headers: { 'Content-Type': 'application/json' }
        },
        {
          method: 'GET',
          path: '/',
        },
        {
          method: 'DELETE',
          path: `/${markerId}`,
        }
      ]
    });

    console.log('📊 Test Completed! Results:', result);
  } catch (err) {
    const error = err as any;
    console.error('❌ Autocannon test failed:', error.message);
  }

  // Step 3: Cleanup - delete the test marker
  await deleteMarker(markerId);
}

// Run the test
runTest();
