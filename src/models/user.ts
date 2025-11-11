import mongoose from "mongoose";

export interface IUser {
  _id?: string;
  email: string;
  password: string;
  fullName?: string;
  profileImage?: string;
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
  profileImage: {
    type: String,
    required: false,
  },
});

export default mongoose.model<IUser>("User", userSchema);
