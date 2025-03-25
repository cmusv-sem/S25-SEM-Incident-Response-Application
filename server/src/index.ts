/**
 * Server Entry Point
 *
 * This file is the main entry point for the server application.
 * It sets up the HTTP server, Socket.IO, and connects to the database.
 */

import { Server } from 'http'
import { Server as SocketIO } from 'socket.io'

import app from './app'
import Socket from './socket'
import * as Database from './utils/Database'
import Env from './utils/Env'

// Set the port for the server to listen on
const PORT = parseInt(Env.getParam('PORT', '3001'))

// Create an HTTP server instance
const server = new Server(app)

// Create and attach a Socket.IO instance to the server
const socketIO = new SocketIO({
  // Configure CORS for Socket.IO
  // @see https://socket.io/docs/v3/handling-cors/
  cors: {
    origin: '*',
    credentials: true,
  },
}).attach(server)

// Connect to the MongoDB database
Database.connect()

// Set up Socket.IO event handlers
Socket.setup(socketIO)

// Start the server
server.listen(PORT, () => console.log(`Server listening on port ${PORT}!`))
