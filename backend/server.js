const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const multer = require('multer'); // <-- 1. IMPORT multer
const path = require('path');     // <-- 2. IMPORT path
const fs = require('fs');         // <-- 3. IMPORT fs
const cloudinary = require('cloudinary').v2; // <-- 4. IMPORT cloudinary

require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const emailService = require('./emailService');

// Load environment variables
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/userManagementDB';

// --- Middleware ---
app.use(express.json());
app.use(cors());
// --- 4. NEW: Serve static images from the reports folder ---
// This makes http://localhost:5000/reports-img/ticket123.jpg accessible
app.use('/reports-img', express.static(path.join(__dirname, 'public', 'reports-img')));
// Serve profile images
app.use('/profile-images', express.static(path.join(__dirname, 'public', 'profile-images')));


// --- Connect to MongoDB ---
mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB!'))
  .catch((err) => console.error('Connection failed:', err));


// --- User Schema & Model (Updated) ---
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String },
  role: {
    type: String,
    enum: ['user', 'admin', 'worker', 'management'],
    required: true
  },
  isBlocked: { type: Boolean, default: false },
  profileImage: { type: String, default: '' },
  // Worker specific fields
  workerCode: { type: String, unique: true, sparse: true }, // Unique code for workers
  workerDetails: {
    fullName: { type: String },
    address: { type: String },
    phone: { type: String },
    department: { type: String },
    registrationComplete: { type: Boolean, default: false }
  }
});

const User = mongoose.model('User', userSchema);

// --- 6. Report Schema & Model (NEW) ---
const ReportSchema = new mongoose.Schema({
  ticketNumber: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  username: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  photoPath: { type: String, required: true }, // Path to the saved image
  photoPublicId: { type: String }, // Cloudinary public ID for deletion
  location: {
    latitude: { type: String },
    longitude: { type: String },
    address: { type: String, required: true }
  },
  // New fields for waste condition and priority
  wasteConditions: [{
    type: String,
    enum: ['smelly', 'hazardous', 'blocking_pathway', 'pest_infestation', 'fire_risk', 'spillage', 'other']
  }],
  userPriority: {
    type: String,
    enum: ['low', 'medium', 'high', 'emergency'],
    default: 'medium'
  },
  wasteAmount: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  status: { type: String, default: 'Reported' },
  // Fields for Management/Triage
  priority: { type: String, default: 'Medium' }, // Admin/Management assigned priority
  assignedWorkerId: { type: String, default: null },
  internalNotes: { type: String, default: '' },
  // Completion fields
  completionPhotoPath: { type: String, default: '' },
  completionPhotoPublicId: { type: String }, // Cloudinary public ID for completion image
  completedAt: { type: Date },
  completedBy: { type: String, default: '' },
  // Image cleanup tracking fields
  originalImageCleaned: { type: Boolean, default: false },
  completionImageCleaned: { type: Boolean, default: false },
  imagesCleanedAt: { type: Date },
  // Task closure status after 7 days
  isTaskClosed: { type: Boolean, default: false },
  taskClosedAt: { type: Date },
  timestamp: { type: Date, default: Date.now },
}, {
  timestamps: true // This automatically adds createdAt and updatedAt fields
});

const Report = mongoose.model('Report', ReportSchema, 'reports'); // 'reports' collection

// --- User Details Schema & Model (NEW) ---
const userDetailsSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  fullName: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: String },
  email: { type: String },
  gender: { type: String, enum: ['male', 'female', 'other'], default: 'male' },
  profileImage: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

const UserDetails = mongoose.model('UserDetails', userDetailsSchema, 'userdetails');

// --- Management Details Schema & Model (NEW) ---
const managementDetailsSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  fullName: { type: String, required: true },
  roleInManagement: { type: String, required: true },
  address: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  gender: { type: String, enum: ['male', 'female', 'other'], default: 'male' },
  profileImage: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

const ManagementDetails = mongoose.model('ManagementDetails', managementDetailsSchema, 'managementdetails');

// --- Admin Details Schema & Model (NEW) ---
const adminDetailsSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  fullName: { type: String, required: true },
  roleTitle: { type: String, required: true },
  address: { type: String, required: true },
  email: { type: String },
  phone: { type: String },
  gender: { type: String, enum: ['male', 'female', 'other'], default: 'male' },
  profileImage: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

const AdminDetails = mongoose.model('AdminDetails', adminDetailsSchema, 'admindetails');

// --- Worker Details Schema & Model (NEW, separate collection) ---
const workerDetailsSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  workerCode: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: String },
  department: { type: String },
  email: { type: String },
  gender: { type: String, enum: ['male', 'female', 'other'], default: 'male' },
  profileImage: { type: String, default: '' },
  workHistory: [{
    jobTitle: { type: String },
    company: { type: String },
    duration: { type: String },
    description: { type: String },
    completedAt: { type: Date }
  }],
  currentStatus: { type: String, enum: ['available', 'busy', 'offline'], default: 'available' },
  pendingJobs: [{ type: String }], // Array of report IDs
  createdAt: { type: Date, default: Date.now }
});

const WorkerDetails = mongoose.model('WorkerDetails', workerDetailsSchema, 'workerdetails');

// Contact Form Schema & Model
const contactSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  subject: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  recipientType: { type: String, enum: ['general', 'management', 'admin'], default: 'general' },
  status: { type: String, enum: ['new', 'read', 'replied', 'closed'], default: 'new' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  adminNotes: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Add indexes for better performance
contactSchema.index({ email: 1 });
contactSchema.index({ status: 1 });
contactSchema.index({ timestamp: -1 });

const Contact = mongoose.model('Contact', contactSchema, 'contacts');


// --- 7. Multer Storage Setup (NEW) ---

// Feedback Schema & Model
const feedbackSchema = new mongoose.Schema({
  reportId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  username: { type: String, default: '' },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
feedbackSchema.index({ reportId: 1, userId: 1 }, { unique: true });
const Feedback = mongoose.model('Feedback', feedbackSchema, 'feedbacks');

// --- Message Schema & Model (Chat System) ---
const messageSchema = new mongoose.Schema({
  conversationId: { type: String, required: true, index: true },
  senderId: { type: String, required: true, index: true },
  senderRole: { type: String, enum: ['user', 'worker', 'admin', 'management'], required: true },
  senderName: { type: String, required: true },
  receiverId: { type: String, required: true, index: true },
  receiverRole: { type: String, enum: ['user', 'worker', 'admin', 'management'], required: true },
  messageText: { type: String, required: true },
  timestamp: { type: Date, default: Date.now, index: true },
  isRead: { type: Boolean, default: false },
  visibility: {
    type: String,
    enum: ['private', 'sharedWithAdmin', 'sharedWithManagement', 'sharedWithBoth'],
    default: 'private'
  }
});

messageSchema.index({ conversationId: 1, timestamp: -1 });
messageSchema.index({ receiverId: 1, isRead: 1 });
const Message = mongoose.model('Message', messageSchema, 'messages');

// --- Conversation Schema & Model ---
const conversationSchema = new mongoose.Schema({
  conversationId: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  userName: { type: String, required: true },
  userRole: { type: String, enum: ['user', 'admin', 'management'], default: 'user' }, // Role of report creator
  workerId: { type: String, required: true, index: true },
  workerName: { type: String, required: true },
  reportId: { type: String, default: null }, // Optional link to report
  visibility: {
    type: String,
    enum: ['private', 'sharedWithAdmin', 'sharedWithManagement', 'sharedWithBoth'],
    default: 'private',
    index: true
  },
  lastMessageTime: { type: Date, default: Date.now, index: true },
  lastMessageText: { type: String, default: '' },
  unreadCount: {
    user: { type: Number, default: 0 },
    worker: { type: Number, default: 0 },
    admin: { type: Number, default: 0 },
    management: { type: Number, default: 0 }
  },
  completedAt: { type: Date, default: null }, // When the associated report was completed
  isActive: { type: Boolean, default: true, index: true }, // False after 7 days of completion
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

conversationSchema.index({ userId: 1, workerId: 1 });
conversationSchema.index({ visibility: 1, lastMessageTime: -1 });
const Conversation = mongoose.model('Conversation', conversationSchema, 'conversations');

// Cloudinary upload helper function
const uploadToCloudinary = async (fileBuffer, originalName, folder = 'sanitiwatch/reports-img') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream({
      folder: folder,
      resource_type: 'image',
      format: 'webp',
      quality: 'auto:good',
      public_id: path.parse(originalName).name
    }, (error, result) => {
      if (error) reject(error);
      else resolve({
        url: result.secure_url,
        publicId: result.public_id
      });
    });

    // Create a readable stream from buffer
    const stream = require('stream');
    const bufferStream = new stream.PassThrough();
    bufferStream.end(fileBuffer);
    bufferStream.pipe(uploadStream);
  });
};

// Image validation middleware (using memory storage)
const storage = multer.memoryStorage();

// Image validation middleware
const fileFilter = (req, file, cb) => {
  // Check if file is an image
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('File must be an image (JPEG, PNG, GIF, WebP, etc.)'), false);
  }

  // Check file extension
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
  const fileExtension = path.extname(file.originalname).toLowerCase();

  if (!allowedExtensions.includes(fileExtension)) {
    return cb(new Error('Invalid image format. Allowed formats: JPEG, PNG, GIF, WebP, BMP'), false);
  }

  cb(null, true);
};

// Multer configuration with validation
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});


// --- 8. Mock Auth Middleware (NEW) ---
// In a real app, you'd verify the JWT token here
const mockAuth = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token || !token.startsWith('Bearer')) {
    // For development, we'll allow it, but log a warning
    console.warn("Auth token missing, but proceeding for development.");
    // In production, you MUST block this:
    // return res.status(401).json({ message: 'Authentication token required.' });
  }

  // Set mock user for development
  req.user = {
    id: 'admin-mock-id',
    username: 'admin',
    role: 'admin'
  };

  next(); // User is "authenticated"
};


// --- API Endpoints (Routes) ---

// Warmup endpoint for keeping server alive
app.get('/api/warmup', (req, res) => {
  res.status(200).json({ message: 'Server is running' });
});

