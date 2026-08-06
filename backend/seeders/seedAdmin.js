const User = require('../models/User');
const connectDB = require('../config/database');
const { loadEnv, validateEnv } = require('../config');

loadEnv(); validateEnv(); connectDB();

const seedAdmin = async () => {
    try {
        if (await User.findOne({ role: 'admin' })) { console.log('Admin user already exists'); process.exit(0); }
        await User.create({ name: 'Admin', email: 'admin@bankpro.com', password: 'Admin@123', phone: '7813765432', pin: '1234', accountNumber: '97612743981', role: 'admin' });
        console.log('Admin user created successfully'); process.exit(0);
    } catch (err) { console.error('Error seeding admin user:', err); process.exit(1); }
};

seedAdmin();
