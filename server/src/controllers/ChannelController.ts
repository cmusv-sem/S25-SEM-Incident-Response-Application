// ChannelController handles operations related to channels, such as creating, listing, and appending messages.
// It interacts with the Channel and User models and manages user connections.

import dotenv from 'dotenv'
import { FilterQuery, Types } from 'mongoose'
import Channel, { IChannel, PUBLIC_CHANNEL_NAME } from '../models/Channel'
import Message from '../models/Message'
import User from '../models/User'
import UserConnections from '../utils/UserConnections'
import UserController from './UserController'
dotenv.config()

class ChannelController {
  /**
   * Delete a channel by Name (Name had unique constraint)
   * @param name - The name of the channel to delete
   * @returns The deleted channel object
   * @throws Error if trying to delete the public channel or if the channel is not found
   */
  async delete(name: string) {
    if (name === PUBLIC_CHANNEL_NAME) {
      throw new Error('Cannot delete the public channel')
    }

    const exists = await Channel.findOne({ name }).exec();

    if (!exists) {
      throw new Error(`Channel(${name}) not found.`)
    }

    await Channel.findOneAndDelete({ name }).exec();
    UserConnections.broadcast('updateGroups', {});
  }

  /**
   * Create a new channel or return an existing one if it already exists
   * @param channel - An object containing channel details
   * @returns The created or existing channel object
   * @throws Error if trying to create a channel with the public channel name
   */
  async create(channel: {
    name: string;
    userIds: Types.ObjectId[];
    description?: string;
    ownerId?: Types.ObjectId;
    closed?: boolean;
  }) {
    console.log("New channel:", channel.name);
    if (channel.name === PUBLIC_CHANNEL_NAME) {
      throw new Error('Channel name cannot be the public channel name');
    }

    const userIds = [...new Set(channel.userIds)].sort((a, b) =>
      a.toHexString().localeCompare(b.toHexString())
    );
    
    const users = await Promise.all(
      userIds.map(async (id) => {
        const user = await User.findById(id).exec();
        if (!user) throw new Error(`User(${id}) not found.`);
        return user;
      })
    );

    let owner = channel.ownerId ? await User.findById(channel.ownerId).exec() : undefined;

    let exists = await Channel.findOne({
      name: channel.name,
      users,
      owner
    }).exec();

    if (exists) {
      console.log('Channel already exists', exists);
      return exists;
    } else {
      console.log('Creating new channel...');
      const newChannel = await new Channel({
        name: channel.name,
        users,
        description: channel.description,
        owner,
        closed: channel.closed,
      }).save();
      UserConnections.broadcast('updateGroups', {});
      return newChannel;
    }
  }

  /**
   * Creates a 911 emergency channel with specific configurations
   * @returns The created 911 channel
   */
  async create911Channel(username: string, userId: Types.ObjectId) {
    const channel911Name = `I${username}_911`;
    
    const systemUser = await UserController.findUserByUsername('System');
    if (!systemUser) {
      throw new Error('System user not found. Please ensure System user is created with Administrator role.');
    }
    
    const channel = await this.create({
      name: channel911Name,
      userIds: [userId, systemUser._id],
      description: `911 Emergency Channel for ${username}`,
      ownerId: userId,
      closed: false
    });
    
    await this.appendMessage({
      content: "Hello! A dispatcher will be with you shortly. Please provide any additional information here.",
      senderId: systemUser._id,
      channelId: channel._id,
      isAlert: false,
      responders: []
    });
    
    return channel;
  }

  /**
   * List channels, optionally filtered by user
   */
  async list(hasUser?: Types.ObjectId) {
    let query: FilterQuery<IChannel> = {};
    if (hasUser) {
      const user = await User.findById(hasUser).exec();
      if (user) {
        query = { users: user };
      }
    }
    return Channel.find(query).select('-messages').exec();
  }

  /**
   * Get a channel by ID
   */
  async get(id: Types.ObjectId) {
    return Channel.findById(id).exec();
  }

  /**
   * Append a new message to a channel
   */
  async appendMessage({
    content,
    senderId,
    channelId,
    isAlert,
    responders,
  }: {
    content: string;
    senderId: Types.ObjectId;
    channelId: Types.ObjectId;
    isAlert: boolean;
    responders: Types.ObjectId[];
  }) {
    const sender = await User.findById(senderId).exec();
    if (!sender) throw new Error(`Sender(${senderId.toHexString()}) not found.`);

    const channel = await Channel.findById(channelId).exec();
    if (!channel) throw new Error(`Channel(${channelId.toHexString()}) not found.`);

    const message = await new Message({
      content,
      sender,
      channelId: channel._id,
      isAlert,
      responders,
    }).save();
    
    channel.messages!.push(message);
    await channel.save();
    
    channel.users.forEach((user) => {
      if (user._id.equals(senderId)) return;
      const id = user._id.toHexString();
      if (!UserConnections.isUserConnected(id)) return;
      const connection = UserConnections.getUserConnection(id)!;
      connection.emit('new-message', message);
    });
    return message;
  }
}

export default new ChannelController();
