const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

exports.register = async (req, res) => {
    try {
        const {name, email, password, role} = req.body;
        const hashPassword = await bcrypt.hash(password, 10);
        const user = new User({name, email, password: hashPassword, role});
        await user.save();
        res.status(201).send('User Registered Successfully');
    } catch(error) {
        res.status(400).send(error);
    }
};

exports.login = async (req, res) => {
    try {
        const {email, password} = req.body;
        
        // 1. Check if the user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" });
        }
        
        // 2. Properly compute the password match
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }
        
        // 3. Issue the token only if both checks pass
        const token = jwt.sign(
            { id: user._id, role: user.role, name: user.name, email: user.email }, 
            process.env.JWT_SECRET, 
            { expiresIn: "1h" }
        );
       
        res.json({ token });
    } catch(error) {
        res.status(500).json({error: error.message});
    }
};