const express = require('express');
const adminController = require('../controllers/AdminController');
const { verifyJWTToken, isAdmin } = require('../middlewares/JWTAuth'); // Ensure the user is authenticated and an admin
const router = express.Router();

// Route to add a new plan (only for admins)
router.post('/admin-login', adminController.signinAdmin);
router.post('/add-plan', verifyJWTToken, isAdmin, adminController.addPlan);
// router.get('/get-btc-games',verifyJWTToken,isAdmin,adminController.getAllBTCGames)
// router.put('/update-game-result/:gameId',adminController.updateResultStatus)

router.get('/plans', adminController.getPlans);
router.get('/invitations',verifyJWTToken,isAdmin, adminController.getInvitationAmounts);
router.put('/update-invitation-status/:id', adminController.updateInvitationStatus);
router.get('/admin-details',verifyJWTToken,isAdmin, adminController.getAdminDetails);
router.get('/users',verifyJWTToken,isAdmin, adminController.getAllUsers);
router.get('/withdraw-requests',verifyJWTToken,isAdmin,adminController.getAllWithdrawalRequests)
router.put('/request-update/:requestId',verifyJWTToken,isAdmin,adminController.updateWithdrawalRequestStatus)
// router.post('/add-timer',verifyJWTToken,isAdmin,adminController.addTimer)
// router.get('/latest-timer',verifyJWTToken,isAdmin,adminController.latestTimer)
router.delete('/delete-plan/:planId',verifyJWTToken,isAdmin,adminController.deletePlan)
router.put('/edit-plan/:planId',adminController.editPlan)

// Route to assign a plan to a user (can be accessed by any authorized user)


module.exports = router;
