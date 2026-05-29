// routes/auth/register.js

import express from "express";

import {
  registerUserWithProfile,
} from "../../services/auth/registerUserWithProfile.js";

const router = express.Router();

router.post(
  "/",
  async (req, res) => {

    try {

      const result =
        await registerUserWithProfile(
          req.body
        );

      return res
        .status(201)
        .json(result);

    } catch (err) {

      console.error(
        "❌ Registration error:",
        err
      );

      return res.status(500).json({
        message:
          err.message ||
          "Registration failed",
      });
    }
  }
);

export default router;
