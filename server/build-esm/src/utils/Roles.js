"use strict";
/**
 * Roles Utility
 *
 * This file defines the roles available in the system.
 * Note: Keep this file in sync with client/src/utils/roles.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLES = void 0;
/**
 * Enum representing the different user roles in the system
 */
var ROLES;
(function (ROLES) {
    ROLES["CITIZEN"] = "Citizen";
    ROLES["DISPATCH"] = "Dispatch";
    ROLES["POLICE"] = "Police";
    ROLES["FIRE"] = "Fire";
    ROLES["NURSE"] = "Nurse";
    ROLES["ADMINISTRATOR"] = "Administrator";
})(ROLES || (exports.ROLES = ROLES = {}));
exports.default = ROLES;
//# sourceMappingURL=Roles.js.map