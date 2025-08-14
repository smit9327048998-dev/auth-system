require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const twilio = require("twilio");

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Public folder static serve
app.use(express.static(path.join(__dirname, "public")));

// Twilio client
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// OTP store (sirf testing ke liye, real project me DB use karo)
let otpStore = {};

// GET signup page
app.get("/signup", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "signup.html"));
});

// Send OTP
app.post("/send-otp", async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone || !phone.startsWith("+")) {
            return res.status(400).send("Phone number must include country code, e.g. +91xxxxxxxxxx");
        }

        const otp = Math.floor(100000 + Math.random() * 900000);
        otpStore[phone] = otp;

        await client.messages.create({
            body: `Your OTP is ${otp}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phone
        });

        res.status(200).send("OTP sent successfully!");
    } catch (error) {
        console.error("OTP send error:", error);
        res.status(500).send("Failed to send OTP. Please try again.");
    }
});

// Verify OTP
app.post("/verify-otp", (req, res) => {
    const { phone, otp } = req.body;

    if (otpStore[phone] && otpStore[phone] == otp) {
        delete otpStore[phone];
        res.send("OTP verified successfully!");
    } else {
        res.status(400).send("Invalid OTP.");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
