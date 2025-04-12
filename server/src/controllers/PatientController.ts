import Patient, { IPatient } from "../models/schemas/Patient";
import PatientStatus, { IPatientStatus } from "../models/schemas/PatientStatus";

export interface ExpandedPatient extends IPatient {
  metadata: IPatientStatus | undefined;
}

export default class PatientController {
  /**
   * Get a list of all patients WITHOUT metadata.
   * @returns A list of all patients.
   */
  async getPatientList(): Promise<IPatient[]> {
    return await Patient.find().lean();
  }

  async create({ userId, name, sex, dob }: IPatient): Promise<IPatient> {
    const patient = await Patient.create({
      userId,
      name,
      nameLower: (name ?? "").toLowerCase(),
      sex,
      dob,
    });

    return patient;
  }

  /**
   * Upsert a new version of a Patient's metadata.
   *
   * But generally speaking you should not invoke this method directly because it's not very friendly...
   * As this method does not limit the fields that can be updated, it might lead to potential issues.
   * @param patientId The ID of the patient.
   * @param fields The fields to update.
   * @returns The updated patient status.
   */
  async updateMetadata(
    patientId: string,
    fields: Partial<IPatientStatus>,
  ): Promise<IPatientStatus | undefined> {
    await this.getExistingPatient(patientId);

    const existing = await PatientStatus.findOne(
      {
        patientId,
      },
      {
        sort: {
          timestamp: -1,
        },
      },
    ).lean();

    let payload: IPatientStatus | undefined;

    // "Upsert" if the patient status does not exist
    if (!existing) {
      payload = new PatientStatus({
        patientId,
        ...fields,
      });
    } else {
      payload = {
        ...existing,
        timestamp: new Date(),
        ...fields,
      } as IPatientStatus;
    }

    const updated = await new PatientStatus(payload).save();

    return updated;
  }

  /**
   * Get an existing patient. Implictly validate the existence of the patient.
   * @param patientId The ID of the patient.
   * @returns The existing patient.
   */
  async getExistingPatient(patientId: string): Promise<IPatient> {
    const patient = await Patient.findOne({
      _id: patientId,
    }).lean();

    if (!patient) {
      throw Error(`Patient with ID: ${patientId} not found`);
    }

    return patient as IPatient;
  }

  /**
   * Create a new visit log for a patient.
   * @param patientId The ID of the patient.
   * @param fields The fields to update.
   * @returns The updated patient status.
   */
  async createVisitLog(
    patientId: string,
    fields: Partial<IPatientStatus>,
  ): Promise<IPatientStatus | undefined> {
    await this.getExistingPatient(patientId);

    const payload = {
      patientId,
      ...fields,
      isVisitLog: true,
    } as IPatientStatus;

    //TODO: Find out what fields should be cleared when creating a visit log

    const updated = await this.updateMetadata(patientId, payload);

    return updated;
  }

  async getVisitLog(patientId: string): Promise<IPatientStatus[]> {
    await this.getExistingPatient(patientId);

    const visitLogs = await PatientStatus.find({
      patientId,
      isVisitLog: true,
    }).lean();

    return visitLogs as IPatientStatus[];
  }

  /**
   * Get all patient statuses.
   * @returns A list of all patient statuses.
   */
  async getAllPatientStatus(): Promise<IPatientStatus[]> {
    const latestStatuses = await PatientStatus.aggregate([
      {
        $sort: { timestamp: -1 },
      },
      {
        $group: {
          _id: "$patientId",
          latestStatus: { $first: "$$ROOT" },
        },
      },
      {
        $replaceRoot: { newRoot: "$latestStatus" },
      },
    ]);

    return latestStatuses;
  }

  /**
   * Get the most recent patient status for a patient.
   * @param patientId The ID of the patient. (Should be ObjectId under the hood)
   * @returns The most recent patient status.
   */
  async getPatientStatus(patientId: string): Promise<IPatientStatus> {
    const patient = await this.getExistingPatient(patientId);

    const metadata = await PatientStatus.find(
      {
        patientId: patient._id,
      },
      {
        // Get the most recent one
        sort: {
          timestamp: -1,
        },
      },
    );

    if (metadata.length === 0) {
      throw new Error("No metadata found for patient");
    }

    return metadata[0];
  }

  /**
   * Get all assigned patients.
   * @returns A list of all assigned patients.
   */
  async getAssignedPatients(): Promise<Record<string, ExpandedPatient[]>> {
    const patients = await this.getPatientsWithMetadata();

    const assigned: ExpandedPatient[] = [];
    const unassigned: ExpandedPatient[] = [];

    for (const p of patients) {
      if (p.metadata != undefined && p.metadata.hospitalId != undefined) {
        assigned.push(p);
      } else {
        unassigned.push(p);
      }
    }
    return {
      assigned,
      unassigned,
    };
  }

  /**
   * Get a list of all patients WITH metadata.
   * @returns A list of all patients with metadata.
   */
  async getPatientsWithMetadata(): Promise<ExpandedPatient[]> {
    const metadataList = await this.getAllPatientStatus();
    const patientList = await this.getPatientList();

    const metadataMap = new Map();
    for (const metadata of metadataList) {
      metadataMap.set(metadata.patientId.toString(), metadata);
    }

    // const patients = await Patient.find({
    //   _id: { $in: metadataMap.keys() },
    // }).lean();

    const ret: ExpandedPatient[] = [];

    // Put together the ExpandedPatient list (Joining Metadata with Patient)
    for (const p of patientList) {
      ret.push({
        ...p,
        // Actually it's not necessary to use ?? undefined because ??
        // relies on the fact that metadataMap.get(p._id.toString()) will return undefined
        // if the patient is not in the metadataMap
        metadata: metadataMap.get(p._id.toString()) ?? undefined,
      } as ExpandedPatient);
    }

    return ret;
  }

  // TODO: make more methods that interact with updateMetadata
  // Such as update nurse, hospital, etc.
}
