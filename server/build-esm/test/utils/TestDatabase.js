"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.close = exports.connect = void 0;
const tslib_1 = require("tslib");
const mongodb_memory_server_core_1 = require("mongodb-memory-server-core");
const mongoose_1 = tslib_1.__importDefault(require("mongoose"));
const Database = tslib_1.__importStar(require("../../src/utils/Database"));
let mongo;
const connect = async () => {
    mongo = await mongodb_memory_server_core_1.MongoMemoryServer.create();
    const testDBUrl = mongo.getUri();
    await Database.connect(testDBUrl);
};
exports.connect = connect;
const close = async () => {
    if (mongo) {
        if (mongoose_1.default.connection.readyState === 1 && mongoose_1.default.connection.db) {
            await mongoose_1.default.connection.db.dropDatabase();
        }
        await Database.close();
        await mongo.stop();
    }
};
exports.close = close;
//# sourceMappingURL=TestDatabase.js.map