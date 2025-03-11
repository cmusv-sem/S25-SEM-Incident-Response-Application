// UserRouter handles operations related to users, such as registration and listing.
// It interacts with the User model and manages user authentication.

import { Router } from 'express'

import UserController from '../controllers/UserController'
import ROLES from '../utils/Roles'

export default Router()
  /**
   * Register a new user
   * @route POST /api/users
   * @param {Object} request.body
   * @param {string} request.body.username - The username for the new user
   * @param {string} request.body.password - The password for the new user
   * @param {string} request.body.phoneNumber - The phone number for the new user
   * @param {ROLES} [request.body.role=ROLES.CITIZEN] - The role for the new user
   * @returns {Object} The created user object (without password and __v)
   * @throws {400} If the username already exists or other validation errors occur
   */
  .post('/', async (request, response) => {
    const { username, password, role = ROLES.CITIZEN } = request.body

    try {
      const user = (
        await UserController.register(username, password, role)
      ).toObject()

      // Remove sensitive information before sending the response
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      delete user.password

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      delete user.__v

      response.send(user)
    } catch (e) {
      const error = e as Error
      response.status(400).send({ message: error.message })
    }
  })
  /**
   * List all users with their online status
   * @route GET /api/users
   * @returns {Array} An array of user objects, each containing _id, username, role, and online status
   */
  .get('/', async (_, response) => {
    const users = await UserController.listUsers()
    response.send(users)
  })

  /**
   * Get user's last known location
   * @route GET /api/users/:id/location
   * @param {string} request.params.id - The ID of the user
   * @returns {Object} An object containing latitude and longitude
   * @throws {400} If the user is not found
   */
  .get('/:id/location', async (request, response) => {
    const { id } = request.params
    try {
      const location = await UserController.getUserLastLocation(id)
      response.send(location)
    } catch (e) {
      const error = e as Error
      response.status(400).send({ message: error.message })
    }
  })

  /**
   * Update user's last known location
   * @route PATCH /api/users/:id/location
   * @param {string} request.params.id - The ID of the user
   * @param {number} request.body.latitude - The new latitude
   * @param {number} request.body.longitude - The new longitude
   * @returns {Object} The updated user object
   * @throws {400} If the user is not found or update fails
   */
  .patch('/:id/location', async (request, response) => {
    const { id } = request.params
    const { latitude, longitude } = request.body

    try {
      const updatedUser = await UserController.updateUserLastLocation(
        id,
        latitude,
        longitude,
      )
      response.send(updatedUser)
    } catch (e) {
      const error = e as Error
      response.status(400).send({ message: error.message })
    }
  })
