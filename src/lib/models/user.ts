import mongoose, { Document, Schema } from 'mongoose';

/**
 * User — accounts created through "Sign in with Google".
 * The Google `sub` claim (stable unique id) is the primary identity key.
 */
export interface IUser extends Document {
  googleId: string;
  email: string;
  name: string;
  image: string;
  lastLoginAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    googleId: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      default: '',
      trim: true,
      maxlength: 200,
    },
    image: {
      type: String,
      default: '',
    },
    lastLoginAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

UserSchema.index({ email: 1 });

export const User =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
