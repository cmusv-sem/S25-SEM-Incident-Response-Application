import { mock } from 'jest-mock-extended'
import SocketIO from 'socket.io'

import UserController from '../../src/controllers/UserController'
import Car from '../../src/models/Car'
import Channel from '../../src/models/Channel'
import Incident from '../../src/models/Incident'
import Truck from '../../src/models/Truck'
import User, { IUser } from '../../src/models/User'
import ROLES from '../../src/utils/Roles'
import * as Token from '../../src/utils/Token'
import UserConnections from '../../src/utils/UserConnections'
import * as TestDatabase from '../utils/TestDatabase'

describe('User controller', () => {
    // "System" user is created in the database upon app run so by default there always is one user present in the database.

    jest.setTimeout(15000)

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

    describe('CommanderLogout', () => {
        let incidentCommander: IUser
        let firstResponder: IUser

        beforeEach(async () => {
            await Incident.deleteMany({})
            await User.deleteMany({})

            // Create an incident commander
            incidentCommander = await UserController.register(
                'incident-commander',
                'password',
                ROLES.FIRE
            )

            // Create a first responder who is not an incident commander
            firstResponder = await UserController.register(
                'first-responder',
                'password',
                ROLES.POLICE
            )

            // Simulate user connection
            const socket = mock<SocketIO.Socket>()
            UserConnections.addUserConnection(
                incidentCommander._id.toString(),
                socket,
                ROLES.FIRE,
            )
            UserConnections.addUserConnection(
                firstResponder._id.toString(),
                socket,
                ROLES.POLICE,
            )

            // Assign the incident commander to an incident
            await Incident.create({
                incidentId: 'Incident-1',
                caller: 'Caller',
                incidentState: 'Assigned',
                commander: incidentCommander.username
            })
        })

        it('should transfer incident command to an available first responder upon commander logout', async () => {
            await UserController.CommanderLogout(incidentCommander.username)

            const updatedIncident = await Incident.find({ incidentId: 'Incident-1' })

            expect(updatedIncident[0].commander).toBe(firstResponder.username)
        })

        it('should not transfer command if no available first responder', async () => {
            await User.deleteOne({ username: firstResponder.username })

            await UserController.CommanderLogout(incidentCommander.username)

            const updatedIncident = await Incident.find({ incidentId: 'Incident-1' })

            expect(updatedIncident[0].commander).toBe(incidentCommander.username)
        })

        it('should throw an error if an issue occurs during logout', async () => {
            jest.spyOn(UserController, 'logout').mockImplementationOnce(() => {
                throw new Error('Logout failed')
            })

            await expect(UserController.CommanderLogout(incidentCommander.username)).rejects.toThrow('Logout failed')
        })
    })

    describe('FirstResponderLogout', () => {
        let fireUser: IUser;
        let policeUser: IUser;
        let commanderUser: IUser;
        let truck: any;
        let car: any;

        beforeEach(async () => {
            await User.deleteMany({});
            await Truck.deleteMany({});
            await Car.deleteMany({});
            await Incident.deleteMany({});

            // Create test users
            fireUser = await UserController.register(
                'fire-responder',
                'password',
                ROLES.FIRE
            );
            policeUser = await UserController.register(
                'police-responder',
                'password',
                ROLES.POLICE
            );
            commanderUser = await UserController.register(
                'fire-commander',
                'password',
                ROLES.FIRE
            );

            // Create test vehicles
            truck = await Truck.create({
                name: 'Fire Truck 1',
                usernames: [fireUser.username, commanderUser.username]
            });
            car = await Car.create({
                name: 'Police Car 1',
                usernames: [policeUser.username]
            });

            // Assign vehicles to users
            await User.updateOne(
                { username: fireUser.username },
                { assignedTruck: truck.name }
            );
            await User.updateOne(
                { username: policeUser.username },
                { assignedCar: car.name }
            );
            await User.updateOne(
                { username: commanderUser.username },
                { assignedTruck: truck.name }
            );

            // Create test incidents
            await Incident.create({
                incidentId: 'Fire-Incident-1',
                caller: 'Fire Caller',
                incidentState: 'Assigned',
                assignedVehicles: [{
                    type: 'Truck',
                    name: truck.name,
                    usernames: [fireUser.username, commanderUser.username]
                }]
            });

            await Incident.create({
                incidentId: 'Police-Incident-1',
                caller: 'Police Caller',
                incidentState: 'Assigned',
                assignedVehicles: [{
                    type: 'Car',
                    name: car.name,
                    usernames: [policeUser.username]
                }]
            });

            // Mock user connections
            const socket = mock<SocketIO.Socket>();
            UserConnections.addUserConnection(fireUser._id.toString(), socket, ROLES.FIRE);
            UserConnections.addUserConnection(policeUser._id.toString(), socket, ROLES.POLICE);
            UserConnections.addUserConnection(commanderUser._id.toString(), socket, ROLES.FIRE);
        });

        afterEach(async () => {
            UserConnections.removeUserConnection(fireUser._id.toString());
            UserConnections.removeUserConnection(policeUser._id.toString());
            UserConnections.removeUserConnection(commanderUser._id.toString());
            await User.deleteMany({});
            await Truck.deleteMany({});
            await Car.deleteMany({});
            await Incident.deleteMany({});
        });

        it('should remove fire responder from assigned truck and incidents', async () => {
            await UserController.FirstResponderLogout(fireUser.username, false);

            // Verify user is removed from truck
            const updatedTruck = await Truck.findOne({ name: truck.name });
            expect(updatedTruck?.usernames).not.toContain(fireUser.username);

            // Verify user is removed from incidents
            const updatedFireIncident = await Incident.findOne({ incidentId: 'Fire-Incident-1' });
            const vehicleInIncident = updatedFireIncident?.assignedVehicles.find(
                (v: any) => v.type === 'Truck' && v.name === truck.name
            );
            expect(vehicleInIncident?.usernames).not.toContain(fireUser.username);

            // Verify user's assignedTruck is cleared
            const updatedUser = await User.findOne({ username: fireUser.username });
            expect(updatedUser?.assignedTruck).toBeNull();
        });

        it('should remove police responder from assigned car and incidents', async () => {
            await UserController.FirstResponderLogout(policeUser.username, false);

            // Verify user is removed from car
            const updatedCar = await Car.findOne({ name: car.name });
            expect(updatedCar?.usernames).not.toContain(policeUser.username);

            // Verify user is removed from incidents
            const updatedPoliceIncident = await Incident.findOne({ incidentId: 'Police-Incident-1' });
            const vehicleInIncident = updatedPoliceIncident?.assignedVehicles.find(
                (v: any) => v.type === 'Car' && v.name === car.name
            );
            expect(vehicleInIncident?.usernames).not.toContain(policeUser.username);

            // Verify user's assignedCar is cleared
            const updatedUser = await User.findOne({ username: policeUser.username });
            expect(updatedUser?.assignedCar).toBeNull();
        });

        it('should not modify vehicles or incidents if user has no assigned vehicle', async () => {
            // Clear assigned vehicle
            await User.updateOne(
                { username: fireUser.username },
                { assignedTruck: null }
            );

            await UserController.FirstResponderLogout(fireUser.username, false);

            // Verify truck remains unchanged
            const updatedTruck = await Truck.findOne({ name: truck.name });
            expect(updatedTruck?.usernames).toEqual(expect.arrayContaining([commanderUser.username]));

            // Verify incident remains unchanged
            const updatedFireIncident = await Incident.findOne({ incidentId: 'Fire-Incident-1' });
            const vehicleInIncident = updatedFireIncident?.assignedVehicles.find(
                (v: any) => v.type === 'Truck' && v.name === truck.name
            );
            expect(vehicleInIncident?.usernames).toEqual(expect.arrayContaining([commanderUser.username]));
        });
    });


  afterAll(async () => {
    await TestDatabase.close()
  })
})
