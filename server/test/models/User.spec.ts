import bcrypt from 'bcryptjs'
import User from '../../src/models/User'
import * as TestDatabase from '../utils/TestDatabase'

describe('User model', () => {
    // "System" user is created in the database upon app run so by default there always is one user present in the database.
    beforeAll(TestDatabase.connect)
    beforeEach(() => jest.clearAllMocks())
    afterEach(() => jest.restoreAllMocks())

    const createTestUser = async (
        username: string,
        password: string,
        phoneNumber,
    ) => {
        const rawUser = await new User({
            username,
            password,
            phoneNumber,
        })

        return rawUser.save()
    }

    it("will encrypt user's password", async () => {
        const rawUser = await createTestUser('User-1', 'password', '1234567890')

        expect(rawUser.password).toBeDefined()
        expect(rawUser.password).not.toEqual('password')
    })

    it('will hide passwords and versions in queries', async () => {
        const users = await User.find().exec()

        expect(users.length).toBe(2)

        const user = users[0]

        expect(user.password).not.toBeDefined()
        expect(user.__v).not.toBeDefined()
    })

    it('compares clear-text password with encrypted password', async () => {
        const rawUser = await createTestUser('User-2', 'password', '0987654321')

        expect(await rawUser.comparePassword('some random string')).toBeFalsy()
        expect(await rawUser.comparePassword('password')).toBeTruthy()
    })

    it('handles invalid hashes in comparePassword method', async () => {
        const rawUser = await createTestUser('User-3', 'password', '1357924680')

        // Replace the password with an invalid hash
        rawUser.password = 'invalid_hash'
        await rawUser.save()

        const result = await rawUser.comparePassword('password')
        expect(result).toBeFalsy()
    })

    it('handles errors in comparePassword method', async () => {
        const rawUser = await createTestUser('User-4', 'password', '1234567890')

        // Mock bcrypt.compare to simulate an error
        jest.spyOn(bcrypt, 'compare').mockImplementationOnce(
            (_, __, callback) => {
                callback(new Error('Mocked bcrypt error'), false)
            },
        )

        await expect(rawUser.comparePassword('password')).rejects.toThrow(
            'Mocked bcrypt error',
        )
    })

    afterAll(TestDatabase.close)
})
