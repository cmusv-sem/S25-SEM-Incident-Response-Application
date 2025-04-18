export default interface IPatient {
  _id: string;
  patientId?: string; // Deprecated, use _id instead
  username: string;
  name?: string;
  nameLower?: string;
  sex?: string;
  dob?: string;
  nurseId?: string;
  hospitalId?: string;
  priority?: string;
  status?: string;
  location?: string;
  visitLog?: IVisitLog[];
  master?: string;
}

export interface IVisitLog {
  _id: string,
  dateTime: Date;
  incidentId: string;
  hospitalId?: string;
  hospitalName?: string;
  priority: "E" | "1" | "2" | "3" | "4";
  location: "Road" | "ER";
  age?: number | null;
  conscious?: "Yes" | "No" | null;
  breathing?: "Yes" | "No" | null;
  chiefComplaint?: string | null;
  condition?:
    | "Allergy"
    | "Asthma"
    | "Bleeding"
    | "Broken bone"
    | "Burn"
    | "Choking"
    | "Concussion"
    | "Covid-19"
    | "Heart Attack"
    | "Heat Stroke"
    | "Hypothermia"
    | "Poisoning"
    | "Seizure"
    | "Shock"
    | "Strain"
    | "Sprain"
    | "Stroke"
    | "Others"
    | null;
  drugs?: string[] | null;
  allergies?: string[] | null;
  active: boolean;
}
