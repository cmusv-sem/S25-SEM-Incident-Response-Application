import { uuidv4 } from 'mongodb-memory-server-core/lib/util/utils'
import { IHospital } from '../models/Hospital'
import Patient, { IPatientBase, PatientSchema } from '../models/Patient'
import { IUser } from '../models/User'
import ROLES from '../utils/Roles'
import HospitalController from './HospitalController'
import UserController from './UserController'

export interface IExpandedPatientInfo extends IPatientBase {
  nurse?: IUser
  hospital?: IHospital
}

class PatientController {
  async getAllPatients() {
    const patients = await Patient.find()
    return patients
  }

  // Get a single patient by ID
  async findById(patientId: string) {
    return await Patient.findOne({ patientId }).lean()
  }

  async findByHospitalId(hospitalId: string) {
    return await Patient.find({
      hospitalId: hospitalId
    })
  }

  /**
   * Get the expanded patient info by patientId, no more joining in the frontend
   * @param patientId - The ID of the patient
   * @returns The expanded patient info
   */
  async getExpandedPatientInfo(patientId: string) {
    const patient = await this.findById(patientId)
    if (!patient) {
      throw new Error(`Patient with ID ${patientId} does not exist`)
    }

    //Turn patient into IExpandedPatientInfo
    const expandedPatientInfo: IExpandedPatientInfo = {
      ...patient,
    }

    if (Object.keys(expandedPatientInfo).includes('hospitalId')) {
      const hospital = await HospitalController.getHospitalById(
        expandedPatientInfo.hospitalId ?? '',
      )
      if (!hospital) {
        throw new Error(`Hospital with ID ${patient.hospitalId} does not exist`)
      }
      expandedPatientInfo.hospital = hospital
    }

    if (Object.keys(expandedPatientInfo).includes('nurseId')) {
      const nurse = await UserController.getUserById(
        expandedPatientInfo.nurseId ?? '',
      )
      if (!nurse) {
        throw new Error(`User with ID ${patient.nurseId} does not exist`)
      } else if ((await UserController.getUserRole(nurse.id)) !== ROLES.NURSE) {
        throw new Error(`User with ID ${patient.nurseId} is not a nurse`)
      }

      expandedPatientInfo.nurse = nurse
    }

    return expandedPatientInfo
  }

  /**
   * Create a new patient
   * @param patientData - The data of the patient
   * @returns The created patient
   */
  async create(patientData) {
    const payload = {
      // In case the patientId is not provided, generate a new one
      patientId: uuidv4(),
      ...patientData,
    }

    if (Object.keys(payload).includes('name')) {
      payload['nameLower'] = (payload['name'] ?? '').trim().toLowerCase()
    }

    const newPatient = await new Patient(payload).save()
    return newPatient
  }

  /**
   * Set the priority of a patient
   * @param patientId - The ID of the patient
   * @param priority - The priority to set, which should be one of the values in the enum of the priority field in the Patient model
   * @returns The updated patient
   */
  async setPriority(patientId: string, priority: string) {
    const column = PatientSchema.obj.priority ?? {}
    const candidates = new Set(column['enum'] ?? [])

    if (!candidates.has(priority)) {
      throw new Error(`Invalid Patient priority: ${priority}`)
    }

    const res = await Patient.findOneAndUpdate(
      { patientId },
      { priority },
      { new: true },
    )

    if (res === null) {
      throw new Error(`Patient "${patientId}" does not exist`)
    }

    return res
  }

  /**
   * Set the ER status of a patient
   * @param patientId - The ID of the patient
   * @param status - The status to set, which should be one of the values in the enum of the status field in the Patient model
   * @returns The updated patient
   */
  async setERStatus(patientId: string, status: string) {
    // Fetch the enum from the schema
    const column = PatientSchema.obj.status ?? {}
    const candidates = new Set(column['enum'] ?? [])

    if (!candidates.has(status)) {
      throw new Error(`Invalid Patient status: ${status}`)
    }

    const res = await Patient.findOneAndUpdate(
      { patientId },
      { status },
      { new: true },
    )

    if (res === null) {
      throw new Error(`Patient "${patientId}" does not exist`)
    }

    return res
  }

  /**
   * Set the name of a patient
   * @param patientId - The ID of the patient
   * @param name - The name to set
   * @returns The updated patient
   */
  async setName(patientId: string, name: string) {
    const nameLower = name.trim().toLowerCase()

    const res = await Patient.findOneAndUpdate(
      { patientId },
      { name, nameLower },
      { new: true, upsert: true },
    )

    if (res === null) {
      throw new Error(`Patient "${patientId}" does not exist`)
    }

    return res
  }

  /**
   * Update an existing patient
   * @param patientId - The ID of the patient
   * @param updateData - The data to update
   * @returns The updated patient
   */
  async update(patientId, updateData) {
    const patient = await Patient.findOneAndUpdate({ patientId }, updateData, {
      new: true,
      runValidators: true,
    })
    if (!patient) {
      throw new Error(`Patient "${patientId}" does not exist`)
    }
    return patient
  }

  /**
   * Set the nurse of a patient
   * @param patientId - The ID of the patient
   * @param nurseId - The ID of the nurse
   * @returns The updated patient
   *
   */
  async setNurse(patientId: string, nurseId: string) {
    // Check if the user exists and is a nurse
    if ((await UserController.getUserRole(nurseId)) !== ROLES.NURSE) {
      throw new Error(`User with ID ${nurseId} is not a nurse`)
    }

    // Check if the patient exists
    const patient = await this.findById(patientId)
    if (!patient) {
      throw new Error(`Patient with ID ${patientId} does not exist`)
    }

    const res = await Patient.findOneAndUpdate(
      { patientId },
      { nurseId },
      { new: true },
    )
    if (res === null) {
      throw new Error(`Patient "${patientId}" does not exist`)
    }
    return res
  }

  /**
   * Set the hospital of a patient
   * @param patientId - The ID of the patient
   * @param hospitalId - The ID of the hospital
   * @returns The updated patient
   */
  async setHospital(patientId: string, hospitalId: string) {
    // Check if the hospital exists
    const hospital = await HospitalController.getHospitalById(hospitalId)
    if (!hospital) {
      throw new Error(`Hospital with ID ${hospitalId} does not exist`)
    }

    // Check if the patient exists
    const patient = await this.findById(patientId)
    if (!patient) {
      throw new Error(`Patient with ID ${patientId} does not exist`)
    }

    const res = await Patient.findOneAndUpdate(
      { patientId },
      { hospitalId },
      { new: true },
    )
    if (res === null) {
      throw new Error(`Patient "${patientId}" does not exist`)
    }
    return res
  }

  /**
   * Delete a patient
   * @param patientId - The ID of the patient
   * @returns The deleted patient
   */
  async delete(patientId: string) {
    const res = await Patient.findOneAndDelete({ patientId })
    if (res === null) {
      throw new Error(`Patient "${patientId}" does not exist`)
    }
    return res
  }
}

export default new PatientController()
