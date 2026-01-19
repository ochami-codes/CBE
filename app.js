import 'dotenv/config';
import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth/index.js";
import adminRoutes from "./routes/admin/index.js";
import donationRoutes from "./routes/donations.js";
import eventRoutes from "./routes/events.js";
import pastorRoutes from "./routes/pastor/index.js";
import profileRoutes from "./routes/profile/index.js";
import churchRoutes from "./routes/churches.js";
import childrenRoutes from "./routes/children-members.js";
import treasuryRoutes from "./routes/treasury/index.js";
import treasuryTransactionRoutes from "./routes/treasury/transactions.js";
import verseRoutes from "./routes/daily-verse.js";
import announcementRoutes from "./routes/announcements.js";
import myBirthdayRoutes from "./routes/dashboard/myBirthday.js";
import todaysBirthdayRoutes from "./routes/dashboard/todaysBirthdays.js";

import memberRoutes from "./routes/members.js";
import requireAuth from "./middleware/requireAuth.js";
import requireAdmin from "./middleware/requireAdmin.js";
import attendanceRoutes from "./routes/attendance.js";
import { supabase } from "./supabaseClient.js";

const app = express();

// global middleware
app.use(cors());
app.use(express.json());

// attach supabase client to every request
app.use((req, res, next) => {
  req.supabase = supabase;
  next();
});

/**
 * PUBLIC ROUTES
 */
app.use("/auth", authRoutes);
app.use("/churches", churchRoutes);

/*** Dashboard routes */
app.use("/dashboard/daily-verse", verseRoutes);
app.use("/dashboard/announcements", announcementRoutes);
app.use("/dashboard/my-birthday", myBirthdayRoutes);
app.use("/dashboard/todays-birthdays",todaysBirthdayRoutes); 
/**
 * AUTHENTICATED ROUTES
 */
app.use("/profile", requireAuth, profileRoutes);
app.use("/donations", requireAuth, donationRoutes);
app.use("/events", requireAuth, eventRoutes);
app.use("/pastor", requireAuth, pastorRoutes);
app.use("/members", memberRoutes);
app.use("/attendance", attendanceRoutes);
app.use("/children", childrenRoutes);
app.use("/treasury", treasuryRoutes);
app.use("/treasury/transactions", treasuryTransactionRoutes);
/**
 * ADMIN ROUTES
 */
app.use("/admin", requireAuth, requireAdmin, adminRoutes);

/**
 * Health check
 */
app.get("/", (req, res) => {
  res.json({ status: "API running" });
});

export default app;
