import { MongoMemoryServer } from 'mongodb-memory-server-core'
import mongoose from 'mongoose'

import * as Database from '../../src/utils/Database'

let mongo: MongoMemoryServer

export const connect = async () => {
  mongo = await MongoMemoryServer.create()
  const testDBUrl = mongo.getUri()

  await Database.connect(testDBUrl)
}

export const close = async () => {
  if (mongo) {
    if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
      await mongoose.connection.db.dropDatabase();
    }
    
    await Database.close()
    await mongo.stop()
  }
}
