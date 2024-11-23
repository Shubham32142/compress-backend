import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";

export async function compressVideo(inputPath, chunkDir, chunkSize = 10) {
  return new Promise((resolve, reject) => {
    // Ensure the chunk directory exists
    if (!fs.existsSync(chunkDir)) {
      fs.mkdirSync(chunkDir, { recursive: true });
    }

    const chunkPath = path.join(chunkDir, "chunk%d.mp4");

    ffmpeg(inputPath)
      .output(chunkPath)
      .outputOptions(
        "-segment_time",
        chunkSize.toString(), // Specify chunk duration
        "-f",
        "segment", // Use segmenting format
        "-reset_timestamps",
        "1" // Reset timestamps for each chunk
      ).videoCodec('libx264')
      .audioCodec('aac')
      .audioBitrate('128k')
      .size("50%")
      .preset('fast')
       // Compress size to 70%
      .on("end", () => {
        console.log("Splitting and compression complete");
        resolve();
      })
      .on("error", (err) => {
        console.error("Compression error:", err);
        reject(err);
      })
      .run();
  });
}
