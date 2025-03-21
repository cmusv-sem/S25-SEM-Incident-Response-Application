import Hospital, { IHospital } from '../models/Hospital'

class HospitalController {
  /**
   * Create a new Hospital
   * @param hospital An object of IHospital
   * @returns The new hospital object which was created
   */
  async create(hospital: IHospital) {
    try {
      const newHospital = new Hospital({
        hospitalName: hospital.hospitalName,
        hospitalAddress: hospital.hospitalAddress,
        hospitalDescription: hospital.hospitalDescription,
        totalNumberERBeds: hospital.totalNumberERBeds,
        nurses: hospital.nurses,
      })
      await newHospital.save()
      return newHospital
    } catch (error) {
      console.error('Error creating hospital:', error)
      throw new Error('Failed to create hospital')
    }
  }

  /**
   * Fetch hospital details by hospitalId
   * @param hospitalId
   * @returns The hospital object associated with the hospitalId passed
   */
  async getHospitalById(hospitalId: string) {
    try {
      const hospital = await Hospital.findOne({ hospitalId })
      if (!hospital) {
        throw new Error('Hospital not found')
      }
      return hospital
    } catch (error) {
      console.error('Error fetching hospital details:', error)
      throw new Error('Failed to fetch hospital details')
    }
  }

  /**
   * Fetch all hospitals from the database
   * @returns An array of hospital objects (empty array if none found)
   */
  async getAllHospitals() {
    try {
      const hospitals = await Hospital.find()
      return hospitals
    } catch (error) {
      console.error('Error fetching hospitals:', error)
      throw new Error('Failed to fetch hospitals')
    }
  }
}

export default new HospitalController()