// Validation endpoint for checking existing data
app.post('/api/validate', async (req, res) => {
  try {
    const { username, email, phone, excludeUserId, isWorker } = req.body;
    const errors = [];

    // Check username uniqueness
    if (username) {
      const query = excludeUserId ? { username, _id: { $ne: excludeUserId } } : { username };
      const existingUsername = await User.findOne(query);
      if (existingUsername) {
        errors.push('Username already exists');
      }
    }

    // Check email uniqueness
    if (email) {
      const userQuery = excludeUserId ? { email, _id: { $ne: excludeUserId } } : { email };
      const existingUserEmail = await User.findOne(userQuery);

      // Check in all detail collections
      const [userDetails, adminDetails, managementDetails, workerDetails] = await Promise.all([
        UserDetails.findOne(excludeUserId ? { email, userId: { $ne: excludeUserId } } : { email }),
        AdminDetails.findOne(excludeUserId ? { email, userId: { $ne: excludeUserId } } : { email }),
        ManagementDetails.findOne(excludeUserId ? { email, userId: { $ne: excludeUserId } } : { email }),
        WorkerDetails.findOne(excludeUserId ? { email, userId: { $ne: excludeUserId } } : { email })
      ]);

      if (existingUserEmail || userDetails || adminDetails || managementDetails || workerDetails) {
        errors.push('Email already exists');
      }
    }

    // Check phone uniqueness (workers can have same phone, others cannot)
    if (phone) {
      if (!isWorker) {
        const [userDetails, adminDetails, managementDetails] = await Promise.all([
          UserDetails.findOne(excludeUserId ? { phone, userId: { $ne: excludeUserId } } : { phone }),
          AdminDetails.findOne(excludeUserId ? { phone, userId: { $ne: excludeUserId } } : { phone }),
          ManagementDetails.findOne(excludeUserId ? { phone, userId: { $ne: excludeUserId } } : { phone })
        ]);

        if (userDetails || adminDetails || managementDetails) {
          errors.push('Phone number already exists');
        }
      }
    }

    res.status(200).json({ valid: errors.length === 0, errors });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// 1. SIGNUP Route (Updated with comprehensive validation)
app.post('/api/signup', async (req, res) => {
  try {
    const { username, password, role, email, phone } = req.body;

    // Validation
    if (!username || !password || !email) {
      return res.status(400).json({ message: 'Username, password, and email are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    if (!email.includes('@')) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    // Check for existing username
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Check for existing email
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Check email in detail collections
    const [userDetails, adminDetails, managementDetails, workerDetails] = await Promise.all([
      UserDetails.findOne({ email }),
      AdminDetails.findOne({ email }),
      ManagementDetails.findOne({ email }),
      WorkerDetails.findOne({ email })
    ]);

    if (userDetails || adminDetails || managementDetails || workerDetails) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      username,
      password: hashedPassword,
      email,
      role: role || 'user'
    });

    await newUser.save();
    res.status(201).json({ message: 'User created successfully!' });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// 2. LOGIN Route (Updated)
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: 'Your account has been blocked. Please contact an administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // --- 9. Create a mock token (replace with jwt.sign in production) ---
    const mockToken = process.env.JWT_SECRET ?
      `jwt-${process.env.JWT_SECRET.substring(0, 8)}-${user._id}` :
      'mock-jwt-token-for-' + user._id;

    let registrationComplete = true;
    if (user.role === 'worker') {
      // Consider both embedded workerDetails and existence in WorkerDetails collection
      let hasCollectionRecord = false;
      let hasPhone = false;
      try {
        if (typeof WorkerDetails !== 'undefined') {
          const wd = await WorkerDetails.findOne({ userId: user._id.toString() }).lean();
          hasCollectionRecord = !!wd;
          hasPhone = wd?.phone && wd.phone.length === 10;
        }
      } catch (_) { }
      registrationComplete = (user.workerDetails?.registrationComplete || false) && hasCollectionRecord && hasPhone;
    } else if (user.role === 'user') {
      const details = await UserDetails.findOne({ userId: user._id.toString() }).lean();
      const hasPhone = details?.phone && details.phone.length === 10;
      registrationComplete = !!details && hasPhone;
    } else if (user.role === 'management') {
      const details = await ManagementDetails.findOne({ userId: user._id.toString() }).lean();
      const hasPhone = details?.phone && details.phone.length === 10;
      registrationComplete = !!details && hasPhone;
    } else if (user.role === 'admin') {
      const details = await AdminDetails.findOne({ userId: user._id.toString() }).lean();
      const hasPhone = details?.phone && details.phone.length === 10;
      registrationComplete = !!details && hasPhone;
    }

    res.status(200).json({
      message: 'Login successful!',
      token: mockToken,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        workerCode: user.workerCode,
        registrationComplete,
        isBlocked: user.isBlocked
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST Worker Registration
app.post('/api/worker/register', async (req, res) => {
  try {
    const { userId, workerCode, fullName, address, phone, department, email, gender } = req.body;

    if (!userId || !fullName || !phone) {
      return res.status(400).json({ message: 'Full name and phone number are required.' });
    }

    if (phone && !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ message: 'Phone number must be exactly 10 digits.' });
    }

    // Check email uniqueness if provided
    if (email) {
      const [existingUserEmail, userDetails, adminDetails, managementDetails, workerDetails] = await Promise.all([
        User.findOne({ email, _id: { $ne: userId } }),
        UserDetails.findOne({ email, userId: { $ne: userId } }),
        AdminDetails.findOne({ email, userId: { $ne: userId } }),
        ManagementDetails.findOne({ email, userId: { $ne: userId } }),
        WorkerDetails.findOne({ email, userId: { $ne: userId } })
      ]);

      if (existingUserEmail || userDetails || adminDetails || managementDetails || workerDetails) {
        return res.status(400).json({ message: 'Email already exists.' });
      }
    }

    // Ensure unique workerCode (auto-generate if missing)
    let finalWorkerCode = workerCode;
    if (!finalWorkerCode) {
      // Generate WRK-XXXXX
      let unique = false;
      while (!unique) {
        const candidate = `WRK-${Math.floor(10000 + Math.random() * 90000)}`;
        const exists = await User.findOne({ workerCode: candidate }).lean();
        if (!exists) {
          finalWorkerCode = candidate;
          unique = true;
        }
      }
    } else {
      const existingWorker = await User.findOne({ workerCode: finalWorkerCode });
      if (existingWorker && existingWorker._id.toString() !== userId) {
        return res.status(400).json({ message: 'Worker code already exists.' });
      }
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        workerCode: finalWorkerCode,
        workerDetails: {
          fullName,
          address,
          phone,
          department,
          registrationComplete: true
        },
        ...(email ? { email } : {})
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Upsert into WorkerDetails separate collection
    if (typeof WorkerDetails !== 'undefined') {
      await WorkerDetails.findOneAndUpdate(
        { userId: userId },
        {
          userId: userId,
          username: user.username,
          workerCode: finalWorkerCode,
          fullName,
          address,
          phone: phone || '',
          department: department || '',
          email: email || user.email || '',
          gender: gender || 'male'
        },
        { upsert: true, new: true }
      );
    }

    res.status(200).json({ message: 'Worker registration complete.', user });
  } catch (error) {
    console.error('Error registering worker:', error);
    res.status(500).json({ message: 'Server error registering worker.' });
  }
});

// POST User Registration (NEW)
app.post('/api/user/register', async (req, res) => {
  try {
    const { userId, fullName, address, phone, email, gender } = req.body;

    if (!userId || !fullName || !address || !phone) {
      return res.status(400).json({ message: 'Full name, address, and phone number are required.' });
    }

    if (phone && !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ message: 'Phone number must be exactly 10 digits.' });
    }

    // Check phone uniqueness
    const [existingPhoneUser, existingPhoneAdmin, existingPhoneManagement] = await Promise.all([
      UserDetails.findOne({ phone, userId: { $ne: userId } }),
      AdminDetails.findOne({ phone, userId: { $ne: userId } }),
      ManagementDetails.findOne({ phone, userId: { $ne: userId } })
    ]);

    if (existingPhoneUser || existingPhoneAdmin || existingPhoneManagement) {
      return res.status(400).json({ message: 'Phone number already exists.' });
    }

    // Check email uniqueness if provided
    if (email) {
      const [existingUserEmail, userDetails, adminDetails, managementDetails, workerDetails] = await Promise.all([
        User.findOne({ email, _id: { $ne: userId } }),
        UserDetails.findOne({ email, userId: { $ne: userId } }),
        AdminDetails.findOne({ email, userId: { $ne: userId } }),
        ManagementDetails.findOne({ email, userId: { $ne: userId } }),
        WorkerDetails.findOne({ email, userId: { $ne: userId } })
      ]);

      if (existingUserEmail || userDetails || adminDetails || managementDetails || workerDetails) {
        return res.status(400).json({ message: 'Email already exists.' });
      }
    }

    const existing = await UserDetails.findOne({ userId });
    const baseUser = await User.findById(userId).lean();
    if (existing) {
      // Update existing details
      existing.username = baseUser?.username || existing.username || '';
      existing.fullName = fullName;
      existing.address = address;
      existing.phone = phone || '';
      existing.email = email || baseUser?.email || '';
      if (gender) existing.gender = gender;
      await existing.save();
      if (email) await User.findByIdAndUpdate(userId, { email });
      return res.status(200).json({ message: 'User details updated.', details: existing });
    }

    const details = new UserDetails({ userId, username: baseUser?.username || '', fullName, address, phone, email: email || baseUser?.email || '', gender: gender || 'male' });
    await details.save();
    if (email) await User.findByIdAndUpdate(userId, { email });

    res.status(201).json({ message: 'User details saved.', details });
  } catch (error) {
    console.error('Error saving user details:', error);
    res.status(500).json({ message: 'Server error saving user details.' });
  }
});

// GET profile details by role (NEW)
app.get('/api/profile/:role/:userId', async (req, res) => {
  try {
    const { role, userId } = req.params;
    if (role === 'user') {
      const d = await UserDetails.findOne({ userId }).lean();
      return res.status(200).json(d || {});
    }
    if (role === 'management') {
      const d = await ManagementDetails.findOne({ userId }).lean();
      return res.status(200).json(d || {});
    }
    if (role === 'admin') {
      const d = await AdminDetails.findOne({ userId }).lean();
      return res.status(200).json(d || {});
    }
    if (role === 'worker') {
      const u = await User.findById(userId).lean();
      const wd = await WorkerDetails.findOne({ userId }).lean();
      return res.status(200).json(wd || (u?.workerDetails ? { ...u.workerDetails, workerCode: u.workerCode, email: u.email } : {}));
    }
    return res.status(400).json({ message: 'Invalid role' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error fetching profile.' });
  }
});

// POST profile image upload
app.post('/api/profile/upload-image', mockAuth, upload.single('profileImage'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Profile image is missing.' });
  }

  const { userId, role } = req.body;
  if (!userId || !role) {
    return res.status(400).json({ message: 'Missing userId or role.' });
  }

  try {
    // Upload profile image to Cloudinary
    const extension = path.extname(req.file.originalname);
    const fileName = `${userId}_profile${extension}`;
    const cloudinaryResult = await uploadToCloudinary(req.file.buffer, fileName, 'sanitiwatch/profile-images');
    const imageUrl = cloudinaryResult.url;
    const imagePublicId = cloudinaryResult.publicId;

    // Update profile image in appropriate collection
    if (role === 'user') {
      await UserDetails.findOneAndUpdate({ userId }, { profileImage: imageUrl, profileImagePublicId: imagePublicId }, { upsert: true });
    } else if (role === 'management') {
      await ManagementDetails.findOneAndUpdate({ userId }, { profileImage: imageUrl, profileImagePublicId: imagePublicId }, { upsert: true });
    } else if (role === 'admin') {
      await AdminDetails.findOneAndUpdate({ userId }, { profileImage: imageUrl, profileImagePublicId: imagePublicId }, { upsert: true });
    } else if (role === 'worker') {
      await WorkerDetails.findOneAndUpdate({ userId }, { profileImage: imageUrl, profileImagePublicId: imagePublicId }, { upsert: true });
    }

    // Also update base User model
    await User.findByIdAndUpdate(userId, { profileImage: imageUrl, profileImagePublicId: imagePublicId });

    res.status(200).json({ message: 'Profile image uploaded successfully.', imageUrl });
  } catch (error) {
    console.error('Profile image upload error:', error);
    res.status(500).json({ message: 'Failed to upload profile image.' });
  }
});

// POST change password
app.post('/api/profile/change-password', mockAuth, async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;

    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({ message: 'User ID, current password, and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await User.findByIdAndUpdate(userId, { password: hashedPassword });

    res.status(200).json({ message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Failed to change password.' });
  }
});

// POST Management Registration (NEW)
app.post('/api/management/register', async (req, res) => {
  try {
    const { userId, fullName, roleInManagement, address, email, phone, gender } = req.body;
    if (!userId || !fullName || !roleInManagement || !address || !phone) {
      return res.status(400).json({ message: 'Full name, role, address, and phone number are required.' });
    }

    if (phone && !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ message: 'Phone number must be exactly 10 digits.' });
    }

    // Check phone uniqueness
    const [existingPhoneUser, existingPhoneAdmin, existingPhoneManagement] = await Promise.all([
      UserDetails.findOne({ phone, userId: { $ne: userId } }),
      AdminDetails.findOne({ phone, userId: { $ne: userId } }),
      ManagementDetails.findOne({ phone, userId: { $ne: userId } })
    ]);

    if (existingPhoneUser || existingPhoneAdmin || existingPhoneManagement) {
      return res.status(400).json({ message: 'Phone number already exists.' });
    }

    // Check email uniqueness if provided
    if (email) {
      const [existingUserEmail, userDetails, adminDetails, managementDetails, workerDetails] = await Promise.all([
        User.findOne({ email, _id: { $ne: userId } }),
        UserDetails.findOne({ email, userId: { $ne: userId } }),
        AdminDetails.findOne({ email, userId: { $ne: userId } }),
        ManagementDetails.findOne({ email, userId: { $ne: userId } }),
        WorkerDetails.findOne({ email, userId: { $ne: userId } })
      ]);

      if (existingUserEmail || userDetails || adminDetails || managementDetails || workerDetails) {
        return res.status(400).json({ message: 'Email already exists.' });
      }
    }
    const baseUser = await User.findById(userId).lean();
    const existing = await ManagementDetails.findOne({ userId });
    if (existing) {
      existing.username = baseUser?.username || existing.username || '';
      existing.fullName = fullName;
      existing.roleInManagement = roleInManagement;
      existing.address = address;
      existing.email = email || baseUser?.email || '';
      existing.phone = phone || '';
      if (gender) existing.gender = gender;
      await existing.save();
      if (email) await User.findByIdAndUpdate(userId, { email });
      return res.status(200).json({ message: 'Management details updated.', details: existing });
    }
    const details = new ManagementDetails({ userId, username: baseUser?.username || '', fullName, roleInManagement, address, email: email || baseUser?.email || '', phone, gender: gender || 'male' });
    await details.save();
    if (email) await User.findByIdAndUpdate(userId, { email });
    res.status(201).json({ message: 'Management details saved.', details });
  } catch (error) {
    console.error('Error saving management details:', error);
    res.status(500).json({ message: 'Server error saving management details.' });
  }
});

// POST Admin Registration (NEW)
app.post('/api/admin/register', async (req, res) => {
  try {
    const { userId, fullName, roleTitle, address, email, phone, gender } = req.body;
    if (!userId || !fullName || !roleTitle || !address || !phone) {
      return res.status(400).json({ message: 'Full name, role title, address, and phone number are required.' });
    }

    if (phone && !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ message: 'Phone number must be exactly 10 digits.' });
    }

    // Check phone uniqueness
    const [existingPhoneUser, existingPhoneAdmin, existingPhoneManagement] = await Promise.all([
      UserDetails.findOne({ phone, userId: { $ne: userId } }),
      AdminDetails.findOne({ phone, userId: { $ne: userId } }),
      ManagementDetails.findOne({ phone, userId: { $ne: userId } })
    ]);

    if (existingPhoneUser || existingPhoneAdmin || existingPhoneManagement) {
      return res.status(400).json({ message: 'Phone number already exists.' });
    }

    // Check email uniqueness if provided
    if (email) {
      const [existingUserEmail, userDetails, adminDetails, managementDetails, workerDetails] = await Promise.all([
        User.findOne({ email, _id: { $ne: userId } }),
        UserDetails.findOne({ email, userId: { $ne: userId } }),
        AdminDetails.findOne({ email, userId: { $ne: userId } }),
        ManagementDetails.findOne({ email, userId: { $ne: userId } }),
        WorkerDetails.findOne({ email, userId: { $ne: userId } })
      ]);

      if (existingUserEmail || userDetails || adminDetails || managementDetails || workerDetails) {
        return res.status(400).json({ message: 'Email already exists.' });
      }
    }
    const baseUser = await User.findById(userId).lean();
    const existing = await AdminDetails.findOne({ userId });
    if (existing) {
      existing.username = baseUser?.username || existing.username || '';
      existing.fullName = fullName;
      existing.roleTitle = roleTitle;
      existing.address = address;
      existing.email = email || baseUser?.email || '';
      existing.phone = phone || '';
      if (gender) existing.gender = gender;
      await existing.save();
      if (email) await User.findByIdAndUpdate(userId, { email });
      return res.status(200).json({ message: 'Admin details updated.', details: existing });
    }
    const details = new AdminDetails({ userId, username: baseUser?.username || '', fullName, roleTitle, address, email: email || baseUser?.email || '', phone, gender: gender || 'male' });
    await details.save();
    if (email) await User.findByIdAndUpdate(userId, { email });
    res.status(201).json({ message: 'Admin details saved.', details });
  } catch (error) {
    console.error('Error saving admin details:', error);
    res.status(500).json({ message: 'Server error saving admin details.' });
  }
});

// --- Admin View & Update Endpoints (NEW) ---
// List all details
app.get('/api/admin/all-details', async (req, res) => {
  try {
    const users = await User.find().lean();
    const userDetails = await UserDetails.find().lean();
    const managementDetails = await ManagementDetails.find().lean();
    const adminDetails = await AdminDetails.find().lean();
    let workerDetails = [];
    if (typeof WorkerDetails !== 'undefined') {
      workerDetails = await WorkerDetails.find().lean();
    }
    res.status(200).json({ users, userDetails, managementDetails, adminDetails, workerDetails });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching details.' });
  }
});

// Block / Unblock a user account (toggle isBlocked flag)
app.put('/api/admin/users/:userId/block', mockAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { isBlocked } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { isBlocked: !!isBlocked },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.status(200).json({
      message: `User ${user.username} has been ${user.isBlocked ? 'blocked' : 'unblocked'}.`,
      user
    });
  } catch (error) {
    console.error('Error updating user block status:', error);
    return res.status(500).json({ message: 'Server error updating user block status.' });
  }
});

// Delete a user account and related profile details
app.delete('/api/admin/users/:userId', mockAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    await User.deleteOne({ _id: userId });
    await UserDetails.deleteOne({ userId });
    await ManagementDetails.deleteOne({ userId });
    await AdminDetails.deleteOne({ userId });
    if (typeof WorkerDetails !== 'undefined') {
      await WorkerDetails.deleteOne({ userId });
    }
    return res.status(200).json({ message: 'User deleted successfully.' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ message: 'Server error deleting user.' });
  }
});

// Update details per role
app.put('/api/admin/update/userdetails/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const updated = await UserDetails.findOneAndUpdate({ userId }, req.body, { new: true, upsert: false });
    if (!updated) return res.status(404).json({ message: 'User details not found.' });
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server error updating user details.' });
  }
});

