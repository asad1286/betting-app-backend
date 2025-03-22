const nodemailer = require('nodemailer');

// Function to send email to the user
function sendMailtoUser(username, email, subject, message) {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com", // ✅ Correct hostname
    port: 587, // TLS port (or 465 for SSL)
    secure: false, // false for TLS, true for SSL
    auth: {
      user: process.env.ADMIN_EMAIL, // Your Gmail email
      pass: process.env.ADMIN_PASSWORD, // App password if using 2FA
    },
    tls: {
      rejectUnauthorized: false,
      family: 4, // Forces IPv4 (fixes some DNS issues)
    },
  });

  const mailOptions = {
    from: process.env.ADMIN_EMAIL,
    to: email,
    subject: subject,
    text: `Hello ${username},\n\n${message}\n\nBest regards`,
  };

  // Send email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('Error sending email:', error);
      return;
    }
    console.log('Email sent:', info.response);
  });
}

module.exports = {sendMailtoUser};
