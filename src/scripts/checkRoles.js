const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const Member = require('../models/Member');

const checkRole = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const admin = await Member.findOne({ email: 'admin@gmail.com' });
        const superAdmin = await Member.findOne({ email: 'superadmin@mpb.com' });

        console.log('\n--- ROLE VERIFICATION ---');
        if (admin) {
            console.log('Admin Account (admin@gmail.com):');
            console.log(' - ID:', admin._id);
            console.log(' - Role:', admin.role);
        } else {
            console.log('Admin Account (admin@gmail.com) NOT FOUND');
        }

        if (superAdmin) {
            console.log('\nSuperAdmin Account (superadmin@mpb.com):');
            console.log(' - ID:', superAdmin._id);
            console.log(' - Role:', superAdmin.role);
        } else {
            console.log('SuperAdmin Account (superadmin@mpb.com) NOT FOUND');
        }
        console.log('-------------------------\n');

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkRole();