app.put('/api/admin/update/managementdetails/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const updated = await ManagementDetails.findOneAndUpdate({ userId }, req.body, { new: true, upsert: false });
    if (!updated) return res.status(404).json({ message: 'Management details not found.' });
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server error updating management details.' });
  }
});

app.put('/api/admin/update/admindetails/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const updated = await AdminDetails.findOneAndUpdate({ userId }, req.body, { new: true, upsert: false });
    if (!updated) return res.status(404).json({ message: 'Admin details not found.' });
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server error updating admin details.' });
  }
});

// Update worker details (admin)
app.put('/api/admin/update/worker/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { workerCode, workerDetails = {}, email } = req.body;
    const update = {};
    if (workerCode) update.workerCode = workerCode;
    if (email) update.email = email;
    if (workerDetails && Object.keys(workerDetails).length > 0) {
      update.workerDetails = workerDetails;
    }
    const updated = await User.findByIdAndUpdate(userId, update, { new: true });
    if (!updated) return res.status(404).json({ message: 'Worker not found.' });
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server error updating worker.' });
  }
});

// ADMIN: Migrate all workers from userdetails to workerdetails
app.post('/api/admin/migrate/workers-to-workerdetails', async (req, res) => {
  try {
    const users = await User.find({ role: 'worker' }).lean();
    let migrated = 0;
    let updated = 0;
    for (const u of users) {
      const ud = await UserDetails.findOne({ userId: u._id.toString() }).lean();
      const src = {
        userId: u._id.toString(),
        username: u.username,
        workerCode: u.workerCode || undefined,
        fullName: u.workerDetails?.fullName || ud?.fullName || '',
        address: u.workerDetails?.address || ud?.address || '',
        phone: u.workerDetails?.phone || ud?.phone || '',
        department: u.workerDetails?.department || '',
        email: u.email || ''
      };
      // Ensure workerCode exists; generate if needed
      let finalWorkerCode = src.workerCode;
      if (!finalWorkerCode) {
        let unique = false;
        while (!unique) {
          const candidate = `WRK-${Math.floor(10000 + Math.random() * 90000)}`;
          const exists = await User.findOne({ workerCode: candidate }).lean();
          if (!exists) {
            finalWorkerCode = candidate;
            unique = true;
          }
        }
        // Persist generated code back to User
        await User.findByIdAndUpdate(u._id, { workerCode: finalWorkerCode });
      }

      const result = await WorkerDetails.findOneAndUpdate(
        { userId: src.userId },
        { ...src, workerCode: finalWorkerCode },
        { upsert: true, new: true }
      );
      if (result) migrated += 1;

      // Remove from UserDetails if present
      if (ud) {
        await UserDetails.deleteOne({ _id: ud._id });
        updated += 1;
      }
    }
    res.status(200).json({ message: 'Migration complete', workersProcessed: users.length, workerdetailsUpserted: migrated, userdetailsRemoved: updated });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ message: 'Migration failed' });
  }
});

// --- 10. REPORT SUBMISSION Route (NEW) ---
app.post('/api/reports', mockAuth, upload.single('reportImage'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Report image is missing.' });
  }

  // Ensure all necessary body data is present
  const { title, description, category, latitude, longitude, address, userId, username, wasteConditions, userPriority, wasteAmount } = req.body;
  if (!title || !description || !category || !address || !userId || !username) {
    fs.unlinkSync(req.file.path); // Clean up the temp file
    return res.status(400).json({ message: 'Missing required report fields.' });
  }

  // Validate latitude and longitude are provided (can be empty strings for manual addresses)
  const lat = latitude && latitude !== '' ? parseFloat(latitude) : null;
  const lng = longitude && longitude !== '' ? parseFloat(longitude) : null;

  try {
    // A. Generate Unique Ticket Number
    const ticketNumber = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;

    // B. Upload Image to Cloudinary
    const cloudinaryResult = await uploadToCloudinary(req.file.buffer, `${ticketNumber}.jpg`, 'sanitiwatch/reports-img');
    const photoPath = cloudinaryResult.url;
    const photoPublicId = cloudinaryResult.publicId;

    // C. Prepare Report Data for MongoDB
    const newReport = new Report({
      ticketNumber: ticketNumber,
      userId: userId,
      username: username,
      title: title,
      description: description,
      category: category,
      photoPath: photoPath,
      photoPublicId: photoPublicId, // Store Cloudinary public ID for deletion
      location: {
        latitude: lat,
        longitude: lng,
        address: address,
      },
      wasteConditions: wasteConditions ? JSON.parse(wasteConditions) : [],
      userPriority: userPriority || 'medium',
      wasteAmount: wasteAmount ? parseInt(wasteAmount) : 50,
      status: 'Reported', // Initial status
    });

    // D. Save to MongoDB
    await newReport.save();

    console.log(`Report saved: ${ticketNumber} by ${username}`);

    // E. Send email notification to user
    try {
      // Fetch user email from User collection or UserDetails
      const user = await User.findById(userId).lean();
      const userDetails = await UserDetails.findOne({ userId }).lean();
      const userEmail = user?.email || userDetails?.email;

      if (userEmail) {
        await emailService.sendReportCreatedEmail(userEmail, {
          ticketNumber,
          username,
          title,
          description,
          category,
          address
        });
      }
    } catch (emailError) {
      console.error('Error sending report created email:', emailError.message);
      // Don't fail the request if email fails
    }

    // F. Success Response
    res.status(201).json({
      message: 'Report submitted successfully.',
      ticketNumber: ticketNumber,
      photoUrl: photoPath,
      createdAt: newReport.createdAt,
      updatedAt: newReport.updatedAt
    });

  } catch (error) {
    console.error('Submission Error Details:', error.message);
    console.error('Error Stack:', error.stack);
    console.error('Request Body:', req.body);
    console.error('File Info:', req.file ? {
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    } : 'No file');

    // Clean up the temp file if something failed
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    // Also delete the final file if it was created but DB save failed
    if (finalPath && fs.existsSync(finalPath)) {
      fs.unlinkSync(finalPath);
    }
    res.status(500).json({
      message: 'Failed to save report to database.',
      error: error.message
    });
  }
});


// --- 11. MANAGEMENT MODULE Routes (NEW) ---

// GET Unassigned Reports (for Triage Page)
// Utility to compute distance between two lat/lng points (in meters)
function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (Number(v) * Math.PI) / 180;
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

app.get('/api/reports/unassigned', mockAuth, async (req, res) => {
  try {
    const reports = await Report.find({ status: 'Reported' }).lean();

    // Promote priority if multiple reports are near the same location
    const NEAR_THRESHOLD_METERS = 200; // within 200m considered nearby
    const toHigh = new Set();

    for (let i = 0; i < reports.length; i++) {
      const ri = reports[i];
      let nearbyCount = 0;
      for (let j = 0; j < reports.length; j++) {
        if (i === j) continue;
        const rj = reports[j];
        // Prefer lat/lng when present
        const li = ri.location || {}; const lj = rj.location || {};
        if (li.latitude && li.longitude && lj.latitude && lj.longitude) {
          const d = haversineDistanceMeters(parseFloat(li.latitude), parseFloat(li.longitude), parseFloat(lj.latitude), parseFloat(lj.longitude));
          if (!isNaN(d) && d <= NEAR_THRESHOLD_METERS) nearbyCount++;
        } else {
          // Fallback: same address string
          if (li.address && lj.address && li.address.trim().toLowerCase() === lj.address.trim().toLowerCase()) nearbyCount++;
        }
      }
      if (nearbyCount >= 1) { // at least one other nearby
        toHigh.add(String(ri._id));
      }
    }

    // Bulk update priorities to High for nearby duplicates
    if (toHigh.size > 0) {
      await Report.updateMany({ _id: { $in: Array.from(toHigh) }, status: 'Reported' }, { $set: { priority: 'High' } });
    }

    // Return sorted: High priority first, then by oldest
    const sorted = reports
      .map(r => ({ ...r, priority: toHigh.has(String(r._id)) ? 'High' : (r.priority || 'Medium') }))
      .sort((a, b) => {
        const prioOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
        const ap = prioOrder[a.priority] ?? 1;
        const bp = prioOrder[b.priority] ?? 1;
        if (ap !== bp) return ap - bp;
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      });

    res.status(200).json(sorted);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching reports.' });
  }
});

// Group unassigned reports by proximity for triage
app.get('/api/reports/unassigned/grouped', mockAuth, async (req, res) => {
  try {
    const reports = await Report.find({ status: 'Reported' }).lean();
    const NEAR_THRESHOLD_METERS = 200;
    const groups = [];
    const visited = new Set();

    for (let i = 0; i < reports.length; i++) {
      const r = reports[i];
      if (visited.has(String(r._id))) continue;
      const group = [r];
      visited.add(String(r._id));
      const li = r.location || {};
      for (let j = i + 1; j < reports.length; j++) {
        const s = reports[j];
        if (visited.has(String(s._id))) continue;
        const lj = s.location || {};
        let near = false;
        if (li.latitude && li.longitude && lj.latitude && lj.longitude) {
          const d = haversineDistanceMeters(
            parseFloat(li.latitude),
            parseFloat(li.longitude),
            parseFloat(lj.latitude),
            parseFloat(lj.longitude)
          );
          near = !isNaN(d) && d <= NEAR_THRESHOLD_METERS;
        } else {
          near = (
            li.address && lj.address &&
            li.address.trim().toLowerCase() === lj.address.trim().toLowerCase()
          );
        }
        if (near) {
          group.push(s);
          visited.add(String(s._id));
        }
      }
      groups.push({
        groupId: `${r.location?.address || r.ticketNumber}-${group.length}`,
        center: {
          latitude: li.latitude || null,
          longitude: li.longitude || null,
          address: li.address || null
        },
        count: group.length,
        priority: group.length > 1 ? 'High' : (r.priority || 'Medium'),
        reports: group
      });
    }

    // Sort groups: larger first, then High, then oldest in group
    const prioOrder = { High: 0, Medium: 1, Low: 2 };
    groups.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      const ap = prioOrder[a.priority] ?? 1;
      const bp = prioOrder[b.priority] ?? 1;
      if (ap !== bp) return ap - bp;
      const at = Math.min(...a.reports.map(x => new Date(x.timestamp).getTime()));
      const bt = Math.min(...b.reports.map(x => new Date(x.timestamp).getTime()));
      return at - bt;
    });

    res.status(200).json(groups);
  } catch (error) {
    res.status(500).json({ message: 'Server error grouping reports.' });
  }
});

// GET Assigned Reports (for Manage Page - reports that are assigned but not completed)
app.get('/api/reports/assigned', mockAuth, async (req, res) => {
  try {
    const reports = await Report.find({
      status: { $in: ['Assigned', 'In Progress'] }
    }).sort({ updatedAt: -1 }).lean();
    res.status(200).json(reports);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching assigned reports.' });
  }
});

// GET All Workers (for Manage Page dropdown)
app.get('/api/users/workers', mockAuth, async (req, res) => {
  try {
    const workers = await User.find({ role: 'worker' }).select('username _id'); // Only send username and ID
    res.status(200).json(workers);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching workers.' });
  }
});

