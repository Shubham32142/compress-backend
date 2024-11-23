import express from "express";
import mongoose from "mongoose";
import cors from "cors";
const app = express();
import dotenv from "dotenv";
import { Routes } from "./Routes/Video.routes.js";
dotenv.config();
app.use(express.json());
app.use(cors());
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`server is running at port ${PORT}`);
});

mongoose
  .connect(process.env.MONGODB_URL)
  .then(() => console.log("Database connected successfully"))
  .catch((err) => console.error("Error connecting to database", err));

Routes(app);
