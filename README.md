# CBE - Church Backend Engine

The backend that powers the CMS (Church Management System). My very first backend project.

> Where I went from "React is hard" to "oh, so this is how full-stack works."

**Frontend:** [CMS](https://github.com/your-username/CMS)

---

### Overview

CBE is a REST API built to handle real Adventist church workflows — members, roles, finance, clerk records, and role-based access for dashboards like admin, pastor, treasury, and clerk.

This was built before SAM-Backend. It's simpler, messier, but it works and it taught me everything.

### What it Powers

- **CMS Frontend** on Vercel
- Handles auth and role-based permissions
- Manages church data for all dashboards

### Features

- **Auth & Roles** - JWT authentication with role guards (admin, pastor, treasury, clerk)
- **Member Management** - CRUD for members, transfers, status
- **Finance Module** - Offerings, expenses for treasury dashboard
- **Clerk Module** - Records, reports, member stats
- **Supabase Integration** - Auth + Database
- **RESTful API** - Clean Express routes

### Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** JavaScript
- **Database & Auth:** Supabase (Postgres + Auth)
- **Auth:** Supabase Auth + JWT
- **Deployment:** Render

- ### What I Learned ( First Backend )
-  1. How Express server works
   2. What Supabase actually does ( auth + storage + DB )
   3. CORS errors and how to fix them

### Related Projects 
1. Advent-project — where I dumped HTML files
2. CBE — First Backend (this repo)
3. CMS — First React app powered by CBE
4. SAM-BACKEND — Current backend standard
5. SAM-FRONTEND — Current frontend standard—
   You can literally see growth.

### License 
  MIT

### Author 
Ian Ochami — First backend that actually powered something real 
