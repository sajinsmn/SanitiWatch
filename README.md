# System Modules & Architecture Report.
**Project:** SanitiWatch - Waste Management System  
**Generated:** November 21, 2025  
**Type:** Full-Stack MERN Application

---

## 📑 Table of Contents
1. [System Overview](#system-overview)
2. [Database Schemas (Master Forms)](#database-schemas-master-forms)
3. [Backend Modules & API Endpoints](#backend-modules--api-endpoints)
4. [Frontend Modules & Pages](#frontend-modules--pages)
5. [Transaction Forms](#transaction-forms)
6. [Master Data Management](#master-data-management)
7. [Business Process Flows](#business-process-flows)
8. [Integration Points](#integration-points)

---

## 🎯 System Overview

### Application Purpose
**SanitiWatch** is a comprehensive waste management and sanitation reporting system that enables:
- Citizens to report sanitation issues
- Workers to manage and complete assigned tasks
- Management to oversee operations and generate reports
- Admins to configure system settings and manage users

### Technology Stack
- **Frontend:** React.js 19.2.0 with React Router
- **Backend:** Node.js with Express.js 5.1.0
- **Database:** MongoDB with Mongoose ODM
- **Cloud Services:** Cloudinary (images), MailerSend (emails)
- **Mapping:** Google Maps API with Heatmap visualization

### User Roles
1. **User** - Regular citizens reporting issues
2. **Worker** - Field workers assigned to resolve issues
3. **Management** - Supervisors overseeing operations
4. **Admin** - System administrators with full control

---

## 📊 Database Schemas (Master Forms)

### 1. **User Schema** (Authentication Master)
**Collection:** `users`  
**Purpose:** Core authentication and user management

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `username` | String | Unique username | Required, Unique |
| `password` | String | Hashed password (bcrypt) | Required, Min 6 chars |
| `email` | String | User email address | Required, Unique |
| `role` | String | User role | Enum: user, admin, worker, management |
| `isBlocked` | Boolean | Account block status | Default: false |
| `profileImage` | String | Profile image URL | Optional |
| `workerCode` | String | Unique worker identifier | Worker only, Unique |
| `workerDetails` | Object | Embedded worker info | Worker only |

**Indexes:** username, email, workerCode

---

### 2. **Report Schema** (Transaction Master)
**Collection:** `reports`  
**Purpose:** Core transaction entity for issue reporting

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `ticketNumber` | String | Unique ticket ID | Required, Unique, Auto-generated |
| `userId` | String | Reporter user ID | Required |
| `username` | String | Reporter username | Required |
| `title` | String | Issue title | Required |
| `description` | String | Detailed description | Required |
| `category` | String | Issue category | Required, From SystemOptions |
| `photoPath` | String | Original issue photo URL | Required |
| `photoPublicId` | String | Cloudinary public ID | For deletion |
| **Location Object** | | | |
| `location.latitude` | String | GPS latitude | Required |
| `location.longitude` | String | GPS longitude | Required |
| `location.address` | String | Human-readable address | Required |
| **Waste Assessment** | | | |
| `wasteConditions` | Array[String] | Condition tags | Enum: smelly, hazardous, blocking_pathway, pest_infestation, fire_risk, spillage, other |
| `userPriority` | String | User-assigned priority | Enum: low, medium, high, emergency |
| `wasteAmount` | Number | Waste quantity (0-100%) | Default: 50 |
| **Status Management** | | | |
| `status` | String | Current status | Default: 'Reported' |
| `priority` | String | Admin-assigned priority | Default: 'Medium' |
| `assignedWorkerId` | String | Assigned worker ID | Optional |
| `internalNotes` | String | Admin/Management notes | Optional |
| **Completion Tracking** | | | |
| `completionPhotoPath` | String | Completion photo URL | Optional |
| `completionPhotoPublicId` | String | Cloudinary public ID | For deletion |
| `completedAt` | Date | Completion timestamp | Optional |
| `completedBy` | String | Worker who completed | Optional |
| **Lifecycle Management** | | | |
| `originalImageCleaned` | Boolean | Original image deleted | Default: false |
| `completionImageCleaned` | Boolean | Completion image deleted | Default: false |
| `imagesCleanedAt` | Date | Cleanup timestamp | Optional |
| `isTaskClosed` | Boolean | Task closed after 7 days | Default: false |
| `taskClosedAt` | Date | Closure timestamp | Optional |
| `timestamp` | Date | Creation timestamp | Auto-generated |
| `createdAt` | Date | Auto-timestamp | Mongoose timestamps |
| `updatedAt` | Date | Auto-timestamp | Mongoose timestamps |

**Indexes:** ticketNumber, userId, status, assignedWorkerId, timestamp  
**Business Rules:**
- Ticket number format: `TKT-YYYYMMDD-XXXXX`
- Images auto-delete 7 days after completion
- Tasks auto-close 7 days after completion

---

### 3. **UserDetails Schema** (User Profile Master)
**Collection:** `userdetails`  
**Purpose:** Extended profile information for regular users

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `userId` | String | Reference to User._id | Required, Unique |
| `username` | String | Username | Required |
| `fullName` | String | Full legal name | Required |
| `address` | String | Residential address | Required |
| `phone` | String | Contact number | 10 digits |
| `email` | String | Email address | Unique |
| `gender` | String | Gender | Enum: male, female, other |
| `profileImage` | String | Profile photo URL | Optional |
| `createdAt` | Date | Registration date | Auto-generated |

**Validation Rules:**
- Phone: Exactly 10 digits, unique across non-worker users
- Full Name: Alphabets and spaces only
- Email: Must be unique across all user types

---

### 4. **WorkerDetails Schema** (Worker Profile Master)
**Collection:** `workerdetails`  
**Purpose:** Extended profile for field workers

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `userId` | String | Reference to User._id | Required, Unique |
| `username` | String | Username | Required |
| `workerCode` | String | Unique worker code | Required, Unique, Format: WRK-XXXXX |
| `fullName` | String | Full name | Required |
| `address` | String | Address | Required |
| `phone` | String | Contact number | 10 digits |
| `department` | String | Department/Team | Optional |
| `email` | String | Email address | Unique |
| `gender` | String | Gender | Enum: male, female, other |
| `profileImage` | String | Profile photo URL | Optional |
| **Work Tracking** | | | |
| `workHistory` | Array[Object] | Completed jobs | |
| `workHistory[].jobTitle` | String | Job title | |
| `workHistory[].company` | String | Company name | |
| `workHistory[].duration` | String | Duration | |
| `workHistory[].description` | String | Job description | |
| `workHistory[].completedAt` | Date | Completion date | |
| `currentStatus` | String | Availability status | Enum: available, busy, offline |
| `pendingJobs` | Array[String] | Array of report IDs | |
| `createdAt` | Date | Registration date | Auto-generated |

**Business Rules:**
- Worker code auto-generated if not provided
- Phone can be shared among workers (not unique)
- Current status auto-updates based on assignments

---

### 5. **ManagementDetails Schema** (Management Profile Master)
**Collection:** `managementdetails`  
**Purpose:** Extended profile for management users

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `userId` | String | Reference to User._id | Required, Unique |
| `username` | String | Username | Required |
| `fullName` | String | Full name | Required |
| `roleInManagement` | String | Management role/title | Required |
| `address` | String | Address | Required |
| `email` | String | Email address | Unique |
| `phone` | String | Contact number | 10 digits, Unique |
| `gender` | String | Gender | Enum: male, female, other |
| `profileImage` | String | Profile photo URL | Optional |
| `createdAt` | Date | Registration date | Auto-generated |

---

### 6. **AdminDetails Schema** (Admin Profile Master)
**Collection:** `admindetails`  
**Purpose:** Extended profile for system administrators

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `userId` | String | Reference to User._id | Required, Unique |
| `username` | String | Username | Required |
| `fullName` | String | Full name | Required |
| `roleTitle` | String | Admin role/title | Required |
| `address` | String | Address | Required |
| `email` | String | Email address | Unique |
| `phone` | String | Contact number | 10 digits, Unique |
| `gender` | String | Gender | Enum: male, female, other |
| `profileImage` | String | Profile photo URL | Optional |
| `createdAt` | Date | Registration date | Auto-generated |

---

### 7. **Contact Schema** (Contact Form Master)
**Collection:** `contacts`  
**Purpose:** Contact/inquiry form submissions

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `name` | String | Sender name | Required |
| `email` | String | Sender email | Required |
| `subject` | String | Message subject | Required |
| `message` | String | Message content | Required |
| `recipientType` | String | Target recipient | Enum: general, management, admin |
| `status` | String | Message status | Enum: new, read, replied, closed |
| `priority` | String | Priority level | Enum: low, medium, high |
| `adminNotes` | String | Internal notes | Optional |
| `timestamp` | Date | Submission time | Auto-generated |
| `updatedAt` | Date | Last update time | Auto-generated |

**Indexes:** email, status, timestamp

---

### 8. **Feedback Schema** (Feedback Master)
**Collection:** `feedbacks`  
**Purpose:** User feedback on completed reports

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `reportId` | String | Reference to Report._id | Required, Indexed |
| `userId` | String | User who gave feedback | Required, Indexed |
| `username` | String | Username | Optional |
| `rating` | Number | Rating (1-5 stars) | Required, Min: 1, Max: 5 |
| `comment` | String | Feedback comment | Optional |
| `createdAt` | Date | Creation timestamp | Auto-generated |
| `updatedAt` | Date | Update timestamp | Auto-generated |

**Indexes:** reportId, userId, (reportId + userId) unique compound index  
**Business Rules:**
- One feedback per user per report
- Only available for completed reports
- Rating must be between 1-5

---

### 9. **Message Schema** (Chat System Master)
**Collection:** `messages`  
**Purpose:** Real-time messaging between users and workers

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `conversationId` | String | Conversation identifier | Required, Indexed |
| `senderId` | String | Message sender ID | Required, Indexed |
| `senderRole` | String | Sender role | Enum: user, worker, admin, management |
| `senderName` | String | Sender name | Required |
| `receiverId` | String | Message receiver ID | Required, Indexed |
| `receiverRole` | String | Receiver role | Enum: user, worker, admin, management |
| `messageText` | String | Message content | Required |
| `timestamp` | Date | Message timestamp | Auto-generated, Indexed |
| `isRead` | Boolean | Read status | Default: false |
| `visibility` | String | Visibility scope | Enum: private, sharedWithAdmin, sharedWithManagement, sharedWithBoth |

**Indexes:** conversationId, senderId, receiverId, timestamp, (conversationId + timestamp), (receiverId + isRead)

---

### 10. **Conversation Schema** (Conversation Master)
**Collection:** `conversations`  
**Purpose:** Conversation metadata and tracking

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `conversationId` | String | Unique conversation ID | Required, Unique, Indexed |
| `userId` | String | User participant ID | Required, Indexed |
| `userName` | String | User name | Required |
| `userRole` | String | User role | Enum: user, admin, management |
| `workerId` | String | Worker participant ID | Required, Indexed |
| `workerName` | String | Worker name | Required |
| `reportId` | String | Associated report ID | Optional |
| `visibility` | String | Visibility scope | Enum: private, sharedWithAdmin, sharedWithManagement, sharedWithBoth |
| `lastMessageTime` | Date | Last message timestamp | Auto-generated, Indexed |
| `lastMessageText` | String | Last message preview | Optional |
| **Unread Counts** | | | |
| `unreadCount.user` | Number | User unread count | Default: 0 |
| `unreadCount.worker` | Number | Worker unread count | Default: 0 |
| `unreadCount.admin` | Number | Admin unread count | Default: 0 |
| `unreadCount.management` | Number | Management unread count | Default: 0 |
| `completedAt` | Date | Report completion time | Optional |
| `isActive` | Boolean | Conversation active status | Default: true, Indexed |
| `createdAt` | Date | Creation timestamp | Auto-generated |
| `updatedAt` | Date | Update timestamp | Auto-generated |

**Indexes:** conversationId, userId, workerId, (userId + workerId), (visibility + lastMessageTime)  
**Business Rules:**
- Conversations auto-deactivate 7 days after report completion
- Unread counts update in real-time

---

### 11. **SystemOptions Schema** (Configuration Master)
**Collection:** `systemoptions`  
**Purpose:** Dynamic system configuration (categories, priorities, statuses)

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `type` | String | Option type | Required, Enum: category, priority, status |
| `value` | String | Option value | Required |
| `isActive` | Boolean | Active status | Default: true |
| `createdAt` | Date | Creation timestamp | Auto-generated |
| `updatedAt` | Date | Update timestamp | Auto-generated |

**Indexes:** type, (type + value) unique compound index  
**Default Values:**
- **Categories:** overflowing_bin, illegal_dumping, uncollected_garbage, broken_bin, other
- **Priorities:** Low, Medium, High, Emergency
- **Statuses:** Reported, Assigned, In Progress, Completed, Rejected

---

### 12. **GeneratedReports Schema** (Report Generation Master)
**Collection:** `generatedreports`  
**Purpose:** Scheduled/generated report metadata

| Field | Type | Description | Constraints |
|-------|------|-------------|-------------|
| `reportId` | String | Unique report ID | Auto-generated, Unique |
| `period` | String | Report period | Enum: Daily, Weekly, Monthly, Custom |
| `fromDate` | Date | Start date | Required |
| `toDate` | Date | End date | Required |
| `exportType` | String | Export format | Enum: PDF, Excel |
| `generatedBy` | String | Generator username | Required |
| `generatedById` | String | Generator user ID | Required |
| `filePath` | String | Generated file path | Auto-generated |
| `fileSize` | Number | File size in bytes | Auto-calculated |
| `reportData` | Object | Aggregated statistics | Auto-calculated |
| `createdAt` | Date | Generation timestamp | Auto-generated |
| `updatedAt` | Date | Update timestamp | Auto-generated |

**Business Rules:**
- Reports auto-generate based on period selection
- PDF and Excel formats available
- Contains aggregated statistics for the period

---

## 🔧 Backend Modules & API Endpoints

### Module 1: Authentication & User Management

#### **Endpoints:**

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/signup` | Create new user account | Public |
| POST | `/api/login` | User authentication | Public |
| POST | `/api/validate` | Validate username/email/phone uniqueness | Public |
| GET | `/api/warmup` | Keep server alive (prevent cold starts) | Public |

**Transaction Flow - User Registration:**
1. User submits signup form (username, password, email, role)
2. Backend validates:
   - Username uniqueness
   - Email uniqueness and format
   - Password length (min 6 chars)
3. Password hashed with bcrypt (10 salt rounds)
4. User record created in `users` collection
5. Success response with user ID

**Transaction Flow - User Login:**
1. User submits credentials (username, password)
2. Backend validates:
   - User exists
   - Account not blocked
   - Password matches (bcrypt compare)
3. Check registration completion status:
   - For workers: Check WorkerDetails collection
   - For users: Check UserDetails collection
   - For management: Check ManagementDetails collection
   - For admin: Check AdminDetails collection
4. Generate JWT token (mock in current implementation)
5. Return token + user data + registration status

---

### Module 2: Profile Management

#### **Endpoints:**

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/worker/register` | Complete worker registration | Authenticated |
| POST | `/api/user/register` | Complete user registration | Authenticated |
| POST | `/api/management/register` | Complete management registration | Authenticated |
| POST | `/api/admin/register` | Complete admin registration | Authenticated |
| GET | `/api/profile/:role/:userId` | Get profile details by role | Authenticated |
| POST | `/api/profile/upload-image` | Upload profile image | Authenticated |
| POST | `/api/profile/change-password` | Change user password | Authenticated |

**Transaction Form - Worker Registration:**
```javascript
{
  userId: String,          // Required
  workerCode: String,      // Auto-generated if not provided
  fullName: String,        // Required, alphabets only
  address: String,         // Required
  phone: String,           // Required, 10 digits
  department: String,      // Optional
  email: String,           // Optional, must be unique
  gender: String           // Optional: male/female/other
}
```

**Transaction Flow - Profile Image Upload:**
1. User uploads image file (max 10MB)
2. File validated (image type, size)
3. Image uploaded to Cloudinary (sanitiwatch/profile-images folder)
4. Image converted to WebP format
5. Cloudinary URL returned
6. URL saved to appropriate details collection
7. URL also saved to base User model

---

### Module 3: Report Management (Core Transaction Module)

#### **Endpoints:**

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/reports` | Create new report | Authenticated |
| GET | `/api/reports` | Get all reports | Authenticated |
| GET | `/api/reports/user/:userId` | Get user's reports | Authenticated |
| GET | `/api/reports/:id` | Get single report | Authenticated |
| PUT | `/api/reports/edit/:id` | Edit report (Reported status only) | Authenticated |
| DELETE | `/api/reports/:id` | Delete report (Reported status only) | Authenticated |
| PUT | `/api/reports/:id/assign` | Assign worker to report | Admin/Management |
| PUT | `/api/reports/:id/status` | Update report status | Admin/Management/Worker |
| POST | `/api/reports/:id/complete` | Mark report as completed | Worker |
| GET | `/api/reports/user/:userId/analytics` | Get user analytics | Authenticated |

**Transaction Form - Create Report:**
```javascript
{
  userId: String,                    // Required
  username: String,                  // Required
  title: String,                     // Required
  description: String,               // Required
  category: String,                  // Required, from SystemOptions
  photo: File,                       // Required, max 10MB
  location: {
    latitude: String,                // Required
    longitude: String,               // Required
    address: String                  // Required
  },
  wasteConditions: Array[String],    // Optional
  userPriority: String,              // Optional: low/medium/high/emergency
  wasteAmount: Number                // Optional: 0-100
}
```

**Transaction Flow - Create Report:**
1. User fills report form with photo
2. Frontend validates all required fields
3. Photo uploaded to Cloudinary (sanitiwatch/reports-img folder)
4. Generate unique ticket number (TKT-YYYYMMDD-XXXXX)
5. Create Report document in MongoDB
6. Send email notification to user (via MailerSend)
7. Return ticket number to user

**Transaction Form - Assign Worker:**
```javascript
{
  reportId: String,                  // Required
  workerId: String,                  // Required
  priority: String,                  // Optional: Low/Medium/High
  internalNotes: String              // Optional
}
```

**Transaction Flow - Assign Worker:**
1. Admin/Management selects report and worker
2. Backend validates:
   - Report exists and is in 'Reported' status
   - Worker exists and is active
3. Update report:
   - Set assignedWorkerId
   - Set status to 'Assigned'
   - Set priority if provided
   - Add internal notes if provided
4. Update worker:
   - Add report ID to pendingJobs array
   - Update currentStatus to 'busy'
5. Send email to user with worker details
6. Create conversation between user and worker

**Transaction Form - Complete Report:**
```javascript
{
  reportId: String,                  // Required
  workerId: String,                  // Required
  completionPhoto: File,             // Required, max 10MB
  completionNotes: String            // Optional
}
```

**Transaction Flow - Complete Report:**
1. Worker uploads completion photo
2. Photo uploaded to Cloudinary (sanitiwatch/completion-images folder)
3. Update report:
   - Set status to 'Completed'
   - Set completionPhotoPath
   - Set completedAt timestamp
   - Set completedBy worker ID
4. Update worker:
   - Remove report ID from pendingJobs
   - Update currentStatus if no pending jobs
5. Send email to user with completion photo
6. Update conversation completedAt timestamp
7. Schedule image cleanup (7 days)
8. Schedule task closure (7 days)

---

### Module 4: System Options Management (Master Data)

#### **Endpoints:**

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/system-options/:type` | Get options by type | Public |
| POST | `/api/system-options` | Add new option | Admin |
| PUT | `/api/system-options/:id` | Update option | Admin |
| DELETE | `/api/system-options/:id` | Delete option | Admin |

**Transaction Form - Add System Option:**
```javascript
{
  type: String,                      // Required: category/priority/status
  value: String                      // Required: option value
}
```

**Business Rules:**
- Only admins can modify system options
- Deleting an option doesn't affect existing reports
- Options are used in dropdowns across the application

---

### Module 5: Feedback Management

#### **Endpoints:**

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/feedback` | Create feedback | Authenticated |
| GET | `/api/feedback/user/:userId` | Get user's feedbacks | Authenticated |
| GET | `/api/feedback/report/:reportId` | Get report feedbacks | Authenticated |
| PUT | `/api/feedback/:id` | Update feedback | Authenticated |
| DELETE | `/api/feedback/:id` | Delete feedback | Authenticated |

**Transaction Form - Create Feedback:**
```javascript
{
  reportId: String,                  // Required
  userId: String,                    // Required
  username: String,                  // Optional
  rating: Number,                    // Required: 1-5
  comment: String                    // Optional
}
```

**Business Rules:**
- Only one feedback per user per report
- Only available for completed reports
- User can edit/delete their own feedback

---

### Module 6: Chat System

#### **Endpoints:**

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/conversations` | Create conversation | Authenticated |
| GET | `/api/conversations/user/:userId` | Get user conversations | Authenticated |
| GET | `/api/conversations/:conversationId` | Get conversation details | Authenticated |
| POST | `/api/messages` | Send message | Authenticated |
| GET | `/api/messages/:conversationId` | Get conversation messages | Authenticated |
| PUT | `/api/messages/:messageId/read` | Mark message as read | Authenticated |
| PUT | `/api/conversations/:conversationId/visibility` | Update visibility | Admin/Management |

**Transaction Form - Send Message:**
```javascript
{
  conversationId: String,            // Required
  senderId: String,                  // Required
  senderRole: String,                // Required
  senderName: String,                // Required
  receiverId: String,                // Required
  receiverRole: String,              // Required
  messageText: String,               // Required
  visibility: String                 // Optional
}
```

**Transaction Flow - Send Message:**
1. User/Worker composes message
2. Message saved to messages collection
3. Update conversation:
   - Set lastMessageTime
   - Set lastMessageText
   - Increment unread count for receiver
4. Real-time notification (if implemented)

---

### Module 7: Contact Management

#### **Endpoints:**

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/contact` | Submit contact form | Public |
| GET | `/api/admin/contacts` | Get all contacts (Admin) | Admin |
| GET | `/api/management/contacts` | Get management contacts | Management |
| PUT | `/api/admin/contacts/:id` | Update contact status | Admin |
| DELETE | `/api/admin/contacts/:id` | Delete contact | Admin |
| DELETE | `/api/management/contacts/:id` | Delete contact | Management |

**Transaction Form - Contact Submission:**
```javascript
{
  name: String,                      // Required
  email: String,                     // Required
  subject: String,                   // Required
  message: String,                   // Required
  recipientType: String              // Optional: general/management/admin
}
```

---

### Module 8: Analytics & Dashboard

#### **Endpoints:**

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/dashboard/stats` | Get dashboard statistics | Authenticated |
| GET | `/api/admin/analytics` | Get admin analytics | Admin |
| GET | `/api/management/analytics` | Get management analytics | Management |
| GET | `/api/worker/analytics/:workerId` | Get worker analytics | Worker |

**Response - Dashboard Stats:**
```javascript
{
  totalReports: Number,
  reportedCount: Number,
  assignedCount: Number,
  inProgressCount: Number,
  completedCount: Number,
  rejectedCount: Number,
  totalUsers: Number,
  totalWorkers: Number,
  totalAdmins: Number,
  totalManagement: Number,
  recentReports: Array[Report],
  categoryBreakdown: Object,
  priorityBreakdown: Object,
  statusBreakdown: Object
}
```

---

### Module 9: Report Generation

#### **Endpoints:**

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/generated-reports` | Generate new report | Management/Admin |
| GET | `/api/generated-reports` | Get all generated reports | Management/Admin |
| GET | `/api/generated-reports/:id` | Get report details | Management/Admin |
| PUT | `/api/generated-reports/:id` | Update/regenerate report | Management/Admin |
| DELETE | `/api/generated-reports/:id` | Delete generated report | Management/Admin |
| GET | `/api/generated-reports/:id/download/pdf` | Download PDF | Management/Admin |
| GET | `/api/generated-reports/:id/download/excel` | Download Excel | Management/Admin |

**Transaction Form - Generate Report:**
```javascript
{
  period: String,                    // Required: Daily/Weekly/Monthly/Custom
  fromDate: Date,                    // Required
  toDate: Date,                      // Required
  exportType: String,                // Required: PDF/Excel
  generatedBy: String,               // Auto-filled
  generatedById: String              // Auto-filled
}
```

**Transaction Flow - Generate Report:**
1. User selects period and date range
2. Backend queries reports within date range
3. Aggregate statistics:
   - Total reports by status
   - Total reports by category
   - Total reports by priority
   - Worker performance metrics
   - Average completion time
4. Generate PDF or Excel file
5. Save file to server/cloud
6. Create GeneratedReports record
7. Return download link

---

### Module 10: Admin User Management

#### **Endpoints:**

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/admin/all-details` | Get all user details | Admin |
| PUT | `/api/admin/update/userdetails/:userId` | Update user details | Admin |
| PUT | `/api/admin/update/workerdetails/:userId` | Update worker details | Admin |
| PUT | `/api/admin/update/managementdetails/:userId` | Update management details | Admin |
| PUT | `/api/admin/update/admindetails/:userId` | Update admin details | Admin |
| PUT | `/api/admin/users/:userId/block` | Block/unblock user | Admin |
| DELETE | `/api/admin/users/:userId` | Delete user account | Admin |
| PUT | `/api/admin/reports/:reportId` | Update report (admin) | Admin |
| DELETE | `/api/admin/reports/:reportId` | Delete report (admin) | Admin |

---

## 🖥️ Frontend Modules & Pages

### Page 1: **HomePage** (`HomePage.js`)
**Route:** `/`  
**Access:** Public  
**Purpose:** Landing page with application overview

**Features:**
- Hero section with application introduction
- Feature highlights
- Quick report button
- Contact information
- Responsive design

---

### Page 2: **AuthPage** (`AuthPage.js`)
**Route:** `/auth`  
**Access:** Public  
**Purpose:** Unified login/signup page

**Features:**
- Tab-based interface (Login/Signup)
- Role selection (User/Worker/Management/Admin)
- Form validation
- Error handling
- Redirect to registration if incomplete

**Transaction Form - Login:**
- Username (required)
- Password (required)

**Transaction Form - Signup:**
- Username (required, unique)
- Email (required, unique)
- Password (required, min 6 chars)
- Role (required)

---

### Page 3: **UserPage** (`UserPage.js`)
**Route:** `/user`  
**Access:** Authenticated Users  
**Purpose:** User dashboard

**Tabs:**
1. **My Reports** - View all submitted reports
2. **Report New Issue** - Quick link to report form
3. **Heat Map** - Geographic visualization of all reports
4. **Analytics** - Personal statistics
5. **Chat** - Conversations with assigned workers

**Features:**
- Report listing with status badges
- Edit/Delete reports (Reported status only)
- View original and completion photos
- Submit feedback on completed reports
- Real-time chat with workers
- Personal analytics dashboard

**Transaction Forms:**
- Edit Report Form (title, description, category, conditions, priority, waste amount)
- Feedback Form (rating 1-5, comment)

---

### Page 4: **WorkerPage** (`WorkerPage.js`)
**Route:** `/worker`  
**Access:** Authenticated Workers  
**Purpose:** Worker task management dashboard

**Tabs:**
1. **Assigned Tasks** - Tasks assigned to worker
2. **Task Map** - Geographic view with navigation
3. **Completed Tasks** - Work history
4. **Analytics** - Performance metrics
5. **Chat** - Conversations with users

**Features:**
- Task list with priority indicators
- Accept/Reject task assignments
- Update task status (In Progress)
- Upload completion photos
- Navigation to task locations
- Chat with report creators
- Performance analytics

**Transaction Forms:**
- Update Status Form (status selection)
- Complete Task Form (completion photo, notes)

---

### Page 5: **ManagementPage** (`ManagementPage.js`)
**Route:** `/management`  
**Access:** Authenticated Management  
**Purpose:** Operations oversight dashboard

**Tabs:**
1. **Dashboard** - Overview statistics
2. **Manage Reports** - Triage and assignment
3. **Heat Map** - Geographic visualization
4. **Analytics** - System-wide analytics
5. **Messages** - Contact form submissions
6. **Your Reports** - Personal reports
7. **Chat** - System-wide conversations
8. **Report Generation** - Generate PDF/Excel reports

**Features:**
- Assign workers to reports
- Update report priorities
- View all system reports
- Advanced filtering (status, priority, category, date)
- Generate periodic reports (Daily/Weekly/Monthly/Custom)
- Download reports (PDF/Excel)
- View contact messages
- System-wide analytics

**Transaction Forms:**
- Assign Worker Form (worker selection, priority, notes)
- Generate Report Form (period, date range, export type)

---

### Page 6: **AdminPage** (`AdminPage.js`)
**Route:** `/admin`  
**Access:** Authenticated Admins  
**Purpose:** System administration dashboard

**Tabs:**
1. **Dashboard** - System overview
2. **Manage Reports** - All reports management
3. **Master Forms** - System options configuration
4. **Profiles** - User management
5. **Messages** - Contact submissions
6. **Heat Map** - Geographic visualization
7. **Your Reports** - Personal reports
8. **Analytics** - System analytics
9. **Chat** - System-wide conversations
10. **Database** - Database viewer

**Features:**
- Create new user accounts
- Manage system options (categories, priorities, statuses)
- Block/unblock user accounts
- Delete user accounts
- Edit/delete any report
- View all user profiles
- Advanced filtering and search
- System-wide analytics
- Database inspection

**Transaction Forms:**
- Create User Form (username, password, email, role)
- Add Category Form (category name)
- Add Priority Form (priority name)
- Add Status Form (status name)
- Edit User Details Form (full name, address, phone, email, gender)

---

### Page 7: **ReportIssuePage** (`ReportIssuePage.js`)
**Route:** `/report`  
**Access:** Public (redirects to login if not authenticated)  
**Purpose:** Issue reporting form

**Transaction Form - Report Issue:**
```javascript
{
  title: String,                     // Required
  description: String,               // Required
  category: String,                  // Required, dropdown
  photo: File,                       // Required, max 10MB
  location: {
    latitude: String,                // Auto-captured via GPS
    longitude: String,               // Auto-captured via GPS
    address: String                  // Auto-filled via reverse geocoding
  },
  wasteConditions: Array[String],    // Checkboxes
  userPriority: String,              // Radio buttons
  wasteAmount: Number                // Slider 0-100
}
```

**Features:**
- Photo upload with preview
- GPS location capture
- Reverse geocoding for address
- Waste condition checkboxes
- Priority selection
- Waste amount slider
- Form validation
- Success confirmation with ticket number

---

### Page 8: **StatusPage** (`StatusPage.js`)
**Route:** `/status`  
**Access:** Public  
**Purpose:** Track report status by ticket number

**Features:**
- Ticket number search
- Report status display
- Timeline visualization
- Worker information (if assigned)
- Original and completion photos
- Location map

---

### Page 9: **ProfilePage** (`ProfilePage.js`)
**Route:** `/profile`  
**Access:** Authenticated  
**Purpose:** User profile management

**Features:**
- View profile details
- Upload profile photo
- Change password
- Edit profile information (based on role)

**Transaction Forms:**
- Change Password Form (current password, new password, confirm password)
- Edit Profile Form (role-specific fields)

---

### Page 10: **ContactUsPage** (`ContactUsPage.js`)
**Route:** `/contact`  
**Access:** Public  
**Purpose:** Contact form

**Transaction Form:**
```javascript
{
  name: String,                      // Required
  email: String,                     // Required
  subject: String,                   // Required
  message: String,                   // Required
  recipientType: String              // Optional: general/management/admin
}
```

---

### Page 11: **TriagePage** (`TriagePage.js`)
**Route:** `/manage` (embedded in Admin/Management pages)  
**Access:** Admin/Management  
**Purpose:** Report triage and assignment

**Features:**
- Report listing with filters
- Worker selection dropdown
- Priority assignment
- Bulk operations
- Quick assign functionality

---

### Page 12: **DatabasePage** (`DatabasePage.js`)
**Route:** Embedded in AdminPage  
**Access:** Admin only  
**Purpose:** Database inspection tool

**Features:**
- View all collections
- Search and filter
- Export data
- Database statistics

---

### Page 13: **Registration Pages**

#### **UserRegistrationPage** (`UserRegistrationPage.js`)
**Route:** `/user-registration`  
**Access:** Authenticated Users (incomplete registration)

#### **WorkerRegistrationPage** (`WorkerRegistrationPage.js`)
**Route:** `/worker-registration`  
**Access:** Authenticated Workers (incomplete registration)

#### **ManagementRegistrationPage** (`ManagementRegistrationPage.js`)
**Route:** `/management-registration`  
**Access:** Authenticated Management (incomplete registration)

#### **AdminRegistrationPage** (`AdminRegistrationPage.js`)
**Route:** `/admin-registration`  
**Access:** Authenticated Admins (incomplete registration)

**Common Features:**
- Profile completion forms
- Photo upload
- Form validation
- Redirect to dashboard on completion

---

## 📝 Transaction Forms Summary

### 1. **User Registration Forms**
- **Signup Form** - Create account
- **Profile Completion Forms** - Complete registration (role-specific)
- **Login Form** - Authentication

### 2. **Report Transaction Forms**
- **Create Report Form** - Submit new issue
- **Edit Report Form** - Modify existing report
- **Assign Worker Form** - Assign task to worker
- **Update Status Form** - Change report status
- **Complete Report Form** - Mark task complete with photo

### 3. **Communication Forms**
- **Contact Form** - Submit inquiry
- **Chat Message Form** - Send message
- **Feedback Form** - Rate completed report

### 4. **Master Data Forms**
- **Add Category Form** - Create new category
- **Add Priority Form** - Create new priority
- **Add Status Form** - Create new status
- **Edit System Option Form** - Modify existing option

### 5. **Report Generation Forms**
- **Generate Report Form** - Create periodic report
- **Edit Generated Report Form** - Modify report parameters

### 6. **User Management Forms**
- **Create User Form** - Admin creates new user
- **Edit User Details Form** - Modify user profile
- **Block User Form** - Block/unblock account
- **Change Password Form** - Update password

---

## 🗄️ Master Data Management

### System Options (Dynamic Configuration)

**Categories Master:**
- Managed via: Admin Page → Master Forms tab
- Default values: overflowing_bin, illegal_dumping, uncollected_garbage, broken_bin, other
- Used in: Report creation, filtering, analytics

**Priorities Master:**
- Managed via: Admin Page → Master Forms tab
- Default values: Low, Medium, High, Emergency
- Used in: Report assignment, filtering, analytics

**Statuses Master:**
- Managed via: Admin Page → Master Forms tab
- Default values: Reported, Assigned, In Progress, Completed, Rejected
- Used in: Report lifecycle, filtering, analytics

**Business Rules:**
- Only admins can add/edit/delete system options
- Deleting an option doesn't affect existing data
- Options are validated for uniqueness
- Options can be temporarily disabled (isActive flag)

---

## 🔄 Business Process Flows

### Process 1: Report Lifecycle

```
1. CREATION
   ├─ User submits report form
   ├─ Photo uploaded to Cloudinary
   ├─ Ticket number generated
   ├─ Report saved to database
   ├─ Email sent to user
   └─ Status: "Reported"

2. ASSIGNMENT
   ├─ Admin/Management assigns worker
   ├─ Worker added to report
   ├─ Priority set
   ├─ Email sent to user (worker details)
   ├─ Conversation created
   └─ Status: "Assigned"

3. IN PROGRESS
   ├─ Worker accepts task
   ├─ Worker updates status
   ├─ Chat enabled
   └─ Status: "In Progress"

4. COMPLETION
   ├─ Worker uploads completion photo
   ├─ Photo uploaded to Cloudinary
   ├─ Report marked complete
   ├─ Email sent to user (with photo)
   ├─ Worker freed from task
   └─ Status: "Completed"

5. FEEDBACK
   ├─ User submits rating (1-5)
   ├─ Optional comment
   └─ Feedback saved

6. CLEANUP (7 days after completion)
   ├─ Original photo deleted from Cloudinary
   ├─ Completion photo deleted from Cloudinary
   ├─ Images marked as cleaned
   ├─ Conversation deactivated
   └─ Task marked as closed
```

### Process 2: User Onboarding

```
1. SIGNUP
   ├─ User fills signup form
   ├─ Validation checks
   ├─ Password hashed
   ├─ User record created
   └─ Redirect to login

2. LOGIN
   ├─ User enters credentials
   ├─ Authentication check
   ├─ Registration status check
   └─ Redirect based on status

3. PROFILE COMPLETION
   ├─ User fills profile form
   ├─ Photo upload (optional)
   ├─ Validation checks
   ├─ Details saved to collection
   └─ Redirect to dashboard

4. READY TO USE
   └─ Full access to features
```

### Process 3: Report Generation (Management)

```
1. CONFIGURATION
   ├─ Select period (Daily/Weekly/Monthly/Custom)
   ├─ Select date range
   └─ Select export type (PDF/Excel)

2. GENERATION
   ├─ Query reports in date range
   ├─ Aggregate statistics
   ├─ Generate file (PDF/Excel)
   ├─ Save to server
   └─ Create GeneratedReports record

3. DOWNLOAD
   ├─ User clicks download
   ├─ File served from server
   └─ Browser downloads file

4. MANAGEMENT
   ├─ View all generated reports
   ├─ Edit/regenerate reports
   └─ Delete old reports
```

---

## 🔗 Integration Points

### 1. **Cloudinary Integration**
**Purpose:** Image storage and CDN  
**Used in:**
- Report photo uploads
- Completion photo uploads
- Profile image uploads

**Flow:**
1. Frontend uploads file to backend
2. Backend validates file (type, size)
3. File uploaded to Cloudinary via SDK
4. Cloudinary returns secure URL and public ID
5. URL saved to database
6. Public ID used for deletion

**Folders:**
- `sanitiwatch/reports-img` - Original report photos
- `sanitiwatch/completion-images` - Completion photos
- `sanitiwatch/profile-images` - User profile photos

**Cleanup:**
- Images auto-delete 7 days after report completion
- Uses Cloudinary API for deletion

---

### 2. **MailerSend Integration**
**Purpose:** Transactional email notifications  
**Used in:**
- Report creation confirmation
- Worker assignment notification
- Status update notifications
- Report completion notification

**Email Templates:**

**A. Report Created Email:**
- To: User email
- Subject: "Report Created - Ticket #[TICKET_NUMBER]"
- Content: Ticket number, title, category, location, next steps

**B. Worker Assigned Email:**
- To: User email
- Subject: "Worker Assigned - Ticket #[TICKET_NUMBER]"
- Content: Worker name, phone, expected timeline

**C. In Progress Email:**
- To: User email
- Subject: "Work Started - Ticket #[TICKET_NUMBER]"
- Content: Status update, worker contact

**D. Completion Email:**
- To: User email
- Subject: "Report Completed - Ticket #[TICKET_NUMBER]"
- Content: Completion message, completion photo, feedback request

---

### 3. **Google Maps Integration**
**Purpose:** Location services and visualization  
**Used in:**
- Report creation (GPS capture)
- Heat map visualization
- Worker navigation
- Status tracking

**Features:**
- Geolocation API for GPS coordinates
- Geocoding API for address lookup
- Maps JavaScript API for visualization
- Heatmap Layer for density visualization

---

### 4. **Chart.js Integration**
**Purpose:** Data visualization  
**Used in:**
- Dashboard statistics
- Analytics pages
- Report generation

**Chart Types:**
- Pie charts (status distribution)
- Doughnut charts (category breakdown)
- Bar charts (time-based trends)
- Line charts (performance metrics)

---

## 📊 Data Flow Diagrams

### Report Creation Flow
```
User (Frontend)
    ↓ [Submit Report Form + Photo]
Backend API (/api/reports)
    ↓ [Validate Data]
Multer Middleware
    ↓ [Process File Upload]
Cloudinary API
    ↓ [Upload Image, Return URL]
MongoDB (reports collection)
    ↓ [Save Report Document]
MailerSend API
    ↓ [Send Confirmation Email]
User (Email)
    ↓ [Receive Ticket Number]
```

### Worker Assignment Flow
```
Admin/Management (Frontend)
    ↓ [Select Report + Worker]
Backend API (/api/reports/:id/assign)
    ↓ [Validate Assignment]
MongoDB (reports collection)
    ↓ [Update Report]
MongoDB (workerdetails collection)
    ↓ [Update Worker]
MongoDB (conversations collection)
    ↓ [Create Conversation]
MailerSend API
    ↓ [Send Email to User]
User (Email)
    ↓ [Receive Worker Details]
```

---

## 🎯 Key Business Rules

### Report Management
1. Reports can only be edited/deleted when status is "Reported"
2. Only assigned worker can mark report as "In Progress"
3. Only assigned worker can complete report
4. Completion photo is mandatory for completion
5. Images auto-delete 7 days after completion
6. Tasks auto-close 7 days after completion
7. Ticket numbers are unique and auto-generated

### User Management
1. Username must be unique across all users
2. Email must be unique across all user types
3. Phone must be unique for non-worker users
4. Workers can share phone numbers
5. Worker codes are auto-generated if not provided
6. Password must be minimum 6 characters
7. Accounts can be blocked by admins

### Feedback
1. One feedback per user per report
2. Only available for completed reports
3. Rating must be 1-5
4. Users can edit/delete their own feedback

### Chat System
1. Conversations auto-create on worker assignment
2. Conversations deactivate 7 days after completion
3. Visibility can be shared with admin/management
4. Unread counts update in real-time

### System Options
1. Only admins can modify system options
2. Options must be unique within type
3. Deleting options doesn't affect existing data
4. Default options cannot be deleted

---

## 📈 Analytics & Reporting

### User Analytics
- Total reports submitted
- Reports by status
- Reports by category
- Average completion time
- Feedback ratings received

### Worker Analytics
- Total tasks assigned
- Tasks completed
- Average completion time
- Pending tasks
- Performance rating

### Management Analytics
- System-wide statistics
- Category breakdown
- Priority distribution
- Status distribution
- Time-based trends
- Worker performance comparison

### Admin Analytics
- All management analytics
- User growth metrics
- System usage statistics
- Database statistics

---

## 🔐 Security Features

### Authentication
- Password hashing with bcrypt (10 salt rounds)
- JWT token-based authentication (mock in current implementation)
- Session management
- Auto-logout on token expiration

### Authorization
- Role-based access control (RBAC)
- Protected routes on frontend
- API endpoint authorization
- Admin-only operations

### Data Validation
- Input sanitization
- File type validation
- File size limits (10MB)
- Email format validation
- Phone number validation (10 digits)
- Unique constraint checks

### Image Security
- File type validation (images only)
- Size limits (10MB max)
- Cloudinary secure URLs
- Auto-deletion after 7 days

---

## 🚀 Deployment Architecture

### Frontend (Vercel)
- React SPA
- Build command: `npm run build`
- Output: `build/`
- Environment variables: `REACT_APP_API_BASE_URL`, `REACT_APP_GOOGLE_MAPS_API_KEY`

### Backend (Render)
- Node.js/Express server
- Start command: `node server.js`
- Environment variables: `MONGO_URI`, `JWT_SECRET`, `CLOUDINARY_*`, `MAILERSEND_*`
- Auto-scaling enabled
- Keep-alive via `/api/warmup` endpoint

### Database (MongoDB Atlas)
- Cloud-hosted MongoDB
- Automatic backups
- Replica sets for high availability
- Connection string in environment variables

---

**Report End**  
*This comprehensive report documents all modules, submodules, transaction forms, and master forms in the SanitiWatch waste management system.*

