import haversine from 'haversine-distance'
import fetch from 'node-fetch'
import { Server as SocketIOServer } from 'socket.io'
import AirQuality from '../models/AirQuality'
import Env from '../utils/Env'

const PURPLEAIR_API_URL = Env.getPurpleAirUrl()
const PURPLEAIR_API_KEY = Env.getPurpleAirKey()

// 0 = Outside or 1 = Inside
const location_type = 0

class AirQualityController {
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map()
  private io: SocketIOServer | null = null

  constructor() {
    // Initialize updates for existing locations when server starts
    this.initializeUpdates()
  }

  // Set Socket.io instance
  setSocketIO(io: SocketIOServer) {
    this.io = io
    console.log('Socket.io integrated with AirQualityController')
  }

  // Initialize periodic updates for all locations in the database
  async initializeUpdates() {
    try {
      const locations = await AirQuality.find({})
      for (const location of locations) {
        this.startPeriodicUpdates(
          location.locationId,
          location.latitude,
          location.longitude,
        )
      }
      console.log(
        `Initialized air quality updates for ${locations.length} locations`,
      )
    } catch (error) {
      console.error('Failed to initialize air quality updates:', error)
    }
  }

  // Start periodic updates for a location
  private startPeriodicUpdates(
    locationId: string,
    latitude: number,
    longitude: number,
  ) {
    // Clear any existing interval for this location
    this.stopPeriodicUpdates(locationId)

    // Create a new interval that updates every 10 minutes
    const interval = setInterval(
      async () => {
        try {
          // Get fresh air quality data
          const airQualityData = await this.getAirQuality(latitude, longitude)
          const currentTime = airQualityData?.time_stamp || Date.now()

          // Update the database with new reading
          const location = await AirQuality.findOne({ locationId })
          if (location) {
            location.air_qualities.push({
              air_quality: airQualityData.air_quality,
              timeStamp: currentTime as number,
            })
            await location.save()

            // Notify clients via Socket.io
            this.notifyAirQualityUpdate(
              locationId,
              airQualityData.air_quality,
              currentTime as number,
              latitude,
              longitude,
            )

            console.log(
              `Updated air quality for ${locationId}: ${airQualityData.air_quality}`,
            )
          }
        } catch (error) {
          console.error(
            `Failed to update air quality for ${locationId}:`,
            error,
          )
        }
      },
      10 * 60 * 1000,
    ) // 10 minutes in milliseconds

    // Store the interval
    this.updateIntervals.set(locationId, interval)
  }

  // Notify clients of air quality update via Socket.io
  private notifyAirQualityUpdate(
    locationId: string,
    air_quality: number,
    timestamp: number,
    latitude?: number,
    longitude?: number,
  ) {
    if (this.io) {
      this.io.emit('airQualityUpdate', {
        locationId,
        air_quality,
        timestamp,
        latitude,
        longitude,
      })
      console.log(`Emitted air quality update for ${locationId} via Socket.io`)
    }
  }

  // Stop periodic updates for a location
  private stopPeriodicUpdates(locationId: string) {
    const interval = this.updateIntervals.get(locationId)
    if (interval) {
      clearInterval(interval)
      this.updateIntervals.delete(locationId)
    }
  }

