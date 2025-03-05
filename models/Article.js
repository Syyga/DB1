import mongoose from "mongoose";

const articleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    image: { type: String },
    username: { type: String, require: true },
    likeCount: { type: Number, default: 0 },
    comments: [
      {
        username: { type: String, required: true },
        content: { type: String, required: true },
        likeCount: { type: Number, default: 0 },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Article", articleSchema);
