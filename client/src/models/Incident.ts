import {
    EmergencyQuestions,
    FireQuestions,
    MedicalQuestions,
    PoliceQuestions,
} from '../utils/types'

/**
 * Incident Interface
 *
 * Defines the structure of an incident object in the application.
 */

export enum IncidentPriority {
    Immediate = 'E',
    Urgent = 'One',
    CouldWait = 'Two',
    Dismiss = 'Three',
    Unset = 'U',
}

export enum IncidentType {
    Fire = 'F',
    Medical = 'M',
    Police = 'P',
    Unset = 'U',
}

export interface ISarTask {
    state: 'Todo' | 'InProgress' | 'Done'
    startDate?: Date
}

export default interface IIncident {
    _id: string // Unique identifier for the incident
    incidentId: string
    caller: string // User object representing the sender of the incident
    openingDate: string // Timestamp of when the incident was create
    closingDate?: string // Timestamp of when the incident was closed
    incidentState: string // Identifier of the state of the incident
    owner: string // The owner of the incident
    commander: string // The commander of the incident
    address: string // The address of the user who created the incident
    type: IncidentType // The type of the incident
    questions:
        | MedicalQuestions[]
        | FireQuestions
        | PoliceQuestions
        | EmergencyQuestions
        | null
    incidentCallGroup?: string | null // ID of the associated chat channel
    respondersGroup?: string | null // ID of the responders group
    priority: IncidentPriority // The priority of the incident
    location?: {
        // Exact coordinates of the incident location
        latitude: number
        longitude: number
    }
    assignedVehicles: { type: string; name: string; usernames: string[] }[] // List of vehicles assigned to the incident
    resources?: {
        id: string
        type: string
        name: string
        quantity: string
        status: string
        notes: string
    }[]
    searchOperation?: {
        incidentCommander: string
        searchType: string
        priority: string
        terrain: string
        weather: string
        visibility: string
        notes: string
        teams?: {
            id: string
            name: string
            leader: string
            members: string[]
            area: string
            status: string
        }[]
    }
    sarTask?: ISarTask
}
