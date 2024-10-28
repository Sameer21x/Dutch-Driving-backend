const express = require('express');
const router = express.Router();
const userController = require('../Controllers/UserController');




// Route to handle signup
router.post('/signup', userController.signUpUser);
router.post('/login', userController.loginUser);
router.post('/verify-otp', userController.verifyOTP);
router.get('/:userId', userController.getUserDetails);
router.put('/update/:userId', userController.updateUserAccount);
router.delete('/delete/:userId', userController.deleteUserAccount);
router.post('/updateMembershipPlan', userController.updateMembershipPlan);
router.post('/contactUs', userController.contactUs);





module.exports = router;
