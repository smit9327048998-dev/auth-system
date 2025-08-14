// server.js
require("dotenv").config();
const path = require("path");
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Middleware ----------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public"))); // index.html, signup.html, script.js

// ---------- Twilio Setup ----------
const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = process.env;
let twilioClient = null;
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  twilioClient = require("twilio")(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
} else {
  console.warn("Twilio creds not found in env. SMS won't actually be sent.");
}

// ---------- In-memory stores (demo only) ----------
const users = []; // { userid, password, phone }
const otpStore = new Map(); // key: phone -> { otp, expiresAt, userid, password }

// Helpers
const genOtp = () => Math.floor(100000 + Math.random() * 900000).toString();
const normalizePhone = (p) => (p || "").replace(/\s+/g, "");

// ---------- Routes ----------

// Send OTP
app.post("/signup", async (req, res) => {
  const { userid, userId, password, phone, phoneNumber } = req.body || {};
  const uid = userId || userid || "";
  const rawPhone = phoneNumber || phone || "";
  const p = normalizePhone(rawPhone);

  console.log("Signup payload:", { uid, password: !!password, phone: p });

  // India format: +91 + 10 digits
  const indiaRegex = /^\+91\d{10}$/;
  if (!indiaRegex.test(p)) {
    return res
      .status(400)
      .send("Phone number must include country code, e.g. +919876543210");
  }
  if (!uid || !password) {
    return res.status(400).send("User ID and password are required.");
  }

  const otp = genOtp();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  otpStore.set(p, { otp, expiresAt, userid: uid, password });

  try {
    if (twilioClient && TWILIO_PHONE_NUMBER) {
      await twilioClient.messages.create({
        from: TWILIO_PHONE_NUMBER,
        to: p,
        body: `Your OTP is ${otp}. It expires in 5 minutes.`,
      });
    } else {
      console.log(`[DEV] Would send OTP ${otp} to ${p}`);
    }
    return res.status(200).send("OTP sent successfully!");
  } catch (err) {
    console.error("Twilio send error:", err?.message || err);
    return res.status(500).send("Failed to send OTP. Please try again.");
  }
});

// Verify OTP
app.post("/verifyOTP", (req, res) => {
  const { otp, phone, phoneNumber } = req.body || {};
  const p = normalizePhone(phoneNumber || phone || "");

  console.log("Verify payload:", { phone: p, otp });

  if (!/^\+91\d{10}$/.test(p)) {
    return res
      .status(400)
      .send("Phone number must include country code, e.g. +919876543210");
  }
  const record = otpStore.get(p);
  if (!record) {
    return res.status(400).send("OTP not requested or already used/expired.");
  }
  if (Date.now() > record.expiresAt) {
    otpStore.delete(p);
    return res.status(400).send("OTP expired. Please request a new one.");
  }
  if (String(otp).trim() !== record.otp) {
    return res.status(400).send("Invalid OTP. Please try again.");
  }

  // Success: save user (demo) and clear OTP
  users.push({ userid: record.userid, password: record.password, phone: p });
  otpStore.delete(p);
  return res.status(200).send("Signup successful! You can now login.");
});

// Simple health route
app.get("/health", (_req, res) => res.send("OK"));

// Start server (0.0.0.0 for Render)
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
