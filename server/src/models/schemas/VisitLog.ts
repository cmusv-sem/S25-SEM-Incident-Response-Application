import { uuidv4 } from "mongodb-memory-server-core/lib/util/utils";
import mongoose, { Schema } from "mongoose";

export type VisitLogPriority = "E" | "1" | "2" | "3" | "4";
export type LocationType = "ER" | "Road";
export type ConsciousnessState = "Yes" | "No" | null;
export type BreathingState = "Yes" | "No" | null;

export interface IVisitLog extends Document {
  visitLogId: string;
  timestamp: Date;
  incidentId: string;
  patientId: Schema.Types.ObjectId;
  priority: VisitLogPriority;
  currentLocation: LocationType;
  age?: number | null;
  conscious?: ConsciousnessState;
  breathing?: BreathingState;
  chiefComplaint?: string | null;
  condition?: string | null;
  drugs?: string[] | null;
  allergies?: string[] | null;
  active: boolean;
}

const VisitLogSchema = new Schema<IVisitLog>(
  {
    visitLogId: { type: String, required: true, default: uuidv4 },
    timestamp: { type: Date, required: true, default: Date.now },
    incidentId: { type: String },
    patientId: { type: Schema.Types.ObjectId },
    priority: {
      type: String,
      enum: ["E", "1", "2", "3", "4"] satisfies ReadonlyArray<VisitLogPriority>,
      default: "E",
      required: true,
    },
    location: {
      type: String,
      enum: ["ER", "Road"] satisfies ReadonlyArray<LocationType>,
      required: true,
    },
    age: { type: Number },
    conscious: { type: String },
    breathing: { type: String },
    chiefComplaint: { type: String },
    condition: {
      type: String,
      enum: [
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
      ],
      required: false,
    },
    drugs: { type: [String], default: undefined },
    allergies: { type: [String], default: undefined },
    active: { type: Boolean, default: true },
  },
  { _id: false },
);

export default mongoose.model<IVisitLog>("VisitLog", VisitLogSchema);
