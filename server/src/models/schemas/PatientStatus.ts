import mongoose, { Schema } from "mongoose";

export type LocationType = "er" | "road";
export type ConsciousnessState = "yes" | "no" | null;
export type BreathingState = "yes" | "no" | null;
export type ErPriority = "e" | "1" | "2" | "3" | "4";
export type ErPriorityLabel = "could_wait" | "dismissed" | "dead";
export type ErCategory = "to_er" | "at_er" | "others";
export type ERStatusType = "requesting" | "ready" | "in_use" | "discharged";

/**
 * Conditions that can be associated with a patient.
 */
const kConditions = [
  "Allergy",
  "Asthma",
  "Bleeding",
  "Broken bone",
  "Burn",
  "Choking",
  "Concussion",
  "Covid-19",
  "Heart Attack",
  "Heat Stroke",
  "Hypothermia",
  "Poisoning",
  "Seizure",
  "Shock",
  "Strain",
  "Sprain",
  "Stroke",
  "Others",
  "",
];

export interface IPatientStatus extends Document {
  // Patient's age
  age?: number | null;

  // Patient's allergies
  allergies?: string[] | null;

  // Patient's breathing
  breathing?: BreathingState;

  // Patient's chief complaint
  chiefComplaint?: string | null;

  // Patient's condition
  condition?: string | null;

  // Patient's consciousness
  conscious?: ConsciousnessState;

  // Patient's location
  loc: LocationType;

  // Patient's drugs
  drugs?: string[] | null;

  // Patient's ER Information
  erPriority?: ErPriority;
  erStatus?: ERStatusType;
  erCategory?: ErCategory;
  erPriorityLabel?: ErPriorityLabel;

  // Current Incident ID associated with the Patient
  incidentId: string;

  // Whether this entry is a Visit Log
  isVisitLog: boolean;

  // ID of the currently assigned nurse, would be that nurse's _id (User Document)
  nurseId?: Schema.Types.ObjectId;

  // ID of the patient, would be that patient's _id (Patient Document)
  patientId: Schema.Types.ObjectId;

  // ID of the responder, would be that responder's _id (User Document)
  responderId?: Schema.Types.ObjectId;

  // ID of the hospital, would be that hospital's _id (Hospital Document)
  hospitalId?: Schema.Types.ObjectId;

  // Timestamp of the entry
  timestamp: Date;
}

const PatientStatusSchema = new Schema<IPatientStatus>({
  age: { type: Number },
  allergies: { type: [String], default: undefined },
  breathing: { type: String },
  chiefComplaint: { type: String },
  conscious: { type: String },
  condition: {
    type: String,
    enum: kConditions,
    required: false,
  },
  loc: {
    type: String,
    enum: ["er", "road"] satisfies ReadonlyArray<LocationType>,
    default: "road",
    required: true,
  },
  drugs: { type: [String], default: undefined },
  erPriority: {
    type: String,
    enum: ["e", "1", "2", "3", "4"] satisfies ReadonlyArray<ErPriority>,
    default: "e",
  },
  erStatus: {
    type: String,
    enum: [
      "requesting",
      "ready",
      "in_use",
      "discharged",
    ] satisfies ReadonlyArray<ERStatusType>,
    default: "requesting",
  },
  erCategory: {
    type: String,
    enum: ["to_er", "at_er", "others"] satisfies ReadonlyArray<ErCategory>,
    default: "others",
  },
  erPriorityLabel: {
    type: String,
    enum: [
      "could_wait",
      "dismissed",
      "dead",
    ] satisfies ReadonlyArray<ErPriorityLabel>,
  },
  incidentId: { type: String },
  isVisitLog: { type: Boolean, required: true, default: false },
  nurseId: { type: Schema.Types.ObjectId },
  patientId: { type: Schema.Types.ObjectId, required: true },
  responderId: { type: Schema.Types.ObjectId },
  hospitalId: { type: Schema.Types.ObjectId },
  timestamp: { type: Date, required: true, default: Date.now },
});

export default mongoose.model<IPatientStatus>(
  "PatientStatus",
  PatientStatusSchema,
);