// PUT Assign/Reject Report (for Triage Page actions)
app.put('/api/reports/assign/:reportId', mockAuth, async (req, res) => {
  try {
    const { reportId } = req.params;
    const { workerId, priority, internalNotes, status } = req.body; // e.g., status: 'Assigned'

    if (!workerId || !priority || !status) {
      return res.status(400).json({ message: 'Missing fields for assignment.' });
    }

    // Check if task is closed (7 days after completion)
    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ message: 'Report not found.' });
    }

    if (report.isTaskClosed) {
      return res.status(403).json({
        message: 'This task has been closed for more than 7 days and cannot be reassigned.',
        taskClosed: true,
        taskClosedAt: report.taskClosedAt
      });
    }

    const updatedReport = await Report.findByIdAndUpdate(
      reportId,
      {
        assignedWorkerId: workerId,
        priority: priority,
        internalNotes: internalNotes,
        status: status
      },
      { new: true }
    );

    if (!updatedReport) {
      return res.status(404).json({ message: 'Report not found.' });
    }

    // Auto-create conversation between user and worker
    try {
      const worker = await User.findById(workerId);
      const user = await User.findById(updatedReport.userId);

      if (worker && user) {
        // Check if conversation already exists
        let conversation = await Conversation.findOne({
          userId: updatedReport.userId,
          workerId: workerId
        });

        if (!conversation) {
          // Create new conversation
          const conversationId = `conv_${updatedReport.userId}_${workerId}_${Date.now()}`;
          conversation = new Conversation({
            conversationId,
            userId: updatedReport.userId,
            userName: user.username,
            userRole: user.role, // Store the reporter's role (user/admin/management)
            workerId: workerId,
            workerName: worker.workerDetails?.fullName || worker.username,
            reportId: reportId,
            visibility: 'private'
          });
          await conversation.save();
          console.log(`Conversation created for report ${reportId} (Assignment)`);
        }
      }
    } catch (convError) {
      console.error('Error creating conversation:', convError);
      // Don't fail the assignment if conversation creation fails
    }

    // Send email notification to user about worker assignment
    try {
      const user = await User.findById(updatedReport.userId).lean();
      const userDetails = await UserDetails.findOne({ userId: updatedReport.userId }).lean();
      const userEmail = user?.email || userDetails?.email;

      if (userEmail) {
        // Fetch worker details
        const workerDetails = await WorkerDetails.findOne({ userId: workerId }).lean();
        const worker = await User.findById(workerId).lean();

        await emailService.sendWorkerAssignedEmail(userEmail, {
          ticketNumber: updatedReport.ticketNumber,
          username: updatedReport.username,
          title: updatedReport.title
        }, {
          fullName: workerDetails?.fullName || worker?.username,
          phone: workerDetails?.phone,
          department: workerDetails?.department,
          username: worker?.username
        });
      }
    } catch (emailError) {
      console.error('Error sending worker assigned email:', emailError.message);
      // Don't fail the assignment if email fails
    }

    res.status(200).json(updatedReport);
  } catch (error) {
    res.status(500).json({ message: 'Server error assigning report.' });
  }
});

// PUT to Reject a Report
app.put('/api/reports/reject/:reportId', mockAuth, async (req, res) => {
  try {
    const { reportId } = req.params;
    const { internalNotes, status } = req.body; // e.g., status: 'Rejected'

    if (status !== 'Rejected') {
      return res.status(400).json({ message: 'Invalid status for rejection.' });
    }

    // Check if task is closed (7 days after completion)
    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ message: 'Report not found.' });
    }

    if (report.isTaskClosed) {
      return res.status(403).json({
        message: 'This task has been closed for more than 7 days and cannot be rejected.',
        taskClosed: true,
        taskClosedAt: report.taskClosedAt
      });
    }

    const updatedReport = await Report.findByIdAndUpdate(
      reportId,
      {
        status: 'Rejected',
        internalNotes: internalNotes || 'Report rejected as invalid.'
      },
      { new: true }
    );

    if (!updatedReport) {
      return res.status(404).json({ message: 'Report not found.' });
    }

    res.status(200).json(updatedReport);
  } catch (error) {
    console.error('Error rejecting report:', error);
    res.status(500).json({ message: 'Server error rejecting report.' });
  }
});

// GET Report by Ticket Number (for StatusPage)
app.get('/api/reports/ticket/:ticketNumber', async (req, res) => {
  try {
    const { ticketNumber } = req.params;
    const report = await Report.findOne({ ticketNumber: ticketNumber.toUpperCase() });

    if (!report) {
      return res.status(404).json({ message: 'Report not found with this ticket number.' });
    }

    res.status(200).json(report);
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ message: 'Server error fetching report.' });
  }
});

// Migration endpoint to update existing reports with proper timestamps
app.post('/api/admin/migrate-timestamps', mockAuth, async (req, res) => {
  try {
    const user = JSON.parse(req.headers.authorization.replace('Bearer ', ''));
    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required.' });
    }

    const reports = await Report.find({
      $or: [
        { createdAt: { $exists: false } },
        { updatedAt: { $exists: false } }
      ]
    });

    let updatedCount = 0;
    for (const report of reports) {
      const updateData = {};
      if (!report.createdAt && report.timestamp) {
        updateData.createdAt = report.timestamp;
      }
      if (!report.updatedAt && report.timestamp) {
        updateData.updatedAt = report.timestamp;
      }

      if (Object.keys(updateData).length > 0) {
        await Report.findByIdAndUpdate(report._id, updateData);
        updatedCount++;
      }
    }

    res.status(200).json({
      message: `Migration completed. Updated ${updatedCount} reports with proper timestamps.`,
      updatedCount
    });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ message: 'Migration failed.' });
  }
});

// GET All Reports (for Management Dashboard)
app.get('/api/reports', mockAuth, async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    res.status(200).json(reports);
  } catch (error) {
    console.error('Error fetching all reports:', error);
    res.status(500).json({ message: 'Server error fetching reports.' });
  }
});

// GET Dashboard Statistics
app.get('/api/dashboard/stats', mockAuth, async (req, res) => {
  try {
    const totalReports = await Report.countDocuments();
    const statusCounts = await Report.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const categoryCounts = await Report.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    const priorityCounts = await Report.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    const recentReports = await Report.find()
      .sort({ createdAt: -1 })
      .limit(10);

    const stats = {
      totalReports,
      statusCounts: statusCounts.reduce((acc, item) => {
        acc[item._id || 'Unknown'] = item.count;
        return acc;
      }, {}),
      categoryCounts: categoryCounts.reduce((acc, item) => {
        acc[item._id || 'Unknown'] = item.count;
        return acc;
      }, {}),
      priorityCounts: priorityCounts.reduce((acc, item) => {
        acc[item._id || 'Unknown'] = item.count;
        return acc;
      }, {}),
      recentReports
    };

    res.status(200).json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Server error fetching dashboard stats.' });
  }
});

// GET Reports assigned to a specific worker
app.get('/api/reports/worker/:workerId', mockAuth, async (req, res) => {
  try {
    const { workerId } = req.params;
    const reports = await Report.find({ assignedWorkerId: workerId })
      .sort({ priority: -1, createdAt: 1 });
    res.status(200).json(reports);
  } catch (error) {
    console.error('Error fetching worker reports:', error);
    res.status(500).json({ message: 'Server error fetching worker reports.' });
  }
});

// GET Worker Analytics
app.get('/api/reports/worker/:workerId/analytics', mockAuth, async (req, res) => {
  try {
    const { workerId } = req.params;
    const allReports = await Report.find({ assignedWorkerId: workerId }).lean();

    const completed = allReports.filter(r => r.status === 'Completed');
    const inProgress = allReports.filter(r => r.status === 'In Progress');
    const assigned = allReports.filter(r => r.status === 'Assigned');

    // Category breakdown
    const categoryBreakdown = {};
    allReports.forEach(r => {
      const cat = r.category || 'other';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
    });

    // Priority breakdown
    const priorityBreakdown = {};
    allReports.forEach(r => {
      const pri = r.priority || 'Medium';
      priorityBreakdown[pri] = (priorityBreakdown[pri] || 0) + 1;
    });

    // Completion trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentCompletions = completed.filter(r =>
      r.completedAt && new Date(r.completedAt) >= thirtyDaysAgo
    );

    // Group by date
    const completionsByDate = {};
    recentCompletions.forEach(r => {
      const date = new Date(r.completedAt).toISOString().split('T')[0];
      completionsByDate[date] = (completionsByDate[date] || 0) + 1;
    });

    // Average completion time (in days)
    let totalDays = 0;
    let count = 0;
    completed.forEach(r => {
      if (r.completedAt && r.createdAt) {
        const diff = new Date(r.completedAt) - new Date(r.createdAt);
        totalDays += diff / (1000 * 60 * 60 * 24);
        count++;
      }
    });
    const avgCompletionTime = count > 0 ? (totalDays / count).toFixed(1) : 0;

    res.status(200).json({
      totalTasks: allReports.length,
      completed: completed.length,
      inProgress: inProgress.length,
      assigned: assigned.length,
      completionRate: allReports.length > 0 ? ((completed.length / allReports.length) * 100).toFixed(1) : 0,
      categoryBreakdown,
      priorityBreakdown,
      completionsByDate,
      avgCompletionTime,
      recentCompletions: recentCompletions.length
    });
  } catch (error) {
    console.error('Error fetching worker analytics:', error);
    res.status(500).json({ message: 'Server error fetching worker analytics.' });
  }
});

// PUT Update report status (generic worker status update like "In Progress")
app.put('/api/reports/update/:reportId', mockAuth, async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required.' });
    }

    // Check if task is closed (7 days after completion)
    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ message: 'Report not found.' });
    }

    if (report.isTaskClosed) {
      return res.status(403).json({
        message: 'This task has been closed for more than 7 days and cannot be reopened.',
        taskClosed: true,
        taskClosedAt: report.taskClosedAt
      });
    }

    const update = {
      status: status,
      internalNotes: notes || `Status updated to ${status}`
    };

    const updatedReport = await Report.findByIdAndUpdate(reportId, update, { new: true });
    if (!updatedReport) {
      return res.status(404).json({ message: 'Report not found.' });
    }

    // Create conversation when status changes to "In Progress"
    if (status === 'In Progress' && updatedReport.assignedWorkerId && updatedReport.userId) {
      try {
        const worker = await User.findById(updatedReport.assignedWorkerId);
        const user = await User.findById(updatedReport.userId);

        if (worker && user) {
          // Check if conversation already exists
          let conversation = await Conversation.findOne({
            userId: updatedReport.userId,
            workerId: updatedReport.assignedWorkerId
          });

          if (!conversation) {
            // Create new conversation
            const conversationId = `conv_${updatedReport.userId}_${updatedReport.assignedWorkerId}_${Date.now()}`;
            conversation = new Conversation({
              conversationId,
              userId: updatedReport.userId,
              userName: user.username,
              userRole: user.role, // Store the reporter's role
              workerId: updatedReport.assignedWorkerId,
              workerName: worker.workerDetails?.fullName || worker.username,
              reportId: reportId,
              visibility: 'private'
            });
            await conversation.save();
            console.log(`Conversation created for report ${reportId} (In Progress)`);
          }
        }
      } catch (convError) {
        console.error('Error creating conversation on In Progress:', convError);
        // Don't fail the status update if conversation creation fails
      }
    }

    // Send email notification when status changes to "In Progress"
    if (status === 'In Progress') {
      try {
        const user = await User.findById(updatedReport.userId).lean();
        const userDetails = await UserDetails.findOne({ userId: updatedReport.userId }).lean();
        const userEmail = user?.email || userDetails?.email;

        if (userEmail) {
          await emailService.sendReportInProgressEmail(userEmail, {
            ticketNumber: updatedReport.ticketNumber,
            username: updatedReport.username,
            title: updatedReport.title,
            category: updatedReport.category
          });
        }
      } catch (emailError) {
        console.error('Error sending in progress email:', emailError.message);
        // Don't fail the status update if email fails
      }
    }

    console.log(`Report ${reportId} status updated to ${status}`);
    res.status(200).json(updatedReport);
  } catch (error) {
    console.error('Error updating report status:', error);
    res.status(500).json({ message: 'Server error updating report status.' });
  }
});

// PUT Update report status (for worker to mark as completed)
// Worker completes a report with optional completion image
const completionUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});
app.put('/api/reports/complete/:reportId', mockAuth, completionUpload.single('completionImage'), async (req, res) => {
  try {
    const { reportId } = req.params;
    const { notes, workerId } = req.body;

    let completionPhotoPath = '';
    let completionPhotoPublicId = '';
    if (req.file) {
      // Get the report to get its ticket number
      const report = await Report.findById(reportId);
      const ticketNumber = report ? report.ticketNumber : `completed-${reportId}`;
      const cloudinaryResult = await uploadToCloudinary(req.file.buffer, `${ticketNumber}_completed.jpg`, 'sanitiwatch/completed-img');
      completionPhotoPath = cloudinaryResult.url;
      completionPhotoPublicId = cloudinaryResult.publicId;
    }

    const update = {
      status: 'Completed',
      internalNotes: notes || 'Task marked as completed',
      completedAt: new Date(),
      completedBy: workerId || '',
    };
    if (completionPhotoPath) {
      update.completionPhotoPath = completionPhotoPath;
      update.completionPhotoPublicId = completionPhotoPublicId;
    }

    const updatedReport = await Report.findByIdAndUpdate(reportId, update, { new: true });
    if (!updatedReport) {
      return res.status(404).json({ message: 'Report not found.' });
    }

    // Mark associated conversation as completed
    try {
      if (updatedReport.userId && updatedReport.assignedWorkerId) {
        const conversation = await Conversation.findOne({
          userId: updatedReport.userId,
          workerId: updatedReport.assignedWorkerId
        });

        if (conversation && !conversation.completedAt) {
          conversation.completedAt = new Date();
          conversation.updatedAt = new Date();
          await conversation.save();
        }
      }
    } catch (convError) {
      console.error('Error updating conversation completion:', convError);
      // Don't fail the report completion if conversation update fails
    }

    // Send email notification when report is completed
    try {
      const user = await User.findById(updatedReport.userId).lean();
      const userDetails = await UserDetails.findOne({ userId: updatedReport.userId }).lean();
      const userEmail = user?.email || userDetails?.email;

      if (userEmail) {
        // Get worker name for completedBy field
        let completedByName = '';
        if (workerId) {
          const worker = await User.findById(workerId).lean();
          const workerDetails = await WorkerDetails.findOne({ userId: workerId }).lean();
          completedByName = workerDetails?.fullName || worker?.username || '';
        }

        await emailService.sendReportCompletedEmail(userEmail, {
          ticketNumber: updatedReport.ticketNumber,
          username: updatedReport.username,
          title: updatedReport.title,
          category: updatedReport.category,
          completedBy: completedByName
        }, completionPhotoPath);
      }
    } catch (emailError) {
      console.error('Error sending completion email:', emailError.message);
      // Don't fail the completion if email fails
    }

    console.log(`Report ${reportId} marked as completed by worker ${workerId}`);
    res.status(200).json(updatedReport);
  } catch (error) {
    console.error('Error completing report:', error);
    res.status(500).json({ message: 'Server error completing report.' });
  }
});

// GET Reports by User ID (for User Dashboard)
app.get('/api/reports/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const reports = await Report.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json(reports);
  } catch (error) {
    console.error('Error fetching user reports:', error);
    res.status(500).json({ message: 'Server error fetching user reports.' });
  }
});

