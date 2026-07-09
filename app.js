// backend/app.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import { userContext } from "./middleware/userContext.js";
import authRoutes from "./routes/auth/index.js";
import activeChurch from "./routes/church/activeChurch.js";
import createChurch from "./routes/church/createChurch.js";
import adminRoutes from "./routes/admin/index.js";
import membershipRoutes from "./routes/membership/member.js";
import adminMembershipRoutes from "./routes/membership/admin.js";
import donationRoutes from "./routes/donations.js";
import pastorRoutes from "./routes/pastor/pastorRoutes.js";
import profileRoutes from "./routes/profile/index.js";
import churchRoutes from "./routes/churches.js";
import childrenRoutes from "./routes/children-members.js";
import clerkRoutes from "./routes/clerk/clerk.routes.js";
import treasuryRoutes from "./routes/treasury/treasury-routes.js";
import verseRoutes from "./routes/daily-verse.js";
import announcementRoutes from "./routes/announcements/announcements.routes.js";
import myBirthdayRoutes from "./routes/dashboard/myBirthday.js";
import upcomingBirthdays from "./routes/dashboard/upcomingBirthdays.js";
import todaysBirthdayRoutes from "./routes/dashboard/todaysBirthdays.js";
import departmentRoutes from "./routes/departments.js";
import messageRoutes from "./routes/messages/messages.js";
import memberRoutes from "./routes/members/member.routes.js";
import notificationRoutes from "./routes/notifications.js";
import attendanceRoutes from "./routes/attendance.js";
import roleRoutes from "./routes/roles.js"
import myRequest from "./routes/role-requests.js";
import conferenceRoutes from "./routes/conferences.js";
import { supabaseAdmin } from "./supabaseClient.js";

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

/* ------------------ Public routes ------------------ */
app.use("/auth", authRoutes);
app.use("/churches", churchRoutes);
app.use("/roles",roleRoutes); 
app.use("/conferences", conferenceRoutes);
/* ------------------ Dashboard routes (auth optional inside route) ------------------ */
app.use("/dashboard/daily-verse", verseRoutes);
app.use("/dashboard/announcements", userContext, announcementRoutes);
app.use("/dashboard/upcoming-birthdays",userContext, upcomingBirthdays);
app.use("/dashboard/my-birthday", userContext, myBirthdayRoutes);
app.use("/dashboard/todays-birthdays", userContext, todaysBirthdayRoutes);
app.use("/notifications", userContext, notificationRoutes);
app.use("/messages", userContext, messageRoutes);
/* ------------------ Authenticated routes ------------------ */
app.use("/profile", userContext, profileRoutes);
app.use("/membership-requests", userContext, membershipRoutes);
app.use("/donations", userContext, donationRoutes);
app.use("/create-church", userContext, createChurch);
app.use("/active-church", userContext, activeChurch);
app.use("/pastor", userContext, pastorRoutes);
app.use("/members", userContext, memberRoutes);
app.use("/departments", userContext, departmentRoutes);
app.use("/attendance", userContext, attendanceRoutes);
app.use("/children", userContext, childrenRoutes);
app.use("/clerk", userContext, clerkRoutes);
app.use("/treasury", userContext, treasuryRoutes);
app.use("/role-requests", userContext, myRequest);

/* ------------------ Admin routes ------------------ */
app.use("/admin", userContext, adminRoutes);
app.use("/admin/membership-requests", userContext, adminMembershipRoutes);

/* ------------------ Health check ------------------ */
app.get("/", (req, res) => {
  res.json({ status: "API running" });
});
export default app;
