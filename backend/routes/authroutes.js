import express from "express";
const router = express.Router();
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import z from "zod";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const registrationschema = z.object({
  name: z.string(),
  email: z.string().email(),
  password: z.string().min(6, "Please enter a valid password (min 6 chars)")
});

const loginschema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Please enter a valid password (min 6 chars)")
});

// 🚀 Register Route
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = registrationschema.parse(req.body);

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword
      }
    });

    res.status(201).json({ message: "User registered successfully", userId: newUser.id });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Invalid input or error occurred", error: err.message });
  }
});

// 🔐 Login Route
router.post("/login", async (req, res) => {
  try {
    const { email, password } = loginschema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: "1d"
    });

    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 86400000 // 1 day
    });

    res.status(200).json({ message: "User logged in successfully", token });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Login failed", error: err.message });
  }
});

export default router;
