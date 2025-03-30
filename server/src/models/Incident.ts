import mongoose, { Document, Schema, Types } from 'mongoose'
import {
    EmergencyQuestions,
    FireQuestions,
    MedicalQuestions,
    PoliceQuestions,
} from '../utils/types'

export enum IncidentType {
    Fire = 'F',
    Medical = 'M',
    Police = 'P',
    Unset = 'U',
    Sar = 'S',
}

export enum IncidentPriority {
    Immediate = 'E',
    Urgent = 'One',
    CouldWait = 'Two',
    Dismiss = 'Three',
    Unset = 'U',
}

// All dedicated field for 'SAR Task' goes here
//   Note: SAR Task/SAR Incident is special type of Incident
export interface ISarTask {
    state: 'Todo' | 'InProgress' | 'Done'
    startDate?: Date
}

export interface IIncident extends Document {
    incidentId: string
    caller: string
    openingDate: Date
    closingDate?: Date
    incidentState: 'Waiting' | 'Triage' | 'Assigned' | 'Closed'
    /*
     TODO in the future: when the app is deployed we can create reserved user System
     and replace String with type of User (same with commander)
     */
    owner: string
    commander: string
    address: string
    type: IncidentType
    questions:
        | MedicalQuestions[]
        | FireQuestions
        | PoliceQuestions
        | EmergencyQuestions
        | null
    priority: IncidentPriority // The priority of the incident
    incidentCallGroup?: Types.ObjectId | null // Reference to Channel model
    assignedVehicles: {
        type: 'Car' | 'Truck'
        name: string
        usernames: string[]
    }[]
    assignHistory?: {
        timestamp: Date
        name: string
        type: string
        isAssign: boolean
        usernames: string[]
    }[]
    respondersGroup?: Types.ObjectId | null // Reference to Channel model
    sarTask?: ISarTask
}

const IncidentSchema = new Schema({
    incidentId: {
        type: String,
        required: true,
        unique: true,
    },
    caller: {
        type: String,
        required: true,
    },
    openingDate: {
        type: Date,
        default: Date.now,
    },
    closingDate: {
        type: Date,
        default: null,
    },
    incidentState: {
        type: String,
        required: true,
        enum: ['Waiting', 'Triage', 'Assigned', 'Closed'],
        default: 'Waiting',
    },
    owner: {
        type: String,
        required: true,
        default: 'System',
    },
    commander: {
        type: String,
        required: true,
        default: 'System',
    },
    address: {
        type: String,
        required: false,
    },
    type: {
        type: String,
        required: false,
        enum: Object.values(IncidentType),
    },
    priority: {
        type: String,
        required: false,
        enum: Object.values(IncidentPriority),
    },
    questions: {
        type: Schema.Types.Mixed, // Allows for different types of object but no strict type validation. This could be changed
        required: false,
    },
    incidentCallGroup: {
        type: Schema.Types.ObjectId,
        ref: 'Channel',
        required: false,
        default: null,
    },
    assignedVehicles: {
        type: [
            {
                type: { type: String, enum: ['Car', 'Truck'] },
                name: { type: String },
                usernames: { type: [String] },
            },
        ],
        default: [],
    },
    assignHistory: {
        type: [
            {
                timestamp: { type: Date, required: true },
                name: { type: String, required: true },
                type: { type: String, enum: ['Car', 'Truck'] },
                isAssign: { type: Boolean, required: true },
                usernames: { type: [String], required: true },
            },
        ],
        default: [],
    },
    respondersGroup: {
        type: Schema.Types.ObjectId,
        ref: 'Channel',
        default: null,
    },
    sarTask: {
        type: {
            state: {
                type: String,
                enum: ['Todo', 'InProgress', 'Done'],
                default: 'Todo',
            },
            startDate: {
                type: Date,
                default: null
            }
        },
        required: false,
        default: null,
    },
})

/**
 * Auto-generate `incidentId` if not provided
 * (e.g., "IZoe" for a caller named "Zoe")
 */
IncidentSchema.pre('save', function (next): void {
    if (!this.incidentId && this.caller) {
        this.incidentId = `I${this.caller}`
    }
    next()
})

export default mongoose.model<IIncident>('Incident', IncidentSchema)
