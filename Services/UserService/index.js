const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const passport = require('passport'); // Add this
const connectDB = require('./config/db');

dotenv.config();
require('./config/passport'); // Load passport configuration

const authRoutes = require("./routes/authRoutes");

const app = express();
app.use(cors());
app.use(express.json());
app.use(passport.initialize()); // Initialize passport

app.use("/api/auth", authRoutes);

// Connect to MongoDB
connectDB();

app.get('/', (req, res) => res.send('User Service Running'));

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`User Service running on port ${PORT}`));