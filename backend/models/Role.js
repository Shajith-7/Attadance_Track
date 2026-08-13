const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
    RoleID: { type: Number, required: true, unique: true }, // Keeping original RoleID logic (1,2,3,4)
    RoleName: { type: String, required: true }
});

module.exports = mongoose.model('Role', roleSchema);
