const express = require("express");
const bodyParser = require("body-parser");
const twilio = require("twilio");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());
app.use(express.static("public"));

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);
let otpStore = {};

app.post("/send-otp", (req, res) => {
    const { phone } = req.body;
    if (!phone.startsWith("+")) {
        return res.json({ message: "Phone number must include country code, e.g. +91xxxxxxxxxx" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);
    otpStore[phone] = otp;

    client.messages
        .create({
            body: `Your OTP is ${otp}`,
            from: twilioNumber,
            to: phone
        })
        .then(() => {
            res.json({ message: "OTP sent successfully" });
        })
        .catch(err => {
            console.error(err);
            res.json({ message: "Failed to send OTP. Please try again." });
        });
});

app.post("/signup", (req, res) => {
    const { username, password, phone, otp } = req.body;

    if (!username || !password || !phone || !otp) {
        return res.json({ message: "All fields are required" });
    }

    if (otpStore[phone] != otp) {
        return res.json({ message: "Invalid OTP" });
    }

    delete otpStore[phone];
    res.json({ message: "Signup successful!" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
