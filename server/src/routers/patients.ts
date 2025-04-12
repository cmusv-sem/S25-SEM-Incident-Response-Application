import { Router } from "express";

import PatientController from "../controllers/PatientController";
import HttpError from "../utils/HttpError";
import WebUtil from "../utils/WebUtil";

export default Router()
  /**
   * @swagger
   * /api/patients:
   *   post:
   *     summary: Create a new patient
   *     description: Create a new patient. The `master` field will be automatically set to the caller's UID.
   *     tags: [Patient]
   *     parameters:
   *       - in: header
   *         name: x-application-uid
   *         required: true
   *         schema:
   *           type: string
   *         description: The UID of the caller, which will be set as the `master` field of the patient.
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
   *       500:
   *         description: Internal server error
   */
  .post("/", async (request, response) => {
    try {
      // Extract the caller's UID from the request headers
      const callerUid = request.headers["x-application-uid"] as string;
      if (!callerUid) {
        throw new HttpError("Caller UID is required", 400);
      }
      const result = await PatientController.create(request.body, callerUid);
      response.status(201).send(result);
    } catch (e) {
      const error = e as HttpError;
      console.error("Error creating patient:", error.message);
      response.status(error.statusCode || 500).send({ message: error.message });
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
  .put("/", async (request, response) => {
    const { patientId } = request.body;

    try {
      const result = await PatientController.update(patientId, request.body);
      if (!result) {
        response.status(404).json({ message: "the update operation failed" });
        return;
      }
      response.json(result);
    } catch (e) {
      const error = e as Error;
      response.status(500).json({ message: error.message });
    }
  })

  .put("/priority", async (request, response) => {
    const { patientId, priority } = request.body;

    try {
      const result = await PatientController.setPriority(patientId, priority);
      response.json(result);
    } catch (e) {
      const error = e as Error;
      response.status(500).json({ message: error.message });
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
  .put("/status", async (request, response) => {
    const { patientId, status } = request.body;

    try {
      const result = await PatientController.setStatus(patientId, status);
      response.json(result);
    } catch (e) {
      const error = e as Error;
      response.status(500).json({ message: error.message });
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
  .delete("/", async (request, response) => {
    try {
      const patientId = request.query["patientId"];
      if (patientId === undefined) {
        response.status(400).json({ message: "patientId is required" });
        return;
      }

      const result = await PatientController.delete(patientId.toString());
      if (!result) {
        response.status(404).json({ message: "Patient not found" });
        return;
      }
      response.json(result);
    } catch (e) {
      const error = e as Error;
      response.status(400).json({ message: error.message });
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
  .post("/nurse", async (request, response) => {
    const { patientId, nurseId } = request.body;

    try {
      const result = await PatientController.setNurse(patientId, nurseId);
      response.json(result);
    } catch (e) {
      const error = e as Error;
      response.status(500).json({ message: error.message });
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
  .post("/hospital", async (request, response) => {
    const { patientId, hospitalId } = request.body;

    try {
      const result = await PatientController.setHospital(patientId, hospitalId);
      response.json(result);
    } catch (e) {
      const error = e as Error;
      response.status(500).json({ message: error.message });
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
  .get("/single", async (request, response) => {
    const { patientId } = request.query;

    try {
      const result = await PatientController.getExpandedPatientInfo(
        patientId as string,
      );
      response.json(result);
    } catch (e) {
      const error = e as Error;
      response.status(500).json({ message: error.message });
    }
  })

  /**
   * @swagger
   * /api/patients:
   *   get:
   *     summary: Get patients. If no parameters are provided, return all patients.
   *     If "patientId" is provided, return the patient with the given ID.
   *     If "hospitalId" is provided, return all patients associated with the given hospital.
   *     description: Retrieve a list of patients, optionally filtered by patient ID or hospital ID.
   *     tags: [Patient]
   *     parameters:
   *       - in: query
   *         name: patientId
   *         description: ID of the patient to retrieve.
   *         required: false
   *         type: string
   *       - in: query
   *         name: hospitalId
   *         description: ID of the hospital to retrieve patients from.
   *         required: false
   *     responses:
   *       200:
   *         description: Patients retrieved successfully.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Patient'
   *       400:
   *         description: Invalid request parameters.
   *       500:
   *         description: Internal server error.
   */

  .get("/", async (request, response) => {
    try {
      const { patientId, hospitalId } = request.query;
      if (patientId) {
        const result = await PatientController.findById(patientId as string);
        response.json(result);
        return;
      }

      if (hospitalId) {
        const result = await PatientController.findByHospitalId(
          hospitalId as string,
        );
        response.json(result);
        return;
      }

      // If no query params, return all patients
      const result = await PatientController.getAllPatients();
      response.json(result);
    } catch (e) {
      const error = e as Error;
      response.status(400).json({ message: error.message });
    }
  })

  /**
   * @swagger
   * /unassigned:
   *   get:
   *     summary: Get unassigned patients
   *     description: Retrieves a list of patients who are currently unassigned to a nurse.
   *     operationId: getUnassignedPatients
   *     tags:
   *       - Patients
   *     responses:
   *       '200':
   *         description: A list of unassigned patients
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *                 properties:
   *                   patientId:
   *                     type: string
   *                     description: The ID of the patient
   *                   name:
   *                     type: string
   *                     description: The name of the patient
   *                   nameLower:
   *                     type: string
   *                     description: The lowercase version of the patient's name for easier searching
   *                   visitLog:
   *                     type: array
   *                     items:
   *                       type: object
   *                       properties:
   *                         date:
   *                           type: string
   *                           format: date
   *                           description: The date of the patient's visit
   *                         location:
   *                           type: string
   *                           description: The location of the visit
   *                         link:
   *                           type: string
   *                           description: A link to more details about the visit
   *                   nurseId:
   *                     type: string
   *                     nullable: true
   *                     description: The ID of the nurse assigned to the patient, null if unassigned
   *                   hospitalId:
   *                     type: string
   *                     nullable: true
   *                     description: The ID of the hospital where the patient is located
   *                   priority:
   *                     type: string
   *                     nullable: true
   *                     description: The priority level of the patient (e.g., high, medium, low)
   *                   status:
   *                     type: string
   *                     nullable: true
   *                     description: The current status of the patient (e.g., pending, in progress)
   *                   location:
   *                     type: string
   *                     nullable: true
   *                     description: The current location of the patient
   *       '400':
   *         description: Bad request, possibly due to server issues or database errors
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   description: Error message
   *                   example: "Failed to fetch unassigned patients"
   */
  .get("/unassigned", async (_, response) => {
    try {
      const result = await PatientController.getUnassignedPatients();
      response.json(result);
    } catch (e) {
      const error = e as Error;
      response.status(400).json({ message: error.message });
    }
  })

  .post("/visits", async (request, response) => {
    try {
      const params = WebUtil.params(request);

      // Check for outer keys
      WebUtil.ensureValidParams(params, "patientId", "visitLog");

      // Check for inner keys
      const visitLog = params.visitLog;
      const patientId = params.patientId;

      WebUtil.ensureValidParams(visitLog, "incidentId", "currentLocation");

      const result = await PatientController.upsertPatientVisit(
        patientId as string,
        visitLog,
      );
      response.status(201).json(result);
    } catch (e) {
      const error = e as Error;
      response.status(500).json({ message: error.message });
    }
  })
  /**
   * @swagger
   * /api/patients/visitLogs:
   *   post:
   *     summary: Create a new visit log for a patient
   *     description: >
   *       Adds a new visit log entry to the specified patient.
   *       If the patient has any existing active visit logs, they will be marked as inactive.
   *       The new visit will be created and marked as active.
   *     tags: [Patient]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - patientId
   *               - visitLog
   *             properties:
   *               patientId:
   *                 type: string
   *                 description: ID of the patient to add a visit for.
   *                 example: "P12345"
   *               visitLog:
   *                 type: object
   *                 required:
   *                   - incidentId
   *                   - location
   *                 properties:
   *                   dateTime:
   *                     type: string
   *                     format: date-time
   *                     description: ISO string representing the date and time of the visit.
   *                     example: "2025-03-29T14:30:00Z"
   *                   incidentId:
   *                     type: string
   *                     description: ID of the related incident.
   *                     example: "IJaneDoe42"
   *                   location:
   *                     type: string
   *                     enum: [Road, ER]
   *                     description: Location of the visit (Road or ER).
   *                     example: "ER"
   *                   priority:
   *                     type: string
   *                     enum: ["E", "1", "2", "3", "4"]
   *                     description: Priority of the visit. Defaults to "E" (Immediate).
   *                     example: "1"
   *                   age:
   *                     type: number
   *                     description: Age of the patient at the time of the visit.
   *                     example: 34
   *                   conscious:
   *                     type: boolean
   *                     description: Whether the patient was conscious during the visit.
   *                     example: true
   *                   breathing:
   *                     type: boolean
   *                     description: Whether the patient was breathing during the visit.
   *                     example: true
   *                   chiefComplaint:
   *                     type: string
   *                     description: The patient's chief complaint during the visit.
   *                     example: "Severe chest pain"
   *                   condition:
   *                     type: string
   *                     enum:
   *                       - Allergy
   *                       - Asthma
   *                       - Bleeding
   *                       - Broken bone
   *                       - Burn
   *                       - Choking
   *                       - Concussion
   *                       - Covid-19
   *                       - Heart Attack
   *                       - Heat Stroke
   *                       - Hypothermia
   *                       - Poisoning
   *                       - Seizure
   *                       - Shock
   *                       - Strain
   *                       - Sprain
   *                       - Stroke
   *                       - Others
   *                     description: Patient's condition type.
   *                     example: "Heart Attack"
   *                   drugs:
   *                     type: array
   *                     items:
   *                       type: string
   *                     description: List of drugs administered or reported.
   *                     example: ["Aspirin"]
   *                   allergies:
   *                     type: array
   *                     items:
   *                       type: string
   *                     description: List of known allergies.
   *                     example: ["Penicillin"]
   *     responses:
   *       201:
   *         description: Visit log created successfully.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Patient'
   *       400:
   *         description: Missing or invalid patientId or visitLog object.
   *       404:
   *         description: Patient not found.
   *       500:
   *         description: Internal server error.
   */
  .post("/visitLogs", async (request, response) => {
    try {
      const { patientId, visitLog } = request.body;
      if (!patientId || !visitLog) {
        response
          .status(400)
          .json({ message: "patientId and visitLog are required" });
        return;
      }

      const result = await PatientController.upsertPatientVisit(
        patientId as string,
        visitLog,
      );
      response.status(201).json(result);
    } catch (e) {
      const error = e as Error;
      response.status(500).json({ message: error.message });
    }
  })

  /**
   * @swagger
   * /api/patients/visitLogs:
   *   put:
   *     summary: Update the active visit log of a patient
   *     description: >
   *       Updates the currently active visit log entry for a patient.
   *       If no active visit log exists, an error is returned.
   *     tags: [Patient]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - patientId
   *               - updatedVisitData
   *             properties:
   *               patientId:
   *                 type: string
   *                 description: ID of the patient whose visit log should be updated.
   *                 example: "P12345"
   *               updatedVisitData:
   *                 type: object
   *                 description: Fields to update in the active visit log.
   *                 properties:
   *                   dateTime:
   *                     type: string
   *                     format: date-time
   *                     description: Updated date and time of the visit.
   *                     example: "2025-03-30T10:45:00Z"
   *                   incidentId:
   *                     type: string
   *                     description: Updated ID of the related incident.
   *                     example: "INewIncident77"
   *                   location:
   *                     type: string
   *                     enum: [Road, ER]
   *                     description: Updated location of the visit.
   *                     example: "Road"
   *                   priority:
   *                     type: string
   *                     enum: ["E", "1", "2", "3", "4"]
   *                     description: Updated priority of the visit.
   *                     example: "2"
   *                   age:
   *                     type: number
   *                     description: Updated age at time of visit.
   *                     example: 45
   *                   conscious:
   *                     type: boolean
   *                     description: Whether the patient was conscious.
   *                     example: false
   *                   breathing:
   *                     type: boolean
   *                     description: Whether the patient was breathing.
   *                     example: false
   *                   chiefComplaint:
   *                     type: string
   *                     description: Updated chief complaint.
   *                     example: "Fainted at workplace"
   *                   condition:
   *                     type: string
   *                     enum:
   *                       - Allergy
   *                       - Asthma
   *                       - Bleeding
   *                       - Broken bone
   *                       - Burn
   *                       - Choking
   *                       - Concussion
   *                       - Covid-19
   *                       - Heart Attack
   *                       - Heat Stroke
   *                       - Hypothermia
   *                       - Poisoning
   *                       - Seizure
   *                       - Shock
   *                       - Strain
   *                       - Sprain
   *                       - Stroke
   *                       - Others
   *                     description: Updated patient condition.
   *                     example: "Shock"
   *                   drugs:
   *                     type: array
   *                     items:
   *                       type: string
   *                     description: Updated list of drugs.
   *                     example: ["Epinephrine"]
   *                   allergies:
   *                     type: array
   *                     items:
   *                       type: string
   *                     description: Updated list of allergies.
   *                     example: ["Peanuts"]
   *     responses:
   *       200:
   *         description: Active visit log updated successfully.
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Patient'
   *       400:
   *         description: Missing or invalid patientId or updatedVisitData.
   *       404:
   *         description: Patient or active visit log not found.
   *       500:
   *         description: Internal server error.
   */
  // .put("/visitLogs", async (request, response) => {
  //   try {
  //     const { patientId, updatedVisitData } = request.body;
  //     if (!patientId || !updatedVisitData) {
  //       response
  //         .status(400)
  //         .json({ message: "patientId and updatedVisitData are required" });
  //       return;
  //     }

  //     const result = await PatientController.updatePatientVisit(
  //       patientId as string,
  //       updatedVisitData,
  //     );
  //     response.status(200).json(result);
  //   } catch (e) {
  //     const error = e as Error;
  //     response.status(500).json({ message: error.message });
  //   }
  // })

  /**
   * @swagger
   * /api/patients/location:
   *   get:
   *     summary: Get patients by location
   *     description: Retrieve a list of patients filtered by their location.
   *     tags: [Patient]
   *     parameters:
   *       - in: query
   *         name: location
   *         description: The location to filter patients by (e.g., "Road").
   *         required: true
   *         type: string
   *     responses:
   *       200:
   *         description: Patients retrieved successfully.
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 $ref: '#/components/schemas/Patient'
   *       400:
   *         description: Invalid request parameters.
   *       500:
   *         description: Internal server error.
   */
  .get("/location", async (request, response) => {
    try {
      const { location } = request.query;

      if (!location) {
        response.status(400).json({ message: "Location is required" });
        return;
      }

      const result = await PatientController.findByLocation(location as string);
      response.json(result);
    } catch (e) {
      const error = e as Error;
      response.status(500).json({ message: error.message });
    }
  })

  /**
   * @swagger
   * /api/patients:
   *   put:
   *     summary: Update a patient's location
   *     description: Update a patient's location
   *     tags: [Patient]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - patientId
   *               - location
   *             properties:
   *               patientId:
   *                 type: string
   *               location:
   *                 type: string
   *                 enum: [ER, Road]
   */
  .put("/:patientId/location", async (request, response) => {
    const { patientId } = request.params;
    try {
      const result = await PatientController.updateLocation(
        patientId,
        request.body.location,
      );
      response.json(result);
    } catch (e) {
      const error = e as Error;
      if (error.message === "Invalid location") {
        response.status(400).json({ message: error.message });
      } else if (
        error.message === `Patient with ID ${patientId} does not exist`
      ) {
        response.status(404).json({ message: error.message });
      } else {
        response.status(500).json({ message: error.message });
      }
    }
  })

  /**
   * @swagger
   * /api/patients/erStatus:
   *   put:
   *     summary: Update a patient's ER status
   *     description: Update a patient's ER status to one of 'requesting', 'ready', 'inUse', 'discharged'
   *     tags: [Patient]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - patientId
   *               - erStatus
   *             properties:
   *               patientId:
   *                 type: string
   *               erStatus:
   *                 type: string
   *                 enum: [requesting, ready, inUse, discharged]
   *     responses:
   *       200:
   *         description: Patient ER status updated
   *       400:
   *         description: Bad request
   */
  .put("/erStatus", async (request, response) => {
    const { patientId, erStatus } = request.body;

    try {
      const result = await PatientController.setERStatus(patientId, erStatus);
      response.json(result);
    } catch (e) {
      const error = e as Error;
      response.status(500).json({ message: error.message });
    }
  });

/**
 * @swagger
 * /api/patients/hospital/{hospitalId}/nurse-view:
 *   get:
 *     summary: Get patients categorized for nurse view
 *     description: Get patients for a specific hospital categorized by ER status for the nurse patients directory
 *     tags: [Patient]
 *     parameters:
 *       - in: path
 *         name: hospitalId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the hospital
 *     responses:
 *       200:
 *         description: Patients categorized by ER status
 *       500:
 *         description: Internal server error
 */
// .get("/hospital/:hospitalId/nurse-view", async (request, response) => {
//   const { hospitalId } = request.params;

//   try {
//     const result =
//       await PatientController.getPatientsForNurseView(hospitalId);
//     response.json(result);
//   } catch (e) {
//     const error = e as Error;
//     response.status(500).json({ message: error.message });
//   }
// });
