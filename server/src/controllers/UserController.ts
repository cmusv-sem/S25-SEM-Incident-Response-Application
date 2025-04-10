import Car from "../models/Car";
import Channel from "../models/Channel";
import Incident from "../models/Incident";
import Truck from "../models/Truck";
import User, { IUser } from "../models/User";
import ROLES from "../utils/Roles";
import SystemGroupConfigs from "../utils/SystemDefinedGroups";
import * as Token from "../utils/Token";
import UserConnections from "../utils/UserConnections";
import CarController from "./CarController";
import IncidentController from "./IncidentController";
import TruckController from "./TruckController";

class UserController {
  /**
   * Register a new user
   * @param username - The username for the new user
   * @param password - The password for the new user
   * @param phoneNumber - The phone number for the new user
   * @param role - The role for the new user (default: ROLES.CITIZEN)
   * @returns The newly created user object
   * @throws Error if the username already exists
   */
  async register(
    username: string,
    password: string,
    role: ROLES = ROLES.CITIZEN,
  ) {
    // Check if user already exists
    let user = await User.findOne({ username }).exec();

    if (user) {
      throw new Error(`User "${username}" already exists`);
    } else {
      // Create and save new user
      user = await new User({
        username,
        password,
        role,
      }).save();

      // Subscribe the new user to the appropriate system defined groups
      for (const config of SystemGroupConfigs) {
        if (config.participantRole.includes(role)) {
          const channel = await Channel.findOne({
            name: config.name,
          }).exec();

          if (channel) {
            channel.users.push(user._id);
            await channel.save();
            console.log(
              `User ${username} added to system group: ${config.name}`,
            );
          } else {
            console.log(
              `System group ${config.name} not found for user ${username}`,
            );
          }
        }
      }
    }

    // NOTE: password is still visible in the user instance.
    // TODO: Consider removing the password field before returning the user object
    return user;
  }

  /**
   * Get the role of a user
   * @param userId - The ID of the user
   * @returns The role of the user
   * @throws Error if the user does not exist
   */
  async getUserRole(userId: string): Promise<string> {
    const user = await User.findOne({
      _id: userId,
    });

    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    return user.role ?? ROLES.CITIZEN;
  }

