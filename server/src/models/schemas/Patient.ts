import mongoose, { Schema } from 'mongoose'
import { v4 as uuidv4 } from 'uuid'

export type PatientPriority = 'e' | 'could_wait' | 'dismissed' | 'dead'
export type PatientStatus = 'to_er' | 'at_er' | 'others'
export type ERStatusType = 'requesting' | 'ready' | 'inUse' | 'discharged'

export interface IPatient extends Document {
    userId: Schema.Types.ObjectId
    patientId: Schema.Types.ObjectId
    responderId: Schema.Types.ObjectId
    name?: string
    nameLower?: string
    sex?: string
    dob?: string
    nurseId?: string
    hospitalId?: string
    priority?: string
    status?: string
    erStatus?: ERStatusType
}

export const PatientSchema = new Schema({
    /**
     * User ID, should be a user (of this patient)'s _id
     */
    userId: { type: Schema.Types.ObjectId, required: true },

    /**
     * Patient ID, should be a patient's _id
     */
    patientId: { type: Schema.Types.ObjectId, required: true, default: uuidv4 },

    /**
     * Nurse ID, should be A user's _id that is a nurse
     */
    nurseId: { type: String },

    /**
     * Responder's ID taking care of this patient
     */
    responderId: { type: Schema.Types.ObjectId, ref: 'User' },
    /**
     * Name of the patient
     */
    name: { type: String },

    /**
     * Lowercase name of the patient. Used for searching.
     */
    nameLower: { type: String },

    /**
     * Sex of the patient
     */
    sex: { type: String },

    /**
     * DoB of the patient
     */
    dob: { type: String },

    /**
     * Hospital ID, should be a hospital's _id
     */
    hospitalId: { type: String },

    /**
     * Priority of the patient, which is a string in enum ['e', 'could_wait', 'dismissed', 'dead']
     */
    priority: {
        type: String,
        enum: [
            'e',
            'could_wait',
            'dismissed',
            'dead',
        ] satisfies ReadonlyArray<PatientPriority>,
    },

    /**
     * Status of the patient, which is a string in enum ['to_er', 'at_er', 'others']
     */
    status: {
        type: String,
        enum: [
            'to_er',
            'at_er',
            'others',
        ] satisfies ReadonlyArray<PatientStatus>,
    },

    /**
     * ER status of the patient, which determines the category for the nurse view
     */
    erStatus: {
        type: String,
        enum: [
            'requesting',
            'ready',
            'inUse',
            'discharged',
        ] satisfies ReadonlyArray<ERStatusType>,
        default: 'requesting',
    },

    /**
     * Master (first responder) of the patient
     */
    master: { type: Schema.Types.ObjectId, ref: 'User' },
})

export default mongoose.model<IPatient>('Patient', PatientSchema)
