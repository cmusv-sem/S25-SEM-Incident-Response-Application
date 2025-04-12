// import { IHospital } from "../models/Hospital";
// import { IUser } from "../models/User";
// import ROLES from "../utils/Roles";
// import HospitalController from "./HospitalController";
// import UserController from "./UserController";

// import Patient, { IPatient, PatientSchema } from "../models/schemas/Patient";
// import VisitLog, { IPatientStatus } from "../models/schemas/PatientStatus";
// import HttpError from "../utils/HttpError";
// export interface IExpandedPatientInfo extends IPatient {
//   nurse?: IUser;
//   hospital?: IHospital;
// }

// class PatientController {
//   async getAllPatients() {
//     const patients = await Patient.find();
//     return patients;
//   }

//   /**
//    * Get a single patient by ID.
//    *
//    * @param {string} patientId - The ID of the patient to retrieve.
//    * @returns patient document if found, otherwise null.
//    */
//   async findById(patientId: string): Promise<IPatient | null> {
//     return await Patient.findOne({ patientId }).lean();
//   }

//   // ================================
//   // NEW METHODS
//   // ================================

//   /**
//    * Get all visits by patient ID.
//    * @param patientId - The ID of the patient to retrieve visits for.
//    * @returns an array of visit documents associated with the given patient.
//    */
//   async getVisitsByPatientId(patientId: string): Promise<IPatientStatus[]> {
//     const patient = await this.findById(patientId);

//     if (!patient) {
//       throw new Error(`Patient with ID ${patientId} does not exist`);
//     }

//     const visits = await VisitLog.find({ patientId })
//       .sort({ timestamp: -1 })
//       .lean();

//     return visits as IPatientStatus[];
//   }

//   /**
//    * Get the last visit by patient ID.
//    * @param patientId - The ID of the patient to retrieve the last visit for.
//    * @returns the last visit document associated with the given patient.
//    */
//   async getLastVisitByPatientId(
//     patientId: string,
//   ): Promise<IPatientStatus | undefined> {
//     const visits = await this.getVisitsByPatientId(patientId);

//     if (visits.length === 0) {
//       return undefined;
//     }

//     return visits[0];
//   }

//   /**
//    * Get patients by hospital ID.
//    *
//    * @param {string} hospitalId - The ID of the hospital to filter patients by.
//    * @returns an array of patient documents associated with the given hospital.
//    */
//   async findByHospitalId(hospitalId: string) {
//     return await Patient.find({
//       hospitalId: hospitalId,
//     });
//   }

//   /**
//    * Get all patients that are not assigned to any hospital.
//    *
//    * @returns an array of patient documents with no assigned hospital.
//    */
//   async getUnassignedPatients() {
//     try {
//       const priorityOrder = { E: 0, "1": 1, "2": 2, "3": 3, "4": 4 }; // Custom priority order

//       const unassignedPatients = await Patient.find({
//         // hospitalId: { $in: [null, ''] }, // Patients with no assigned hospital
//         location: "Road", // Only fetch patients where location is "Road"
//         priority: { $in: ["E", "1"] },
//       })
//         .sort({
//           priority: 1, // Sort by priority first
//           name: 1, // Sort alphabetically within the same priority
//         })
//         .lean();

//       // Ensure sorting follows the custom priority order
//       return unassignedPatients.sort(
//         (a, b) =>
//           priorityOrder[a.priority ?? Number.MAX_SAFE_INTEGER] -
//             priorityOrder[b.priority ?? Number.MAX_SAFE_INTEGER] ||
//           (a.name ?? "").localeCompare(b.name ?? ""),
//       );
//     } catch (error) {
//       console.error("Error fetching unassigned patients:", error);
//       throw new Error(
//         "An error occurred while retrieving unassigned patients.",
//       );
//     }
//   }

//   /**
//    * Get the expanded patient info by patientId, no more joining in the frontend
//    * @param patientId - The ID of the patient
//    * @returns The expanded patient info
//    */
//   async getExpandedPatientInfo(patientId: string) {
//     const patient = await this.findById(patientId);
//     if (!patient) {
//       throw new Error(`Patient with ID ${patientId} does not exist`);
//     }

