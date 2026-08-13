const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
    EmployeeID: { type: Number, unique: true }, // We might need an auto-increment plugin or just rely on MongoDB's _id instead. For this migration, let's keep EmployeeID if we rely on it elsewhere, or we can transition to _id.
    // Given the previous schema used IDENTITY(1,1), we should probably use a counter, OR we can refactor code to use _id.
    // Refactoring to use _id is better for Mongo. We will keep EmployeeID for now, but also use standard Mongo references where possible.
    EmployeeCode: { type: String, default: null },
    FirstName: { type: String, required: true },
    LastName: { type: String, required: true },
    Email: { type: String, required: true, unique: true },
    Phone: { type: String, default: null },
    DepartmentID: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    RoleID: { type: Number, required: true }, // Sticking with the 1, 2, 3, 4 logic from SQL
    ManagerID: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    Designation: { type: String, default: null },
    JoiningDate: { type: Date, default: null },
    EmploymentType: { type: String, default: 'Full-time', enum: ['Full-time', 'Part-time', 'Contract', 'Intern'] },
    WorkMode: { type: String, default: 'WFO', enum: ['WFO', 'WFH', 'Hybrid'] }, // Legacy, kept for historical records
    AssignedShift: { type: String, default: 'NIGHT' },
    WfhDaysPerWeek: { type: Number, default: 0 },
    WorkLocation: { type: String, default: null },
    ProfilePhoto: { type: String, default: null },
    PasswordHash: { type: String, default: null },
    InvitationToken: { type: String, default: null },
    Status: { type: String, default: 'Invited', enum: ['Invited', 'Active', 'Inactive'] },
    TwoFactorSecret: { type: String, default: null },
    IsTwoFactorEnabled: { type: Boolean, default: false },
    SetupOtp: { type: String, default: null },
    SetupOtpExpiry: { type: Date, default: null }
}, { timestamps: true });

// We can map timestamps to CreatedAt and UpdatedAt
// The timestamps option automatically adds createdAt and updatedAt fields.

module.exports = mongoose.model('Employee', employeeSchema);
