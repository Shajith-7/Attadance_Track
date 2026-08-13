const mongoose = require('mongoose');
require('dotenv').config();
const { connectDB } = require('./db');
const Role = require('./models/Role');
const Department = require('./models/Department');

const seedDB = async () => {
    try {
        await connectDB();

        // Seed Roles
        const roles = [
            { RoleID: 1, RoleName: 'Employee' },
            { RoleID: 2, RoleName: 'Manager' },
            { RoleID: 3, RoleName: 'HR' },
            { RoleID: 4, RoleName: 'CEO' }
        ];

        for (const role of roles) {
            await Role.findOneAndUpdate({ RoleID: role.RoleID }, role, { upsert: true, new: true });
        }
        console.log('Roles seeded successfully.');

        // Seed Departments
        const departments = [
            { DepartmentID: 1, DepartmentName: 'Engineering' },
            { DepartmentID: 2, DepartmentName: 'Product' },
            { DepartmentID: 3, DepartmentName: 'Sales' },
            { DepartmentID: 4, DepartmentName: 'HR' },
            { DepartmentID: 5, DepartmentName: 'Data Analytics' }
        ];

        for (const dept of departments) {
            await Department.findOneAndUpdate({ DepartmentID: dept.DepartmentID }, dept, { upsert: true, new: true });
        }
        console.log('Departments seeded successfully.');

        console.log('Database seeding complete.');
        process.exit(0);
    } catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
};

seedDB();
