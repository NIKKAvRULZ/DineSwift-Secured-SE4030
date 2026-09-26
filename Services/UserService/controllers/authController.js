const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

exports.register = async (req, res) => {
    try {
        const {name, email, password} = req.body;
        if (req.body.role !== undefined && req.body.role !== 'customer') {
            return res.status(400).json({ message: 'Privileged roles cannot be self-registered' });
        }
        const role = 'customer';
        const hashPassword = await bcrypt.hash(password, 10);
        const user = new User({name, email, password: hashPassword, role});
        await user.save();
        res.status(201).send('User Registered Successfully');
    } catch (error) {
        res.status(400).json({ message: "Registration failed" });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Basic payload validation
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Securely compare incoming password with database hash
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role, name: user.name, email: user.email }, 
            process.env.JWT_SECRET, 
            { expiresIn: "1h" }
        );
       
        return res.status(200).json({ token });
    } catch (err) {
        console.error("Login server error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};
