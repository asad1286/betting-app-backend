const express = require("express");
const router = express.Router();
const userController = require("../controllers/UserController");
const {verifyJWTToken,isAdmin,isUser}=require('../middlewares/JWTAuth')


// Routes for user operations
router.post("/signup", userController.signupUser);
router.post("/signin", userController.signinUser);
router.get("/profile",verifyJWTToken,isUser, userController.userProfile);
router.put("/update_profile",verifyJWTToken,isUser, userController.editProfile);
router.put("/update_password",verifyJWTToken,isUser, userController.updatePassword);
// router.get("/create-order", userController.createOrder);

router.post('/assign-plan', verifyJWTToken, userController.assignPlanToUser);
router.get('/user-plans', verifyJWTToken, userController.getLoggedInUserPlans);
router.post('/withdraw-request', verifyJWTToken, userController.withdrawAmountRequest);
router.get('/referer-user', verifyJWTToken, userController.sendAmountOnUserReferel);



module.exports = router;
