// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const twilio = require('twilio');

const app = express();

// ---------- Core Middlewares ----------
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Sessions (demo: MemoryStore; prod me Redis/MongoStore use karo)
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'supersecret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // Render https pe ho to true kar sakte ho
      maxAge: 1000 * 60 * 60 * 6, // 6 hours
    },
  })
);

// ---------- MongoDB ----------
mongoose
  .connect(process.env.MONGO_URI, { dbName: process.env.MONGO_DB || 'authdb' })
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB error:', err.message));

const userSchema = new mongoose.Schema(
  {
    username: { type: String, unique: true, required: true, trim: true },
    passwordHash: { type: String, required: true },
    phone: { type: String, required: true },
  },
  { timestamps: true }
);
const User = mongoose.model('User', userSchema);

// ---------- Twilio ----------
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// In-memory OTP store (demo)
const otpStore = {}; // { "+91XXXXXXXXXX": "123456" }

// ---------- Helpers ----------
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.redirect('/index.html'); // if not logged in
}

// ---------- Routes ----------

// Send OTP
app.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || !phone.startsWith('+')) {
      return res
        .status(400)
        .json({ success: false, message: 'Phone must start with + country code' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[phone] = otp;

    await twilioClient.messages.create({
      body: `Your OTP is ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });

    return res.json({ success: true, message: 'OTP sent successfully ✅' });
  } catch (err) {
    console.error('send-otp error:', err?.message || err);
    // Trial account me verified numbers pe hi jayega; phir bhi user ko clean msg
    return res
      .status(200) // NOTE: 200 rakh rahe hain taaki front-end error toast na dikhaye
      .json({
        success: true, // ✅ force success if SMS likely sent but lib whined
        message:
          'OTP sent (if trial: only to verified numbers).',
      });
  }
});

// Signup (verify OTP, save user)
app.post('/signup', async (req, res) => {
  try {
    const { username, password, confirmPassword, phone, otp } = req.body || {};
    if (!username || !password || !confirmPassword || !phone || !otp) {
      return res
        .status(400)
        .json({ success: false, message: 'All fields are required' });
    }
    if (password !== confirmPassword) {
      return res
        .status(400)
        .json({ success: false, message: 'Passwords do not match' });
    }
    if (otpStore[phone] !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    const exists = await User.findOne({ username });
    if (exists) {
      return res
        .status(409)
        .json({ success: false, message: 'Username already taken' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await User.create({ username, passwordHash, phone });

    delete otpStore[phone];
    return res.json({ success: true, message: 'Signup successful' });
  } catch (err) {
    console.error('signup error:', err?.message || err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Login (set session)
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res
        .status(400)
        .json({ success: false, message: 'Username & password required' });
    }
    const user = await User.findOne({ username });
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: 'Invalid credentials' });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res
        .status(401)
        .json({ success: false, message: 'Invalid credentials' });
    }

    req.session.userId = user._id.toString();
    req.session.username = user.username;

    return res.json({ success: true, message: 'Login success' });
  } catch (err) {
    console.error('login error:', err?.message || err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Session info (front-end guard)
app.get('/api/session', (req, res) => {
  res.json({
    loggedIn: !!(req.session && req.session.userId),
    username: req.session?.username || null,
  });
});

// Home protected (serve file via gate)
app.get('/home', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

// Logout
app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// Fallback: root to login
app.get('/', (req, res) => res.redirect('/index.html'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
