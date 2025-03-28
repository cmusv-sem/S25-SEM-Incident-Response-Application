import { mock } from 'jest-mock-extended'
import SocketIO from 'socket.io'

import UserController from '../../src/controllers/UserController'
import Channel from '../../src/models/Channel'
import Incident from '../../src/models/Incident'
import User, { IUser } from '../../src/models/User'
import ROLES from '../../src/utils/Roles'
import * as Token from '../../src/utils/Token'
import UserConnections from '../../src/utils/UserConnections'
import * as TestDatabase from '../utils/TestDatabase'

describe('User controller', () => {
    // "System" user is created in the database upon app run so by default there always is one user present in the database.
      beforeAll(async () => {
        await TestDatabase.connect()
      })

    const username = 'test-username-1'
    const password = 'super-secret-password'
    const role = ROLES.DISPATCH
    let newUser: IUser

    it('will register a new user', async () => {
        newUser = await UserController.register(username, password, role)
        const users = await UserController.listUsers()

        expect(users.length).toBe(2)
        expect(users[1]._id).toStrictEqual(newUser._id)
    })

    it('will not register two users with the same username', async () => {
        // @see https://jestjs.io/docs/en/asynchronous#promises
        expect.assertions(1)

        try {
            await UserController.register(username, password)
        } catch (e) {
            const error = e as Error
            expect(error.message).toBe(`User "${username}" already exists`)
        }
    })

    it('will subscribe the new user to the public channel', async () => {
        const publicChannel = await Channel.getPublicChannel()
        const channelMembers = publicChannel.users as IUser[]

        expect(channelMembers.length).toBe(2)
        expect(channelMembers[1].id).toStrictEqual(newUser.id)
    })

    it('will allow an existing user to login', async () => {
        const credential = await UserController.login(username, password)

        expect(credential.token).toBeDefined()
        expect(Token.validate(newUser.id, credential.token)).toBeTruthy
        expect(credential._id).toBe(newUser.id)
        expect(credential.role).toBe(role)
    })

    it('will not allow an existing user to login if the password is incorrect', async () => {
        expect.assertions(1)

        try {
            await UserController.login(username, 'random-password')
        } catch (e) {
            const error = e as Error
            expect(error.message).toBe(
                `User "${username}" does not exist or incorrect password`,
            )
        }
    })

    it('will not allow a non-existing user to login', async () => {
        expect.assertions(1)

        try {
            await UserController.login('non-existing-user', 'random-password')
        } catch (e) {
            const error = e as Error
            expect(error.message).toBe(
                'User "non-existing-user" does not exist or incorrect password',
            )
        }
    })

    it('will list users with their online/offline status', async () => {
        // connect the previous user
        const socket = mock<SocketIO.Socket>()
        UserConnections.addUserConnection(newUser.id, socket, ROLES.CITIZEN)

        // add another user
        const citizenName = 'new-citizen'
        const citizenPassword = 'citizen-password'
        const newCitizen = await UserController.register(
            citizenName,
            citizenPassword,
        )
        let users = await UserController.listUsers()

        expect(users.length).toBe(3)
        expect(users).toContainEqual(
            expect.objectContaining({
                _id: newUser._id,
                role: newUser.role,
                username: newUser.username,
                online: true,
            }),
        )
        expect(users).toContainEqual(
            expect.objectContaining({
                _id: newCitizen._id,
                role: newCitizen.role,
                username: newCitizen.username,
                online: false,
            }),
        )

        // double check
        UserConnections.removeUserConnection(newUser.id)

        users = await UserController.listUsers()

        expect(users.length).toBe(3)
        expect(users).toContainEqual(
            expect.objectContaining({
                _id: newUser._id,
                role: newUser.role,
                username: newUser.username,
                online: false,
            }),
        )
        expect(users).toContainEqual(
            expect.objectContaining({
                _id: newCitizen._id,
                role: newCitizen.role,
                username: newCitizen.username,
                online: false,
            }),
        )
    })

    it('sorts users: online first, then alphabetical order', async () => {
        await UserController.register('Zack', 'pass1', ROLES.CITIZEN)
        await UserController.register('Alice', 'pass2', ROLES.POLICE)
        const userC = await UserController.register('Bob', 'pass3', ROLES.FIRE)
        const userD = await UserController.register(
            'Charlie',
            'pass4',
            ROLES.DISPATCH,
        )

        const socket = mock<SocketIO.Socket>()
        UserConnections.addUserConnection(userC.id, socket, ROLES.FIRE)
        UserConnections.addUserConnection(userD.id, socket, ROLES.DISPATCH)

        const users = await UserController.listUsers()

        const expectedSortedUsernames = [
            'Bob',
            'Charlie',
            'Alice',
            'new-citizen',
            'System',
            'test-username-1',
            'Zack',
        ]

        expect(users.map((u) => u.username)).toEqual(expectedSortedUsernames)

        UserConnections.removeUserConnection(userC.id)
        UserConnections.removeUserConnection(userD.id)
    })

    // Test for the regular logout method
    describe('logout', () => {
        let regularUser: IUser
        beforeEach(async () => {
            // Create a regular user for testing
            regularUser = await UserController.register(
                'test-regular',
                'password',
                ROLES.CITIZEN,
            )
            // Simulate user connection
            const socket = mock<SocketIO.Socket>()
            UserConnections.addUserConnection(
                regularUser._id.toString(),
                socket,
                ROLES.CITIZEN,
            )
        })
        afterEach(async () => {
            // Clean up the user connection after each test
            UserConnections.removeUserConnection(regularUser._id.toString())
            await User.deleteMany({})
        })
        it('should log out a connected user', async () => {
            // Verify user is connected
            expect(
                UserConnections.isUserConnected(regularUser._id.toString()),
            ).toBe(true)

            // Perform logout
            await UserController.logout(regularUser.username)

            // Verify user is no longer connected
            expect(
                UserConnections.isUserConnected(regularUser._id.toString()),
            ).toBe(false)
        })

        it('should throw an error when user is not found', async () => {
            expect.assertions(1)

            try {
                await UserController.logout('non-existent-user')
            } catch (e) {
                const error = e as Error
                expect(error.message).toContain('not found')
            }
        })

        it('should throw an error when user is not logged in', async () => {
            expect.assertions(1)

            // Remove connection first
            UserConnections.removeUserConnection(regularUser._id.toString())

            try {
                await UserController.logout(regularUser.username)
            } catch (e) {
                const error = e as Error
                expect(error.message).toContain('not logged in')
            }
        })
    })

    // Test for the dispatcherLogout method
    describe('dispatcherLogout', () => {
        let regularUser: IUser
        let dispatcher1: IUser
        let dispatcher2: IUser
        let dispatcher3: IUser

        beforeEach(async () => {
            await Incident.deleteMany({})
            dispatcher1 = await UserController.register(
                'test-dispatcher1',
                'password1',
                ROLES.DISPATCH,
            )
            dispatcher2 = await UserController.register(
                'test-dispatcher2',
                'password2',
                ROLES.DISPATCH,
            )
            dispatcher3 = await UserController.register(
                'test-dispatcher3',
                'password3',
                ROLES.DISPATCH,
            )
            // Create a regular user for testing
            regularUser = await UserController.register(
                'test-regular',
                'password',
                ROLES.CITIZEN,
            )
            // Simulate user connection
            const socket = mock<SocketIO.Socket>()
            UserConnections.addUserConnection(
                regularUser._id.toString(),
                socket,
                ROLES.CITIZEN,
            )
            UserConnections.addUserConnection(
                dispatcher1._id.toString(),
                socket,
                ROLES.DISPATCH,
            )
            UserConnections.addUserConnection(
                dispatcher2._id.toString(),
                socket,
                ROLES.DISPATCH,
            )
            UserConnections.addUserConnection(
                dispatcher3._id.toString(),
                socket,
                ROLES.DISPATCH,
            )

            // Create test incidents
            await Incident.create({
                incidentId: 'I-Test1',
                caller: 'Caller1',
                incidentState: 'Triage',
                owner: dispatcher1.username,
                commander: dispatcher1.username,
                address: '123 Test St',
            })

            await Incident.create({
                incidentId: 'I-Test2',
                caller: 'Caller2',
                incidentState: 'Triage',
                owner: dispatcher1.username,
                commander: dispatcher1.username,
                address: '456 Test Ave',
            })

            await Incident.create({
                incidentId: 'I-Test3',
                caller: 'Caller3',
                incidentState: 'Waiting',
                owner: dispatcher1.username,
                commander: dispatcher1.username,
                address: '789 Test Blvd',
            })

            // Make dispatcher2 busier (2 triage incidents)
            await Incident.create({
                incidentId: 'I-Test4',
                caller: 'Caller4',
                incidentState: 'Triage',
                owner: dispatcher2.username,
                commander: dispatcher2.username,
                address: '111 Busy St',
            })

            await Incident.create({
                incidentId: 'I-Test5',
                caller: 'Caller5',
                incidentState: 'Triage',
                owner: dispatcher2.username,
                commander: dispatcher2.username,
                address: '222 Busy Ave',
            })
        })
        afterEach(async () => {
            // Clean up the user connection after each test
            UserConnections.removeUserConnection(regularUser._id.toString())
            await User.deleteMany({})
        })
        it('should transfer triage incidents to the less busy dispatcher', async () => {
            // Initial state verification
            const initialIncidents = await Incident.find({
                commander: dispatcher1.username,
                incidentState: 'Triage',
            })
            expect(initialIncidents.length).toBe(2)

            // Perform dispatcher logout
            await UserController.dispatcherLogout(dispatcher1.username)

            // Verify no more triage incidents for dispatcher1
            const remainingIncidents = await Incident.find({
                commander: dispatcher1.username,
                incidentState: 'Triage',
            })
            expect(remainingIncidents.length).toBe(0)

            // Verify incidents were transferred to dispatcher3 (least busy)
            const transferredIncidents = await Incident.find({
                commander: dispatcher3.username,
                incidentState: 'Triage',
            })
            expect(transferredIncidents.length).toBe(2)

            // Verify non-triage incidents were not transferred
            const waitingIncidents = await Incident.find({
                commander: dispatcher1.username,
                incidentState: 'Waiting',
            })
            expect(waitingIncidents.length).toBe(1)

            // Verify user is no longer connected
            expect(
                UserConnections.isUserConnected(dispatcher1._id.toString()),
            ).toBe(false)
        })

        it('should not transfer incidents when no other dispatchers are online', async () => {
            // Disconnect other dispatchers
            UserConnections.removeUserConnection(dispatcher2._id.toString())
            UserConnections.removeUserConnection(dispatcher3._id.toString())

            // Initial state verification
            const initialIncidents = await Incident.find({
                commander: dispatcher1.username,
                incidentState: 'Triage',
            })
            expect(initialIncidents.length).toBe(2)

            // Perform dispatcher logout
            await UserController.dispatcherLogout(dispatcher1.username)

            // Verify incidents are still assigned to dispatcher1
            const remainingIncidents = await Incident.find({
                commander: dispatcher1.username,
                incidentState: 'Triage',
            })
            expect(remainingIncidents.length).toBe(2)

            // Verify user is no longer connected
            expect(
                UserConnections.isUserConnected(dispatcher1._id.toString()),
            ).toBe(false)
        })

        // Test for the findLeastBusyDispatcher method
        describe('findLeastBusyDispatcher', () => {
            it('should identify the dispatcher with the fewest triage incidents', async () => {
                // Get all dispatchers
                const dispatchers = [dispatcher1, dispatcher2, dispatcher3]

                // Find least busy dispatcher
                const leastBusy =
                    await UserController.findLeastBusyDispatcher(dispatchers)

                // Verify it's dispatcher3 (who has 0 triage incidents)
                expect(leastBusy._id.toString()).toBe(
                    dispatcher3._id.toString(),
                )
            })

            it('should handle tie situations by returning the first dispatcher with the minimum count', async () => {
                // Create another dispatcher with same load as dispatcher3 (0 incidents)
                let dispatcher4: IUser
                dispatcher4 = await UserController.register(
                    'test-dispatcher4',
                    'password4',
                    ROLES.DISPATCH,
                )

                const socket4 = mock<SocketIO.Socket>()
                UserConnections.addUserConnection(
                    dispatcher4._id.toString(),
                    socket4,
                    ROLES.DISPATCH,
                )

                // Get all dispatchers
                const dispatchers = [
                    dispatcher1,
                    dispatcher2,
                    dispatcher3,
                    dispatcher4,
                ]

                // Find least busy dispatcher
                const leastBusy =
                    await UserController.findLeastBusyDispatcher(dispatchers)

                // Verify it's either dispatcher3 or dispatcher4 (both have 0 triage incidents)
                expect([
                    dispatcher3._id.toString(),
                    dispatcher4._id.toString(),
                ]).toContain(leastBusy._id.toString())

                // Clean up
                UserConnections.removeUserConnection(dispatcher4._id.toString())
            })

            it('should handle an empty array of dispatchers', async () => {
                // This test depends on your implementation - if it should throw an error or return null
                expect.assertions(1)

                try {
                    await UserController.findLeastBusyDispatcher([])
                    // If your implementation returns null/undefined instead of throwing
                    // You should adjust this test accordingly
                    fail(
                        'Expected findLeastBusyDispatcher to throw for empty array',
                    )
                } catch (e) {
                    const error = e as Error
                    expect(error).toBeDefined()
                }
            })
        })
    })

  afterAll(async () => {
    await TestDatabase.close()
  })
})
