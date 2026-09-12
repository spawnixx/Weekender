import { ExpressError } from "./expressError.js";
import jwt from "jsonwebtoken";
import "dotenv/config";

export const tokenAuth = (req, res, next) => {
  try {
    const token = req.cookies.jwt;

    if (!token) {
      throw new ExpressError("Authenticated required", 401);
    }

    req.user = jwt.verify(token, process.env.JWT_SECRET);

    return next();
  } catch (err) {
    console.error("JWT VERIFY ERROR:", err.message);
    return next(
      new ExpressError("Invalid or expired authentication token", 401),
    );
  }
};
