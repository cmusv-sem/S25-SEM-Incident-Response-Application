/**
 * User Model
 *
 * Represents a user in the system with authentication capabilities.
 */

import bcrypt from 'bcryptjs'
import mongoose, { Document, Model, Schema } from 'mongoose'

import ROLES from '../utils/Roles'

const SALT_WORK_FACTOR = 10

/**
 * Interface for the User document
 */
export interface IUser extends Document {
    username: string
    password?: string
    // phoneNumber?: string
    role: string
    assignedCity?: string | null
    assignedCar?: string | null
    assignedTruck?: string | null
    assignedVehicleTimestamp?: Date
    assignedIncident?: string | null
    previousLatitude: number
    previousLongitude: number
    comparePassword: (candidatePassword: string) => Promise<boolean>
    hospitalId?: string
}

/**
 * User Schema
 */
const UserSchema = new Schema<IUser>({
    username: {
        type: String,
        required: true,
        index: {
            unique: true,
        },
    },
    password: { type: String, required: true, select: false },
    // phoneNumber: { type: String, required: true },
    role: { type: String, required: true, default: ROLES.CITIZEN },
    /**
     * assignedCity should only be used if role is 'Police' or 'Fire'.
     * Default is null. When role is anything else, assignedCity must remain null.
     */
    assignedCity: {
        type: String,
        default: null,
        validate: {
            validator: function (this: IUser, val: string | null) {
                // If role is Police or Fire, assignedCity can be any string (including null).
                // Otherwise, assignedCity must be null.
                if (this.role === ROLES.POLICE || this.role === ROLES.FIRE) {
                    return true
                }
                return val === null
            },
            message:
                'assignedCity is only allowed for users with role Police or Fire.',
        },
    },
    /**
     * assignedCar should only be used if role is 'Police'.
     * Default is null. When role is anything else, assignedCar must remain null.
     */
    assignedCar: {
        type: String,
        default: null,
        validate: {
            validator: function (this: IUser, val: string | null) {
                // If role is Police, assignedCar can be any string (including null).
                // Otherwise, assignedCar must be null.
                if (this.role === ROLES.POLICE) {
                    return true
                }
                return val === null
            },
            message: 'assignedCar is only allowed for users with role Police.',
        },
    },
    /**
     * assignedTruck should only be used if role is 'Fire'.
     * Default is null. When role is anything else, assignedTruck must remain null.
     */
    assignedTruck: {
        type: String,
        default: null,
        validate: {
            validator: function (this: IUser, val: string | null) {
                // If role is Fire, assignedTruck can be any string (including null).
                // Otherwise, assignedTruck must be null.
                if (this.role === ROLES.FIRE) {
                    return true
                }
                return val === null
            },
            message: 'assignedTruck is only allowed for users with role Fire.',
        },
    },
    /**
     * assignedVehicleTimestamp should only be used if role is 'Police' or 'Fire'.
     * Default is null. When role is anything else, assignedVehicleTimestamp must remain null.
     */
    assignedVehicleTimestamp: {
        type: Date,
        default: null,
        validate: {
            validator: function (this: IUser, val: Date | null) {
                // If role is Police or Fire, assignedVehicleTimestamp can be any date (including null).
                // Otherwise, assignedVehicleTimestamp must be null.
                if (this.role === ROLES.POLICE || this.role === ROLES.FIRE) {
                    return true
                }
                return val === null
            },
            message:
                'assignedVehicleTimestamp is only allowed for users with role Police or Fire.',
        },
    },
    previousLatitude: { type: Number, required: false, default: 0 },
    previousLongitude: { type: Number, required: false, default: 0 },
    hospitalId: { type: String, required: false, ref: 'Hospital' },
    __v: { type: Number, select: false },
})

/**
 * Pre-save hook to hash the password before saving the user to the database
 */
UserSchema.pre('save', function (next) {
    const user = this as IUser

    if (!user.isModified('password')) return next()

    bcrypt.genSalt(SALT_WORK_FACTOR, (err, salt) => {
        if (err) return next(err)

        bcrypt.hash(user.password!, salt ?? 10, (err, hash) => {
            if (err) return next(err)

            // overwrite the plaintext password with the hashed one
            user.password = hash
            next()
        })
    })
})

/**
 * Method to compare a given password with the user's hashed password
 */
UserSchema.methods.comparePassword = function (candidatePassword) {
    return new Promise((resolve, reject) => {
        bcrypt.compare(candidatePassword, this.password!, (error, isMatch) => {
            if (error) {
                reject(error)
            } else {
                resolve(isMatch)
            }
        })
    })
}

/**
 * Method to ensure a System Administator exits in the database.
 */
UserSchema.statics.ensureSystemUser = async function () {
    const username: string = 'System'
    const password: string = '1234'
    const role = ROLES.ADMINISTRATOR

    try {
        const existingUser = await this.findOne({ username: username })

        if (!existingUser) {
            console.log('System user does not exist. Creating now.')
            // Create user using new model instance to trigger pre-save hook
            const systemUser = new this({
                username: username,
                password: password, // Plain password - will be hashed by pre-save hook
                role: role,
            })
            await systemUser.save()
            console.log('System user created successfully.')
        } else {
            console.log('System user already exists.')
        }
    } catch (error) {
        console.error('Error creating system user:', error)
    }
}

export default mongoose.model<
    IUser,
    Model<IUser> & { ensureSystemUser: () => Promise<void> }
>('User', UserSchema)
