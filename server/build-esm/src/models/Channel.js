"use strict";
/**
 * Channel Model
 *
 * Represents a channel where users can send messages.
 * This model is similar to a Slack channel.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PUBLIC_CHANNEL_NAME = void 0;
const tslib_1 = require("tslib");
const mongoose_1 = tslib_1.__importStar(require("mongoose"));
const mongoose_autopopulate_1 = tslib_1.__importDefault(require("mongoose-autopopulate"));
const UserController_1 = tslib_1.__importDefault(require("../controllers/UserController"));
const SystemDefinedGroups_1 = tslib_1.__importDefault(require("../utils/SystemDefinedGroups"));
const User_1 = tslib_1.__importDefault(require("./User"));
exports.PUBLIC_CHANNEL_NAME = 'Public';
/**
 * Channel Schema
 */
const ChannelSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    description: { type: String },
    owner: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        autopopulate: {
            select: '-password -__v',
        },
    },
    closed: { type: Boolean, default: false },
    users: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            required: true,
            ref: 'User',
            autopopulate: {
                select: '-password -__v',
            },
        },
    ],
    messages: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            required: true,
            ref: 'Message',
            autopopulate: true,
        },
    ],
});
ChannelSchema.plugin(mongoose_autopopulate_1.default);
/**
 * Static method to get or create the public channel
 */
ChannelSchema.statics.getPublicChannel = async () => {
    const channel = await Channel.findOne({ name: exports.PUBLIC_CHANNEL_NAME }).exec();
    if (channel) {
        return channel;
    }
    else {
        return new Channel({ name: exports.PUBLIC_CHANNEL_NAME }).save();
    }
};
/**
 * Static method to get a group by its ID
 * Ignore the public channel when getting a group
 */
ChannelSchema.statics.getGroupById = async (id) => {
    return Channel.findOne({ _id: id, name: { $ne: exports.PUBLIC_CHANNEL_NAME } }).exec();
};
/**
 * Static method to get a group owned by a user
 * Including system defined groups
 * Default to get all groups
 * @param userId - The ID of the user
 * @param checkClosed - Optional. If true, returns groups based on the "closed"  field. Otherwise, returns all groups.
 * @param closed - Optional. Default to false (open groups). If true, returns closed groups. Otherwise, returns open groups.
 */
ChannelSchema.statics.getGroupOwnedByUser = async (userId, checkClosed = false, closed = false) => {
    if (checkClosed) {
        return Channel.find({ owner: userId, closed: closed }).exec();
    }
    else {
        return Channel.find({ owner: userId }).exec();
    }
};
/**
 * Static method to get a group by a user
 * Including system defined groups
 * Default to get all groups
 * @param userId - The ID of the user
 * @param checkClosed - Optional. If true, returns groups based on the "closed"  field. Otherwise, returns all groups.
 * @param closed - Optional. Default to false (open groups). If true, returns closed groups. Otherwise, returns open groups.
 */
ChannelSchema.statics.getGroupByUser = async (userId, checkClosed = false, closed = false) => {
    if (checkClosed) {
        return Channel.find({ users: userId, closed: closed }).exec();
    }
    else {
        return Channel.find({ users: userId }).exec();
    }
};
ChannelSchema.statics.ensureSystemDefinedGroup = async () => {
    const systemUser = await UserController_1.default.findUserByUsername('System');
    if (!systemUser) {
        console.log('[ensureSystemDefinedGroup] systemUser not found. Cannot create system defined groups.');
        return;
    }
    for (const config of SystemDefinedGroups_1.default) {
        const channel = await Channel.findOne({ name: config.name }).exec();
        if (!channel) {
            const users = await User_1.default.find({
                role: { $in: config.participantRole }
            }).exec();
            await new Channel({
                name: config.name,
                users: users,
                description: config.description,
                owner: systemUser,
                closed: false,
            }).save();
            console.log(`[ensureSystemDefinedGroup] System Group ${config.name} created! (user count: ${users.length})`);
        }
        else {
            console.log(`[ensureSystemDefinedGroup] System Group ${config.name} already exists!`);
        }
    }
};
const Channel = mongoose_1.default.model('Channel', ChannelSchema);
exports.default = Channel;
//# sourceMappingURL=Channel.js.map