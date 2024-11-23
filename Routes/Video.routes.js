import express from "express";
import { fileURLToPath } from "url";
import { dirname } from "path";
import multer from "multer";
import {
  uploadVideo,
  download,
  videoById,
} from "../Controller/video.controller.js";
import fs from "fs";

// Get the directory name of the current file for file paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set up multer to store uploaded files in memory
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // Limit to 100MB
});

// Define Routes
export function Routes(server) {
  // POST /videos/upload - Upload video
  server.post("/videos/upload", upload.single("video"), uploadVideo);

  // GET /videos/:id/download - Get download links for video
  server.get("/videos/:id/download", download);

  // GET /video/:id - Get video metadata by ID
  server.get("/video/:id", videoById);

  // Error handling middleware
  server.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: err.message || "Internal Server Error" });
  });
}
