import mongoose, { Schema, Document } from 'mongoose';

export interface IAddress {
  _id?: mongoose.Types.ObjectId;
  houseNumber: string;
  streetArea: string;
  villageTown: string;
  landmark?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  isDefault: boolean;
}

export interface IUser extends Document {
  name: string;
  mobile: string;
  profilePhoto?: string;
  addresses: IAddress[];
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AddressSchema = new Schema<IAddress>(
  {
    houseNumber: { type: String, required: true, trim: true },
    streetArea: { type: String, required: true, trim: true },
    villageTown: { type: String, required: true, trim: true },
    landmark: { type: String, trim: true },
    coordinates: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, unique: true, trim: true, index: true },
    profilePhoto: { type: String },
    addresses: [AddressSchema],
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>('User', UserSchema);
