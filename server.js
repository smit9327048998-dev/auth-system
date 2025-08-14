require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const twilio = require('twilio');

const app = express();
const PORT = process.env.PORT || 3000;

// Twilio Credentials from .env
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !twilioPhone) {
    console.error("❌ Twilio credentials missing. Please check your .env file or hosting environment variables.");
    process.exit(1);
}

const client = twilio(accountSid, authToken);

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Serve Signup Page
app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

// Handle OTP sending
app.post('/send-otp', async (req, res) => {
    const { phone } = req.body;

    if (!phone) {
        return res.status(400).send('Phone number is required.');
    }

    const otp = Math.floor(100000 + Math.random() * 900000); // 6-digit OTP

    try {
        await client.messages.create({
            body: `Your OTP code is ${otp}`,
            from: twilioPhone,
            to: phone
        });
        res.send(`OTP sent successfully to ${phone}`);
    } catch (err) {
        console.error("❌ Error sending OTP:", err.message);
        res.status(500).send('Failed to send OTP. Please try again.');
    }
});

app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});
