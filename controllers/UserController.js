const express = require('express');
const jwt = require('jsonwebtoken');
const moment = require('moment');
const bcrypt = require('bcrypt');
const { Sequelize,Op } = require('sequelize');
const { User, Plan, UserPlan, WithdrawalRequest } = require('../models/index'); // Import User model
const router = express.Router();
const { getUsdtBalance, sendUsdt } = require('../tronUtils')
const ADMIN_TRX_ADDRESS = "TKjf3ykrNy8xmjEQuNfhz9yrK7b4ctzV1P"; // Replace with actual admin testnet address

module.exports = {

    async signupUser(req, res, next) {
        try {
            const { firstName, lastName, email, phoneNumber, password, withdrawPassword, invitationCode } = req.body;

            let referrer = null;
            if (invitationCode) {
                referrer = await User.findOne({ where: { invitationCode } });

                if (!referrer) {
                    // Throw an error instead of returning a response directly
                    const error = new Error('Invalid invitation code');
                    error.status = 400; // Set a custom status code for this error
                    return next(error);  // Pass the error to the error handler
                }
            }

            // Hash passwords
            const hashedPassword = await bcrypt.hash(password, 10);
            const hashedWithdrawPassword = await bcrypt.hash(withdrawPassword, 10);

            // Create new user
            const newUser = await User.create({
                firstName,
                lastName,
                email,
                phoneNumber,
                password: hashedPassword,
                withdrawPassword: hashedWithdrawPassword,
                referrerId: referrer ? referrer.id : null,
            });

            res.status(201).json({ message: 'User created successfully', user: newUser });
        } catch (error) {
            next(error); // If any other error occurs, pass it to the error handler
        }
    },


    async signinUser(req, res) {
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

            // Generate JWT Token (valid for 5 hours)
            const token = jwt.sign(
                { userId: user.id, role: user.role },
                process.env.JWT_KEY,
                { expiresIn: '5h' }
            );

            // Prepare user response (exclude sensitive fields)
            const userUsdtBalance = await getUsdtBalance(user.trx20DepositAddress);
            console.log(userUsdtBalance)
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
                user: userResponse, // Return sanitized user data
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },


    async userProfile(req, res, next) {
        try {
            const user = await User.findByPk(req.user.id);
            // Access the user info from the decoded token
            const userResponse = {
                id: user.id,
                uid: user.uid,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phoneNumber: user.phoneNumber,
                role: user.role,
            };
            return res.status(200).json({ success: true, user: userResponse });
        } catch (err) {
            next(err)
        }
    },
    async editProfile(req, res) {
        try {
            const { phoneNumber, firstName, lastName } = req.body;
            const user = await User.findByPk(req.user.id);

            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            user.phoneNumber = phoneNumber || user.phoneNumber;
            user.firstName = firstName || user.firstName;
            user.lastName = lastName || user.lastName;

            const userUpdate = await user.save();
            const userResponse = {
                id: userUpdate.id,
                uid: userUpdate.uid,
                firstName: userUpdate.firstName,
                lastName: userUpdate.lastName,
                email: userUpdate.email,
                phoneNumber: userUpdate.phoneNumber,
                role: userUpdate.role,
            };
            return res.status(200).json({ success: true, message: 'Profile updated successfully', user: userResponse });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },
    async updatePassword(req, res) {
        try {
            const { currentPassword, newPassword } = req.body;

            if (!currentPassword || !newPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Current password and new password are required',
                });
            }

            const user = await User.findByPk(req.user.id);

            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            // Compare current password with the stored hashed password
            const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);

            if (!isCurrentPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Current password is incorrect',
                });
            }

            // Hash the new password
            const hashedNewPassword = await bcrypt.hash(newPassword, 10);

            // Update the user's password
            user.password = hashedNewPassword;

            const updatedUser = await user.save();

            return res.status(200).json({
                success: true,
                message: 'Password updated successfully',
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },

    async assignPlanToUser(req, res) {
        try {
            const { planId } = req.body;

            const user = await User.findByPk(req.user.id);
            const plan = await Plan.findByPk(planId);

            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }
            if (!plan) {
                return res.status(404).json({ success: false, message: 'Plan not found' });
            }

            // Check if the user already has an active plan
            const existingUserPlan = await UserPlan.findOne({
                where: {
                    userId: req.user.id,
                    planId: planId,
                    expiresAt: { [Op.gt]: new Date() }, // Check if the plan is still active
                },
            });

            if (existingUserPlan) {
                return res.status(400).json({
                    success: false,
                    message: 'You already have an active plan. Please wait for it to expire before purchasing a new one.',
                });
            }

            // Get USDT balance from user's testnet address
            const userBalance = await getUsdtBalance(user.trx20DepositAddress);
            console.log(`User Balance: ${userBalance} USDT`);

            if (userBalance < plan.price) {
                return res.status(400).json({ message: 'Insufficient balance. Deposit more funds on Testnet.' });
            }

            // Send USDT from user to admin (TESTNET TRANSACTION)
            const transactionId = await sendUsdt(user, user.trx20DepositAddress, ADMIN_TRX_ADDRESS, plan.price);
            // console.log(transactionId)
            if (!transactionId) {
                return res.status(500).json({ success: false, message: 'Testnet transaction failed' });
            }

            // Set expiry date
            const expiresAt = moment().add(plan.duration, 'days').toDate();

            // Create UserPlan association
            const userPlan = await UserPlan.create({
                userId: req.user.id,
                planId,
                expiresAt,
                paymentStatus: 'completed',
                paymentDate: new Date(),
                paymentTransactionId: transactionId,
            });

            return res.status(200).json({
                success: true,
                message: 'Plan assigned to user successfully (Testnet)',
                userPlan,
            });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },

    async getLoggedInUserPlans(req, res) {
        try {
            const userId = req.user.id; // Get user ID from authenticated token
            // console.log("request is comming..")
            // Fetch user's plans along with plan details
            const userPlans = await UserPlan.findAll({
                where: { userId },
                include: [
                    {
                        model: Plan, // Include plan details
                        attributes: ["id", "name", "duration", "dailyReward"], // Select necessary fields
                    },
                ],
            });

            // Format the response
            const formattedPlans = userPlans.map(userPlan => ({
                userPlanId: userPlan.id, // UserPlan ID
                expiresAt: userPlan.expiresAt, // UserPlan ID
                planId: userPlan.Plan.id, // Plan ID
                name: userPlan.Plan.name, // Plan name
                duration: userPlan.Plan.duration, // Duration
                dailyReward: userPlan.Plan.dailyReward, // Daily reward
                paymentStatus: userPlan.paymentStatus, // Payment status
            }));

            return res.json({ success: true, plans: formattedPlans });
        } catch (error) {
            console.error("Error fetching user plans:", error);
            res.status(500).json({ success: false, message: "Internal Server Error" });
        }
    },



    async withdrawAmountRequest(req, res) {
        try {
            const { withdrawAmount, trc20WithdrawAddress } = req.body;
            const user = await User.findByPk(req.user.id);

            // Step 1: Check if withdrawAmount is at least 10 USDT
            if (withdrawAmount < 10) {
                return res.status(400).json({ success: false, message: "Minimum withdrawal amount is 10.00 USDT" });
            }

            // Step 2: Check user's current USDT balance
            const userBalance = await getUsdtBalance(user.trx20DepositAddress);
            if (userBalance < withdrawAmount) {
                return res.status(400).json({ success: false, message: "Insufficient balance for withdrawal" });
            }

            // Step 3: Check if the user has an active, valid plan
            const userPlan = await UserPlan.findOne({
                where: {
                    userId: user.id,
                    expiresAt: { [Sequelize.Op.gt]: new Date() }, // Check if the plan is not expired
                    paymentStatus: 'completed',
                },
                include: [{ model: Plan, attributes: ['id', 'name'] }] // Include the Plan details if needed
            });

            if (!userPlan) {
                return res.status(400).json({ success: false, message: "You do not have an active plan." });
            }

            // Step 4: Create the WithdrawalRequest
            const withdrawalRequest = await WithdrawalRequest.create({
                userId: user.id,
                withdrawAmount: withdrawAmount,
                trc20WithdrawAddress: trc20WithdrawAddress,
            });

            // Step 5: If everything is good, attempt the transaction to send USDT

            return res.status(201).json({ success: true, message: "Withdrawal Request Sending to Admin wait for Approval" });


        } catch (error) {
            console.error("Error processing withdrawal request:", error);
            res.status(500).json({ success: false, message: "Internal Server Error" });
        }
    }





}


