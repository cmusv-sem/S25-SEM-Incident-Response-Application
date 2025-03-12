"use strict";
/**
 * User Model
 *
 * Represents a user in the system with authentication capabilities.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const bcrypt_1 = tslib_1.__importDefault(require("bcrypt"));
const mongoose_1 = tslib_1.__importStar(require("mongoose"));
const Roles_1 = tslib_1.__importDefault(require("../utils/Roles"));
const SALT_WORK_FACTOR = 10;
/**
 * User Schema
 */
const UserSchema = new mongoose_1.Schema({
    username: {
        type: String,
        required: true,
        index: {
            unique: true,
        },
    },
    password: { type: String, required: true, select: false },
    // phoneNumber: { type: String, required: true },
    role: { type: String, required: true, default: Roles_1.default.CITIZEN },
    /**
     * assignedCity should only be used if role is 'Police' or 'Fire'.
     * Default is null. When role is anything else, assignedCity must remain null.
     */
    assignedCity: {
        type: String,
        default: null,
        validate: {
            validator: function (val) {
                // If role is Police or Fire, assignedCity can be any string (including null).
                // Otherwise, assignedCity must be null.
                if (this.role === Roles_1.default.POLICE || this.role === Roles_1.default.FIRE) {
                    return true;
                }
                return val === null;
            },
            message: 'assignedCity is only allowed for users with role Police or Fire.',
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
            validator: function (val) {
                // If role is Police, assignedCar can be any string (including null).
                // Otherwise, assignedCar must be null.
                if (this.role === Roles_1.default.POLICE) {
                    return true;
                }
                return val === null;
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
            validator: function (val) {
                // If role is Fire, assignedTruck can be any string (including null).
                // Otherwise, assignedTruck must be null.
                if (this.role === Roles_1.default.FIRE) {
                    return true;
                }
                return val === null;
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
            validator: function (val) {
                // If role is Police or Fire, assignedVehicleTimestamp can be any date (including null).
                // Otherwise, assignedVehicleTimestamp must be null.
                if (this.role === Roles_1.default.POLICE || this.role === Roles_1.default.FIRE) {
                    return true;
                }
                return val === null;
            },
            message: 'assignedVehicleTimestamp is only allowed for users with role Police or Fire.',
        },
    },
    previousLatitude: { type: Number, required: false, default: 0 },
    previousLongitude: { type: Number, required: false, default: 0 },
});
/**
 * Pre-save hook to hash the password before saving the user to the database
 */
UserSchema.pre('save', function (next) {
    const user = this;
    if (!user.isModified('password'))
        return next();
    bcrypt_1.default.genSalt(SALT_WORK_FACTOR, (err, salt) => {
        if (err)
            return next(err);
        bcrypt_1.default.hash(user.password, salt, (err, hash) => {
            if (err)
                return next(err);
            // overwrite the plaintext password with the hashed one
            user.password = hash;
            next();
        });
    });
});
/**
 * Method to compare a given password with the user's hashed password
 */
UserSchema.methods.comparePassword = function (candidatePassword) {
    return new Promise((resolve, reject) => {
        bcrypt_1.default.compare(candidatePassword, this.password, (error, isMatch) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(isMatch);
            }
        });
    });
};
/**
 * Method to ensure a System Administator exits in the database.
 */
UserSchema.statics.ensureSystemUser = async function () {
    const username = "System";
    const password = "1234";
    const role = Roles_1.default.ADMINISTRATOR;
    try {
        const existingUser = await this.findOne({ username: username });
        if (!existingUser) {
            console.log('System user does not exist. Creating now.');
            // Create user using new model instance to trigger pre-save hook
            const systemUser = new this({
                username: username,
                password: password, // Plain password - will be hashed by pre-save hook
                role: role
            });
            await systemUser.save();
            console.log('System user created successfully.');
        }
        else {
            console.log('System user already exists.');
        }
    }
    catch (error) {
        console.error('Error creating system user:', error);
    }
};
exports.default = mongoose_1.default.model('User', UserSchema);
//# sourceMappingURL=User.js.map