const { Plan, User, UserPlan, WithdrawalRequest } = require('../models/index'); // Import the models
const moment = require('moment'); // To format dates
// We will use this to set the expiry date for the plan
const { Sequelize,Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { sendWithDrawAmount, getUsdtBalance,getAdminDetails } = require('../tronUtils')
const { sendMailtoUser } = require('../mailer');
const { use } = require('../routes/AdminRoute');
const ADMIN_TRX_ADDRESS = "TKjf3ykrNy8xmjEQuNfhz9yrK7b4ctzV1P";
// Controller to add a new plan
module.exports = {
    async signinAdmin(req, res) {
        try {
            const { email, phoneNumber, password } = req.body;
            //   console.log(req.body);
            // Ensure only one of email or phoneNumber is provided
            if ((!email && !phoneNumber) || (email && phoneNumber)) {
                return res.status(400).json({
                    success: false,
                    message: 'Please provide either email or phone number, but not both.',
                });
            }

            // Find user by either email or phoneNumber
            const user = await User.findOne({
                where: {
                    [Op.or]: [
                        email ? { email } : null, // Only include email if provided
                        phoneNumber ? { phoneNumber } : null, // Only include phoneNumber if provided
                    ],
                },
            });

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'User not found',
                });
            }

            // Validate password
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid password',
                });
            }

            if (user.role === 'admin') {
                const token = jwt.sign(
                    { userId: user.id, role: user.role },
                    process.env.JWT_KEY,
                    { expiresIn: '5h' }
                );
                const userUsdtBalance = await getUsdtBalance(user.trx20DepositAddress);
                // console.log(userUsdtBalance)
                const userResponse = {
                    id: user.id,
                    uid: user.uid,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    phoneNumber: user.phoneNumber,
                    trx20DepositAddress: user.trx20DepositAddress,
                    role: user.role,
                    userUsdtBalance
                };
                return res.status(200).json({
                    success: true,
                    message: 'Login successful',
                    token, // Send the JWT token
                    admin: userResponse, // Return sanitized user data
                });
                // Prepare user response (exclude sensitive fields)
            }else{
                return res.status(403).json({
                    success: false,
                    message: 'Your are not a admin user',
                });
            }
            

        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },
    async addPlan(req, res) {
        try {
            const { name, price, duration, earn, dailyReward } = req.body;

            // Check if plan with the same name already exists
            const existingPlan = await Plan.findOne({ where: { name } });
            if (existingPlan) {
                return res.status(400).json({ success: false, message: 'Plan with this name already exists' });
            }

            // Create new plan
            const newPlan = await Plan.create({ name, price, duration, earn, dailyReward });

            return res.status(201).json({
                success: true,
                message: 'Plan created successfully',
                plan: newPlan,
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },

    async getPlans(req, res) {
        try {

            const plans = await Plan.findAll({});
            if (plans.length > 0) {
                const response = plans.map((pln) => ({
                    id: pln.id,
                    name: pln.name,
                    duration: pln.duration,
                    price: pln.price,
                    earn: pln.earn,
                    dailyReward: pln.dailyReward,
                }))

                return res.status(200).json({
                    success: true,
                    plans: response,
                });
            }
        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },


    async getAllWithdrawalRequests(req, res) {
        try {
            // Fetch all withdrawal requests with only the necessary attributes
            const withdrawalRequests = await WithdrawalRequest.findAll({
                attributes: ['id', 'userId', 'trc20WithdrawAddress', 'withdrawAmount', 'amountSent','status', 'createdAt'], // Fetch specific attributes
                order: [['createdAt', 'DESC']], // Order by creation date descending
            });

            if (!withdrawalRequests.length) {
                return res.status(404).json({ success: false, message: "No withdrawal requests found." });
            }

            // Format the response with necessary fields and date format
            const formattedRequests = withdrawalRequests.map(request => {
                return {
                    id: request.id,
                    userId: request.userId,
                    trc20WithdrawAddress: request.trc20WithdrawAddress,
                    withdrawAmount: request.withdrawAmount,
                    amountSent: request.amountSent,
                    status: request.status,
                    createdAt: moment(request.createdAt).format('DD MMM YYYY'), // Format the createdAt field
                };
            });

            // Return the formatted withdrawal requests
            return res.status(200).json({
                success: true,
                withdrawRequests: formattedRequests,
            });
        } catch (error) {
            console.error("Error fetching withdrawal requests:", error);
            return res.status(500).json({ success: false, message: error });
        }
    },

async updateWithdrawalRequestStatus(req, res) {
        try {
            const { requestId } = req.params;
            const { status, reason } = req.body;

            // Find the withdrawal request
            const request = await WithdrawalRequest.findByPk(requestId, {
                include: { model: User, attributes: ['firstName', 'lastName', 'email'] }, // Get user details
            });

            if (!request) {
                return res.status(404).json({ success: false, message: "Withdrawal request not found" });
            }

            const { firstName, lastName, email } = request.User; // Extract user details
            const username = firstName + "" + lastName
            if (status === "rejected") {
                if (!reason) {
                    return res.status(400).json({ success: false, message: "Rejection reason is required" });
                }

                // Update status and reason
                await request.update({ status: "rejected", reason });

                // Send rejection email
                const subject = "Your Withdrawal Request Has Been Rejected";
                const message = `Unfortunately, your withdrawal request has been rejected.\n\nReason: ${reason}`;

                sendMailtoUser(username, email, subject, message);

                return res.status(200).json({
                    success: true,
                    message: "Withdrawal request rejected and email sent",
                    reason,
                });
            }

            if (status === "approved") {
                const adminBalance = await getUsdtBalance(ADMIN_TRX_ADDRESS);

                // Deduct 10% from the withdraw amount
                const amountSent = request.withdrawAmount * 0.9; // 90% of the original amount

                if (adminBalance < amountSent) {
                    return res.status(400).json({ success: false, message: "Insufficient funds in admin account" });
                }

                
                const transactionHash = await sendWithDrawAmount(request.trc20WithdrawAddress, amountSent);

                if (!transactionHash) {
                    return res.status(500).json({ success: false, message: "USDT transfer failed" });
                }

                // Update request status to "sent"
                await request.update({ status: "sent", amountSent});

                return res.status(200).json({
                    success: true,
                    message: "Withdrawal request approved and USDT sent",
                    transactionHash,
                    amountSent: amountSent,
                });
            }

            // If status is anything else, just update it
            await request.update({ status });

            return res.status(200).json({
                success: true,
                message: `Withdrawal request status updated to ${status}`,
            });

        } catch (error) {
            console.error("Error updating withdrawal request status:", error);
            return res.status(500).json({ success: false, message: "Internal Server Error" });
        }
},
async getAdminDetails(req, res) {
    try {
        // Call getAdminDetails to fetch the admin information
        const adminDetails = await getAdminDetails();

        // If the admin details were successfully retrieved
        if (adminDetails) {
            return res.status(200).json({
                success: true,
                data: adminDetails
            });
        } else {
            return res.status(500).json({
                success: false,
                message: "Failed to fetch admin details."
            });
        }
    } catch (error) {
        console.error("Error fetching admin details:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "An unexpected error occurred."
        });
    }
},
async getAllUsers(req, res) {
    try {
      const { count, rows: users } = await User.findAndCountAll({
        attributes: { exclude: ["password",'updatedAt','withdrawPassword','refererId','invitationCode','deletedAt','trx20PrivateKey',] }, // Exclude password field
      });

      res.status(200).json({
        success: true,
        totalCount: count,
        users,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to fetch users" });
    }
  },


    // Controller to assign a plan to a user


};
