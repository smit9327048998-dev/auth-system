require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const twilio = require("twilio");

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Signup route (Send OTP)
app.post("/signup", async (req, res) => {
    try {
        let { username, password, phoneNumber } = req.body;

        if (!username || !password || !phoneNumber) {
            return res.status(400).send("User ID, password, and phone number are required");
        }

        // Format phone number
        phoneNumber = phoneNumber.trim();
        if (!phoneNumber.startsWith("+")) {
            phoneNumber = "+91" + phoneNumber; // Default India code
        }

        // Send OTP using Twilio Verify
        const verification = await client.verify.v2
            .services(process.env.TWILIO_VERIFY_SERVICE_SID)
            .verifications
            .create({ to: phoneNumber, channel: "sms" });

        console.log(`OTP sent to ${phoneNumber}:`, verification.status);
        res.send(`OTP sent to ${phoneNumber}`);
    } catch (error) {
        console.error("Error sending OTP:", error);
        res.status(500).send("Failed to send OTP. Please try again.");
    }
});

// Verify OTP route
app.post("/verify-otp", async (req, res) => {
    try {
        let { phoneNumber, otp } = req.body;

        if (!phoneNumber || !otp) {
            return res.status(400).send("Phone number and OTP are required");
        }

        phoneNumber = phoneNumber.trim();
        if (!phoneNumber.startsWith("+")) {
            phoneNumber = "+91" + phoneNumber;
        }

        const verificationCheck = await client.verify.v2
            .services(process.env.TWILIO_VERIFY_SERVICE_SID)
            .verificationChecks
            .create({ to: phoneNumber, code: otp });

        if (verificationCheck.status === "approved") {
            res.send("OTP verified successfully!");
        } else {
            res.status(400).send("Invalid OTP. Please try again.");
        }
    } catch (error) {
        console.error("Error verifying OTP:", error);
        res.status(500).send("Failed to verify OTP. Please try again.");
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