//     //Turn patient into IExpandedPatientInfo
//     const expandedPatientInfo: IExpandedPatientInfo = {
//       ...patient,
//     };

//     if (Object.keys(expandedPatientInfo).includes("hospitalId")) {
//       const hospital = await HospitalController.getHospitalById(
//         expandedPatientInfo.hospitalId ?? "",
//       );
//       if (!hospital) {
//         throw new Error(
//           `Hospital with ID ${patient.hospitalId} does not exist`,
//         );
//       }
//       expandedPatientInfo.hospital = hospital;
//     }

//     if (Object.keys(expandedPatientInfo).includes("nurseId")) {
//       const nurse = await UserController.getUserById(
//         expandedPatientInfo.nurseId ?? "",
//       );
//       if (!nurse) {
//         throw new Error(`User with ID ${patient.nurseId} does not exist`);
//       } else if ((await UserController.getUserRole(nurse.id)) !== ROLES.NURSE) {
//         throw new Error(`User with ID ${patient.nurseId} is not a nurse`);
//       }

//       expandedPatientInfo.nurse = nurse;
//     }

//     return expandedPatientInfo;
//   }

//   // ================================
//   // OLD METHODS
//   // ================================

//   /**
//    * Create a new patient
//    * @param patientData - The data of the patient
//    * @param callerUid - The UID of the caller (first responder)
//    * @returns The created patient
//    */
//   async create(patientData, callerId?: string) {
//     try {
//       if (!callerId) {
//         throw new HttpError("Caller UID is required", 400);
//       }

//       if (Object.keys(patientData).includes("patientId")) {
//         delete patientData.patientId;
//       }

//       // const payload = {
//       //   // Generate a new patientId if not provided
//       //   patientId:
//       //     patientData.patientId || new mongoose.Types.ObjectId().toString(),
//       //   ...patientData,
//       //   master: callerId, // Set the master field to the caller's UID
//       // };

//       // Ensure the nameLower field is set for searching
//       if (payload.name) {
//         payload.nameLower = payload.name.trim().toLowerCase();
//       }

//       const newPatient = await new Patient(payload).save();
//       return newPatient;
//     } catch (error) {
//       console.error("Error creating patient:", error);
//       if (error instanceof HttpError) {
//         throw error;
//       }
//       throw new HttpError("Failed to create patient", 500);
//     }
//   }

//   /**
//    * Set the priority of a patient
//    * @param patientId - The ID of the patient
//    * @param priority - The priority to set, which should be one of the values in the enum of the priority field in the Patient model
//    * @returns The updated patient
//    */
//   async setPriority(patientId: string, priority: string) {
//     const column = PatientSchema.obj.priority ?? {};
//     const candidates = new Set(column["enum"] ?? []);

//     if (!candidates.has(priority)) {
//       throw new Error(`Invalid Patient priority: ${priority}`);
//     }

//     const res = await Patient.findOneAndUpdate(
//       { patientId },
//       { priority },
//       { new: true },
//     );

//     if (res === null) {
//       throw new Error(`Patient "${patientId}" does not exist`);
//     }

//     return res;
//   }

//   /**
//    * Set the status of a patient
//    * @param patientId - The ID of the patient
//    * @param status - The status to set, which should be one of the values in the enum of the status field in the Patient model
//    * @returns The updated patient
//    */
//   async setStatus(patientId: string, status: string) {
//     // Fetch the enum from the schema
//     const column = PatientSchema.obj.status ?? {};
//     const candidates = new Set(column["enum"] ?? []);

//     if (!candidates.has(status)) {
//       throw new Error(`Invalid Patient status: ${status}`);
//     }

//     const res = await Patient.findOneAndUpdate(
//       { patientId },
//       { status },
//       { new: true },
//     );

//     if (res === null) {
//       throw new Error(`Patient "${patientId}" does not exist`);
//     }

//     return res;
//   }