  // Get air quality data from PurpleAir API (single)
  async getAirQuality(latitude: number, longitude: number) {
    // Ensure API key is defined
    if (!PURPLEAIR_API_KEY) {
      throw new Error('PurpleAir API key is not defined')
    }

    // Get bounding box for 10-mile radius
    const { nw, se } = getBoundingBox(latitude, longitude)

    // Build query parameters (pm2.5_atm outdoor sensors data, cf1 indoor sensors data)
    const params = new URLSearchParams({
      fields: 'latitude, longitude, pm2.5_atm',
      location_type: location_type.toString(), // Outdoor sensors only
      nwlng: nw.lon.toString(),
      nwlat: nw.lat.toString(),
      selng: se.lon.toString(),
      selat: se.lat.toString(),
    })

    // Make API request to PurpleAir using fetch
    const response = await fetch(`${PURPLEAIR_API_URL}?${params}`, {
      headers: { 'X-API-Key': PURPLEAIR_API_KEY },
    })

    // console.log(response);

    if (!response.ok) {
      throw new Error(`PurpleAir API returned status: ${response.status}`)
    }

    const data = (await response.json()) as Record<string, unknown>
    // console.log(data);
    // fields: [ 'sensor_index', 'latitude', 'longitude', 'pm2.5_atm' ]
    const sensors = data.data as Array<[number, number, number, number]>

    if (!sensors || sensors.length === 0) {
      return {
        air_quality: 'Unknown',
        message: 'No sensors found within 10 miles',
      }
    }

    // Map sensors with distance from target location
    const sensorsWithDistance = sensors.map((sensor) => {
      const [, sensorLat, sensorLon, pm25] = sensor
      const distance = calculateDistance(
        latitude,
        longitude,
        sensorLat,
        sensorLon,
      )
      return { latitude: sensorLat, longitude: sensorLon, pm25, distance }
    })

    // Filter sensors within 10 miles
    const nearbySensors = sensorsWithDistance.filter(
      (sensor) => sensor.distance <= 10,
    )
    if (nearbySensors.length === 0) {
      return {
        air_quality: 'Unknown',
        message: 'No sensors within 10 miles after filtering',
      }
    }

    // Sort by distance and take the 3 nearest
    const sortedSensors = nearbySensors.sort((a, b) => a.distance - b.distance)
    const nearestSensors = sortedSensors.slice(
      0,
      Math.min(3, sortedSensors.length),
    )

    // Calculate average PM2.5
    const totalPm25 = nearestSensors.reduce(
      (sum, sensor) => sum + sensor.pm25,
      0,
    )
    const averagePm25 = totalPm25 / nearestSensors.length

    return {
      time_stamp: data.time_stamp,
      air_quality: aqiFromPM(averagePm25.toFixed(2)),
      sensor_count: nearestSensors.length,
      sensors_used: nearestSensors.map((s) => ({
        latitude: s.latitude,
        longitude: s.longitude,
        pm25: aqiFromPM(s.pm25),
        distance_miles: s.distance.toFixed(2),
      })),
    }
  }

  // Get all air quality data from the database filtered by locationId
  async getAllAirQuality(locationId: string) {
    const maxNumReadings = 24 * 6 // 24 hours of readings (6 times per hour)

    const location = await AirQuality.findOne({
      locationId,
    })

    if (location && location.air_qualities.length > 0) {
      // Sort by timestamp in descending order (newest first)
      location.air_qualities.sort((a, b) => b.timeStamp - a.timeStamp)

      // Take only the latest readings up to maxNumReadings
      if (location.air_qualities.length > maxNumReadings) {
        location.air_qualities = location.air_qualities.slice(0, maxNumReadings)
      } else {
        // fill in missing readings with the last available reading
        const lastReading =
          location.air_qualities[location.air_qualities.length - 1]
        const missingReadings = maxNumReadings - location.air_qualities.length
        for (let i = 0; i < missingReadings; i++) {
          location.air_qualities.push(lastReading)
        }
      }
    }

    if (!location) {
      throw new Error(`Location with ID ${locationId} not found`)
    }

    return location.air_qualities
  }

  // Add air quality data to the database
  async addAirQuality(
    locationId: string,
    latitude: number,
    longitude: number,
    air_quality: number,
    timeStamp: number,
  ) {
    // Check if locationId already exists
    const existingLocation = await AirQuality.findOne({
      locationId,
    })

    // If locationId already exists, update the air_quality array
    if (existingLocation) {
      existingLocation.air_qualities.push({ air_quality, timeStamp })
      await existingLocation.save()

      // Notify clients via Socket.io
      this.notifyAirQualityUpdate(
        locationId,
        air_quality,
        timeStamp,
        latitude,
        longitude,
      )

      // Start periodic updates for this location
      this.startPeriodicUpdates(locationId, latitude, longitude)

      return existingLocation
    }

    // Create a new locationId with air_quality array
    const newLocation = new AirQuality({
      locationId,
      latitude,
      longitude,
      air_qualities: [{ air_quality, timeStamp }],
    })

    await newLocation.save()

    // Notify clients via Socket.io
    this.notifyAirQualityUpdate(
      locationId,
      air_quality,
      timeStamp,
      latitude,
      longitude,
    )

    // Start periodic updates for this new location
    this.startPeriodicUpdates(locationId, latitude, longitude)

    return newLocation
  }

