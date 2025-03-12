"use strict";
/**
 * Message Model
 *
 * Represents a message sent by a user in a channel.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const mongoose_1 = tslib_1.__importStar(require("mongoose"));
const mongoose_autopopulate_1 = tslib_1.__importDefault(require("mongoose-autopopulate"));
/**
 * Message Schema
 */
const MessageSchema = new mongoose_1.Schema({
    content: { type: String, required: true },
    sender: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: false,
        ref: 'User',
        autopopulate: {
            select: '-password -__v',
        },
    },
    channelId: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
        ref: 'Channel',
        autopopulate: false,
    },
    isAlert: {
        type: Boolean, require: true,
    },
    responders: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User',
            autopopulate: true,
        },
    ],
    acknowledgedBy: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: 'User',
            autopopulate: true,
        },
    ],
    acknowledgedAt: [
        {
            type: Date,
        },
    ],
}, {
    timestamps: {
        createdAt: 'timestamp',
        updatedAt: false,
    },
});
MessageSchema.plugin(mongoose_autopopulate_1.default);
exports.default = mongoose_1.default.model('Message', MessageSchema);
//# sourceMappingURL=Message.js.map