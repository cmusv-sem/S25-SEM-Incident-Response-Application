import mongoose, { Schema } from "mongoose";

export interface IPatient extends Document {
  _id: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  name?: string;
  nameLower?: string;
  sex?: string;
  dob?: string;
}

export const PatientSchema = new Schema<IPatient>({
  /**
   * User ID, should be a user (of this patient)'s _id
   */
  userId: { type: Schema.Types.ObjectId, required: true },

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
});

export default mongoose.model<IPatient>("Patient", PatientSchema);
