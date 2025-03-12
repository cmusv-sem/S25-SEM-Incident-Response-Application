"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const loadtest_1 = tslib_1.__importDefault(require("loadtest"));
const TestDatabase = tslib_1.__importStar(require("../../utils/TestDatabase"));
const options = {
    url: 'http://localhost:3000/api/channels',
    concurrency: 5,
    method: 'GET',
    requestsPerSecond: 5,
    maxSeconds: 30,
};
const before = async () => {
    await TestDatabase.connect();
};
const after = async () => {
    await TestDatabase.close();
};
const runTest = async () => {
    try {
        await before();
        // Using loadtest@7 (CommonJS version) – no dynamic import needed
        loadtest_1.default.loadTest(options, async (error, result) => {
            if (error) {
                console.error('Got an error:', error);
            }
            else {
                console.log(result);
                console.log('Tests run successfully');
            }
            await after();
        });
    }
    catch (error) {
        console.error('Setup failed:', error);
    }
};
runTest();
//# sourceMappingURL=get-channels.js.map