//   /**
//    * Set the ER status of a patient
//    * @param patientId - The ID of the patient
//    * @param erStatus - The ER status to set, should be one of: 'requesting', 'ready', 'inUse', 'discharged'
//    * @returns The updated patient
//    */
//   async setERStatus(patientId: string, erStatus: string) {
//     // Fetch the enum from the schema
//     const column = PatientSchema.obj.erStatus ?? {};
//     const candidates = new Set(column["enum"] ?? []);

//     if (!candidates.has(erStatus)) {
//       throw new Error(`Invalid ER status: ${erStatus}`);
//     }

//     const res = await Patient.findOneAndUpdate(
//       { patientId },
//       { erStatus },
//       { new: true },
//     );

//     if (res === null) {
//       throw new Error(`Patient "${patientId}" does not exist`);
//     }

//     return res;
//   }

//   /**
//    * Set the name of a patient
//    * @param patientId - The ID of the patient
//    * @param name - The name to set
//    * @returns The updated patient
//    */
//   async setName(patientId: string, name: string) {
//     const nameLower = name.trim().toLowerCase();

//     const res = await Patient.findOneAndUpdate(
//       { patientId },
//       { name, nameLower },
//       { new: true, upsert: true },
//     );

//     if (res === null) {
//       throw new Error(`Patient "${patientId}" does not exist`);
//     }

//     return res;
//   }

//   /**
//    * Update an existing patient
//    * @param patientId - The ID of the patient
//    * @param updateData - The data to update
//    * @returns The updated patient
//    */
//   async update(patientId, updateData) {
//     const patient = await Patient.findOneAndUpdate({ patientId }, updateData, {
//       new: true,
//       runValidators: true,
//     });
//     if (!patient) {
//       throw new Error(`Patient "${patientId}" does not exist`);
//     }
//     return patient;
//   }

//   /**
//    * Set the nurse of a patient
//    * @param patientId - The ID of the patient
//    * @param nurseId - The ID of the nurse
//    * @returns The updated patient
//    *
//    */
//   async setNurse(patientId: string, nurseId: string) {
//     // Check if the user exists and is a nurse
//     if ((await UserController.getUserRole(nurseId)) !== ROLES.NURSE) {
//       throw new Error(`User with ID ${nurseId} is not a nurse`);
//     }

//     // Check if the patient exists
//     const patient = await this.findById(patientId);
//     if (!patient) {
//       throw new Error(`Patient with ID ${patientId} does not exist`);
//     }

//     const res = await Patient.findOneAndUpdate(
//       { patientId },
//       { nurseId },
//       { new: true },
//     );
//     if (res === null) {
//       throw new Error(`Patient "${patientId}" does not exist`);
//     }
//     return res;
//   }

//   /**
//    * Set the hospital of a patient
//    * @param patientId - The ID of the patient
//    * @param hospitalId - The ID of the hospital
//    * @returns The updated patient
//    */
//   async setHospital(patientId: string, hospitalId: string) {
//     // Check if the hospital exists
//     const hospital = await HospitalController.getHospitalById(hospitalId);
//     if (!hospital) {
//       throw new Error(`Hospital with ID ${hospitalId} does not exist`);
//     }

//     // Check if the patient exists
//     const patient = await this.findById(patientId);
//     if (!patient) {
//       throw new Error(`Patient with ID ${patientId} does not exist`);
//     }

//     const res = await Patient.findOneAndUpdate(
//       { patientId },
//       { hospitalId },
//       { new: true },
//     );
//     if (res === null) {
//       throw new Error(`Patient "${patientId}" does not exist`);
//     }
//     return res;
//   }

//   /**
//    * Delete a patient
//    * @param patientId - The ID of the patient
//    * @returns The deleted patient
//    */
//   async delete(patientId: string) {
//     const res = await Patient.findOneAndDelete({ patientId });
//     if (res === null) {
//       throw new Error(`Patient "${patientId}" does not exist`);
//     }
//     return res;
//   }

