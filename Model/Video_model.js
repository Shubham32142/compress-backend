import mongoose from "mongoose";

const videoSchema = new mongoose.Schema({
  fileName: String,
  originalSize: Number,
  compressedSize: Number,
  compressionStatus: { type: String, default: "pending" },
  downloadLinks: {
    original: String,
    compressed: String,
  },
});
export const videos = mongoose.model("VideoCompressed", videoSchema);
