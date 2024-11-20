const User = require('../Models/User');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
require('dotenv').config(); // Load environment variables at the top
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const blacklist = new Set();
const imagekit = require('../config/imagekit');




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

const updateMembershipPlan = async (req, res) => {
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

        // Calculate the membership plan details
        const planDetails = calculateMembershipPlan(membershipPlanType);

        // Stripe expects the amount in cents
        const unitAmount = Math.round(planDetails.cost * 100);

        // Create a Stripe Checkout session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'eur', // Specify euros as the currency
                        product_data: {
                            name: `Membership Plan - ${membershipPlanType}`,
                        },
                        unit_amount: unitAmount, // Amount in cents
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: "http://localhost:3001/userprofile", // Adjust the success URL
            cancel_url: "http://localhost:3001/paymentfailed", // Adjust the cancel URL
            metadata: {
                userId: user._id.toString(),
                membershipPlanType: membershipPlanType,
            },
        });

        // Save the checkout session ID and update membership details
        user.stripeSessionId = session.id;
        user.membershipPlan = {
            planType: membershipPlanType,
            cost: planDetails.cost, // Keep cost in euros for display purposes
            startDate: new Date(),
            endDate: planDetails.endDate,
        };
        await user.save();

        res.status(200).json({
            message: 'Redirecting to payment gateway...',
            checkoutUrl: session.url,
            membershipDetails: user.membershipPlan, // Include membership details in the response
        });
    } catch (error) {
        console.error('Error creating membership plan:', error);
        res.status(500).json({ message: 'Internal server error', error });
    }
};

// Helper function to calculate membership plan details
function calculateMembershipPlan(planType) {
    let cost, endDate;
    const startDate = new Date();
    const fixedMonthLength = 30;

    switch (planType) {
        case '1month':
            cost = 19.99;
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + fixedMonthLength);
            break;
        case '3months':
            cost = 14.99;
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + fixedMonthLength * 3);
            break;
        case '6months':
            cost = 9.99;
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + fixedMonthLength * 6);
            break;
        default:
            throw new Error('Invalid membership plan type');
    }

    return { cost, endDate };
}


// Stripe webhook to handle successful payment
async function handlePaymentWebhook(event) {
    try {
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;

            // Get user ID and membership plan type from metadata
            const userId = session.metadata.userId;
            const membershipPlanType = session.metadata.membershipPlanType;

            // Find the user and update their payment status and membership plan
            const user = await User.findById(userId);
            if (user) {
                const planDetails = calculateMembershipPlan(membershipPlanType);
                user.paymentActive = true;
                user.membershipPlan = {
                    planType: membershipPlanType,
                    cost: planDetails.cost,
                    startDate: new Date(),
                    endDate: planDetails.endDate,
                };

                await user.save();
                console.log('Membership plan updated successfully for user:', userId);
            }
        }
    } catch (error) {
        console.error('Error handling payment webhook:', error);
    }
}

// // Helper function to calculate membership plan details
// function calculateMembershipPlan(planType) {
//     let cost, endDate;
//     const startDate = new Date();
//     const fixedMonthLength = 30;

//     switch (planType) {
//         case '1month':
//             cost = 19.99;
//             endDate = new Date(startDate);
//             endDate.setDate(startDate.getDate() + fixedMonthLength);
//             break;
//         case '3months':
//             cost = 14.99 * 3; // Total cost for 3 months
//             endDate = new Date(startDate);
//             endDate.setDate(startDate.getDate() + fixedMonthLength * 3);
//             break;
//         case '6months':
//             cost = 9.99 * 6; // Total cost for 6 months
//             endDate = new Date(startDate);
//             endDate.setDate(startDate.getDate() + fixedMonthLength * 6);
//             break;
//         default:
//             throw new Error('Invalid membership plan type');
//     }

//     return { cost, endDate };
// }



// Function to generate a random 6-digit OTP
function generateOTP() {
    return Math.floor(1000 + Math.random() * 9000).toString();
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



async function logoutUser(req, res) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: "No token provided." });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Blacklist the token by storing its jti or full token
        blacklist.add(token);

        res.status(200).json({ message: "Successfully logged out." });
    } catch (error) {
        res.status(400).json({ message: "Invalid token.", error });
    }
}

// Controller to upload and save profile picture
const uploadProfilePic = async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId || !req.file) {
            return res.status(400).json({ message: 'User ID and image file are required.' });
        }

        const file = req.file.buffer; // Ensure you're using multer to handle file uploads
        const fileName = `profile_${userId}_${Date.now()}.jpg`;

        // Upload to ImageKit
        const response = await imagekit.upload({
            file,
            fileName,
            folder: '/Dutch-Driving-assets'
        });

        // Save URL in the database
        const user = await User.findByIdAndUpdate(
            userId,
            { profilePic: response.url },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.status(200).json({ message: 'Profile picture updated successfully.', profilePic: response.url });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error uploading profile picture.', error });
    }
};

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
    logoutUser,
    verifyOTP,
    updateMembershipPlan,
    handlePaymentWebhook,
    getUserDetails,
    updateUserAccount,
    deleteUserAccount,
    contactUs,
    uploadProfilePic
};
