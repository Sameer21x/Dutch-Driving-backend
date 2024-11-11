const User = require('../Models/User');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
require('dotenv').config(); // Load environment variables at the top
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

console.log("Stripe Secret Key:", process.env.STRIPE_SECRET_KEY);


dotenv.config();




// Setup Nodemailer transport for Ethereal email
const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
        user: 'micaela.baumbach30@ethereal.email',
        pass: 'sE8yYSn6ztQduPQqdq'
    }
});

// Function to send OTP email
const sendOTPEmail = async (emailAddress, otp) => {
    try {
        // Define mail options
        const mailOptions = {
            from: '"Dutch Driving 👻" <micaela.baumbach30@ethereal.email>', // Sender address
            to: emailAddress, // Receiver's email
            subject: 'Your OTP Code', // Subject line
            text: `Your OTP code is ${otp}`, // Plain text body
            html: `<b>Your OTP code is ${otp}</b>` // HTML body
        };

        // Send mail with transporter
        const info = await transporter.sendMail(mailOptions);
        console.log("Message sent: %s", info.messageId);
        return info.messageId; // Return message ID on success
    } catch (error) {
        console.error("Error sending OTP email:", error);
        throw error; // Propagate the error to be handled in the signup function
    }
};

// Example usage in the signup function
async function signUpUser(req, res) {
    if (!req.body.username || !req.body.password || !req.body.emailAddress) {
        return res.status(400).json({ message: 'Username, password, and email are required.' });
    }

    try {
        const existingUser = await User.findOne({
            $or: [
                { username: req.body.username },
                { emailAddress: req.body.emailAddress }
            ]
        });

        if (existingUser) {
            return res.status(400).json({ message: 'Username or email address already exists.' });
        }

        const salt = await bcryptjs.genSalt(10);
        const hash = await bcryptjs.hash(req.body.password, salt);

        const otp = Math.floor(1000 + Math.random() * 9000);

        const user = new User({
            username: req.body.username,
            password: hash,
            emailAddress: req.body.emailAddress,
            otp,
            isVerified: false,
            paymentActive: false
        });

        const savedUser = await user.save();
        const messageId = await sendOTPEmail(savedUser.emailAddress, otp);

        const token = jwt.sign({
            userId: savedUser._id, email: savedUser.emailAddress, paymentActive: savedUser.paymentActive,
            isVerified: savedUser.isVerified
        }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(201).json({
            message: 'User created successfully, OTP sent to email',
            token: `Bearer ${token}`,
            emailMessageId: messageId
        });
    } catch (error) {
        // Existing error handling...
    }
}



async function updateMembershipPlan(req, res) {
    const { userId, membershipPlanType } = req.body;

    if (!userId || !membershipPlanType) {
        return res.status(400).json({ message: 'User ID and membership plan type are required.' });
    }

    try {
        // Find the user by their ID
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Calculate the cost, end date, and days based on the plan type
        const planDetails = calculateMembershipPlan(membershipPlanType);

        // Convert the cost to cents (Stripe expects the amount in cents)
        const unitAmount = Math.round(planDetails.cost * 100); // 19.99 becomes 1999 cents

        // Create a Stripe Checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
              {
                price_data: {
                  currency: 'usd',
                  product_data: {
                    name: `Membership Plan - ${membershipPlanType}`,
                  },
                  unit_amount: unitAmount, // Use the dynamically calculated amount
                },
                quantity: 1,
              },
            ],
            mode: 'payment',
            success_url: 'https://example.com/placeholder',  // temporary placeholder
            cancel_url: 'https://example.com/placeholder',  // temporary placeholder
          });
          
        // Retrieve the session URL for checkout
        const checkoutUrl = session.url;
        console.log("Checkout URL:", checkoutUrl);

        // Return the session URL and the number of days in the response
        res.status(200).json({
            message: 'Membership plan updated successfully. Redirecting to Stripe...',
            checkoutUrl: session.url,
            days: planDetails.days  // Return the calculated days
        });
    } catch (error) {
        res.status(500).json({ message: 'Something went wrong', error });
    }
}
// Helper function to calculate membership plan details based on type
function calculateMembershipPlan(planType) {
    let cost, endDate, days;
    const startDate = new Date(); // Current date

    // Assume 30 days per month for simplicity
    const fixedMonthLength = 30;

    // Create end date based on plan duration
    switch (planType) {
        case '1month':
            cost = 19.99;
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + fixedMonthLength); // 30 days later
            break;
        case '3months':
            cost = 14.99;
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + fixedMonthLength * 3); // 90 days later
            break;
        case '6months':
            cost = 9.99;
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + fixedMonthLength * 6); // 180 days later
            break;
        default:
            throw new Error('Invalid membership plan type');
    }

    // Calculate the number of days between the start and end date
    days = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));

    return { cost, endDate, days }; // Return the number of days
}







// Function to generate a random 6-digit OTP
function generateOTP() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

// Login User

