import fs from "fs";
import path from "path";
import { videos } from "../Model/Video_model.js";
import dotenv from "dotenv";
import AWS from "aws-sdk";
import ffmpeg from "fluent-ffmpeg";
import { compressVideo } from "../utils/compressVideo.js";

dotenv.config();

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();
export async function uploadVideo(req, res) {
  const file = req.file;

  if (!file || !file.buffer) {
    return res.status(400).json({ message: "No valid file uploaded" });
  }

  console.log("Uploaded file:", file);

  const { originalname, size } = file;
  const uploadDir = path.resolve("uploads");
  const chunkDir = path.resolve("chunks");

  // Ensure directories exist
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  if (!fs.existsSync(chunkDir)) fs.mkdirSync(chunkDir, { recursive: true });

  const filePath = path.join(uploadDir, originalname);

  // Write file to disk before processing
  fs.writeFileSync(filePath, file.buffer);

  try {
    // Upload original video to S3
    const originalUploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `original/${originalname}`,
      Body: fs.createReadStream(filePath),
    };
    const originalUpload = await s3.upload(originalUploadParams).promise();
    console.log("Original file uploaded:", originalUpload.Location);

    // Compress and split the video into chunks
    await compressVideo(filePath, chunkDir, 10); // Chunk size = 10 seconds

    // Get list of generated chunks
    const chunks = fs
      .readdirSync(chunkDir)
      .filter((file) => file.startsWith("chunk"));
    console.log("Generated chunks:", chunks);

    // Upload each chunk to S3
    const chunkUploadPromises = chunks.map((chunkFile) => {
      const chunkPath = path.join(chunkDir, chunkFile);
      const chunkUploadParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `chunks/${chunkFile}`,
        Body: fs.createReadStream(chunkPath),
      };
      return s3.upload(chunkUploadParams).promise();
    });

    const uploadedChunks = await Promise.all(chunkUploadPromises);
    console.log(
      "Chunks uploaded:",
      uploadedChunks.map((chunk) => chunk.Location)
    );

    // Save video details to the database
    const videoData = new videos({
      fileName: originalname,
      originalSize: size,
      compressedSize: chunks.reduce(
        (total, chunkFile) =>
          total + fs.statSync(path.join(chunkDir, chunkFile)).size,
        0
      ),
      compressionStatus: "Completed",
      downloadLinks: {
        original: originalUpload.Location,
        chunks: uploadedChunks.map((chunk) => chunk.Location),
      },
    });

    await videoData.save();

    // Clean up local files
    try {
      fs.unlinkSync(filePath); // Original video
      chunks.forEach((chunkFile) =>
        fs.unlinkSync(path.join(chunkDir, chunkFile))
      ); // Chunks
    } catch (err) {
      console.error("Error deleting files:", err);
    }

    res.status(200).json(videoData);
  } catch (error) {
    console.error("Upload or compression failed:", error);

    // Clean up files on error
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      fs.readdirSync(chunkDir).forEach((chunkFile) =>
        fs.unlinkSync(path.join(chunkDir, chunkFile))
      );
    } catch (err) {
      console.error("Error deleting files:", err);
    }

    res.status(500).json({
      message: "Upload or compression failed",
      error: error.message || error,
    });
  }
}

export async function download(req, res) {
  try {
    const video = await videos.findById(req.params.id);
    if (!video) return res.status(404).json({ message: "Video not found" });

    res.status(200).json({
      original: video.downloadLinks.original,
      compressed: video.downloadLinks.compressed,
    });
  } catch (error) {
    res.status(500).json({ message: "Error retrieving video", error });
  }
}

export async function videoById(req, res) {
  try {
    const video = await videos.findById(req.params.id);
    if (!video) return res.status(404).json({ message: "Video not found" });

    res.status(200).json(video);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving video", error });
  }
}
