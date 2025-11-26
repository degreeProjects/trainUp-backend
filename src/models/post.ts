import mongoose from "mongoose";

export interface IComment {
  user: string;
  body: string;
  date: Date;
}

export const TrainingTypes = [
  "Gym",
  "CrossFit",
  "Cardio",
  "Yoga",
  "Pilates",
  "Stretching",
  "Martial Arts",
  "Team Sports",
  "Tennis",
  "Padel",
  "Climbing",
  "Ruining",
  "Walking",
  "Cycling",
  "Swimming",
  "Stair Climbing",
  "Jumping Rope",
  "Hiking",
  "Tabata",
];

export type TrainingType = (typeof TrainingTypes)[number];

export interface IPost {
  _id?: string;
  type: TrainingType;
  description: string;
  image: string;
  city: string;
  user: string;
  comments: Array<IComment>;
  likes: Array<string>;
}

const postSchema = new mongoose.Schema<IPost>(
  {
    type: {
      type: String,
      required: true,
      enum: TrainingTypes,
    },
    description: {
      type: String,
      required: false,
    },
    image: {
      type: String,
      required: false,
    },
    city: {
      type: String,
      required: true,
    },
    user: {
      type: String,
      required: true,
      ref: "User",
    },
    comments: {
      required: false,
      type: [
        {
          user: {
            type: String,
            required: true,
            ref: "User",
          },
          body: {
            type: String,
            required: true,
          },
          date: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },
    likes: {
      type: [
        {
          type: String,
          ref: "User",
        },
      ],
      default: [],
      required: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IPost>("Post", postSchema);