  // Delete air quality data from the database
  async deleteAirQuality(locationId: string) {
    const existingLocation = await AirQuality.findOne({
      locationId,
    })

    if (!existingLocation) {
      throw new Error(`Location with ID ${locationId} not found`)
    }

    // Stop periodic updates for this location
    this.stopPeriodicUpdates(locationId)

    await existingLocation.deleteOne()
    return { message: `Location ${locationId} removed successfully` }
  }

  // Method to clean up all intervals (useful for server shutdown)
  stopAllUpdates() {
    for (const [locationId, interval] of this.updateIntervals.entries()) {
      clearInterval(interval)
      console.log(`Stopped updates for location ${locationId}`)
    }
    this.updateIntervals.clear()
  }

  // Function calculate Measurement Quality
  // Measurement Quality is High if the measurement is based on 3 sensors within a 2-mile radius
  // Measurement Quality is Medium if the closest sensor is within a 2-to-5-mile radius
  // Measurement Quality is Low if the closest sensor is within a 5-to-10-mile radius
  // Measurement Quality is NA if the Air Quality is unknown
  async getMeasurementQuality(
    latitude: number,
    longitude: number,
  ): Promise<{
    measurement_quality: 'High' | 'Medium' | 'Low' | 'NA'
    message: string
  }> {
    // Ensure API key is defined
    if (!PURPLEAIR_API_KEY) {
      throw new Error('PurpleAir API key is not defined')
    }

    // Get bounding box for 10-mile radius
    const { nw, se } = getBoundingBox(latitude, longitude)

    // Build query parameters (pm2.5_atm outdoor sensors data, cf1 indoor sensors data)
    const params = new URLSearchParams({
      fields: 'latitude, longitude, pm2.5_atm',
      location_type: location_type.toString(), // Outdoor sensors only
      nwlng: nw.lon.toString(),
      nwlat: nw.lat.toString(),
      selng: se.lon.toString(),
      selat: se.lat.toString(),
    })

    // Make API request to PurpleAir using fetch
    const response = await fetch(`${PURPLEAIR_API_URL}?${params}`, {
      headers: { 'X-API-Key': PURPLEAIR_API_KEY },
    })

    // console.log(response);

    if (!response.ok) {
      throw new Error(`PurpleAir API returned status: ${response.status}`)
    }

    const data = (await response.json()) as Record<string, unknown>
    // console.log(data);
    // fields: [ 'sensor_index', 'latitude', 'longitude', 'pm2.5_atm' ]
    const sensors = data.data as Array<[number, number, number, number]>

    if (!sensors || sensors.length === 0) {
      return {
        measurement_quality: 'NA',
        message: 'No sensors found within 10 miles',
      }
    }

    // Map sensors with distance from target location
    const sensorsWithDistance = sensors.map((sensor) => {
      const [, sensorLat, sensorLon] = sensor
      const distance = calculateDistance(
        latitude,
        longitude,
        sensorLat,
        sensorLon,
      )
      return { latitude: sensorLat, longitude: sensorLon, distance }
    })

    // Filter sensors within 10 miles
    const nearbySensors = sensorsWithDistance.filter(
      (sensor) => sensor.distance <= 10,
    )
    if (nearbySensors.length === 0) {
      return {
        measurement_quality: 'NA',
        message: 'No sensors within 10 miles after filtering',
      }
    }

    // Sort by distance and take the 3 nearest
    const sortedSensors = nearbySensors.sort((a, b) => a.distance - b.distance)
    const nearestSensors = sortedSensors.slice(
      0,
      Math.min(3, sortedSensors.length),
    )

    // Determine measurement quality based on sensor distance
    if (
      nearestSensors.length === 3 &&
      nearestSensors.every((sensor) => sensor.distance <= 2)
    ) {
      return {
        measurement_quality: 'High',
        message: 'Based on 3 sensors within 2-mile radius',
      }
    } else if (
      nearestSensors.length > 0 &&
      nearestSensors[0].distance <= 5 &&
      nearestSensors[0].distance > 2
    ) {
      return {
        measurement_quality: 'Medium',
        message: 'Closest sensor within 2-to-5-mile radius',
      }
    } else if (
      nearestSensors.length > 0 &&
      nearestSensors[0].distance <= 10 &&
      nearestSensors[0].distance > 5
    ) {
      return {
        measurement_quality: 'Low',
        message: 'Closest sensor within 5-to-10-mile radius',
      }
    } else {
      return {
        measurement_quality: 'NA',
        message: 'No suitable sensors found for quality assessment',
      }
    }
  }
}