//   /**
//    * Creates or updates a visit log for a patient and sets the erStatus appropriately
//    *
//    * - If the patient has no visit logs, a new entry is created.
//    * - If the patient has visit logs, all active ones are set to inactive and a new log entry is created.
//    * - Updates the erStatus based on the location and priority

//    * @param patientId - The unique ID of the patient
//    * @param visitLog - The visit details to log for the patient
//    * @returns The updated patient document
//    * @throws Error if the patient with the given ID does not exist
//    */
//   async upsertPatientVisit(patientId: string, visitLog: IPatientStatus) {
//     const patient = await Patient.findOne({ patientId }).lean();

//     if (!patient) {
//       throw new Error(`Patient with ID ${patientId} does not exist`);
//     }

//     // const {
//     //   timestamp,
//     //   incidentId,
//     //   currentLocation,
//     //   priority,
//     //   age,
//     //   conscious,
//     //   breathing,
//     //   chiefComplaint,
//     //   condition,
//     //   drugs,
//     //   allergies,
//     // } = visitLog;

//     // A helper function to generate a new IVisitLog object
//     // const createVisitLog = (): IVisitLog => {
//     //   return {
//     //     timestamp: timestamp ? timestamp : new Date(),
//     //     incidentId,
//     //     currentLocation,
//     //     priority: priority || "E",
//     //     age: age ?? null,
//     //     conscious: conscious ?? null,
//     //     breathing: breathing ?? null,
//     //     chiefComplaint: chiefComplaint ?? null,
//     //     condition: condition ?? null,
//     //     drugs: drugs ?? null,
//     //     allergies: allergies ?? null,
//     //     active: true,
//     //   };
//     // };

//     // Clear ER Status of the patient first
//     const oldErStatus = patient["erStatus"];
//     patient["erStatus"] = undefined;

//     if (
//       // Only if the patient is in ER and has priority E or 1, we set the erStatus to requesting
//       visitLog.loc === "ER" &&
//       new Set(["E", "1"]).has(visitLog.erPriorityLabel)
//     ) {
//       patient["erStatus"] = oldErStatus ?? "requesting";
//     }

//     visitLog.patientId = patientId;
//     visitLog.timestamp = new Date();

//     const [, updatedPatient] = await Promise.all([
//       new VisitLog(visitLog).save(),
//       Patient.findOneAndUpdate({ patientId }, { $set: patient }, { new: true }),
//     ]);

//     return updatedPatient;
//   }

//   // /**
//   //  * Update the active visit log entry of a patient.
//   //  *
//   //  * @param patientId - ID of the patient to update
//   //  * @param updatedVisitData - The updated visit details to log for the patient
//   //  * @returns The updated patient document with the modified visit log
//   //  * @throws Error if the patient with the given ID does not exist
//   //  */
//   // async updatePatientVisit(patientId: string, updatedVisitData: IVisitLog) {
//   //   const patient = await Patient.findOne({ patientId });
//   //   if (!patient) {
//   //     throw new Error(`Patient with ID ${patientId} does not exist`);
//   //   }

//   //   const activeVisit = patient.visitLog?.find((visit) => visit.active);

//   //   // Update only the provided fields
//   //   Object.entries(updatedVisitData).forEach(([key, value]) => {
//   //     if (value !== undefined && key !== "active") {
//   //       activeVisit[key] = value;
//   //     }
//   //   });

//   //   await patient.save();
//   //   const updatedPatient = await Patient.findOne({ patientId });
//   //   if (
//   //     updatedPatient &&
//   //     updatedPatient.visitLog &&
//   //     updatedPatient.visitLog.length > 0
//   //   ) {
//   //     const incidentId = activeVisit.incidentId;
//   //     const incidents =
//   //       await IncidentController.getIncidentByIncidentId(incidentId);
//   //     const incident = incidents[0];
//   //     if (incident && updatedPatient) {
//   //       if (!Array.isArray(incident.patients)) {
//   //         incident.patients = [];
//   //       }

//   //       incident.patients.push({
//   //         username: updatedPatient.username,
//   //         status: updatedPatient.status,
//   //         dateTime: new Date().toISOString(),
//   //       });
//   //       await IncidentController.updateIncident(incident);
//   //     }
//   //   }
//   //   return updatedPatient;
//   // }

