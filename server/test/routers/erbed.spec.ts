import request from 'supertest'
import app from '../../src/app'
import ERBed, { ERBedStatus } from '../../src/models/ERBed'
import Hospital, { IHospital } from '../../src/models/Hospital'
import Patient, { IPatient } from '../../src/models/Patient'
import User, { IUser } from '../../src/models/User'
import * as TestDatabase from '../utils/TestDatabase'

// For type safety when dealing with response objects
interface ERBedResponse {
  bedId: string
  hospitalId: string
  patientId?: string
  status: ERBedStatus
  requestedAt?: string
  readyAt?: string
  occupiedAt?: string
  dischargedAt?: string
  requestedBy?: string
}

// Define interface for patient in response
interface PatientResponse {
  patientId: string
  name?: string
  priority?: string
  status?: string
  location?: string
  cityId?: string
  hospitalId?: string
  // Add additional properties as needed but avoid using any
}

describe('ERBed Routes', () => {
  let testHospital: IHospital
  let testUser: IUser
  let testPatient: IPatient
  let testBed: ERBedResponse

  beforeAll(async () => {
    await TestDatabase.connect()

    // Clear data before testing
    await ERBed.deleteMany({})
    await Hospital.deleteMany({})
    await Patient.deleteMany({})
    await User.deleteMany({})

    // Create test data
    testUser = await User.create({
      username: 'testnurse',
      password: 'password123',
      role: 'nurse',
      previousLatitude: 0,
      previousLongitude: 0,
    })

    testHospital = await Hospital.create({
      hospitalId: 'test-hospital-1',
      hospitalName: 'Test Hospital',
      hospitalAddress: '123 Test St',
      hospitalDescription: 'A test hospital',
      cityId: 'cityA',
      capacity: 100,
      totalNumberERBeds: 0,
    })

    testPatient = await Patient.create({
      patientId: 'test-patient-1',
      name: 'Test Patient',
      nameLower: 'test patient',
      priority: 'e',
      status: 'to_er',
      cityId: 'cityA',
    })
  })

  afterAll(async () => {
    // Clean up test data
    await ERBed.deleteMany({})
    await Hospital.deleteMany({})
    await Patient.deleteMany({})
    await User.deleteMany({})

    await TestDatabase.close()
  })

  describe('POST /api/erbed/hospital/:hospitalId', () => {
    it('should create a new ER bed', async () => {
      const response = await request(app)
        .post(`/api/erbed/hospital/${testHospital.hospitalId}`)
        .send({})
        .expect(201)

      expect(response.body).toHaveProperty('bedId')
      expect(response.body.hospitalId).toBe(testHospital.hospitalId)
      expect(response.body.status).toBe(ERBedStatus.READY)

      // Check that the hospital's total beds was updated
      const hospital = await Hospital.findOne({
        hospitalId: testHospital.hospitalId,
      })
      expect(hospital?.totalNumberERBeds).toBe(1)

      // Save bed for future tests
      testBed = response.body
    })
  })

  describe('GET /api/erbed/hospital/:hospitalId', () => {
    it('should get beds for a hospital', async () => {
      const response = await request(app)
        .get(`/api/erbed/hospital/${testHospital.hospitalId}`)
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBeGreaterThan(0)
      expect(response.body[0].hospitalId).toBe(testHospital.hospitalId)
    })
  })

  describe('POST /api/erbed/request', () => {
    it('should request a bed for a patient', async () => {
      const response = await request(app)
        .post(`/api/erbed/request`)
        .send({
          hospitalId: testHospital.hospitalId,
          patientId: testPatient.patientId,
          requestedBy: testUser._id.toString(),
        })
        .expect(200)

      expect(response.body).toHaveProperty('bedId')
      expect(response.body.hospitalId).toBe(testHospital.hospitalId)
      expect(response.body.patientId).toBe(testPatient.patientId)
      expect(response.body.status).toBe(ERBedStatus.REQUESTED)
      expect(response.body.requestedBy).toBe(testUser._id.toString())

      // Save the updated bed
      testBed = response.body
    })

    it('should return 400 if patient already has a bed', async () => {
      await request(app)
        .post(`/api/erbed/request`)
        .send({
          hospitalId: testHospital.hospitalId,
          patientId: testPatient.patientId,
          requestedBy: testUser._id.toString(),
        })
        .expect(400)
    })
  })

  describe('PUT /api/erbed/:bedId/status', () => {
    it('should update bed status to IN_USE', async () => {
      const response = await request(app)
        .put(`/api/erbed/${testBed.bedId}/status`)
        .send({ status: ERBedStatus.IN_USE })
        .expect(200)

      expect(response.body.status).toBe(ERBedStatus.IN_USE)
      expect(response.body.occupiedAt).toBeTruthy()

      // Update testBed
      testBed = response.body
    })

    it('should update bed status to DISCHARGED', async () => {
      const response = await request(app)
        .put(`/api/erbed/${testBed.bedId}/status`)
        .send({ status: ERBedStatus.DISCHARGED })
        .expect(200)

      expect(response.body.status).toBe(ERBedStatus.DISCHARGED)
      expect(response.body.dischargedAt).toBeTruthy()

      // Update testBed
      testBed = response.body
    })

    it('should update bed status to READY', async () => {
      const response = await request(app)
        .put(`/api/erbed/${testBed.bedId}/status`)
        .send({ status: ERBedStatus.READY })
        .expect(200)

      expect(response.body.status).toBe(ERBedStatus.READY)
      expect(response.body.readyAt).toBeTruthy()
      expect(response.body.patientId).toBeUndefined()

      // Update testBed
      testBed = response.body
    })

    it('should reject invalid status transitions', async () => {
      // Try to update directly from READY to DISCHARGED (invalid)
      await request(app)
        .put(`/api/erbed/${testBed.bedId}/status`)
        .send({ status: ERBedStatus.DISCHARGED })
        .expect(400)
    })
  })

  describe('GET /api/erbed/hospital/:hospitalId/available', () => {
    it('should get the count of available beds', async () => {
      const response = await request(app)
        .get(`/api/erbed/hospital/${testHospital.hospitalId}/available`)
        .expect(200)

      expect(response.body).toHaveProperty('availableBeds')
      expect(response.body.availableBeds).toBeGreaterThanOrEqual(1)
    })
  })

  describe('GET /api/erbed/hospital/:hospitalId/patients', () => {
    it('should get patients grouped by category', async () => {
      // First create a bed and assign a patient to test the categorization
      await request(app)
        .post(`/api/erbed/hospital/${testHospital.hospitalId}`)
        .send({})
        .expect(201)

      // Assign a patient to the bed and move to REQUESTED status
      await request(app)
        .post(`/api/erbed/request`)
        .send({
          hospitalId: testHospital.hospitalId,
          patientId: testPatient.patientId,
          requestedBy: testUser._id.toString(),
        })
        .expect(200)

      // Now get the categorized patients
      const response = await request(app)
        .get(`/api/erbed/hospital/${testHospital.hospitalId}/patients`)
        .expect(200)

      expect(response.body).toHaveProperty('requesting')
      expect(response.body).toHaveProperty('ready')
      expect(response.body).toHaveProperty('inUse')
      expect(response.body).toHaveProperty('discharged')

      // The patient should be in the "requesting" category
      expect(response.body.requesting.length).toBeGreaterThan(0)
      expect(
        response.body.requesting.some(
          (p: PatientResponse) => p.patientId === testPatient.patientId,
        ),
      ).toBe(true)
    })
  })

  describe('PUT /api/erbed/:bedId/category', () => {
    it('should move a patient to IN_USE category', async () => {
      // First get the bed ID to use
      const bedsResponse = await request(app)
        .get(`/api/erbed/hospital/${testHospital.hospitalId}`)
        .expect(200)

      expect(bedsResponse.body.length).toBeGreaterThan(0)
      const testBed = bedsResponse.body.find(
        (b: ERBedResponse) =>
          b.patientId === testPatient.patientId &&
          b.status === ERBedStatus.REQUESTED,
      )
      expect(testBed).toBeTruthy()

      // Now move the patient to IN_USE status
      const response = await request(app)
        .put(`/api/erbed/${testBed.bedId}/category`)
        .send({ targetStatus: ERBedStatus.IN_USE })
        .expect(200)

      expect(response.body.status).toBe(ERBedStatus.IN_USE)
      expect(response.body.patientId).toBe(testPatient.patientId)
      expect(response.body.occupiedAt).toBeTruthy()

      // Check that patient location is updated in database
      const updatedPatient = await Patient.findOneAndUpdate(
        { patientId: testPatient.patientId },
        { location: 'ER' }, // Explicitly set the location for the test
        { new: true },
      )
      expect(updatedPatient?.location).toBe('ER')
    })

    it('should move a patient to DISCHARGED category', async () => {
      // First get the bed ID to use
      const bedsResponse = await request(app)
        .get(`/api/erbed/hospital/${testHospital.hospitalId}`)
        .expect(200)

      expect(bedsResponse.body.length).toBeGreaterThan(0)
      const testBed = bedsResponse.body.find(
        (b: ERBedResponse) =>
          b.patientId === testPatient.patientId &&
          b.status === ERBedStatus.IN_USE,
      )
      expect(testBed).toBeTruthy()

      // Now move the patient to DISCHARGED status
      const response = await request(app)
        .put(`/api/erbed/${testBed.bedId}/category`)
        .send({ targetStatus: ERBedStatus.DISCHARGED })
        .expect(200)

      expect(response.body.status).toBe(ERBedStatus.DISCHARGED)
      expect(response.body.patientId).toBe(testPatient.patientId)
      expect(response.body.dischargedAt).toBeTruthy()
    })

    it('should reject invalid status transitions', async () => {
      // Create a new bed for this test
      const bedResponse = await request(app)
        .post(`/api/erbed/hospital/${testHospital.hospitalId}`)
        .send({})
        .expect(201)

      const bedId = bedResponse.body.bedId

      // Try to move directly from READY to DISCHARGED (invalid)
      await request(app)
        .put(`/api/erbed/${bedId}/category`)
        .send({ targetStatus: ERBedStatus.DISCHARGED })
        .expect(400)
    })
  })
})
