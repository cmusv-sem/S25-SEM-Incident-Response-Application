/**
 * Database Utility
 *
 * This utility provides functions for connecting to and closing the MongoDB database.
 * It also imports models to ensure their schemas are registered with Mongoose.
 */

import mongoose from 'mongoose'

// Import models to ensure their schemas are registered
import '../models/Channel'
import '../models/Message'
import User from '../models/User'

import dotenv from 'dotenv'
import Channel from '../models/Channel'
import Env from './Env'

dotenv.config({ path: '.env' })

/**
 * Connect to the MongoDB database
 * @param url - The MongoDB connection URL (default: constructed from environment variables)
 * @param useTls - Whether to use TLS (default: constructed from environment variables)
 */
export const connect = async (
  url: string | undefined = undefined,
  useTls: boolean | undefined = undefined,
) => {
  // If MongoDB URL is not provided, use the environment variables
  if (url === undefined) {
    let baseUrl = Env.getParam(
      'MONGODB_URL',
      'mongodb://localhost:27017',
      false,
    )
    let dbName = Env.getParam('MONGODB_DB_NAME', 'sem', false)

    // Edge case for those who added an extra forward slash at either ends
    if (baseUrl?.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1)
    }
    if (dbName?.startsWith('/')) {
      dbName = dbName.slice(1)
    }

    url = `${baseUrl}/${dbName}`
  }

  // If TLS is not provided, use the environment variables
  if (useTls === undefined) {
    useTls = process.env.MONGODB_TLS === '1'
  }

  await mongoose.connect(
    url,
    useTls
      ? {
          tls: true,
        }
      : undefined,
  )
  await User.ensureSystemUser()
  await Channel.ensureSystemDefinedGroup()
}

/**
 * Close the MongoDB connection
 */
export const close = async () => {
  mongoose.connection.close()
}
