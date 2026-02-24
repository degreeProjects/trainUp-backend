import mongoose from "mongoose";

export interface IUser {
  _id?: string;
  email: string;
  password?: string;
  fullName: string;
  homeCity?: string;
  profileImage?: string;
  height: number;
  weight: number;
  age: number;
  refreshTokens?: Array<string>;
}

const userSchema = new mongoose.Schema<IUser>({
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
  },
  fullName: {
    type: String,
    required: true,
  },
  homeCity: {
    type: String,
  },
  profileImage: {
    type: String,
    required: false,
  },
  height: {
    type: Number,
    default: 170,
  },
  weight: {
    type: Number,
    default: 70,
  },
  age: {
    type: Number,
    default: 25,
  },
  refreshTokens: {
    type: [String],
    required: false,
  },
});

export default mongoose.model<IUser>("User", userSchema);
