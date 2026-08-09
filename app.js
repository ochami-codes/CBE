// backend/app.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import { userContext } from "./middleware/userContext.js";
import { authorizeChurch } from "./middleware/authorizeChurch.js";
import authRoutes from "./routes/auth/auth.routes.js";
import adminRoutes from "./routes/admin/admin.routes.js";
import membershipRoutes from "./routes/membership/membership.routes.js";
import pastorRoutes from "./routes/pastor/pastor.routes.js";
import profileRoutes from "./routes/profile/profile.routes.js";
import clerkRoutes from "./routes/clerk/clerk.routes.js";
import treasuryRoutes from "./routes/treasury/treasury-routes.js";
import dashboardRoutes from "./routes/dashboard/dashboard.routes.js";
import announcementRoutes from "./routes/announcements/announcements.routes.js";
import messageRoutes from "./routes/messages/messages.routes.js";
import memberRoutes from "./routes/members/member.routes.js";
import notificationRoutes from "./routes/notifications/notifications.routes.js";
import attendanceRoutes from "./routes/attendance/attendance.routes.js";
import roleRoutes from "./routes/roleRequests/role.requests.routes.js";
import reusableRoutes from "./routes/reusables/reusables.routes.js";
import sabbathSchoolRoutes from "./routes/sabbathSchool/sabbathSchool.routes.js";
import { supabaseAdmin } from "./supabaseClient.js";
import { errorHandler } from "./errors/errorHandler.js";

const app = express();

/* ----------------- Global middleware ------------------ */
const allowedOrigins = [
  "http://localhost:5173",
  "https://cms-ian-ochami-s-projects.vercel.app",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

app.use(express.json());

/* ------------------ Attach Supabase ------------------ */
app.use((req, res, next) => {
  req.supabase = supabaseAdmin;
  next();
});

app.use("/auth", authRoutes);
app.use("/reusables", userContext, reusableRoutes);
app.use("/dashboard", userContext, dashboardRoutes);
app.use("/announcements", userContext,authorizeChurch, announcementRoutes);
app.use("/notifications", userContext, notificationRoutes);
app.use("/messages", userContext, authorizeChurch, messageRoutes);
app.use("/profile", userContext, profileRoutes);
app.use("/membership-requests", userContext, membershipRoutes);
app.use("/pastor", userContext, authorizeChurch, pastorRoutes);
app.use("/members", userContext, authorizeChurch, memberRoutes);
app.use("/attendance", userContext, authorizeChurch, attendanceRoutes);
app.use("/clerk", userContext, authorizeChurch, clerkRoutes);
app.use("/treasury", userContext, authorizeChurch, treasuryRoutes);
app.use("/role-requests", userContext, authorizeChurch, roleRoutes);
app.use("/sabbath-school", userContext, authorizeChurch, sabbathSchoolRoutes);
app.use("/admin", userContext, authorizeChurch, adminRoutes);


app.use(errorHandler);
/* ------------------ Health check ------------------ */
app.get("/", (req, res) => {
  res.json({ status: "API running" });
});
export default app;
