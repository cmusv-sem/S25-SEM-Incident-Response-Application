/**
 * Server Entry Point
 *
 * This file is the main entry point for the server application.
 * It sets up the HTTP server, Socket.IO, and connects to the database.
 */

import { Server as SocketIO } from 'socket.io'

import * as Http from 'node:http'
import app from './app'
import Socket from './socket'
import * as Database from './utils/Database'
import Env from './utils/Env'

// Set the port for the server to listen on
const PORT = parseInt(Env.getParam('PORT', '3001'))

async function getHttpServer() {
  return Http.createServer(app)
}

async function setupSocketIo(server: Http.Server) {
  const impl = new SocketIO(server, {
    cors: {
      origin: '*',
      credentials: true,
    },
  })

  Socket.setup(impl)
}

async function main() {
  // Create an HTTP server instance
  const server = await getHttpServer()

  // Setup Socket.IO and connect to the database at the same time
  await Promise.all([setupSocketIo(server), Database.connect()])

  // Start the server
  server.listen(PORT, () => console.log(`Server listening on port ${PORT}!`))
}

main()
