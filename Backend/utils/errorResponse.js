// utils/errorResponse.js
class ErrorResponse extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ErrorResponse;

// utils/emailService.js
const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  if (process.env.NODE_ENV === 'production') {
    // Production email service (e.g., SendGrid, AWS SES)
    return nodemailer.createTransporter({
      service: 'SendGrid',
      auth: {
        user: process.env.SENDGRID_USERNAME,
        pass: process.env.SENDGRID_PASSWORD
      }
    });
  } else {
    // Development - use Ethereal Email
    return nodemailer.createTransporter({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: process.env.EMAIL_USERNAME || 'ethereal.user@ethereal.email',
        pass: process.env.EMAIL_PASSWORD || 'ethereal.pass'
      }
    });
  }
};

// Send email function
const sendEmail = async (options) => {
  const transporter = createTransporter();

  const message = {
    from: `${process.env.FROM_NAME || 'Child Study App'} <${process.env.FROM_EMAIL || 'noreply@childstudy.com'}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html
  };

  try {
    const info = await transporter.sendMail(message);
    console.log('Message sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
};

// Email templates
const emailTemplates = {
  welcomeChild: (childName, parentEmail) => ({
    subject: `Welcome to Child Study App, ${childName}!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4CAF50;">Welcome to Child Study App! 🎉</h1>
        <p>Hi ${childName}!</p>
        <p>We're so excited to have you join our learning adventure! Get ready to:</p>
        <ul>
          <li>📚 Learn computer science basics in a fun way</li>
          <li>🎮 Play educational games</li>
          <li>🏆 Earn badges and rewards</li>
          <li>🧠 Grow your problem-solving skills</li>
        </ul>
        <p>Your parent/guardian (${parentEmail}) has set up your account and will help you get started.</p>
        <p>We can't wait to see what you'll learn!</p>
        <p style="font-weight: bold;">The Child Study Team</p>
        <hr style="border: 0; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #777;">
          If you didn't expect this email, please contact us at support@childstudy.com
        </p>
      </div>
    `
  }),

  welcomeParent: (parentName) => ({
    subject: `Welcome to Child Study App!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4CAF50;">Welcome to Child Study App! 👋</h1>
        <p>Hi ${parentName},</p>
        <p>Thank you for signing up! You've taken the first step in your child's exciting learning journey.</p>
        
        <h3 style="color: #4CAF50;">Getting Started:</h3>
        <ol>
          <li>Add your child's profile</li>
          <li>Explore our learning modules</li>
          <li>Set learning goals together</li>
          <li>Track progress in your dashboard</li>
        </ol>

        <p>We're here to help if you have any questions. Just reply to this email or visit our <a href="${process.env.APP_URL}/support">support center</a>.</p>
        
        <p>Happy learning!</p>
        <p style="font-weight: bold;">The Child Study Team</p>
      </div>
    `
  }),

  passwordReset: (name, resetUrl) => ({
    subject: `Child Study App - Password Reset Request`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4CAF50;">Password Reset</h1>
        <p>Hi ${name},</p>
        <p>We received a request to reset your password. Click the button below to proceed:</p>
        
        <a href="${resetUrl}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">
          Reset Password
        </a>

        <p>This link will expire in 1 hour. If you didn't request this, please ignore this email.</p>
        <p style="font-size: 12px; color: #777;">For security reasons, we don't store your password. This link will let you choose a new one.</p>
      </div>
    `
  }),

  achievementUnlocked: (childName, achievementName, description) => ({
    subject: `🏆 Achievement Unlocked: ${achievementName}!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #FFD700;">🏆 Achievement Unlocked!</h1>
        <p>Congratulations ${childName}!</p>
        <div style="background: linear-gradient(45deg, #FFD700, #FFA500); padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
          <h2 style="color: white; margin: 0;">${achievementName}</h2>
          <p style="color: white; margin: 10px 0 0 0;">${description}</p>
        </div>
        <p>Keep up the great work! You're doing amazing in your learning journey.</p>
        <p style="font-weight: bold;">The Child Study Team</p>
      </div>
    `
  }),

  progressReport: (childName, parentEmail, weeklyStats) => ({
    subject: `${childName}'s Weekly Progress Report`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #4CAF50;">Weekly Progress Report</h1>
        <p>Hi there!</p>
        <p>Here's how ${childName} did this week:</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #4CAF50; margin-top: 0;">This Week's Achievements:</h3>
          <ul>
            <li>📺 Videos watched: ${weeklyStats.videosWatched}</li>
            <li>⏱️ Total watch time: ${Math.round(weeklyStats.totalWatchTime / 60)} minutes</li>
            <li>✅ Lessons completed: ${weeklyStats.lessonsCompleted}</li>
            <li>🎯 Points earned: ${weeklyStats.pointsEarned}</li>
          </ul>
        </div>

        <p>Keep encouraging ${childName} to continue this great progress!</p>
        <p style="font-weight: bold;">The Child Study Team</p>
      </div>
    `
  })
};

module.exports = {
  sendEmail,
  emailTemplates
};