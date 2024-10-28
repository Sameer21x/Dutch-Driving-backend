const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    emailAddress: {
      type: String,
      required: true,
      unique: true,
      match: [/.+\@.+\..+/, 'Please fill a valid email address']
  },    otp: { type: Number },
    lastKnownIP: { type: String },         // Add lastKnownIP
    lastKnownDevice: { type: String }, 
    profilePic: { type: String },  
    isVerified: { type: Boolean, default: false }, 
    accountActive: { type: Boolean, default: true },
    paymentActive: { type: Boolean, default: false },
      // Membership Plan Details
      membershipPlan: {
        planType: { type: String, enum: ['1month', '3months', '6months'] }, // Plan type (1, 3, or 6 months)
        cost: { type: Number },  // Price based on the plan type
        startDate: { type: Date },  // When the plan starts
        endDate: { type: Date }     // When the plan expires
    }
    
}, { timestamps: true });





module.exports = mongoose.model('User', userSchema);