// GET Admin Analytics (System-wide)
app.get('/api/admin/analytics', mockAuth, async (req, res) => {
  try {
    const allReports = await Report.find().lean();
    const allUsers = await User.find().lean();

    // Report Status breakdown
    const reported = allReports.filter(r => r.status === 'Reported');
    const assigned = allReports.filter(r => r.status === 'Assigned');
    const inProgress = allReports.filter(r => r.status === 'In Progress');
    const completed = allReports.filter(r => r.status === 'Completed');
    const rejected = allReports.filter(r => r.status === 'Rejected');

    // User role breakdown
    const users = allUsers.filter(u => u.role === 'user');
    const workers = allUsers.filter(u => u.role === 'worker');
    const management = allUsers.filter(u => u.role === 'management');
    const admins = allUsers.filter(u => u.role === 'admin');

    // Category breakdown
    const categoryBreakdown = {};
    allReports.forEach(r => {
      const cat = r.category || 'other';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
    });

    // Priority breakdown
    const priorityBreakdown = {};
    allReports.forEach(r => {
      const pri = r.priority || 'Medium';
      priorityBreakdown[pri] = (priorityBreakdown[pri] || 0) + 1;
    });

    // Last 30 days activity
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentReports = allReports.filter(r =>
      r.createdAt && new Date(r.createdAt) >= thirtyDaysAgo
    );

    const reportsByDate = {};
    recentReports.forEach(r => {
      const date = new Date(r.createdAt).toISOString().split('T')[0];
      reportsByDate[date] = (reportsByDate[date] || 0) + 1;
    });

    // Average resolution time
    let totalDays = 0;
    let count = 0;
    completed.forEach(r => {
      if (r.completedAt && r.createdAt) {
        const diff = new Date(r.completedAt) - new Date(r.createdAt);
        totalDays += diff / (1000 * 60 * 60 * 24);
        count++;
      }
    });
    const avgResolutionTime = count > 0 ? (totalDays / count).toFixed(1) : 0;

    // Worker performance
    const workerPerformance = {};
    allReports.filter(r => r.assignedWorkerId).forEach(r => {
      const wId = r.assignedWorkerId;
      if (!workerPerformance[wId]) {
        workerPerformance[wId] = { total: 0, completed: 0 };
      }
      workerPerformance[wId].total++;
      if (r.status === 'Completed') workerPerformance[wId].completed++;
    });

    res.status(200).json({
      totalReports: allReports.length,
      totalUsers: allUsers.length,
      reported: reported.length,
      assigned: assigned.length,
      inProgress: inProgress.length,
      completed: completed.length,
      rejected: rejected.length,
      resolutionRate: allReports.length > 0 ? ((completed.length / allReports.length) * 100).toFixed(1) : 0,
      users: users.length,
      workers: workers.length,
      management: management.length,
      admins: admins.length,
      categoryBreakdown,
      priorityBreakdown,
      reportsByDate,
      avgResolutionTime,
      recentReports: recentReports.length,
      workerPerformance
    });
  } catch (error) {
    console.error('Error fetching admin analytics:', error);
    res.status(500).json({ message: 'Server error fetching admin analytics.' });
  }
});

// GET User Analytics
app.get('/api/reports/user/:userId/analytics', async (req, res) => {
  try {
    const { userId } = req.params;
    const allReports = await Report.find({ userId }).lean();

    // Status breakdown
    const reported = allReports.filter(r => r.status === 'Reported');
    const assigned = allReports.filter(r => r.status === 'Assigned');
    const inProgress = allReports.filter(r => r.status === 'In Progress');
    const completed = allReports.filter(r => r.status === 'Completed');
    const rejected = allReports.filter(r => r.status === 'Rejected');

    // Category breakdown
    const categoryBreakdown = {};
    allReports.forEach(r => {
      const cat = r.category || 'other';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
    });

    // Priority breakdown
    const priorityBreakdown = {};
    allReports.forEach(r => {
      const pri = r.priority || 'Medium';
      priorityBreakdown[pri] = (priorityBreakdown[pri] || 0) + 1;
    });

    // Submission trend (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentSubmissions = allReports.filter(r =>
      r.createdAt && new Date(r.createdAt) >= thirtyDaysAgo
    );

    // Group by date
    const submissionsByDate = {};
    recentSubmissions.forEach(r => {
      const date = new Date(r.createdAt).toISOString().split('T')[0];
      submissionsByDate[date] = (submissionsByDate[date] || 0) + 1;
    });

    // Average resolution time (for completed reports)
    let totalDays = 0;
    let count = 0;
    completed.forEach(r => {
      if (r.completedAt && r.createdAt) {
        const diff = new Date(r.completedAt) - new Date(r.createdAt);
        totalDays += diff / (1000 * 60 * 60 * 24);
        count++;
      }
    });
    const avgResolutionTime = count > 0 ? (totalDays / count).toFixed(1) : 0;

    res.status(200).json({
      totalReports: allReports.length,
      reported: reported.length,
      assigned: assigned.length,
      inProgress: inProgress.length,
      completed: completed.length,
      rejected: rejected.length,
      resolutionRate: allReports.length > 0 ? ((completed.length / allReports.length) * 100).toFixed(1) : 0,
      categoryBreakdown,
      priorityBreakdown,
      submissionsByDate,
      avgResolutionTime,
      recentSubmissions: recentSubmissions.length
    });
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    res.status(500).json({ message: 'Server error fetching user analytics.' });
  }
});

// EDIT a report owned by the requester (only when status is 'Reported')
app.put('/api/reports/edit/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { userId, title, description, category, latitude, longitude, address, wasteConditions, userPriority, wasteAmount } = req.body;

    if (!userId) return res.status(400).json({ message: 'userId is required.' });

    const report = await Report.findById(reportId);
    if (!report) return res.status(404).json({ message: 'Report not found.' });

    if (String(report.userId) !== String(userId)) {
      return res.status(403).json({ message: 'You are not allowed to edit this report.' });
    }

    if (report.status !== 'Reported') {
      return res.status(400).json({ message: 'Only reports in "Reported" status can be edited.' });
    }

    const update = {};
    if (title !== undefined) update.title = title;
    if (description !== undefined) update.description = description;
    if (category !== undefined) update.category = category;
    if (wasteConditions !== undefined) update.wasteConditions = wasteConditions;
    if (userPriority !== undefined) update.userPriority = userPriority;
    if (wasteAmount !== undefined) update.wasteAmount = parseInt(wasteAmount);
    if (latitude !== undefined || longitude !== undefined || address !== undefined) {
      update['location'] = {
        latitude: latitude !== undefined ? latitude : (report.location?.latitude || ''),
        longitude: longitude !== undefined ? longitude : (report.location?.longitude || ''),
        address: address !== undefined ? address : (report.location?.address || '')
      };
    }

    const updated = await Report.findByIdAndUpdate(reportId, update, { new: true });
    return res.status(200).json(updated);
  } catch (error) {
    console.error('Error editing report:', error);
    return res.status(500).json({ message: 'Server error editing report.' });
  }
});

// ADMIN UPDATE - Edit report details (admin only)
app.put('/api/admin/reports/:reportId', mockAuth, async (req, res) => {
  try {
    const { reportId } = req.params;
    const { title, description, category, priority } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required.' });
    }

    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ message: 'Report not found.' });
    }

    // Update report fields
    report.title = title;
    report.description = description;
    if (category) report.category = category;
    if (priority) report.priority = priority;
    report.updatedAt = new Date();

    await report.save();
    return res.status(200).json({ message: 'Report updated successfully.', report });
  } catch (error) {
    console.error('Admin update report error:', error);
    return res.status(500).json({ message: 'Server error updating report.' });
  }
});

// ADMIN DELETE - Delete any report (admin only)
app.delete('/api/admin/reports/:reportId', mockAuth, async (req, res) => {
  try {
    const { reportId } = req.params;

    const report = await Report.findById(reportId);
    if (!report) return res.status(404).json({ message: 'Report not found.' });

    // Delete associated images from Cloudinary and disk
    try {
      // Delete from Cloudinary if they exist
      if (report.photoPublicId) {
        try {
          await cloudinary.uploader.destroy(report.photoPublicId);
          console.log(`✅ Deleted original image from Cloudinary: ${report.photoPublicId}`);
        } catch (cloudinaryError) {
          console.error(`Error deleting original image from Cloudinary:`, cloudinaryError);
        }
      }
      if (report.completionPhotoPublicId) {
        try {
          await cloudinary.uploader.destroy(report.completionPhotoPublicId);
          console.log(`✅ Deleted completion image from Cloudinary: ${report.completionPhotoPublicId}`);
        } catch (cloudinaryError) {
          console.error(`Error deleting completion image from Cloudinary:`, cloudinaryError);
        }
      }
      // Also try to delete from disk for backward compatibility
      if (report.photoPath) {
        const rel = report.photoPath.startsWith('/') ? report.photoPath.slice(1) : report.photoPath;
        const filePath = path.join(__dirname, 'public', rel.replace('reports-img/', 'reports-img/'));
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      if (report.completionPhotoPath) {
        const rel2 = report.completionPhotoPath.startsWith('/') ? report.completionPhotoPath.slice(1) : report.completionPhotoPath;
        const filePath2 = path.join(__dirname, 'public', rel2.replace('reports-img/', 'reports-img/'));
        if (fs.existsSync(filePath2)) fs.unlinkSync(filePath2);
      }
    } catch (imgErr) {
      console.error('Error deleting image files:', imgErr);
    }

    // Delete associated conversations and messages
    try {
      const conversationsToDelete = await Conversation.find({
        reportId: report.ticketNumber || report._id.toString()
      });

      if (conversationsToDelete.length > 0) {
        // Delete messages for these conversations
        for (const conv of conversationsToDelete) {
          await Message.deleteMany({ conversationId: conv.conversationId });
        }

        // Delete the conversations
        await Conversation.deleteMany({
          reportId: report.ticketNumber || report._id.toString()
        });

        console.log(`✅ Deleted ${conversationsToDelete.length} conversations and their messages for deleted report ${report.ticketNumber}`);
      }
    } catch (chatErr) {
      console.error('Error deleting conversations:', chatErr);
    }

    await Report.deleteOne({ _id: reportId });
    return res.status(200).json({ message: 'Report deleted successfully by admin.' });
  } catch (error) {
    console.error('Admin delete report error:', error);
    return res.status(500).json({ message: 'Server error deleting report.' });
  }
});

// DELETE assigned report by management (cancel assignment)
app.delete('/api/reports/assigned/:reportId', mockAuth, async (req, res) => {
  try {
    const { reportId } = req.params;

    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ message: 'Report not found.' });
    }

    // Only allow cancellation of Assigned or In Progress reports
    if (!['Assigned', 'In Progress'].includes(report.status)) {
      return res.status(400).json({ message: 'Only assigned or in-progress reports can be cancelled.' });
    }

    // Delete associated images from Cloudinary and disk
    try {
      // Delete from Cloudinary if they exist
      if (report.photoPublicId) {
        try {
          await cloudinary.uploader.destroy(report.photoPublicId);
          console.log(`✅ Deleted original image from Cloudinary: ${report.photoPublicId}`);
        } catch (cloudinaryError) {
          console.error(`Error deleting original image from Cloudinary:`, cloudinaryError);
        }
      }
      if (report.completionPhotoPublicId) {
        try {
          await cloudinary.uploader.destroy(report.completionPhotoPublicId);
          console.log(`✅ Deleted completion image from Cloudinary: ${report.completionPhotoPublicId}`);
        } catch (cloudinaryError) {
          console.error(`Error deleting completion image from Cloudinary:`, cloudinaryError);
        }
      }

      // Also try to delete from disk for backward compatibility
      if (report.photoPath) {
        const rel = report.photoPath.startsWith('/') ? report.photoPath.slice(1) : report.photoPath;
        const filePath = path.join(__dirname, 'public', rel.replace('reports-img/', 'reports-img/'));
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      if (report.completionPhotoPath) {
        const rel2 = report.completionPhotoPath.startsWith('/') ? report.completionPhotoPath.slice(1) : report.completionPhotoPath;
        const filePath2 = path.join(__dirname, 'public', rel2.replace('reports-img/', 'reports-img/'));
        if (fs.existsSync(filePath2)) fs.unlinkSync(filePath2);
      }
    } catch (fileErr) {
      console.warn('Failed to remove report images:', fileErr.message);
    }

    // Delete associated conversations and messages
    try {
      const conversationsToDelete = await Conversation.find({
        reportId: report.ticketNumber || report._id.toString()
      });

      if (conversationsToDelete.length > 0) {
        // Delete messages for these conversations
        for (const conv of conversationsToDelete) {
          await Message.deleteMany({ conversationId: conv.conversationId });
        }

        // Delete the conversations
        await Conversation.deleteMany({
          reportId: report.ticketNumber || report._id.toString()
        });

        console.log(`✅ Deleted ${conversationsToDelete.length} conversations and their messages for cancelled report ${report.ticketNumber}`);
      }
    } catch (chatErr) {
      console.error('Error deleting conversations:', chatErr);
    }

    await Report.deleteOne({ _id: reportId });
    return res.status(200).json({ message: 'Assigned report cancelled and deleted successfully.' });
  } catch (error) {
    console.error('Error cancelling assigned report:', error);
    return res.status(500).json({ message: 'Server error cancelling report.' });
  }
});

