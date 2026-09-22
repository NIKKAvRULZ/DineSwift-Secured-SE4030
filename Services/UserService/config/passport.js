const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User'); // Adjust path to your User model if needed
const jwt = require('jsonwebtoken');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // 1. Check if user already exists in your DB
      let user = await User.findOne({ email: profile.emails[0].value });

      if (user) {
        // If they exist but signed up with email/password, you might want to link the accounts,
        // or just log them in. Here we just log them in.
        return done(null, user);
      } else {
        // 2. If not, create a new user in the database
        user = await User.create({
          name: profile.displayName,
          email: profile.emails[0].value,
          // Generate a random password since they used Google to sign in
          password: Math.random().toString(36).slice(-8), 
          role: 'customer' // Default role for DineSwift
        });
        return done(null, user);
      }
    } catch (error) {
      return done(error, false);
    }
  }
));