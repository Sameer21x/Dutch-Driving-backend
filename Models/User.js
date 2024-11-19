const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid'); // Import UUID generator

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  emailAddress: {
    type: String,
    required: true,
    unique: true,
    match: [/.+\@.+\..+/, 'Please fill a valid email address'],
  },
  otp: { type: Number },
  lastKnownIP: { type: String },
  lastKnownDevice: { type: String },
  profilePic: { type: String },
  isVerified: { type: Boolean, default: false },
  accountActive: { type: Boolean, default: true },
  paymentActive: { type: Boolean, default: false },
  membershipPlan: {
    planType: { type: String, enum: ['1month', '3months', '6months'] },
    cost: { type: Number },
    startDate: { type: Date },
    endDate: { type: Date },
  },
  memberId: { type: String, unique: true }, // No need for `required` here
}, { timestamps: true });


userSchema.pre('save', function (next) {
  if (!this.isNew || this.memberId) return next(); // Skip if not new or already has memberId

  const prefix = 'DM-'; // Prefix for the MemberId
  const numericSuffix = Math.floor(1000 + Math.random() * 9000); // Generate a 4-digit random number
  this.memberId = `${prefix}${numericSuffix}`; // Combine prefix with numeric suffix

  next(); // Proceed with the save
});



module.exports = mongoose.model('User', userSchema);
