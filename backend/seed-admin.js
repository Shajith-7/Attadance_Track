require('dotenv').config();
const mongoose = require('mongoose');
const argon2 = require('argon2');
const Employee = require('./models/Employee');
const Role = require('./models/Role');
const { connectDB } = require('./db');

async function seedAdmin() {
  try {
    await connectDB();

    const ceoRole = await Role.findOne({ RoleName: 'CEO' });
    if (!ceoRole) {
      throw new Error('CEO Role not found. Run seed.js first.');
    }

    const mongoose = require('mongoose');
    const department = mongoose.connection.collection('departments');
    const mngmtDept = await department.findOne({ DepartmentName: 'Management' });

    const email = 'admin@company.com';
    const password = 'admin';
    const passwordHash = await argon2.hash(password);

    // Remove existing admin if any
    await Employee.deleteOne({ Email: email });

    const admin = new Employee({
      EmployeeID: 1,
      FirstName: 'Jane',
      LastName: 'Doe',
      Email: email,
      PasswordHash: passwordHash,
      RoleID: ceoRole.RoleID,
      DepartmentID: mngmtDept ? mngmtDept._id : null,
      Status: 'Active',
      IsTwoFactorEnabled: false
    });

    await admin.save();
    console.log(`✅ Admin user seeded successfully!`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    process.exit(1);
  }
}

seedAdmin();