// DELETE a report owned by the requester (only when status is 'Reported')
// Note: userId is expected as a query param for DELETE requests: /api/reports/:reportId?userId=...
app.delete('/api/reports/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: 'userId is required.' });

    const report = await Report.findById(reportId);
    if (!report) return res.status(404).json({ message: 'Report not found.' });

    if (String(report.userId) !== String(userId)) {
      return res.status(403).json({ message: 'You are not allowed to delete this report.' });
    }

    if (report.status !== 'Reported') {
      return res.status(400).json({ message: 'Only reports in "Reported" status can be deleted.' });
    }

    // Delete associated images from Cloudinary and disk
    try {
      // Delete from Cloudinary if they exist
      if (report.photoPublicId) {
        try {
          await cloudinary.uploader.destroy(report.photoPublicId);
          console.log(`✅ Deleted original image from Cloudinary: ${report.photoPublicId}`);
        } catch (cloudinaryError) {
          console.error(`Error deleting original image from Cloudinary:`, cloudinaryError);
        }
      }
      if (report.completionPhotoPublicId) {
        try {
          await cloudinary.uploader.destroy(report.completionPhotoPublicId);
          console.log(`✅ Deleted completion image from Cloudinary: ${report.completionPhotoPublicId}`);
        } catch (cloudinaryError) {
          console.error(`Error deleting completion image from Cloudinary:`, cloudinaryError);
        }
      }

      // Also try to delete from disk for backward compatibility
      if (report.photoPath) {
        const rel = report.photoPath.startsWith('/') ? report.photoPath.slice(1) : report.photoPath;
        const filePath = path.join(__dirname, 'public', rel.replace('reports-img/', 'reports-img/'));
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      if (report.completionPhotoPath) {
        const rel2 = report.completionPhotoPath.startsWith('/') ? report.completionPhotoPath.slice(1) : report.completionPhotoPath;
        const filePath2 = path.join(__dirname, 'public', rel2.replace('reports-img/', 'reports-img/'));
        if (fs.existsSync(filePath2)) fs.unlinkSync(filePath2);
      }
    } catch (fileErr) {
      console.warn('Failed to remove report images:', fileErr.message);
    }

    // Delete associated conversations and messages
    try {
      const conversationsToDelete = await Conversation.find({
        reportId: report.ticketNumber || report._id.toString()
      });

      if (conversationsToDelete.length > 0) {
        // Delete messages for these conversations
        for (const conv of conversationsToDelete) {
          await Message.deleteMany({ conversationId: conv.conversationId });
        }

        // Delete the conversations
        await Conversation.deleteMany({
          reportId: report.ticketNumber || report._id.toString()
        });

        console.log(`✅ Deleted ${conversationsToDelete.length} conversations and their messages for deleted report ${report.ticketNumber}`);
      }
    } catch (chatErr) {
      console.error('Error deleting conversations:', chatErr);
    }

    await Report.deleteOne({ _id: reportId });
    return res.status(200).json({ message: 'Report deleted successfully.' });
  } catch (error) {
    console.error('Error deleting report:', error);
    return res.status(500).json({ message: 'Server error deleting report.' });
  }
});

// POST Contact Form Submission
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message, recipientType } = req.body;

    // Enhanced validation
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address.' });
    }

    // Check for spam (simple check for duplicate recent submissions)
    const recentSubmission = await Contact.findOne({
      email: email.toLowerCase(),
      timestamp: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // 5 minutes ago
    });

    if (recentSubmission) {
      return res.status(429).json({ message: 'Please wait before submitting another message.' });
    }

    const contact = new Contact({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      subject: subject.trim(),
      message: message.trim(),
      recipientType: recipientType || 'general'
    });

    await contact.save();

    console.log(`New contact message from ${name} (${email}) to ${recipientType}: ${subject}`);
    res.status(201).json({
      message: 'Contact form submitted successfully!',
      id: contact._id
    });
  } catch (error) {
    console.error('Error submitting contact form:', error);
    res.status(500).json({ message: 'Server error submitting contact form.' });
  }
});

// GET All Contact Submissions (Admin only)
app.get('/api/admin/contacts', mockAuth, async (req, res) => {
  try {
    const { status, priority, limit = 50, page = 1 } = req.query;

    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const contacts = await Contact.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Contact.countDocuments(filter);

    res.status(200).json({
      contacts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ message: 'Server error fetching contacts.' });
  }
});

// PUT Update Contact Status (Admin only)
app.put('/api/admin/contacts/:id', mockAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, adminNotes } = req.body;

    const updateData = { updatedAt: new Date() };
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;

    const contact = await Contact.findByIdAndUpdate(id, updateData, { new: true });

    if (!contact) {
      return res.status(404).json({ message: 'Contact message not found.' });
    }

    res.status(200).json(contact);
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({ message: 'Server error updating contact.' });
  }
});

// GET Contact Statistics (Admin only)
app.get('/api/admin/contacts/stats', mockAuth, async (req, res) => {
  try {
    const totalContacts = await Contact.countDocuments();
    const statusCounts = await Contact.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const priorityCounts = await Contact.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);
    const recentContacts = await Contact.find()
      .sort({ timestamp: -1 })
      .limit(5);

    res.status(200).json({
      totalContacts,
      statusCounts: statusCounts.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      priorityCounts: priorityCounts.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      recentContacts
    });
  } catch (error) {
    console.error('Error fetching contact stats:', error);
    res.status(500).json({ message: 'Server error fetching contact stats.' });
  }
});

// DELETE Contact Message (Admin only)
app.delete('/api/admin/contacts/:id', mockAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const contact = await Contact.findByIdAndDelete(id);

    if (!contact) {
      return res.status(404).json({ message: 'Contact message not found.' });
    }

    console.log(`Contact message deleted: ${contact.name} (${contact.email})`);
    res.status(200).json({ message: 'Contact message deleted successfully.' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ message: 'Server error deleting contact.' });
  }
});

// GET Management Contact Messages (Management only)
app.get('/api/management/contacts', mockAuth, async (req, res) => {
  try {
    const { status, priority, limit = 50, page = 1 } = req.query;

    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const contacts = await Contact.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Contact.countDocuments(filter);

    res.status(200).json({
      contacts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching management contacts:', error);
    res.status(500).json({ message: 'Server error fetching contacts.' });
  }
});

// DELETE Contact Message (Management only)
app.delete('/api/management/contacts/:id', mockAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const contact = await Contact.findByIdAndDelete(id);

    if (!contact) {
      return res.status(404).json({ message: 'Contact message not found.' });
    }

    console.log(`Contact message deleted by management: ${contact.name} (${contact.email})`);
    res.status(200).json({ message: 'Contact message deleted successfully.' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ message: 'Server error deleting contact.' });
  }
});

// Feedback: create
app.post('/api/feedback', async (req, res) => {
  try {
    const { reportId, userId, username, rating, comment } = req.body;
    if (!reportId || !userId || !rating) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }
    const report = await Report.findById(reportId);
    if (!report) return res.status(404).json({ message: 'Report not found.' });
    if (String(report.userId) !== String(userId)) {
      return res.status(403).json({ message: 'Not allowed to submit feedback for this report.' });
    }
    if (report.status !== 'Completed') {
      return res.status(400).json({ message: 'Feedback allowed only after completion.' });
    }
    try {
      const fb = new Feedback({ reportId, userId, username: username || '', rating, comment: comment || '' });
      await fb.save();
      return res.status(201).json(fb);
    } catch (e) {
      if (e.code === 11000) {
        return res.status(409).json({ message: 'Feedback already exists for this report.' });
      }
      throw e;
    }
  } catch (error) {
    return res.status(500).json({ message: 'Server error creating feedback.' });
  }
});

// Feedback: by user
app.get('/api/feedback/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const list = await Feedback.find({ userId }).sort({ createdAt: -1 }).lean();
    return res.status(200).json(list);
  } catch (error) {
    return res.status(500).json({ message: 'Server error fetching feedback.' });
  }
});

// Feedback: by report
app.get('/api/feedback/report/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    const list = await Feedback.find({ reportId }).sort({ createdAt: -1 }).lean();
    return res.status(200).json(list);
  } catch (error) {
    return res.status(500).json({ message: 'Server error fetching feedback.' });
  }
});

// --- GENERATED REPORT Schema ---
const generatedReportSchema = new mongoose.Schema({
  reportId: { type: String, required: true, unique: true },
  period: { type: String, required: true, enum: ['Daily', 'Weekly', 'Monthly', 'Custom'] },
  fromDate: { type: Date, required: true },
  toDate: { type: Date, required: true },
  totalIssues: { type: Number, default: 0 },
  completedIssues: { type: Number, default: 0 },
  assignedIssues: { type: Number, default: 0 },
  pendingIssues: { type: Number, default: 0 },
  workerPerformance: { type: String }, // JSON string or text summary
  exportType: { type: String, enum: ['PDF', 'Excel'], default: 'PDF' },
  generatedBy: { type: String }, // Username of admin/management who generated it
  generatedById: { type: mongoose.Schema.Types.ObjectId }, // User ID
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const GeneratedReport = mongoose.model('GeneratedReport', generatedReportSchema);

// Feedback: update
app.put('/api/feedback/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, rating, comment } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId is required.' });
    const fb = await Feedback.findById(id);
    if (!fb) return res.status(404).json({ message: 'Feedback not found.' });
    if (String(fb.userId) !== String(userId)) return res.status(403).json({ message: 'Not allowed.' });
    const updated = await Feedback.findByIdAndUpdate(id, {
      ...(rating !== undefined ? { rating } : {}),
      ...(comment !== undefined ? { comment } : {}),
      updatedAt: new Date()
    }, { new: true });
    return res.status(200).json(updated);
  } catch (error) {
    return res.status(500).json({ message: 'Server error updating feedback.' });
  }
});

// Feedback: delete
app.delete('/api/feedback/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: 'userId is required.' });
    const fb = await Feedback.findById(id);
    if (!fb) return res.status(404).json({ message: 'Feedback not found.' });
    if (String(fb.userId) !== String(userId)) return res.status(403).json({ message: 'Not allowed.' });
    await Feedback.deleteOne({ _id: id });
    return res.status(200).json({ message: 'Feedback deleted.' });
  } catch (error) {
    return res.status(500).json({ message: 'Server error deleting feedback.' });
  }
});

// System Options Schema (for admin-managed categories, priorities, statuses)
const systemOptionsSchema = new mongoose.Schema({
  type: { type: String, required: true, enum: ['category', 'priority', 'status'] },
  value: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const SystemOption = mongoose.model('SystemOption', systemOptionsSchema);

// Initialize default options
async function initializeDefaultOptions() {
  try {
    const categoryCount = await SystemOption.countDocuments({ type: 'category' });
    const priorityCount = await SystemOption.countDocuments({ type: 'priority' });
    const statusCount = await SystemOption.countDocuments({ type: 'status' });

    if (categoryCount === 0) {
      await SystemOption.insertMany([
        { type: 'category', value: 'overflowing_bin' },
        { type: 'category', value: 'illegal_dumping' },
        { type: 'category', value: 'uncollected_garbage' },
        { type: 'category', value: 'broken_bin' },
        { type: 'category', value: 'other' }
      ]);
      console.log('Default categories initialized');
    }

    if (priorityCount === 0) {
      await SystemOption.insertMany([
        { type: 'priority', value: 'Low' },
        { type: 'priority', value: 'Medium' },
        { type: 'priority', value: 'High' }
      ]);
      console.log('Default priorities initialized');
    }

    if (statusCount === 0) {
      await SystemOption.insertMany([
        { type: 'status', value: 'Reported' },
        { type: 'status', value: 'Assigned' },
        { type: 'status', value: 'In Progress' },
        { type: 'status', value: 'Completed' },
        { type: 'status', value: 'Rejected' }
      ]);
      console.log('Default statuses initialized');
    }
  } catch (error) {
    console.error('Error initializing default options:', error);
  }
}

// Call initialization after DB connection
initializeDefaultOptions();

// GET all options by type
app.get('/api/system-options/:type', async (req, res) => {
  try {
    const { type } = req.params;
    if (!['category', 'priority', 'status'].includes(type)) {
      return res.status(400).json({ message: 'Invalid type. Use category, priority, or status.' });
    }
    const options = await SystemOption.find({ type }).sort({ value: 1 });
    res.status(200).json(options);
  } catch (error) {
    console.error('Error fetching system options:', error);
    res.status(500).json({ message: 'Server error fetching system options.' });
  }
});

// POST add new option
app.post('/api/system-options', mockAuth, async (req, res) => {
  try {
    const { type, value } = req.body;
    if (!type || !value) {
      return res.status(400).json({ message: 'Type and value are required.' });
    }
    if (!['category', 'priority', 'status'].includes(type)) {
      return res.status(400).json({ message: 'Invalid type. Use category, priority, or status.' });
    }

    // Check if already exists
    const existing = await SystemOption.findOne({ type, value });
    if (existing) {
      return res.status(400).json({ message: 'This option already exists.' });
    }

    const newOption = new SystemOption({ type, value });
    await newOption.save();
    res.status(201).json(newOption);
  } catch (error) {
    console.error('Error adding system option:', error);
    res.status(500).json({ message: 'Server error adding system option.' });
  }
});

// PUT update option by ID
app.put('/api/system-options/:id', mockAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { value } = req.body;

    if (!value || !value.trim()) {
      return res.status(400).json({ message: 'Value is required.' });
    }

    // Find the option to get its type
    const option = await SystemOption.findById(id);
    if (!option) {
      return res.status(404).json({ message: 'Option not found.' });
    }

    // Check if the new value already exists for this type (excluding current option)
    const existing = await SystemOption.findOne({
      type: option.type,
      value: value.trim(),
      _id: { $ne: id }
    });

    if (existing) {
      return res.status(400).json({ message: 'This option value already exists.' });
    }

    // Update the option
    option.value = value.trim();
    await option.save();

    res.status(200).json({ message: 'Option updated successfully.', option });
  } catch (error) {
    console.error('Error updating system option:', error);
    res.status(500).json({ message: 'Server error updating system option.' });
  }
});

// DELETE option by ID
app.delete('/api/system-options/:id', mockAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const option = await SystemOption.findByIdAndDelete(id);
    if (!option) {
      return res.status(404).json({ message: 'Option not found.' });
    }
    res.status(200).json({ message: 'Option deleted successfully.' });
  } catch (error) {
    console.error('Error deleting system option:', error);
    res.status(500).json({ message: 'Server error deleting system option.' });
  }
});

// ========== GENERATED REPORTS API ==========