// Helper function to calculate distance in miles between two coordinates
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const point1 = { latitude: lat1, longitude: lon1 }
  const point2 = { latitude: lat2, longitude: lon2 }
  const distanceMeters = haversine(point1, point2)
  return distanceMeters / 1609.34 // Convert meters to miles
}

// Helper function to get bounding box for 10-mile radius
function getBoundingBox(lat: number, lon: number, radiusMiles = 10) {
  const earthRadiusMiles = 3958.8 // Earth's radius in miles
  const latChange = (radiusMiles / earthRadiusMiles) * (180 / Math.PI)
  const lonChange =
    ((radiusMiles / earthRadiusMiles) * (180 / Math.PI)) /
    Math.cos((lat * Math.PI) / 180)

  return {
    nw: { lat: lat + latChange, lon: lon - lonChange },
    se: { lat: lat - latChange, lon: lon + lonChange },
  }
}

// Helper function to calculate US EPA AQI from PM2.5
function aqiFromPM(pm) {
  if (isNaN(pm)) return '-'
  if (pm == undefined) return '-'
  if (pm < 0) return pm
  if (pm > 1000) return '-'
  /*                                  AQI         RAW PM2.5
    Good                               0 - 50   |   0.0 – 12.0
    Moderate                          51 - 100  |  12.1 – 35.4
    Unhealthy for Sensitive Groups   101 – 150  |  35.5 – 55.4
    Unhealthy                        151 – 200  |  55.5 – 150.4
    Very Unhealthy                   201 – 300  |  150.5 – 250.4
    Hazardous                        301 – 400  |  250.5 – 350.4
    Hazardous                        401 – 500  |  350.5 – 500.4
    */
  if (pm > 350.5) {
    return calcAQI(pm, 500, 401, 500.4, 350.5) //Hazardous
  } else if (pm > 250.5) {
    return calcAQI(pm, 400, 301, 350.4, 250.5) //Hazardous
  } else if (pm > 150.5) {
    return calcAQI(pm, 300, 201, 250.4, 150.5) //Very Unhealthy
  } else if (pm > 55.5) {
    return calcAQI(pm, 200, 151, 150.4, 55.5) //Unhealthy
  } else if (pm > 35.5) {
    return calcAQI(pm, 150, 101, 55.4, 35.5) //Unhealthy for Sensitive Groups
  } else if (pm > 12.1) {
    return calcAQI(pm, 100, 51, 35.4, 12.1) //Moderate
  } else if (pm >= 0) {
    return calcAQI(pm, 50, 0, 12, 0) //Good
  } else {
    return undefined
  }
}

function calcAQI(Cp, Ih, Il, BPh, BPl) {
  const a = Ih - Il
  const b = BPh - BPl
  const c = Cp - BPl
  return Math.round((a / b) * c + Il)
}

export default new AirQualityController()
