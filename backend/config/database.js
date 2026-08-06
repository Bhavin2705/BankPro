const mongoose = require('mongoose');

const connectDB = async () => {
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) { console.error('MONGODB_URI environment variable is not set'); process.exit(1); }

    try {
        const conn = await mongoose.connect(mongoURI, { dbName: 'bank_management_system' });
        console.log(`MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    } catch (error) {
        console.error('Database connection error:', error.message);
        process.exit(1);
    }
};

module.exports = connectDB;
