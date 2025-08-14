const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const path = require("path");
const twilio = require("twilio");

dotenv.config();

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Twilio Client
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

let otpStore = {}; // { phone: otp }

// Serve signup page
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "signup.html"));
});

// Send OTP
app.post("/signup", async (req, res) => {
    const phone = req.body.phone;
    if (!phone) return res.status(400).send("Phone number required");

    const otp = Math.floor(100000 + Math.random() * 900000); // 6-digit OTP
    otpStore[phone] = otp;

    try {
        await client.messages.create({
            body: `Your OTP is ${otp}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phone
        });
        res.send("OTP sent successfully");
    } catch (err) {
        console.error("Error sending OTP:", err);
        res.status(500).send("Failed to send OTP. Please try again.");
    }
});

// Verify OTP
app.post("/verify-otp", (req, res) => {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).send("Phone and OTP required");

    if (otpStore[phone] && otpStore[phone].toString() === otp) {
        delete otpStore[phone];
        // OTP correct → redirect to index.html (login page)
        res.redirect("/index.html");
    } else {
        res.status(400).send("Invalid OTP");
    }
});

// Serve login page (index.html)
app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// Handle login (demo)
app.post("/login", (req, res) => {
    const { username, password } = req.body;
    if (username === "admin" && password === "12345") {
        res.send("Login successful!");
    } else {
        res.status(400).send("Invalid username or password");
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
