import { ExpressError } from "../middleware/expressError.js";
import { User } from "../models/userModel.js";
import bcrypt from "bcrypt";
import { createToken } from "../utils/createToken.js";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 3 * 24 * 60 * 60 * 1000,
  path: "/",
};

export async function register(req, res, next) {
  try {
    const { firstName, lastName, email, password } = req.body;
    if (!firstName || !lastName || !email || !password) {
      throw new ExpressError("All fields are required", 400);
    }

    const existingUser = await User.findByEmail(email);

    if (existingUser) {
      return next(new ExpressError("Email already in use.", 400));
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
    });
    const token = createToken(newUser);
    res.cookie("jwt", token, cookieOptions);
    return res.status(201).json({
      user: {
        id: newUser.id,
        firstname: newUser.firstName ?? newUser.firstname,
        lastname: newUser.lastname,
        email: newUser.email,
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function login(req, res, next) {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return next(new ExpressError("Email and password required", 400));
    }
    const existingUser = await User.findByEmail(email);

    if (!existingUser) {
      return next(new ExpressError("Invalid email or password", 401));
    }
    const auth = await bcrypt.compare(password, existingUser.password);
    if (!auth) {
      return next(new ExpressError("Invalid email or password", 401));
    }

    const token = createToken(existingUser);
    res.cookie("jwt", token, cookieOptions);
    return res.status(200).json({
      user: {
        id: existingUser.id,
        firstName: existingUser.firstName ?? existingUser.firstname,
        lastName: existingUser.lastName ?? existingUser.lastname,
        email: existingUser.email,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const { firstName, lastName, email, currentPassword, newPassword } =
      req.body;
    const userId = req.user.id;
    if (newPassword) {
      const validPassword = await User.verifyPassword(userId, currentPassword);
      if (!validPassword) {
        throw new ExpressError("Current password is incorrect", 401);
      }
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await User.updatePassword(userId, hashedPassword);
    }
    const updatedUser = await User.updateUser({
      id: userId,
      firstName,
      lastName,
      email,
    });

    res.json(updatedUser);
  } catch (err) {
    return next(err);
  }
}

export function logout(req, res) {
  res.clearCookie("jwt", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  });

  return res.json({
    message: "Logged out successfully",
  });
}
export async function getProfile(req, res, next) {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return next(new ExpressError("User not found", 404));
    }

    return res.json(user);
  } catch (err) {
    return next(err);
  }
}
