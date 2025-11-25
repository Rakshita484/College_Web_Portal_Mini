const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const Department = require('./models/Department');
const User = require('./models/User');

dotenv.config();

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected for seeding');

        // Clear existing data
        await Department.deleteMany({});
        await User.deleteMany({});

        // Create Departments
        const departments = await Department.insertMany([
            { code: 'CSE', name: 'Computer Science and Engineering' },
            { code: 'ECE', name: 'Electronics and Communication Engineering' },
            { code: 'ME', name: 'Mechanical Engineering' }
        ]);
        console.log('Departments seeded');

        // Create Admin User
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('Admin@123', salt);

        const adminUser = new User({
            fullName: 'System Admin',
            email: 'admin@college.edu',
            passwordHash: passwordHash,
            role: 'admin',
            departmentId: departments[0]._id // Assigning to CSE for now, or null if preferred
        });

        await adminUser.save();
        console.log('Admin user seeded: admin@college.edu / Admin@123');

        process.exit();
    } catch (err) {
        console.error('Seeding error:', err);
        process.exit(1);
    }
};

seedData();
