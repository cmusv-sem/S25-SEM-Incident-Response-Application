/**
 * Channel Model
 *
 * Represents a channel where users can send messages.
 * This model is similar to a Slack channel.
 */

import mongoose, { Document, Model, Schema, Types } from 'mongoose'
import AutoPopulate from 'mongoose-autopopulate'

import UserController from '../controllers/UserController'
import SystemGroupConfigs, {
    ISystemGroupConfig,
} from '../utils/SystemDefinedGroups'
import { IMessage } from './Message'
import User, { IUser } from './User'

export const PUBLIC_CHANNEL_NAME = 'Public'

/**
 * Interface for the Channel document
 */
export interface IChannel extends Document {
    name: string
    description?: string
    owner?: IUser
    closed: boolean
    users: IUser[]
    messages?: IMessage[]
}

/**
 * Interface for the Channel model
 * Note: Private channels are called "Groups"
 */
export interface IChannleModel extends Model<IChannel> {
    getPublicChannel: () => Promise<IChannel>
    getGroupById: (id: Types.ObjectId) => Promise<IChannel>
    getGroupByUser: (userId: Types.ObjectId) => Promise<IChannel[]>
    getGroupOwnedByUser: (userId: Types.ObjectId) => Promise<IChannel[]>
    ensureSystemDefinedGroup: () => Promise<void>
    closeChannel: (channelId: Types.ObjectId) => Promise<IChannel>
}

/**
 * Channel Schema
 */
const ChannelSchema = new Schema({
    name: { type: String, required: true },
    description: { type: String },
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        autopopulate: {
            select: '-password -__v',
        },
    },
    closed: { type: Boolean, default: false },
    users: [
        {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'User',
            autopopulate: {
                select: '-password -__v',
            },
        },
    ],
    messages: [
        {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'Message',
            autopopulate: true,
        },
    ],
})

ChannelSchema.plugin(AutoPopulate)

/**
 * Static method to get or create the public channel
 */
ChannelSchema.statics.getPublicChannel = async () => {
    const channel = await Channel.findOne({ name: PUBLIC_CHANNEL_NAME }).exec()

    if (channel) {
        return channel
    } else {
        return new Channel({ name: PUBLIC_CHANNEL_NAME }).save()
    }
}

/**
 * Static method to get a group by its ID
 * Ignore the public channel when getting a group
 */
ChannelSchema.statics.getGroupById = async (id: Types.ObjectId) => {
    return Channel.findOne({ _id: id }).exec()
}

/**
 * Static method to get a group owned by a user
 * Including system defined groups
 * Default to get all groups
 * @param userId - The ID of the user
 * @param checkClosed - Optional. If true, returns groups based on the "closed"  field. Otherwise, returns all groups.
 * @param closed - Optional. Default to false (open groups). If true, returns closed groups. Otherwise, returns open groups.
 */
ChannelSchema.statics.getGroupOwnedByUser = async (
    userId: Types.ObjectId,
    checkClosed: boolean = false,
    closed: boolean = false,
) => {
    if (checkClosed) {
        return Channel.find({ owner: userId, closed: closed }).exec()
    } else {
        return Channel.find({ owner: userId }).exec()
    }
}

/**
 * Static method to get a group by a user
 * Including system defined groups
 * Default to get all groups
 * @param userId - The ID of the user
 * @param checkClosed - Optional. If true, returns groups based on the "closed"  field. Otherwise, returns all groups.
 * @param closed - Optional. Default to false (open groups). If true, returns closed groups. Otherwise, returns open groups.
 */
ChannelSchema.statics.getGroupByUser = async (
    userId: Types.ObjectId,
    checkClosed: boolean = false,
    closed: boolean = false,
) => {
    if (checkClosed) {
        return Channel.find({ users: userId, closed: closed }).exec()
    } else {
        return Channel.find({ users: userId }).exec()
    }
}

ChannelSchema.statics.ensureSystemDefinedGroup = async () => {
    const systemUser = await UserController.findUserByUsername('System')
    if (!systemUser) {
        console.log(
            '[ensureSystemDefinedGroup] systemUser not found. Cannot create system defined groups.',
        )
        return
    }

    async function ensureConfig(config: ISystemGroupConfig) {
        const channel = await Channel.findOne({ name: config.name }).lean()
        if (!channel) {
            const users = await User.find({
                role: { $in: config.participantRole },
            }).exec()

            await new Channel({
                name: config.name,
                users: users,
                description: config.description,
                owner: systemUser,
                closed: false,
            }).save()

            console.log(
                `[ensureSystemDefinedGroup] System Group ${config.name} created! (user count: ${users.length})`,
            )
        } else {
            console.log(
                `[ensureSystemDefinedGroup] System Group ${config.name} already exists!`,
            )
        }
    }

    // await Promise.all(
    //     SystemGroupConfigs.map(async (config) => {
    //         await ensureConfig(config)
    //     }),
    // )
    // Some tests rely on the order of creating system groups, so do not use Promise.all here
    for (const config of SystemGroupConfigs) {
        await ensureConfig(config)
    }
}

ChannelSchema.statics.closeChannel = async function (
    channelId: Types.ObjectId,
): Promise<IChannel> {
    const channel = await this.findById(channelId).exec()
    if (!channel) {
        throw new Error(`Channel with id ${channelId.toHexString()} not found.`)
    }
    channel.closed = true
    return channel.save()
}

const Channel = mongoose.model<IChannel, IChannleModel>(
    'Channel',
    ChannelSchema,
)

export default Channel
