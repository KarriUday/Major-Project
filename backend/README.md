# Project Tracking & Allocation System - Backend

REST API backend for the academic project tracking, allocation, and review scheduling system.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- npm or yarn

### Installation

1. **Clone and setup**
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database URL and SMTP settings
   ```

3. **Setup database**
   ```bash
   npx prisma migrate dev --name init
   npm run seed
   ```

4. **Start server**
   ```bash
   npm run dev
   ```

Server will run on `http://localhost:3000`

## 🐳 Docker Setup

```bash
docker-compose up -d
```

## 📚 API Documentation

### Authentication

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "firstName": "John",
  "lastName": "Doe",
  "role": "STUDENT"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

### Excel Exports (Admin/Faculty only)

#### Export All Data
```http
GET /api/excel/export-all?cycleId=cycle-123
Authorization: Bearer {token}
```

#### Export Students
```http
GET /api/excel/export-students?cycleId=cycle-123
Authorization: Bearer {token}
```

#### Export Groups
```http
GET /api/excel/export-groups?cycleId=cycle-123
Authorization: Bearer {token}
```

#### Export Faculty
```http
GET /api/excel/export-faculty
Authorization: Bearer {token}
```

#### Export Allocations
```http
GET /api/excel/export-allocations?cycleId=cycle-123
Authorization: Bearer {token}
```

### Groups

#### Get Groups
```http
GET /api/groups?cycleId=cycle-123&status=FORMED
Authorization: Bearer {token}
```

#### Create Group
```http
POST /api/groups
Authorization: Bearer {token}
Content-Type: application/json

{
  "groupName": "Group A",
  "cycleId": "cycle-123",
  "projectTitle": "AI Chatbot",
  "projectDomain": "Artificial Intelligence",
  "maxMembers": 4
}
```

#### Add Member to Group
```http
POST /api/groups/{groupId}/members
Authorization: Bearer {token}
Content-Type: application/json

{
  "studentId": "student-123"
}
```

### Reviews

#### Schedule Review
```http
POST /api/reviews/schedule
Authorization: Bearer {token}
Content-Type: application/json

{
  "groupId": "group-123",
  "facultyId": "faculty-123",
  "phase": "R0",
  "scheduledDate": "2025-07-15T10:00:00Z"
}
```

#### Mark Attendance
```http
POST /api/reviews/attendance
Authorization: Bearer {token}
Content-Type: application/json

{
  "reviewSessionId": "review-123",
  "studentId": "student-123",
  "status": "PRESENT"
}
```

#### Submit Evaluation
```http
POST /api/reviews/evaluate
Authorization: Bearer {token}
Content-Type: application/json

{
  "groupId": "group-123",
  "reviewSessionId": "review-123",
  "facultyId": "faculty-123",
  "technicalScore": 85,
  "presentationScore": 90,
  "documentationScore": 80,
  "feedback": "Good project"
}
```

## 📊 Database Schema

See `prisma/schema.prisma` for the complete database design.

Key models:
- **User**: Authentication and user profiles
- **Student**: Student-specific data
- **Faculty**: Faculty information and allocations
- **Cycle**: Project cycles (Major, Mini, Internship)
- **ProjectGroup**: Student project groups
- **ReviewSession**: Review scheduling and tracking
- **Evaluation**: Performance evaluations
- **Notification**: User notifications

## 🔧 Configuration

### Environment Variables

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/pts_db

# JWT
JWT_SECRET=your_secret_key
JWT_EXPIRY=7d

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
MAIL_FROM=Project Tracking <noreply@pts.local>

# Frontend
FRONTEND_URL=http://localhost:3001

# Files
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880
```

## 📦 Dependencies

- **Express.js**: Web framework
- **Prisma**: ORM for database management
- **JWT**: Authentication tokens
- **ExcelJS**: Excel file generation
- **Nodemailer**: Email sending
- **Socket.IO**: Real-time notifications
- **bcryptjs**: Password hashing

## 📝 Scripts

```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm run seed       # Seed database with sample data
npm run test       # Run tests
npm run lint       # Run ESLint
```

## 🔐 Security

- JWT token authentication
- Password hashing with bcryptjs
- Input validation with express-validator
- CORS configuration
- Environment variable protection
- Role-based access control

## 📄 License

MIT
