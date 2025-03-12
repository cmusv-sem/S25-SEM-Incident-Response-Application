"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const Roles_1 = tslib_1.__importDefault(require("./Roles"));
const SystemGroupConfigs = [
    {
        name: "Public",
        description: "Group includes all users.",
        participantRole: [Roles_1.default.CITIZEN, Roles_1.default.DISPATCH, Roles_1.default.POLICE, Roles_1.default.FIRE, Roles_1.default.NURSE, Roles_1.default.ADMINISTRATOR]
    },
    {
        name: "Citizens",
        description: "Group includes all citizens.",
        participantRole: [Roles_1.default.CITIZEN, Roles_1.default.ADMINISTRATOR]
    },
    {
        name: "Responders",
        description: "Group includes all responders.",
        participantRole: [Roles_1.default.DISPATCH, Roles_1.default.POLICE, Roles_1.default.FIRE, Roles_1.default.ADMINISTRATOR]
    },
    {
        name: "Dispatch",
        description: "Group includes all dispatchers.",
        participantRole: [Roles_1.default.DISPATCH, Roles_1.default.ADMINISTRATOR]
    },
    {
        name: "Police",
        description: "Group includes all Police personnel.",
        participantRole: [Roles_1.default.POLICE, Roles_1.default.ADMINISTRATOR]
    },
    {
        name: "Fire",
        description: "Group includes all Fire personnel.",
        participantRole: [Roles_1.default.FIRE, Roles_1.default.ADMINISTRATOR]
    },
    {
        name: "Nurses",
        description: "Group includes all nurses.",
        participantRole: [Roles_1.default.NURSE, Roles_1.default.ADMINISTRATOR]
    },
    {
        name: "Medic",
        description: "Group includes all medical personnel.",
        participantRole: [Roles_1.default.NURSE, Roles_1.default.POLICE, Roles_1.default.FIRE, Roles_1.default.NURSE, Roles_1.default.ADMINISTRATOR]
    },
];
exports.default = SystemGroupConfigs;
//# sourceMappingURL=SystemDefinedGroups.js.map