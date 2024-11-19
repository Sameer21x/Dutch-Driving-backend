const express = require('express');
const router = express.Router();
const userController = require('../Controllers/UserController');
const upload =require('../middleware/upload')




// Route to handle signup
router.post('/signup', userController.signUpUser);
router.post('/login', userController.loginUser);
router.post('/logout', userController.logoutUser);
router.post('/verify-otp', userController.verifyOTP);
router.get('/:userId', userController.getUserDetails);
router.put('/update/:userId', userController.updateUserAccount);
router.delete('/delete/:userId', userController.deleteUserAccount);
router.post('/updateMembershipPlan', userController.updateMembershipPlan);
router.post('/stripe-webhook', express.raw({ type: 'application/json' }), userController.handlePaymentWebhook);
router.post('/contactUs', userController.contactUs);
router.post('/uploadprofilepic', upload.single('image'), userController.uploadProfilePic);





module.exports = router;