// CREATE - Generate new report
app.post('/api/generated-reports', mockAuth, async (req, res) => {
  try {
    const { period, fromDate, toDate, exportType, generatedBy, generatedById } = req.body;

    if (!period || !fromDate || !toDate) {
      return res.status(400).json({ message: 'Period, fromDate, and toDate are required.' });
    }

    // Generate unique report ID
    const reportId = `RPT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Calculate statistics from reports within date range
    const startDate = new Date(fromDate);
    const endDate = new Date(toDate);
    endDate.setHours(23, 59, 59, 999); // End of day

    const reportsInRange = await Report.find({
      timestamp: { $gte: startDate, $lte: endDate }
    }).lean();

    const totalIssues = reportsInRange.length;
    const completedIssues = reportsInRange.filter(r => r.status === 'Completed').length;
    const assignedIssues = reportsInRange.filter(r => r.status === 'Assigned').length;
    const pendingIssues = reportsInRange.filter(r =>
      r.status === 'Reported' || r.status === 'Assigned' || r.status === 'In Progress'
    ).length;

    // Worker performance summary
    const workerStats = {};
    for (const report of reportsInRange) {
      if (report.assignedWorkerId) {
        const workerId = String(report.assignedWorkerId);
        if (!workerStats[workerId]) {
          workerStats[workerId] = { assigned: 0, completed: 0, inProgress: 0 };
        }
        workerStats[workerId].assigned++;
        if (report.status === 'Completed') workerStats[workerId].completed++;
        if (report.status === 'In Progress') workerStats[workerId].inProgress++;
      }
    }

    // Get worker usernames
    const workerIds = Object.keys(workerStats);
    const workers = await User.find({ _id: { $in: workerIds } }).select('username').lean();
    const workerPerformanceData = workers.map(w => {
      const stats = workerStats[String(w._id)];
      return {
        worker: w.username,
        assigned: stats.assigned,
        completed: stats.completed,
        inProgress: stats.inProgress,
        completionRate: stats.assigned > 0 ? ((stats.completed / stats.assigned) * 100).toFixed(1) + '%' : '0%'
      };
    });

    const workerPerformance = JSON.stringify(workerPerformanceData);

    const newReport = new GeneratedReport({
      reportId,
      period,
      fromDate: startDate,
      toDate: endDate,
      totalIssues,
      completedIssues,
      assignedIssues,
      pendingIssues,
      workerPerformance,
      exportType: exportType || 'PDF',
      generatedBy: generatedBy || 'Unknown',
      generatedById: generatedById || null
    });

    await newReport.save();
    res.status(201).json(newReport);
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ message: 'Server error generating report.' });
  }
});

// READ - Get all generated reports
app.get('/api/generated-reports', mockAuth, async (req, res) => {
  try {
    const reports = await GeneratedReport.find().sort({ createdAt: -1 }).lean();
    res.status(200).json(reports);
  } catch (error) {
    console.error('Error fetching generated reports:', error);
    res.status(500).json({ message: 'Server error fetching reports.' });
  }
});

// READ - Get single generated report by ID
app.get('/api/generated-reports/:id', mockAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const report = await GeneratedReport.findById(id).lean();
    if (!report) {
      return res.status(404).json({ message: 'Report not found.' });
    }
    res.status(200).json(report);
  } catch (error) {
    console.error('Error fetching generated report:', error);
    res.status(500).json({ message: 'Server error fetching report.' });
  }
});

// UPDATE - Edit generated report (period, dates, export type)
app.put('/api/generated-reports/:id', mockAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { period, fromDate, toDate, exportType } = req.body;

    if (!period || !fromDate || !toDate || !exportType) {
      return res.status(400).json({ message: 'Period, dates, and export type are required.' });
    }

    const report = await GeneratedReport.findById(id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found.' });
    }

    // Recalculate statistics with new date range
    const startDate = new Date(fromDate);
    const endDate = new Date(toDate);
    endDate.setHours(23, 59, 59, 999);

    const reportsInRange = await Report.find({
      timestamp: { $gte: startDate, $lte: endDate }
    }).lean();

    const totalIssues = reportsInRange.length;
    const completedIssues = reportsInRange.filter(r => r.status === 'Completed').length;
    const assignedIssues = reportsInRange.filter(r => r.status === 'Assigned').length;
    const pendingIssues = reportsInRange.filter(r =>
      r.status === 'Reported' || r.status === 'Assigned' || r.status === 'In Progress'
    ).length;

    // Worker performance recalculation
    const workerStats = {};
    for (const r of reportsInRange) {
      if (r.assignedWorkerId) {
        const workerId = String(r.assignedWorkerId);
        if (!workerStats[workerId]) {
          workerStats[workerId] = { assigned: 0, completed: 0, inProgress: 0 };
        }
        workerStats[workerId].assigned++;
        if (r.status === 'Completed') workerStats[workerId].completed++;
        if (r.status === 'In Progress') workerStats[workerId].inProgress++;
      }
    }

    const workerIds = Object.keys(workerStats);
    const workers = await User.find({ _id: { $in: workerIds } }).select('username').lean();
    const workerPerformanceData = workers.map(w => {
      const stats = workerStats[String(w._id)];
      return {
        worker: w.username,
        assigned: stats.assigned,
        completed: stats.completed,
        inProgress: stats.inProgress,
        completionRate: stats.assigned > 0 ? ((stats.completed / stats.assigned) * 100).toFixed(1) + '%' : '0%'
      };
    });

    // Update all fields
    report.period = period;
    report.fromDate = startDate;
    report.toDate = endDate;
    report.exportType = exportType;
    report.totalIssues = totalIssues;
    report.completedIssues = completedIssues;
    report.assignedIssues = assignedIssues;
    report.pendingIssues = pendingIssues;
    report.workerPerformance = JSON.stringify(workerPerformanceData);
    report.updatedAt = new Date();

    await report.save();
    res.status(200).json({ message: 'Report updated successfully.', report });
  } catch (error) {
    console.error('Error updating generated report:', error);
    res.status(500).json({ message: 'Server error updating report.' });
  }
});

// DELETE - Remove generated report
app.delete('/api/generated-reports/:id', mockAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const report = await GeneratedReport.findByIdAndDelete(id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found.' });
    }
    res.status(200).json({ message: 'Report deleted successfully.' });
  } catch (error) {
    console.error('Error deleting generated report:', error);
    res.status(500).json({ message: 'Server error deleting report.' });
  }
});

// DOWNLOAD PDF - Generate and download report as PDF
app.get('/api/generated-reports/:id/download/pdf', mockAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const report = await GeneratedReport.findById(id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found.' });
    }

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${report.reportId}.pdf"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Add content to PDF
    doc.fontSize(20).text('Sanitation Performance Report', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12);
    doc.text(`Report ID: ${report.reportId}`);
    doc.text(`Period: ${report.period}`);
    doc.text(`Date Range: ${new Date(report.fromDate).toLocaleDateString()} - ${new Date(report.toDate).toLocaleDateString()}`);
    doc.text(`Generated By: ${report.generatedBy}`);
    doc.text(`Generated On: ${new Date(report.createdAt).toLocaleString()}`);
    doc.text(`Export Type: ${report.exportType}`);
    doc.moveDown();

    // Statistics Section
    doc.fontSize(16).text('Statistics', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12);
    doc.text(`Total Issues: ${report.totalIssues}`);
    doc.text(`Completed Issues: ${report.completedIssues}`);
    doc.text(`Assigned Issues: ${report.assignedIssues || 0}`);
    doc.text(`Pending Issues: ${report.pendingIssues} (Includes Reported, Assigned, In Progress)`);
    doc.text(`Completion Rate: ${report.totalIssues > 0 ? ((report.completedIssues / report.totalIssues) * 100).toFixed(1) : 0}%`);
    doc.moveDown();

    // Worker Performance Section
    doc.fontSize(16).text('Worker Performance', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12);

    const workerPerformance = JSON.parse(report.workerPerformance || '[]');
    if (workerPerformance.length > 0) {
      workerPerformance.forEach((worker, index) => {
        doc.text(`${index + 1}. ${worker.worker}`);
        doc.text(`   - Assigned: ${worker.assigned} tasks`);
        doc.text(`   - Completed: ${worker.completed} tasks`);
        doc.text(`   - In Progress: ${worker.inProgress} tasks`);
        doc.text(`   - Completion Rate: ${worker.completionRate}`);
        doc.moveDown(0.5);
      });
    } else {
      doc.text('No worker performance data available.');
    }

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ message: 'Server error generating PDF.' });
  }
});

// DOWNLOAD EXCEL - Generate and download report as Excel
app.get('/api/generated-reports/:id/download/excel', mockAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const report = await GeneratedReport.findById(id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found.' });
    }

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report');

    // Add header styling
    worksheet.getCell('A1').value = 'Sanitation Performance Report';
    worksheet.getCell('A1').font = { size: 16, bold: true };
    worksheet.mergeCells('A1:D1');
    worksheet.getCell('A1').alignment = { horizontal: 'center' };

    // Add report info
    worksheet.addRow([]);
    worksheet.addRow(['Report ID:', report.reportId]);
    worksheet.addRow(['Period:', report.period]);
    worksheet.addRow(['Date Range:', `${new Date(report.fromDate).toLocaleDateString()} - ${new Date(report.toDate).toLocaleDateString()}`]);
    worksheet.addRow(['Generated By:', report.generatedBy]);
    worksheet.addRow(['Generated On:', new Date(report.createdAt).toLocaleString()]);
    worksheet.addRow(['Export Type:', report.exportType]);
    worksheet.addRow([]);

    // Statistics section
    worksheet.addRow(['Statistics']);
    worksheet.getCell('A' + worksheet.lastRow.number).font = { bold: true, size: 14 };
    worksheet.addRow(['Total Issues:', report.totalIssues]);
    worksheet.addRow(['Completed Issues:', report.completedIssues]);
    worksheet.addRow(['Assigned Issues:', report.assignedIssues || 0]);
    worksheet.addRow(['Pending Issues:', report.pendingIssues + ' (Includes Reported, Assigned, In Progress)']);
    worksheet.addRow(['Completion Rate:', `${report.totalIssues > 0 ? ((report.completedIssues / report.totalIssues) * 100).toFixed(1) : 0}%`]);
    worksheet.addRow([]);

    // Worker Performance section
    worksheet.addRow(['Worker Performance']);
    worksheet.getCell('A' + worksheet.lastRow.number).font = { bold: true, size: 14 };
    worksheet.addRow([]);

    // Worker performance table headers
    const headerRow = worksheet.addRow(['Worker', 'Assigned', 'Completed', 'In Progress', 'Completion Rate']);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center' };
    });

    const workerPerformance = JSON.parse(report.workerPerformance || '[]');
    if (workerPerformance.length > 0) {
      workerPerformance.forEach(worker => {
        worksheet.addRow([
          worker.worker,
          worker.assigned,
          worker.completed,
          worker.inProgress,
          worker.completionRate
        ]);
      });
    } else {
      worksheet.addRow(['No worker performance data available']);
    }

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, cell => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = maxLength < 10 ? 10 : maxLength + 2;
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${report.reportId}.xlsx"`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error generating Excel:', error);
    res.status(500).json({ message: 'Server error generating Excel.' });
  }
});

// ===========================
// CHAT SYSTEM API ENDPOINTS
// ===========================

// GET all conversations for a user (based on role)
app.get('/api/chat/conversations/:userId/:role', mockAuth, async (req, res) => {
  try {
    const { userId, role } = req.params;
    let conversations = [];

    if (role === 'user') {
      conversations = await Conversation.find({ userId, isActive: true }).sort({ lastMessageTime: -1 });
    } else if (role === 'worker') {
      conversations = await Conversation.find({ workerId: userId, isActive: true }).sort({ lastMessageTime: -1 });
    } else if (role === 'admin') {
      // Admin sees: shared conversations + conversations where they are the reporter
      conversations = await Conversation.find({
        $or: [
          { visibility: { $in: ['sharedWithAdmin', 'sharedWithBoth'] } },
          { userId: userId, userRole: 'admin' } // Admin's own reports
        ],
        isActive: true
      }).sort({ lastMessageTime: -1 });
    } else if (role === 'management') {
      // Management sees: shared conversations + conversations where they are the reporter
      conversations = await Conversation.find({
        $or: [
          { visibility: { $in: ['sharedWithManagement', 'sharedWithBoth'] } },
          { userId: userId, userRole: 'management' } // Management's own reports
        ],
        isActive: true
      }).sort({ lastMessageTime: -1 });
    }

    res.status(200).json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ message: 'Server error fetching conversations.' });
  }
});

// GET or CREATE conversation between user and worker
app.post('/api/chat/conversation', mockAuth, async (req, res) => {
  try {
    const { userId, userName, workerId, workerName, reportId } = req.body;

    // Check if conversation already exists
    let conversation = await Conversation.findOne({ userId, workerId });

    if (!conversation) {
      // Create new conversation
      const conversationId = `conv_${userId}_${workerId}_${Date.now()}`;
      conversation = new Conversation({
        conversationId,
        userId,
        userName,
        workerId,
        workerName,
        reportId: reportId || null,
        visibility: 'private'
      });
      await conversation.save();
    }

    res.status(200).json(conversation);
  } catch (error) {
    console.error('Error creating/fetching conversation:', error);
    res.status(500).json({ message: 'Server error with conversation.' });
  }
});

// GET messages for a conversation
app.get('/api/chat/messages/:conversationId', mockAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const messages = await Message.find({ conversationId }).sort({ timestamp: 1 });
    res.status(200).json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Server error fetching messages.' });
  }
});

// POST send a message
app.post('/api/chat/message', mockAuth, async (req, res) => {
  try {
    const {
      conversationId,
      senderId,
      senderRole,
      senderName,
      receiverId,
      receiverRole,
      messageText
    } = req.body;

    if (!conversationId || !senderId || !receiverId || !messageText) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    // Get conversation to inherit visibility
    const conversation = await Conversation.findOne({ conversationId });
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }

    // Create message
    const message = new Message({
      conversationId,
      senderId,
      senderRole,
      senderName,
      receiverId,
      receiverRole,
      messageText,
      visibility: conversation.visibility
    });
    await message.save();

    // Update conversation
    conversation.lastMessageTime = new Date();
    conversation.lastMessageText = messageText.substring(0, 50);
    conversation.updatedAt = new Date();

    // Increment unread count for receiver
    if (receiverRole === 'user') conversation.unreadCount.user++;
    else if (receiverRole === 'worker') conversation.unreadCount.worker++;
    else if (receiverRole === 'admin') conversation.unreadCount.admin++;
    else if (receiverRole === 'management') conversation.unreadCount.management++;

    // If visible to admin/management, increment their counts too
    if (conversation.visibility === 'sharedWithAdmin' || conversation.visibility === 'sharedWithBoth') {
      conversation.unreadCount.admin++;
    }
    if (conversation.visibility === 'sharedWithManagement' || conversation.visibility === 'sharedWithBoth') {
      conversation.unreadCount.management++;
    }

    await conversation.save();

    res.status(201).json({ message: 'Message sent successfully', data: message });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Server error sending message.' });
  }
});

