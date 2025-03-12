"use strict";
/**
 * Database Utility
 *
 * This utility provides functions for connecting to and closing the MongoDB database.
 * It also imports models to ensure their schemas are registered with Mongoose.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.close = exports.connect = void 0;
const tslib_1 = require("tslib");
const mongoose_1 = tslib_1.__importDefault(require("mongoose"));
// Import models to ensure their schemas are registered
require("../models/Channel");
require("../models/Message");
const User_1 = tslib_1.__importDefault(require("../models/User"));
const dotenv_1 = tslib_1.__importDefault(require("dotenv"));
const Channel_1 = tslib_1.__importDefault(require("../models/Channel"));
dotenv_1.default.config({ path: '.env' });
/**
 * Connect to the MongoDB database
 * @param url - The MongoDB connection URL (default: constructed from environment variables)
 * @param useTls - Whether to use TLS (default: constructed from environment variables)
 */
const connect = async (url = undefined, useTls = undefined) => {
    // If MongoDB URL is not provided, use the environment variables
    if (url === undefined) {
        let baseUrl = process.env.MONGODB_URL;
        let dbName = process.env.MONGODB_DB_NAME;
        // Edge case for those who added an extra forward slash at either ends
        if (baseUrl?.endsWith('/')) {
            baseUrl = baseUrl.slice(0, -1);
        }
        if (dbName?.startsWith('/')) {
            dbName = dbName.slice(1);
        }
        url = `${baseUrl}/${dbName}`;
    }
    // If TLS is not provided, use the environment variables
    if (useTls === undefined) {
        useTls = process.env.MONGODB_TLS === '1';
    }
    await mongoose_1.default.connect(url, useTls
        ? {
            tls: true,
        }
        : undefined);
    await User_1.default.ensureSystemUser();
    await Channel_1.default.ensureSystemDefinedGroup();
};
exports.connect = connect;
/**
 * Close the MongoDB connection
 */
const close = async () => {
    mongoose_1.default.connection.close();
};
exports.close = close;
//# sourceMappingURL=Database.js.map