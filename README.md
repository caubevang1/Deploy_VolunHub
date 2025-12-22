# VolunteerHub

Fueling volunteer passion.

VolunteerHub is a Single Page Application (SPA) for organizing and managing volunteer activities (tree planting, clean-ups, charity drives, community tutoring, etc.). The project contains a React frontend and a Node.js + Express backend (MVC style). The system supports three roles: Volunteer, Event Manager, and Admin.

Key features (by role)
- Common / Platform
  - Email/password authentication and role-based access control (JWT).
  - Event discovery (search, filtering by date/category).
  - Per-event discussion channel (post/comment/like) created automatically when an event is approved.
  - Role-specific dashboards (Volunteer, Event Manager, Admin).
  - Export data (CSV/JSON) endpoints for Admin.

- Volunteer
  - Register / login.
  - Browse events with details (name, date, location, description, gallery).
  - Register & cancel registration before the event starts.
  - View participation history and completion status.
  - Receive notifications (push/email hooks supported).
  - Access and interact with event discussion channel after event approval.

- Event Manager
  - Register / login.
  - Create / edit / delete events (file upload support for cover images; use multipart/form-data).
  - Approve / reject volunteer registrations.
  - Mark volunteer participation as completed and rate performance.
  - View participants and event-specific reports.
  - Access event discussion channel for approved events.
  - Manager dashboard: overview of managed events, registrations, and basic stats.

- Admin
  - Login and system-level management.
  - Approve / reject / delete events created by managers.
  - Manage users (list, lock/unlock accounts, change roles).
  - Export events / users / volunteers (CSV or JSON) via blob responses.
  - Admin dashboard with system statistics and recent activity.

Project structure (top-level)
- frontend/ — React SPA (pages, templates, services, assets)
- backend/ — Express API (controllers, models, routes, middlewares)
- README.md — this file

Important backend routes (examples)
- Admin
  - GET /api/admin/dashboard
  - GET /api/admin/events/all
  - GET /api/admin/events/pending
  - PUT /api/admin/events/:id/approve
  - PUT /api/admin/events/:id/reject
  - DELETE /api/admin/events/:id
  - GET /api/admin/users
  - PUT /api/admin/users/:id/status
  - GET /api/admin/export/users?format=csv
- Event Manager / Dashboard
  - GET /api/dashboard/manager/events
  - GET /api/dashboard/manager/events/:eventId/registrations
  - PUT /api/dashboard/manager/registrations/:id/approve-cancel
- Public / Events
  - GET /api/events/public
  - GET /api/events/public/:eventId
- Note: Authentication and role middleware are applied to protected routes.

Development setup (local)
1. Backend
   - cd backend
   - npm install
   - Create a `.env` in backend (see required variables below).
   - npm start
   - Default server URL: http://localhost:5000

2. Frontend
   - cd frontend
   - npm install
   - npm start
   - Default app URL: http://localhost:3000
   - If needed, set API base URL via environment variables (e.g., VITE_API_BASE_URL).

Required environment variables (backend) — use placeholders, do not commit real secrets
- MONGO_URI=your_mongo_connection_string
- JWT_SECRET=your_jwt_secret
- PORT=5000
- SMTP_EMAIL=your_smtp_email
- SMTP_PASS=your_smtp_password
- VAPID_PUBLIC_KEY=your_vapid_public_key
- VAPID_PRIVATE_KEY=your_vapid_private_key

VAPID keys (Web Push)
- VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY are required for Web Push notifications. If your .env is missing valid VAPID keys, generate them (e.g., using web-push library) and add them to your local `.env`. Example generator (node):
  - npm i -g web-push
  - node -e "const webpush=require('web-push'); console.log(webpush.generateVAPIDKeys())"

Notes & caveats
- Do not commit real secrets. Keep .env values local and private.
- API responses for file export use `responseType: blob` on the frontend.
- Many frontend components expect backend fields like `event.id`, `createdBy`, `stats` — keep consistent payloads.
- If you hit CORS issues, enable CORS on the backend or configure a dev proxy in the frontend.
- For large uploads, ensure backend file size limits and multipart handling are configured.

Testing & seeding
- The repository does not include a production seed by default. Create seed scripts or use Postman to create sample users (Volunteer / EventManager / Admin) and sample events for testing.

Contributing / Notes for the team
- Keep frontend UI logic separate from service/API calls (see services/* files).
- Follow role-based access checks in backend middlewares (verifyToken, admin, eventManager).
- When altering APIs, update frontend services accordingly (services/*).

Contacts / Team
- Nguyễn Trường Nam — 23021644  
- Nguyễn Đăng Đạo — 23021516  
- Nguyễn Lê Anh Tuấn — 23021708