function loginUser(req, res) {
    const { emailAddress, password } = req.body;

    // Get the user's IP address and user-agent (device info)
    const userIP = req.ip;
    const userAgent = req.headers['user-agent'];

    User.findOne({ emailAddress }).then(user => {
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials!" });
        }

        // Check if the account is active
        if (!user.accountActive) {
            return res.status(403).json({ message: "Your account is deactivated. Please contact support." });
        }

        // Compare password
        bcryptjs.compare(password, user.password, function (err, result) {
            if (!result) {
                return res.status(401).json({ message: "Invalid credentials!" });
            }

            // Check if it's a new IP or device or if the user is not verified
            const isNewDeviceOrIP = user.lastKnownIP !== userIP || user.lastKnownDevice !== userAgent;
            if (isNewDeviceOrIP || !user.isVerified) {
                // Send OTP if new IP, device, or unverified user
                const otp = generateOTP(); // Assuming you have a function for this
                user.otp = otp;
                sendOTPEmail(user.emailAddress, otp)
                    .then(() => {
                        // Update IP, device info, and mark as unverified
                        user.lastKnownIP = userIP;
                        user.lastKnownDevice = userAgent;
                        user.isVerified = false;
                        user.save().then(() => {
                            return res.status(200).json({
                                message: "OTP sent to your email. Please verify.",
                                otpRequired: true
                            });
                        });
                    })
                    .catch(err => {
                        res.status(500).json({ message: "Error sending OTP", error: err });
                    });
            } else {
                // Regular login without OTP
                const token = jwt.sign({
                    userId: user._id,
                    paymentActive: user.paymentActive,
                    isVerified: user.isVerified
                }, process.env.JWT_SECRET, { expiresIn: '1h' });

                // Update last known IP and device, and set isVerified to true
                user.lastKnownIP = userIP;
                user.lastKnownDevice = userAgent;
                user.isVerified = true;
                user.save().then(() => {
                    return res.status(200).json({
                        message: "Login successful!",
                        token: `Bearer ${token}`,
                        otpRequired: false // No OTP needed for familiar IP/device
                    });
                });
            }
        });
    }).catch(err => {
        res.status(500).json({ message: "Something went wrong", error: err });
    });
}



// Verify OTP
function verifyOTP(req, res) {
    const { emailAddress, otp } = req.body;

    if (!emailAddress || !otp) {
        return res.status(400).json({ message: 'Email and OTP are required.' });
    }

    // Find the user by email and verify the OTP
    User.findOne({ emailAddress }).then(user => {
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Check if the OTP matches
        if (user.otp === otp) {
            user.isVerified = true; // Mark the user as verified
            user.otp = undefined; // Optionally, remove the OTP from the record

            user.save()
                .then(() => {
                    res.status(200).json({
                        message: 'User has been verified.',
                        paymentActive: user.paymentActive // Include paymentActive in the response
                    });
                })
                .catch(error => {
                    res.status(500).json({
                        message: 'Error updating user verification status.',
                        error: error
                    });
                });
        } else {
            res.status(400).json({ message: 'Invalid OTP.' });
        }
    }).catch(error => {
        res.status(500).json({
            message: 'Something went wrong!',
            error: error
        });
    });
}


// Function to fetch user details by userId
async function getUserDetails(req, res) {
    const { userId } = req.params;

    // Validate if userId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: 'Invalid user ID format' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json({ message: 'User details retrieved successfully', user });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user details', error });
    }
}

// Update Account API
async function updateUserAccount(req, res) {
    const userId = req.params.userId; // Get user ID from URL params
    const { username, emailAddress, profilePic } = req.body; // Details to update

    try {
        // Find user by ID
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Update user details if they are provided
        if (username) user.username = username;
        if (emailAddress) user.emailAddress = emailAddress;
        if (profilePic) user.profilePic = profilePic;

        // Save updated user
        const updatedUser = await user.save();

        return res.status(200).json({
            message: "User updated successfully",
            updatedUser
        });
    } catch (error) {
        return res.status(500).json({ message: "Something went wrong", error });
    }
}

// Delete Account API (Soft Delete)
async function deleteUserAccount(req, res) {
    const userId = req.params.userId; // Get user ID from URL params

    try {
        // Find user by ID
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Mark account as inactive
        user.accountActive = false;

        // Save the updated user
        await user.save();

        return res.status(200).json({
            message: "Account has been deactivated successfully. You can no longer log in."
        });
    } catch (error) {
        return res.status(500).json({ message: "Something went wrong", error });
    }
}












async function contactUs(req, res) {
    const { emailAddress, name, message } = req.body;

    // Validate input fields
    if (!emailAddress || !name || !message) {
        return res.status(400).json({ message: 'Email, name, and message are required.' });
    }

    try {
        // Create a test account using Ethereal
        let testAccount = await nodemailer.createTestAccount();

        // Set up Nodemailer transport using Ethereal test account
        let transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            auth: {
                user: 'micaela.baumbach30@ethereal.email',
                pass: 'sE8yYSn6ztQduPQqdq'
            }
        });

        // Email content and structure
        let mailOptions = {
            from: emailAddress, // Sender's email (user's email)
            to: "company@example.com", // Your company email or where the messages should go
            subject: `Contact Us Query from ${name}`, // Subject line
            text: `You have received a new message from ${name} (${emailAddress}):\n\n${message}`
        };

        // Send the email
        let info = await transporter.sendMail(mailOptions);

        // Get the test email URL for preview (since Ethereal provides a URL for testing)
        let emailPreviewURL = nodemailer.getTestMessageUrl(info);

        // Response back to the client
        res.status(200).json({
            message: 'Your query has been submitted successfully.',
            emailPreviewURL // Return the preview URL for testing
        });

    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({
            message: 'An error occurred while sending your query. Please try again later.',
            error: error.message
        });
    }
}

module.exports = {
    signUpUser,
    loginUser,
    verifyOTP,
    updateMembershipPlan,
    getUserDetails,
    updateUserAccount,
    deleteUserAccount,
    contactUs
};
