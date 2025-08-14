// Load environment variables
require("dotenv").config();

// Import required packages
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const twilio = require("twilio");

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public")); // Serve frontend files from public folder

// Twilio client
const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

// Temporary OTP storage (in-memory)
const otpStore = {};

// API: Send OTP
app.post("/send-otp", async (req, res) => {
    const { phone } = req.body;

    if (!phone || !phone.startsWith("+")) {
        return res.json({
            success: false,
            message: "Phone number must include country code (e.g. +91...)"
        });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[phone] = otp;

    try {
        await client.messages.create({
            body: `Your OTP is ${otp}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phone
        });
        res.json({ success: true, message: "OTP sent successfully" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

// API: Verify OTP
app.post("/verify-otp", (req, res) => {
    const { phone, otp } = req.body;

    if (otpStore[phone] && otpStore[phone] === otp) {
        delete otpStore[phone]; // OTP used, remove from store
        res.json({ success: true, message: "OTP verified successfully" });
    } else {
        res.json({ success: false, message: "Invalid or expired OTP" });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
