// UserController handles user-related operations such as registration, login, and listing users.
// It interacts with the User model and manages user authentication.

import Channel from '../models/Channel'
import Incident from '../models/Incident'
import User, { IUser } from '../models/User'
import ROLES from '../utils/Roles'
import SystemGroupConfigs from '../utils/SystemDefinedGroups'
import * as Token from '../utils/Token'
import UserConnections from '../utils/UserConnections'

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
        let user = await User.findOne({ username }).exec()

        if (user) {
            throw new Error(`User "${username}" already exists`)
        } else {
            // Create and save new user
            user = await new User({
                username,
                password,
                role,
            }).save()

            // Subscribe the new user to the appropriate system defined groups
            for (const config of SystemGroupConfigs) {
                if (config.participantRole.includes(role)) {
                    const channel = await Channel.findOne({
                        name: config.name,
                    }).exec()

                    if (channel) {
                        channel.users.push(user._id)
                        await channel.save()
                        console.log(
                            `User ${username} added to system group: ${config.name}`,
                        )
                    } else {
                        console.log(
                            `System group ${config.name} not found for user ${username}`,
                        )
                    }
                }
            }
        }

        // NOTE: password is still visible in the user instance.
        // TODO: Consider removing the password field before returning the user object
        return user
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
        })

        if (!user) {
            throw new Error(`User with ID ${userId} not found`)
        }

        return user.role ?? ROLES.CITIZEN
    }

    async getUserById(userId: string) {
        const user = await User.findById(userId)
        if (!user) {
            throw new Error(`User with ID ${userId} not found`)
        }
        return user
    }

    /**
     * Check if a user exists
     * @param userId - The ID of the user
     * @returns True if the user exists, false otherwise
     */
    async isExistingUser(userId: string): Promise<boolean> {
        const user = await User.findOne({
            _id: userId,
        })

        return user !== null
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
            .select('+password') // Include password field which is usually excluded
            .exec()

        if (user) {
            const isMatch = await user.comparePassword(password)

            if (isMatch) {
                return {
                    token: Token.generate(user.id),
                    _id: user.id,
                    role: user.role,
                }
            }
        }

        throw new Error(
            `User "${username}" does not exist or incorrect password`,
        )
    }

    /**
     * List all users with their online status
     * @returns An array of user objects, each containing _id, username, role, and online status
     */
    async listUsers() {
        const users = await User.find().exec()

        const formattedUsers = users.map((user) => ({
            ...(user.toJSON() as Pick<IUser, '_id' | 'username' | 'role'>),
            online: UserConnections.isUserConnected(user.id),
        }))

        const onlineUsers = formattedUsers
            .filter((user) => user.online)
            .sort((a, b) => a.username.localeCompare(b.username))

        const offlineUsers = formattedUsers
            .filter((user) => !user.online)
            .sort((a, b) => a.username.localeCompare(b.username))

        return onlineUsers.concat(offlineUsers)
    }

    /**
     * Get user's last known location
     * @param userId - The ID of the user
     * @returns The last known latitude and longitude of the user
     */
    async getUserLastLocation(userId: string) {
        const user = await User.findById(userId).exec()
        if (!user) {
            throw new Error(`User with ID ${userId} not found`)
        }
        return {
            latitude: user.previousLatitude,
            longitude: user.previousLongitude,
        }
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
        const user = await User.findById(userId).exec()
        if (!user) {
            throw new Error(`User with ID ${userId} not found`)
        }
        user.previousLatitude = latitude
        user.previousLongitude = longitude
        await user.save()
        return user
    }

    /**
     * Find a user by their username and role
     * @param username - The username to search for
     * @param role - Optional role to filter by
     * @returns The user if found, null otherwise
     */
    // TO-DO: Write Unit Test
    async findUserByUsername(username: string) {
        const query = { username }

        const user = await User.findOne(query).exec()
        if (!user) {
            return null
        }

        return {
            ...(user.toJSON() as Pick<IUser, '_id' | 'username' | 'role'>),
        }
    }

    async logout(username: string): Promise<void> {
        try {
            const user = await this.findUserByUsername(username) // Await the promise
            if (!user) {
                throw new Error(`User with name ${username} not found`)
            }
            console.log('User Id:', user._id)
            console.log(
                'User Connections:',
                UserConnections.getConnectedUsers(),
            )
            if (!UserConnections.isUserConnected(user._id.toString())) {
                throw new Error(`User ${username} is not logged in`)
            }
            UserConnections.removeUserConnection(user._id.toString())
        } catch (error) {
            console.error('Error during logout:', error)
            throw error
        }
    }

    async dispatcherLogout(username: string): Promise<void> {
        try {
            // 1. Find all online dispatchers (excluding the one logging out)
            // Get all dispatchers from the database
            const allDispatchers = await User.find({ role: ROLES.DISPATCH })

            const onlineDispatchers = allDispatchers.filter((dispatcher) => {
                return (
                    dispatcher.username !== username &&
                    UserConnections.isUserConnected(dispatcher.id)
                )
            })

            // 2. If there are other online dispatchers, transfer triage incidents
            if (onlineDispatchers.length > 0) {
                // Find all triage incidents commanded by the dispatcher
                const triageIncidents = await Incident.find({
                    commander: username,
                    incidentState: 'Triage',
                })

                if (triageIncidents.length > 0) {
                    // Find the least busy dispatcher
                    const leastBusyDispatcher =
                        await this.findLeastBusyDispatcher(onlineDispatchers)

                    // Transfer command of each triage incident
                    for (const incident of triageIncidents) {
                        incident.commander = leastBusyDispatcher.username
                        await incident.save()
                    }
                }
            }

            // 3. Perform standard logout
            await this.logout(username)
        } catch (error) {
            console.error('Error during dispatcher logout:', error)
            throw error
        }
    }

    async findLeastBusyDispatcher(dispatchers: IUser[]): Promise<IUser> {
        const dispatcherLoads = await Promise.all(
            dispatchers.map(async (dispatcher) => {
                const triageCount = await Incident.countDocuments({
                    commander: dispatcher.username,
                    incidentState: 'Triage',
                })

                return {
                    dispatcher,
                    triageCount,
                }
            }),
        )

        // Sort by triage count (ascending)
        dispatcherLoads.sort((a, b) => a.triageCount - b.triageCount)

        // Return the least busy dispatcher
        return dispatcherLoads[0].dispatcher
    }
}

export default new UserController()