  async getUserById(userId: string) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    return user;
  }

  async getUserByUsername(username: string) {
    try {
      const user = await User.findOne({ username }).lean().exec();
      return user || null;
    } catch (error) {
      console.error("Error getting user by username:", error);
      return null;
    }
  }

  /**
   * Check if a user exists
   * @param userId - The ID of the user
   * @returns True if the user exists, false otherwise
   */
  async isExistingUser(userId: string): Promise<boolean> {
    const user = await User.findOne({
      _id: userId,
    });

    return user !== null;
  }

  /**
   * Authenticate user and generate login token
   * @param username - The username of the user trying to log in
   * @param password - The password of the user trying to log in
   * @returns An object containing the authentication token, user ID, and role
   * @throws Error if the user doesn't exist or the password is incorrect
   */
  async login(username: string, password: string) {
    const user = await User.findOne({ username })
      .select("+password") // Include password field which is usually excluded
      .exec();

    if (user) {
      const isMatch = await user.comparePassword(password);

      if (isMatch) {
        return {
          token: Token.generate(user.id),
          _id: user.id,
          role: user.role,
        };
      }
    }

    throw new Error(`User "${username}" does not exist or incorrect password`);
  }

  /**
   * List all users with their online status
   * @returns An array of user objects, each containing _id, username, role, and online status
   */
  async listUsers() {
    const users = await User.find().exec();

    const formattedUsers = users.map((user) => ({
      ...(user.toJSON() as Pick<IUser, "_id" | "username" | "role">),
      online: UserConnections.isUserConnected(user.id),
    }));

    const onlineUsers = formattedUsers
      .filter((user) => user.online)
      .sort((a, b) => a.username.localeCompare(b.username));

    const offlineUsers = formattedUsers
      .filter((user) => !user.online)
      .sort((a, b) => a.username.localeCompare(b.username));

    return onlineUsers.concat(offlineUsers);
  }

  /**
   * Get user's last known location
   * @param userId - The ID of the user
   * @returns The last known latitude and longitude of the user
   */
  async getUserLastLocation(userId: string) {
    const user = await User.findById(userId).exec();
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    return {
      latitude: user.previousLatitude,
      longitude: user.previousLongitude,
    };
  }

  /**
   * Update user's last known location
   * @param userId - The ID of the user
   * @param latitude - The new latitude to store
   * @param longitude - The new longitude to store
   * @returns The updated user object
   */
  async updateUserLastLocation(
    userId: string,
    latitude: number,
    longitude: number,
  ) {
    const user = await User.findById(userId).exec();
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    user.previousLatitude = latitude;
    user.previousLongitude = longitude;
    await user.save();
    return user;
  }

  /**
   * Find a user by their username and role
   * @param username - The username to search for
   * @param role - Optional role to filter by
   * @returns The user if found, null otherwise
   */
  // TO-DO: Write Unit Test
  async findUserByUsername(username: string) {
    const query = { username };

    const user = await User.findOne(query).exec();
    if (!user) {
      return null;
    }

    return {
      ...(user.toJSON() as Pick<IUser, "_id" | "username" | "role">),
    };
  }

  /**
   * Logout a user
   * @param username - The username of the user to log out
   * @throws Error if the user is not logged in or does not exist
   */
  async logout(username: string): Promise<void> {
    try {
      const user = await this.findUserByUsername(username); // Await the promise
      if (!user) {
        throw new Error(`User with name ${username} not found`);
      }
      console.log("User Id:", user._id);
      console.log("User Connections:", UserConnections.getConnectedUsers());
      if (!UserConnections.isUserConnected(user._id.toString())) {
        throw new Error(`User ${username} is not logged in`);
      }
      UserConnections.removeUserConnection(user._id.toString());
    } catch (error) {
      console.error("Error during logout:", error);
      throw error;
    }
  }

  /**
   * Handle incident commander logout and transfer the command of incident to other un-assigned first responder
   * @param username - The username of the incident commanders logging out
   * @throws Error if an error occurs during logout or incident transfer
   */
  async CommanderLogout(username: string) {
    try {
      // 1. Find all incident commanders
      const incidentCommanderUsernames = await Incident.find({
        commander: { $nin: ["System"] },
        incidentState: "Assigned",
      }).select("commander");

      // 2. Find one first responder who is not an incident commander
      const firstResponderNotCommander = await User.findOne({
        role: { $in: [ROLES.POLICE, ROLES.FIRE] },
        username: {
          $nin: incidentCommanderUsernames.map((ic) => ic.commander),
        },
      });

      const prevCommander = await User.findOne({
        username: username,
      });

      if (!prevCommander) {
        throw new Error(`Previous commander ${username} not found`);
      }

      console.log("Previous Commander:", prevCommander);

      if (!firstResponderNotCommander) {
        await this.logout(username);
        return;
      }

      const incidents =
        await IncidentController.getIncidentByCommander(username);

      if (incidents.length === 0) {
        await this.logout(username);
        return;
      }

      console.log("Incidents:", incidents);
      let incident = incidents.find(
        (inc) => inc.closingDate === null && inc.commander === username,
      );

      if (!incident) {
        await this.logout(username);
        return;
      }

      // Make a shallow copy to avoid mutation issues during iteration
      const originalVehicles = [...incident.assignedVehicles];
      console.log("Original Vehicles:", originalVehicles);

      // Deallocate vehicles where the commander is present
      for (const vehicle of originalVehicles) {
        if (
          vehicle.name === prevCommander.assignedCar ||
          vehicle.name === prevCommander.assignedTruck
        ) {
          // Remove vehicle from assignment
          incident.assignedVehicles = incident.assignedVehicles.filter(
            (v) => v.name !== vehicle.name,
          );

          // console.log(`Vehicle '${vehicle.name}' deallocated from incident '${incident.incidentId}'`)
          incident = await incident.save();

          // Deallocate vehicle in DB
          if (vehicle.type === "Car") {
            await CarController.updateIncident(vehicle.name, null);

            if (
              firstResponderNotCommander.assignedCar &&
              !incident.assignedVehicles.some(
                (vehicle) =>
                  vehicle.name === firstResponderNotCommander.assignedCar,
              )
            ) {
              await CarController.updateIncident(
                firstResponderNotCommander.assignedCar,
                incident.incidentId,
              );

              const newAssignCar = await CarController.getCarByName(
                firstResponderNotCommander.assignedCar,
              );
              incident.assignedVehicles.push({
                type: "Car",
                name: firstResponderNotCommander.assignedCar,
                usernames: newAssignCar?.usernames || [
                  firstResponderNotCommander.username,
                ],
              });
            }
          } else {
            await TruckController.updateIncident(vehicle.name, null);

            if (
              firstResponderNotCommander.assignedTruck &&
              !incident.assignedVehicles.some(
                (vehicle) =>
                  vehicle.name === firstResponderNotCommander.assignedTruck,
              )
            ) {
              await TruckController.updateIncident(
                firstResponderNotCommander.assignedTruck,
                incident.incidentId,
              );

              const newAssignTruck = await TruckController.getTruckByName(
                firstResponderNotCommander.assignedTruck,
              );
              incident.assignedVehicles.push({
                type: "Truck",
                name: firstResponderNotCommander.assignedTruck,
                usernames: newAssignTruck?.usernames || [
                  firstResponderNotCommander.username,
                ],
              });
            }
          }

          console.log(
            `Vehicle '${vehicle.name}' deallocated from incident '${incident.incidentId}'`,
          );
        }
      }

      // Transfer command to the new responder and save updated vehicles
      incident.commander = firstResponderNotCommander.username;
      console.log("New Commander:", incident.commander);
      incident = await incident.save();
      console.log(incident);

      console.log(
        `Incident '${incident.incidentId}' command transferred to '${incident.commander}'`,
      );
      await this.logout(username);
    } catch (error) {
      console.error("Error during commander logout:", error);
      throw error;
    }
  }

  /**
   * Handle first responder logout and un-assigns them from their Vehicle
   * @param username - The username of the incident commanders logging out
   * @param isCommander - Whether the user is the incident commander or not
   * @throws Error if an error occurs during logout or un-assigns vehicle
   */
  async FirstResponderLogout(username: string) {
    try {
      const user = await User.findOne({ username });
      if (!user) {
        throw new Error("User not found");
      }

      if (user.role === ROLES.FIRE && user.assignedTruck) {
        // Remove user from assigned truck
        await Truck.updateOne(
          { name: user.assignedTruck },
          { $pull: { usernames: username } },
        );

        // Remove user from incidents where this truck is assigned
        await Incident.updateMany(
          {
            "assignedVehicles.type": "Truck",
            "assignedVehicles.name": user.assignedTruck,
          },
          { $pull: { "assignedVehicles.$.usernames": username } },
        );

        // Clear user's assignedTruck field
        await User.updateOne({ username }, { assignedTruck: null });
      }

      if (user.role === ROLES.POLICE && user.assignedCar) {
        // Remove user from assigned car
        await Car.updateOne(
          { name: user.assignedCar },
          { $pull: { usernames: username } },
        );

        // Remove user from incidents where this car is assigned
        await Incident.updateMany(
          {
            "assignedVehicles.type": "Car",
            "assignedVehicles.name": user.assignedCar,
          },
          { $pull: { "assignedVehicles.$.usernames": username } },
        );

        // Clear user's assignedCar field
        await User.updateOne({ username }, { assignedCar: null });
      }

      // Perform standard logout
      await this.logout(username);
    } catch (error) {
      console.error("Error during first responder logout:", error);
      throw error;
    }
  }

  /**
   * Handle dispatcher logout and transfer triage incidents to another dispatcher
   * @param username - The username of the dispatcher logging out
   * @throws Error if an error occurs during logout or incident transfer
   */
  async dispatcherLogout(username: string): Promise<void> {
    try {
      // 1. Find all online dispatchers (excluding the one logging out)
      // Get all dispatchers from the database
      const allDispatchers = await User.find({ role: ROLES.DISPATCH });

      const onlineDispatchers = allDispatchers.filter((dispatcher) => {
        return (
          dispatcher.username !== username &&
          UserConnections.isUserConnected(dispatcher.id)
        );
      });

      // 2. If there are other online dispatchers, transfer triage incidents
      if (onlineDispatchers.length > 0) {
        // Find all triage incidents commanded by the dispatcher
        const triageIncidents = await Incident.find({
          commander: username,
          incidentState: "Triage",
        });

        if (triageIncidents.length > 0) {
          // Find the least busy dispatcher
          const leastBusyDispatcher =
            await this.findLeastBusyDispatcher(onlineDispatchers);

          // Transfer command of each triage incident
          for (const incident of triageIncidents) {
            incident.commander = leastBusyDispatcher.username;
            incident.owner = leastBusyDispatcher.username;
            await incident.save();

            // replace channel user from the old dispatcher to the new one
            const currentChannel = await Channel.findOne({
              _id: incident.incidentCallGroup,
            });

            if (currentChannel) {
              currentChannel.users = currentChannel.users.filter(
                (user) => user.toString() !== username,
              );
              currentChannel.users.push(leastBusyDispatcher._id);
              await currentChannel.save();
            }
          }
        }
      }

      // 3. Perform standard logout
      await this.logout(username);
    } catch (error) {
      console.error("Error during dispatcher logout:", error);
      throw error;
    }
  }

  /**
   * Find the least busy dispatcher based on the number of triage incidents
   * @param dispatchers - An array of dispatchers to evaluate
   * @returns The least busy dispatcher
   */
  async findLeastBusyDispatcher(dispatchers: IUser[]): Promise<IUser> {
    const dispatcherLoads = await Promise.all(
      dispatchers.map(async (dispatcher) => {
        const triageCount = await Incident.countDocuments({
          commander: dispatcher.username,
          incidentState: "Triage",
        });

        return {
          dispatcher,
          triageCount,
        };
      }),
    );

    // Sort by triage count (ascending)
    dispatcherLoads.sort((a, b) => a.triageCount - b.triageCount);

    // Return the least busy dispatcher
    return dispatcherLoads[0].dispatcher;
  }

  /**
   * Create a temporary user account for a patient.
   * This method automatically generates a temporary username (e.g., "temp1", "temp2", etc.)
   * and a fixed password "1234", then creates a new user with an empty profile.
   * @returns An object containing a message, the newly created user object, and userId.
   * @throws Error if the account creation fails.
   */
  async createTempUserForPatient() {
    const retries = 3;
    let attempt = 0;

    while (attempt < retries) {
      try {
        const newTempUsername = `temp${Date.now()}`;

        const newUser = new User({
          username: newTempUsername,
          password: "1234",
          role: ROLES.CITIZEN,
          assignedCity: null,
          assignedCar: null,
          assignedTruck: null,
          assignedVehicleTimestamp: null,
        });

        await newUser.save();

        const Patient = (await import("../models/Patient")).default;
        const newPatient = await Patient.create({
          patientId: newUser._id.toString(),
          username: newTempUsername,
          name: "",
          sex: "",
          dob: "",
        });

        return {
          message: "A new user account has been created for the Patient.",
          userId: newUser._id,
          username: newTempUsername,
          patientId: newPatient._id,
        };

        // TODO: Fix this pattern for using any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        if (
          error.code === 11000 &&
          error.keyPattern?.username &&
          error.keyValue?.username?.startsWith("temp")
        ) {
          // duplicate key, retry
          attempt += 1;
          console.warn("Duplicate temp username, retrying...", attempt);
          continue;
        }
        console.error("Error creating temporary patient user:", error);
        throw new Error("Failed to create temporary patient user.");
      }
    }

    throw new Error("Failed to create temporary patient user after retries.");
  }

  /**
   * Register a nurse to a hospital
   * @param userId - The ID of the nurse
   * @param hospitalId - The ID of the hospital
   * @returns An object containing a success message and the updated user object
   * @throws Error if the user is not found, is not a nurse, or the update fails
   */
  async registerToHospital(userId: string, hospitalId: string) {
    // Find the user by ID
    const user = await User.findById(userId);

    // Check if the user exists
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    // Ensure the user is a nurse
    if (user.role !== ROLES.NURSE) {
      throw new Error("Only nurses can be registered to hospitals");
    }

    // Assign the hospital ID to the user
    user.hospitalId = hospitalId;

    // Save the updated user
    await user.save();

    // Return a success message and the updated user object
    return {
      message: `Nurse ${user.username} has been registered to hospital ${hospitalId}`,
      user,
    };
  }

  /**
   * Find user ID by username
   * @param username - The username of the user
   * @returns The user ID if found, or an error message
   */
  async findUserIdByUsername(username: string) {
    const user = await User.findOne({ username }).select("_id").exec();
    if (!user) {
      return null;
    }
    return { userId: user._id };
  }
}

export default new UserController();
