const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const twilio = require('twilio');  // Twilio library for sending SMS
const app = express();

// Use body-parser to parse incoming form data
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// In-memory database for storing users temporarily (for demo purposes)
let users = [];
let currentOtp = ''; // Temporary OTP for verification
let phoneNumber = ''; // Store phone number temporarily for OTP verification

// Twilio API credentials (replace with your actual account SID and Auth Token)
const accountSid = '';  // Replace with your Twilio Account SID
const authToken = '';    // Replace with your Twilio Auth Token
const client = twilio(accountSid, authToken);

// Signup route to store user data and send OTP
app.post('/signup', (req, res) => {
  const { userid, password, phone } = req.body;
  
  // Generate random OTP (6 digits)
  currentOtp = Math.floor(100000 + Math.random() * 900000);
  phoneNumber = phone;  // Store phone number temporarily

  // Send OTP via Twilio SMS
  client.messages.create({
    body: `Your OTP is: ${currentOtp}`,
    from: '+18566060151',  // Replace with your Twilio phone number
    to: `+919327048998`   // User's phone number (ensure correct format)
  })
  .then(message => {
    console.log('OTP sent:', message.sid);
    // After OTP sent, show OTP verification form
    res.send('<h2>OTP sent to your phone. Please check and enter it below.</h2><form action="/verifyOTP" method="POST"><input type="number" name="otp" required><button type="submit">Verify OTP</button></form>');
  })
  .catch(err => {
    console.error('Error sending OTP:', err);
    res.send('Error sending OTP. Please try again.');
  });
});

// OTP verification route
app.post('/verifyOTP', (req, res) => {
  const { otp } = req.body;

  // Verify OTP
  if (otp == currentOtp) {
    // If OTP matches, save the user to in-memory database (for now)
    users.push({ userid: req.body.userid, password: req.body.password, phone: phoneNumber });
    currentOtp = '';  // Clear OTP after successful verification
    phoneNumber = '';  // Clear phone number after verification
    res.send('Signup successful! You can now login.');
  } else {
    res.send('Invalid OTP. Please try again.');
  }
});

// Login route to verify user credentials
app.post('/login', (req, res) => {
  const { userid, password } = req.body;

  const user = users.find(u => u.userid === userid && u.password === password);
  if (user) {
    res.send('Login successful!');
  } else {
    res.send('Invalid credentials');
  }
});

// Start the server on port 3000
const port = 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on  http://0.0.0.0:${port}`);
});
