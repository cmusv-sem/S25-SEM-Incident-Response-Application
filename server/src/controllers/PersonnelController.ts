import Car from "../models/Car";
import City from "../models/City";
import Truck from "../models/Truck";
import User, { IUser } from "../models/User";
import { ROLES } from "../utils/Roles";

class PersonnelController {
  /**
   * Get all available personnel (Police and Firefighters) who are not assigned to any city.
   */
  async getAllAvailablePersonnel(){  
    try {
      const unassignedUsers = await User.find({
        role: { $in: [ROLES.POLICE, ROLES.FIRE] },
        assignedCity: null,
      }).sort({ username: 1 }).exec();
  
      return unassignedUsers.map(({ _id, username, assignedCity }) => ({
        _id,
        name: username,
        assignedCity,
      }));
    } catch (error) {
      console.error('Error fetching unassigned users:', error);
      throw error;
    }
  }

  /**
   * Update the assigned city for a specific personnel.
   * @param username - The username of the personnel to update.
   * @param cityName - The name of the city to assign.
   * @returns The updated personnel object.
   */
  async updatePersonnelCity(username: string, cityName: string): Promise<IUser | null> {
    try {
      if (!cityName) {
        const updatedPersonnel = await User.findOneAndUpdate(
          {
            username,
            role: { $in: [ROLES.POLICE, ROLES.FIRE] },
          },
          { assignedCity: null },
          { new: true }
        )
        return updatedPersonnel
      }
      const cityExists = await City.findOne({ name: cityName })
      if (!cityExists) {
        throw new Error(`City '${cityName}' does not exist in the database`)
      }
      const personnel = await User.findOne({ username })
      if (!personnel || (personnel.role !== ROLES.POLICE && personnel.role !== ROLES.FIRE)) {
        throw new Error(`Personnel with username '${username}' does not exist`)
      }
      const updatedPersonnel = await User.findOneAndUpdate(
        { username }, { assignedCity: cityName })
      return updatedPersonnel
    } catch (error) {
      console.error('Error updating personnel city:', error)
      throw error
    }
  }

  async selectVehicleForPersonnel(personnelName: string, vehicleName: string) {
    if (!vehicleName) {
      throw new Error("Vehicle name is required");
    }
    const personnel = await User.findOne({ username: personnelName });
    if (!personnel) {
      throw new Error(`Personnel with username '${personnelName}' does not exist`);
    }
    if (personnel.role === ROLES.POLICE) {
      const car = await Car.findOne({ name: vehicleName });
      if (!car) {
        throw new Error(`Car with name '${vehicleName}' does not exist`);
      }
      const updatedPersonnel = await User.findOneAndUpdate(
        { username: personnelName },
        { assignedCar: vehicleName, assignedVehicleTimestamp: new Date() },
        { new: true }
      );
      return updatedPersonnel;
    } else if (personnel.role === ROLES.FIRE) {
      const truck = await Truck.findOne({ name: vehicleName });
      if (!truck) {
        throw new Error(`Truck with name '${vehicleName}' does not exist`);
      }
      const updatedPersonnel = await User.findOneAndUpdate(
        { username: personnelName },
        { assignedTruck: vehicleName, assignedVehicleTimestamp: new Date() },
        { new: true }
      );
      return updatedPersonnel;
    }

    throw new Error(`Personnel with username '${personnelName}' is not a police or firefighter`);
  }

  async releaseVehicleFromPersonnel(personnelName: string, vehicleName: string) {
    const personnel = await User.findOne({ username: personnelName });
    if (!personnel) {
      throw new Error(`Personnel with username '${personnelName}' does not exist`);
    }
    if (personnel.role === ROLES.POLICE) {
      const car = await Car.findOne({ name: vehicleName });
      if (!car) {
        throw new Error(`Car with name '${vehicleName}' does not exist`);
      }
      const updatedPersonnel = await User.findOneAndUpdate(
        { username: personnelName },
        { assignedCar: null, assignedVehicleTimestamp: null },
        { new: true }
      );
      return updatedPersonnel;
    } else if (personnel.role === ROLES.FIRE) {
      const truck = await Truck.findOne({ name: vehicleName });
      if (!truck) {
        throw new Error(`Truck with name '${vehicleName}' does not exist`);
      }
      const updatedPersonnel = await User.findOneAndUpdate(
        { username: personnelName },
        { assignedTruck: null, assignedVehicleTimestamp: null },
        { new: true }
      );
      return updatedPersonnel;
    }
    throw new Error(`Personnel with username '${personnelName}' is not a police or firefighter`);
  }
}

export default new PersonnelController();
