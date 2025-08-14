const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const twilio = require('twilio');
require('dotenv').config(); // For local testing with .env

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

let users = [];
let currentOtp = '';
let phoneNumber = '';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !twilioPhone) {
  console.error("❌ Missing Twilio environment variables!");
}

const client = twilio(accountSid, authToken);

app.post('/signup', (req, res) => {
  const { userid, password, phone } = req.body;

  if (!phone.startsWith('+')) {
    return res.status(400).send('Phone number must include country code, e.g. +91XXXXXXXXXX');
  }

  currentOtp = Math.floor(100000 + Math.random() * 900000).toString();
  phoneNumber = phone;

  client.messages
    .create({
      body: `Your OTP is: ${currentOtp}`,
      from: twilioPhone,
      to: phoneNumber
    })
    .then(() => {
      console.log(`✅ OTP sent to ${phoneNumber}`);
      res.send('OTP sent successfully!');
    })
    .catch(err => {
      console.error("❌ Error sending OTP:", err);
      res.status(500).send('Failed to send OTP. Please try again.');
    });
});

app.post('/verify', (req, res) => {
  const { otp } = req.body;
  if (otp === currentOtp) {
    users.push({ phone: phoneNumber });
    res.send('✅ OTP verified successfully!');
  } else {
    res.status(400).send('❌ Invalid OTP!');
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