//   async findByLocation(location: string) {
//     return await Patient.find({ location }).exec();
//   }

//   async updateLocation(patientId: string, location: string) {
//     if (location !== "ER" && location !== "Road") {
//       throw new Error("Invalid location");
//     }
//     const patient = await this.findById(patientId);
//     if (!patient) {
//       throw new Error(`Patient with ID ${patientId} does not exist`);
//     }
//     const updatedPatient = await Patient.findOneAndUpdate(
//       { patientId },
//       { location },
//       { new: true },
//     );
//     return updatedPatient;
//   }

//   /**
//    * Get patients by hospital ID and categorize them by ER status
//    * Only includes patients with latest visit log location 'ER' and priority 'E' or '1'
//    *
//    * @param {string} hospitalId - The ID of the hospital to filter patients by.
//    * @returns an object with categorized patients: requesting, ready, inUse, discharged
//    */
//   // async getPatientsForNurseView(hospitalId: string) {
//   //   try {
//   //     // Get all patients in this hospital
//   //     const allPatients = await Patient.find({
//   //       hospitalId: hospitalId,
//   //     }).lean();

//   //     // Define patient item type
//   //     interface PatientItem {
//   //       patientId: string;
//   //       name: string;
//   //       priority: "E" | "1";
//   //       bedId: string;
//   //     }

//   //     // Initialize the result object with typed arrays
//   //     const result: {
//   //       requesting: PatientItem[];
//   //       ready: PatientItem[];
//   //       inUse: PatientItem[];
//   //       discharged: PatientItem[];
//   //     } = {
//   //       requesting: [],
//   //       ready: [],
//   //       inUse: [],
//   //       discharged: [],
//   //     };

//   //     // Group patients by their erStatus
//   //     for (const patient of allPatients) {
//   //       // Get the latest visit log entry
//   //       const latestVisit =
//   //         patient.visitLog && patient.visitLog.length > 0
//   //           ? patient.visitLog[patient.visitLog.length - 1]
//   //           : null;

//   //       // Only include patients with location 'ER' and priority E or 1 in their latest visit log
//   //       if (
//   //         latestVisit &&
//   //         latestVisit.location === "ER" &&
//   //         (latestVisit.priority === "E" || latestVisit.priority === "1")
//   //       ) {
//   //         // Create a simplified patient object for the frontend
//   //         const patientItem: PatientItem = {
//   //           patientId: patient.patientId,
//   //           name: patient.name || "Unknown",
//   //           priority: latestVisit.priority as "E" | "1",
//   //           bedId: "", // This could be populated if bed information is available
//   //         };

//   //         // Add to the appropriate category
//   //         if (patient.erStatus === "requesting") {
//   //           result.requesting.push(patientItem);
//   //         } else if (patient.erStatus === "ready") {
//   //           result.ready.push(patientItem);
//   //         } else if (patient.erStatus === "inUse") {
//   //           result.inUse.push(patientItem);
//   //         } else if (patient.erStatus === "discharged") {
//   //           result.discharged.push(patientItem);
//   //         }
//   //       }
//   //     }

//   //     // Sort each category by priority and then by name
//   //     const priorityOrder = { E: 0, "1": 1 };

//   //     for (const category of Object.keys(result) as (keyof typeof result)[]) {
//   //       result[category].sort((a, b) => {
//   //         // First sort by priority
//   //         const priorityA = priorityOrder[a.priority] || 0;
//   //         const priorityB = priorityOrder[b.priority] || 0;

//   //         if (priorityA !== priorityB) {
//   //           return priorityA - priorityB;
//   //         }

//   //         // Then sort by name
//   //         return (a.name || "").localeCompare(b.name || "");
//   //       });
//   //     }

//   //     return result;
//   //   } catch (error) {
//   //     console.error("Error fetching patients for nurse view:", error);
//   //     throw new Error("Failed to fetch patients for nurse view");
//   //   }
//   // }
// }

// export default new PatientController();
