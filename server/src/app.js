import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import { db } from "./db.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { router as userRoutes } from "./routes/userRoutes.js";
import { router as groupRoutes } from "./routes/groupRoutes.js";
import ticketmasterRoutes from "./routes/ticketmasterRoutes.js";

const app = express();

app.set("trust proxy", 1);
app.use(helmet());

const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

app.use(express.json());
app.use(cookieParser());

app.use("/users", userRoutes);
app.use("/groups", groupRoutes);
app.use("/ticketmaster", ticketmasterRoutes);

app.get("/", async (req, res) => {
  const result = await db.query("SELECT NOW()");

  res.json({
    status: "ok",
    dbTime: result.rows[0].now,
  });
});
app.use(errorHandler);
export { app };