// PUT mark messages as read
app.put('/api/chat/messages/read', mockAuth, async (req, res) => {
  try {
    const { conversationId, userId, userRole } = req.body;

    console.log('📖 Mark as read request:', { conversationId, userId, userRole });

    // Mark all messages in this conversation as read for this user
    const msgResult = await Message.updateMany(
      { conversationId, receiverId: userId, isRead: false },
      { $set: { isRead: true } }
    );

    console.log(`✅ Marked ${msgResult.modifiedCount} messages as read`);

    // Reset unread count for this user's role
    const conversation = await Conversation.findOne({ conversationId });
    if (conversation) {
      console.log('Before reset:', conversation.unreadCount);

      if (userRole === 'user') conversation.unreadCount.user = 0;
      else if (userRole === 'worker') conversation.unreadCount.worker = 0;
      else if (userRole === 'admin') conversation.unreadCount.admin = 0;
      else if (userRole === 'management') conversation.unreadCount.management = 0;

      await conversation.save();

      console.log('After reset:', conversation.unreadCount);
    }

    res.status(200).json({
      message: 'Messages marked as read.',
      messagesUpdated: msgResult.modifiedCount,
      unreadCount: conversation.unreadCount
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ message: 'Server error marking messages as read.' });
  }
});

// PUT update conversation visibility (share with admin/management)
app.put('/api/chat/conversation/visibility', mockAuth, async (req, res) => {
  try {
    const { conversationId, visibility } = req.body;

    const conversation = await Conversation.findOne({ conversationId });
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }

    conversation.visibility = visibility;
    conversation.updatedAt = new Date();
    await conversation.save();

    // Update all messages in this conversation
    await Message.updateMany(
      { conversationId },
      { $set: { visibility } }
    );

    res.status(200).json({ message: 'Visibility updated successfully', conversation });
  } catch (error) {
    console.error('Error updating visibility:', error);
    res.status(500).json({ message: 'Server error updating visibility.' });
  }
});

// GET total unread message count for a user
app.get('/api/chat/unread/:userId/:role', mockAuth, async (req, res) => {
  try {
    const { userId, role } = req.params;
    let totalUnread = 0;

    if (role === 'user') {
      const conversations = await Conversation.find({ userId });
      totalUnread = conversations.reduce((sum, conv) => sum + (conv.unreadCount.user || 0), 0);
    } else if (role === 'worker') {
      const conversations = await Conversation.find({ workerId: userId });
      totalUnread = conversations.reduce((sum, conv) => sum + (conv.unreadCount.worker || 0), 0);
    } else if (role === 'admin') {
      // Admin: shared conversations + their own reports
      const conversations = await Conversation.find({
        $or: [
          { visibility: { $in: ['sharedWithAdmin', 'sharedWithBoth'] } },
          { userId: userId, userRole: 'admin' }
        ]
      });
      totalUnread = conversations.reduce((sum, conv) => sum + (conv.unreadCount.admin || 0), 0);
    } else if (role === 'management') {
      // Management: shared conversations + their own reports
      const conversations = await Conversation.find({
        $or: [
          { visibility: { $in: ['sharedWithManagement', 'sharedWithBoth'] } },
          { userId: userId, userRole: 'management' }
        ]
      });
      totalUnread = conversations.reduce((sum, conv) => sum + (conv.unreadCount.management || 0), 0);
    }

    res.status(200).json({ unreadCount: totalUnread });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ message: 'Server error getting unread count.' });
  }
});

// DATABASE MANAGEMENT API ROUTES (ADMIN ONLY)

// Get all collections
app.get('/api/database/collections', mockAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(col => col.name);

    res.json({ collections: collectionNames });
  } catch (error) {
    console.error('Error fetching collections:', error);
    res.status(500).json({ message: 'Server error fetching collections' });
  }
});

// Get documents from a collection
app.get('/api/database/collections/:collectionName', mockAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { collectionName } = req.params;
    const { page = 1, limit = 20, search = '' } = req.query;

    const Collection = mongoose.connection.db.collection(collectionName);

    let query = {};
    if (search) {
      // Simple text search - can be enhanced
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { ticketNumber: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const documents = await Collection.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .toArray();

    res.json({ documents });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ message: 'Server error fetching documents' });
  }
});

// Update a document
app.put('/api/database/collections/:collectionName/:documentId', mockAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { collectionName, documentId } = req.params;
    const updateData = req.body;

    const Collection = mongoose.connection.db.collection(collectionName);

    // Convert string ID to ObjectId if needed
    let objectId;
    try {
      objectId = new mongoose.Types.ObjectId(documentId);
    } catch {
      objectId = documentId;
    }

    const result = await Collection.updateOne(
      { _id: objectId },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Document not found' });
    }

    res.json({ message: 'Document updated successfully' });
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ message: 'Server error updating document' });
  }
});

// Delete a document
app.delete('/api/database/collections/:collectionName/:documentId', mockAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { collectionName, documentId } = req.params;

    const Collection = mongoose.connection.db.collection(collectionName);

    // Convert string ID to ObjectId if needed
    let objectId;
    try {
      objectId = new mongoose.Types.ObjectId(documentId);
    } catch {
      objectId = documentId;
    }

    const result = await Collection.deleteOne({ _id: objectId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Document not found' });
    }

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ message: 'Server error deleting document' });
  }
});

// Delete all documents in a collection
app.delete('/api/database/collections/:collectionName', mockAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { collectionName } = req.params;

    const Collection = mongoose.connection.db.collection(collectionName);
    const result = await Collection.deleteMany({});

    res.json({
      message: `Deleted ${result.deletedCount} documents from ${collectionName}`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error deleting all documents:', error);
    res.status(500).json({ message: 'Server error deleting documents' });
  }
});

// Get Cloudinary files
app.get('/api/database/cloudinary', mockAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const result = await cloudinary.api.resources({
      type: 'upload',
      max_results: 500
    });

    res.json({ resources: result.resources });
  } catch (error) {
    console.error('Error fetching Cloudinary files:', error);
    res.status(500).json({ message: 'Server error fetching Cloudinary files' });
  }
});

// Delete Cloudinary file
app.delete('/api/database/cloudinary/:publicId', mockAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { publicId } = req.params;

    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === 'ok') {
      res.json({ message: 'File deleted successfully' });
    } else {
      res.status(400).json({ message: 'Failed to delete file', result });
    }
  } catch (error) {
    console.error('Error deleting Cloudinary file:', error);
    res.status(500).json({ message: 'Server error deleting file' });
  }
});

// Cleanup old completed conversations and reports (7 days after completion)
const cleanupOldConversations = async () => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    console.log('🧹 Starting cleanup of data older than 7 days (images and chats will be deleted)...');

    // 1. Find and cleanup old conversations
    const oldConversations = await Conversation.find({
      completedAt: { $lt: sevenDaysAgo, $ne: null },
      isActive: true
    });

    let messagesDeleted = 0;
    let conversationsDeleted = 0;

    if (oldConversations.length > 0) {
      // Delete associated messages first
      for (const conv of oldConversations) {
        const msgResult = await Message.deleteMany({ conversationId: conv.conversationId });
        messagesDeleted += msgResult.deletedCount;
      }

      // Delete the conversations
      const convResult = await Conversation.deleteMany({
        completedAt: { $lt: sevenDaysAgo, $ne: null },
        isActive: true
      });
      conversationsDeleted = convResult.deletedCount;

      console.log(`✅ Deleted ${conversationsDeleted} conversations and ${messagesDeleted} messages`);
    }

    // 2. Close old completed reports and delete associated conversations and images
    const oldReports = await Report.find({
      status: 'Completed',
      completedAt: { $lt: sevenDaysAgo, $ne: null },
      isTaskClosed: { $ne: true } // Only process reports that haven't been closed yet
    });

    let tasksClosed = 0;
    let conversationsDeletedForReports = 0;
    let messagesDeletedForReports = 0;

    if (oldReports.length > 0) {
      for (const report of oldReports) {
        // Close the task permanently after 7 days and delete images
        try {
          // Delete images from Cloudinary first
          if (report.photoPublicId) {
            try {
              await cloudinary.uploader.destroy(report.photoPublicId);
              console.log(`✅ Deleted original image from Cloudinary for closed report ${report.ticketNumber}: ${report.photoPublicId}`);
            } catch (cloudinaryError) {
              console.error(`Error deleting original image from Cloudinary for report ${report.ticketNumber}:`, cloudinaryError);
            }
          }
          if (report.completionPhotoPublicId) {
            try {
              await cloudinary.uploader.destroy(report.completionPhotoPublicId);
              console.log(`✅ Deleted completion image from Cloudinary for closed report ${report.ticketNumber}: ${report.completionPhotoPublicId}`);
            } catch (cloudinaryError) {
              console.error(`Error deleting completion image from Cloudinary for report ${report.ticketNumber}:`, cloudinaryError);
            }
          }

          // Update report to mark as closed and clear image references
          await Report.findByIdAndUpdate(report._id, {
            isTaskClosed: true,
            taskClosedAt: new Date(),
            internalNotes: (report.internalNotes || '') + '\n[Task automatically closed after 7 days - images deleted]',
            photoPath: null,
            photoPublicId: null,
            completionPhotoPath: null,
            completionPhotoPublicId: null
          });
          tasksClosed++;
        } catch (updateError) {
          console.error(`Error closing task ${report._id}:`, updateError);
        }

        // Delete associated conversations and messages for this report
        try {
          const conversationsToDelete = await Conversation.find({
            reportId: report.ticketNumber || report._id.toString()
          });

          if (conversationsToDelete.length > 0) {
            // Delete messages for these conversations
            for (const conv of conversationsToDelete) {
              const msgResult = await Message.deleteMany({ conversationId: conv.conversationId });
              messagesDeletedForReports += msgResult.deletedCount;
            }

            // Delete the conversations
            const convResult = await Conversation.deleteMany({
              reportId: report.ticketNumber || report._id.toString()
            });
            conversationsDeletedForReports += convResult.deletedCount;
          }
        } catch (chatError) {
          console.error(`Error deleting chat for report ${report._id}:`, chatError);
        }
      }

      console.log(`✅ Closed ${tasksClosed} tasks and deleted associated images from Cloudinary`);
      if (conversationsDeletedForReports > 0 || messagesDeletedForReports > 0) {
        console.log(`✅ Deleted ${conversationsDeletedForReports} conversations and ${messagesDeletedForReports} messages associated with closed reports`);
      }
    }

    if (conversationsDeleted === 0 && messagesDeleted === 0 && tasksClosed === 0 && conversationsDeletedForReports === 0 && messagesDeletedForReports === 0) {
      console.log('✨ No old data to cleanup');
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
};

// Run cleanup every 24 hours
setInterval(cleanupOldConversations, 24 * 60 * 60 * 1000);

// Run cleanup on server start
cleanupOldConversations();

// Manual cleanup endpoint (admin only)
app.delete('/api/chat/cleanup', mockAuth, async (req, res) => {
  try {
    await cleanupOldConversations();
    res.status(200).json({ message: 'Cleanup completed successfully' });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ message: 'Cleanup failed' });
  }
});

// Check if task can be reopened (7-day rule)
app.get('/api/reports/:reportId/reopen-status', mockAuth, async (req, res) => {
  try {
    const { reportId } = req.params;

    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({ message: 'Report not found.' });
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    let canReopen = true;
    let reason = '';
    let daysUntilClosure = 0;

    if (report.status === 'Completed' && report.completedAt) {
      const daysSinceCompletion = Math.floor((new Date() - new Date(report.completedAt)) / (1000 * 60 * 60 * 24));

      if (report.isTaskClosed) {
        canReopen = false;
        reason = 'Task has been closed for more than 7 days and cannot be reopened.';
      } else if (daysSinceCompletion >= 7) {
        canReopen = false;
        reason = 'Task completed more than 7 days ago. It will be closed soon.';
      } else {
        daysUntilClosure = 7 - daysSinceCompletion;
        reason = `Task can be reopened. Will close permanently in ${daysUntilClosure} day(s).`;
      }
    } else {
      reason = 'Task is not completed yet.';
    }

    res.status(200).json({
      reportId,
      status: report.status,
      completedAt: report.completedAt,
      isTaskClosed: report.isTaskClosed,
      taskClosedAt: report.taskClosedAt,
      canReopen,
      reason,
      daysUntilClosure,
      imagesCleaned: {
        original: report.originalImageCleaned,
        completion: report.completionImageCleaned,
        cleanedAt: report.imagesCleanedAt
      }
    });
  } catch (error) {
    console.error('Error checking reopen status:', error);
    res.status(500).json({ message: 'Server error checking reopen status.' });
  }
});

// Update existing reports with default values for new fields
const updateExistingReports = async () => {
  try {
    const result = await Report.updateMany(
      {
        $or: [
          { wasteConditions: { $exists: false } },
          { userPriority: { $exists: false } },
          { wasteAmount: { $exists: false } }
        ]
      },
      {
        $set: {
          wasteConditions: ['smelly'],
          userPriority: 'high',
          wasteAmount: 50
        }
      }
    );
    console.log(`Updated ${result.modifiedCount} existing reports with default values`);
  } catch (error) {
    console.error('Error updating existing reports:', error);
  }
};

// Error handling middleware for multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File size too large. Maximum size is 10MB.' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: 'Too many files uploaded.' });
    }
    return res.status(400).json({ message: 'File upload error: ' + error.message });
  }

  if (error.message.includes('image') || error.message.includes('format')) {
    return res.status(400).json({ message: error.message });
  }

  next(error);
});

// Start the server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  // Update existing reports on server start
  await updateExistingReports();
});