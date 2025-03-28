import { Router } from 'express'

import PatientController from '../controllers/PatientController'

export default Router()
  /**
   * @swagger
   * /api/patients:
   *   post:
   *     summary: Create a new patient
   *     description: Create a new patient
   *     tags: [Patient]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *               - age
   *             properties:
   *               name:
   *                 type: string
   *               age:
   *                 type: number
   *     responses:
   *       201:
   *         description: Patient created
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Patient'
   *       400:
   *         description: Bad request
   */
  .post('/', async (request, response) => {
    try {
      console.log('Here!')
      const result = await PatientController.create(request.body)
      response.status(201).send(result)
    } catch (e) {
      const error = e as Error
      response.status(400).send({ message: error.message })
    }
  })

  /**
   * @swagger
   * /api/patients:
   *   put:
   *     summary: Update a patient's name
   *     description: Update a patient's name
   *     tags: [Patient]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - patientId
   *             properties:
   *               patientId:
   *                 type: string
   */
  .put('/', async (request, response) => {
    const { patientId } = request.body

    try {
      const result = await PatientController.update(patientId, request.body)
      if (!result) {
        response.status(404).json({ message: 'the update operation failed' })
        return
      }
      response.json(result)
    } catch (e) {
      const error = e as Error
      response.status(500).json({ message: error.message })
    }
  })

  .put('/priority', async (request, response) => {
    const { patientId, priority } = request.body

    try {
      const result = await PatientController.setPriority(patientId, priority)
      response.json(result)
    } catch (e) {
      const error = e as Error
      response.status(500).json({ message: error.message })
    }
  })

  /**
   * @swagger
   * /api/patients/status:
   *   put:
   *     summary: Update a patient's status
   *     description: Update a patient's status
   *     tags: [Patient]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - patientId
   *               - status
   *             properties:
   *               patientId:
   *                 type: string
   *               status:
   *                 type: string
   *     responses:
   *       200:
   *         description: Patient status updated
   *       400:
   *         description: Bad request
   */
  .put('/status', async (request, response) => {
    const { patientId, status } = request.body

    try {
      const result = await PatientController.setERStatus(patientId, status)
      response.json(result)
    } catch (e) {
      const error = e as Error
      response.status(500).json({ message: error.message })
    }
  })

  /**
   * @swagger
   * /api/patients:
   *   delete:
   *     summary: Delete a patient
   *     description: Delete a patient
   *     tags: [Patient]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - patientId
   *             properties:
   *               patientId:
   *                 type: string
   *     responses:
   *       200:
   *         description: Patient deleted
   *       400:
   *         description: Bad request
   */
  .delete('/', async (request, response) => {
    try {
      const patientId = request.query['patientId']
      if (patientId === undefined) {
        response.status(400).json({ message: 'patientId is required' })
        return
      }

      const result = await PatientController.delete(patientId.toString())
      if (!result) {
        response.status(404).json({ message: 'Patient not found' })
        return
      }
      response.json(result)
    } catch (e) {
      const error = e as Error
      response.status(400).json({ message: error.message })
    }
  })

  /**
   * @swagger
   * /api/patients/nurse:
   *   post:
   *     summary: Set a patient's nurse
   *     description: Set a patient's nurse
   *     tags: [Patient]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - patientId
   *               - nurseId
   *             properties:
   *               patientId:
   *                 type: string
   *               nurseId:
   *                 type: string
   *     responses:
   *       200:
   *         description: Patient nurse updated
   *       400:
   *         description: Bad request
   *       500:
   *         description: Internal server error
   */
  .post('/nurse', async (request, response) => {
    const { patientId, nurseId } = request.body

    try {
      const result = await PatientController.setNurse(patientId, nurseId)
      response.json(result)
    } catch (e) {
      const error = e as Error
      response.status(500).json({ message: error.message })
    }
  })

  /**
   * @swagger
   * /api/patients/hospital:
   *   post:
   *     summary: Set a patient's hospital
   *     description: Set a patient's hospital
   *     tags: [Patient]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - patientId
   */
  .post('/hospital', async (request, response) => {
    const { patientId, hospitalId } = request.body

    try {
      const result = await PatientController.setHospital(patientId, hospitalId)
      response.json(result)
    } catch (e) {
      const error = e as Error
      response.status(500).json({ message: error.message })
    }
  })

  /**
   * @swagger
   * /api/patients/single:
   *   get:
   *     summary: >
   *       Get a single patient, if hospitalId or nurseId are present in the document,
   *       their data will be embedded in the response
   *       (So you don't have to join the IDs yourself)
   *     description: Get a single patient
   *     tags: [Patient]
   *     parameters:
   *       - in: query
   *         name: patientId
   *         required: true
   *         type: string
   *     responses:
   *       200:
   *         description: Patient retrieved
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Patient'
   *       400:
   *         description: Bad request
   *       500:
   *         description: Internal server error
   */
  .get('/single', async (request, response) => {
    const { patientId } = request.query

    try {
      const result = await PatientController.getExpandedPatientInfo(
        patientId as string,
      )
      response.json(result)
    } catch (e) {
      const error = e as Error
      response.status(500).json({ message: error.message })
    }
  })

  /**
   * @swagger
   * /api/patients:
   *   get:
   *     summary: Get patients. If no param is provided, return all patients. If param "patientId" is provided, return the patient with the given ID.
   *     description: Get all patients
   *     tags: [Patient]
   *     parameters:
   *       - in: query
   *         name: patientId
   *         description: Id of the patient
   *         required: false
   *         type: string
   *     responses:
   *       200:
   *         description: Patients retrieved
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   */
  .get('/', async (request, response) => {
    try {
      const patientId = request.query['patientId']

      if (patientId !== undefined && patientId !== '' && patientId !== null) {
        const result = await PatientController.findById(patientId as string)
        response.json(result)
      } else {
        const result = await PatientController.getAllPatients()
        response.json(result)
      }
    } catch (e) {
      const error = e as Error
      response.status(400).json({ message: error.message })
    }
  })
