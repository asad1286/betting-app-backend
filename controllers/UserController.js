const express = require('express');
const jwt = require('jsonwebtoken');
const moment = require('moment');
const bcrypt = require('bcrypt');
const { Sequelize, Op } = require('sequelize');
const { User, Plan, BTCGame, InvitationAmount, UserPlan, WithdrawalRequest } = require('../models/index'); // Import User model
const router = express.Router();
const { getTRXBalance, sendTRX } = require('../tronUtils')
const ADMIN_TRX_ADDRESS = process.env.ADMIN_TRX_ADDRESS; // Replace with actual admin testnet address

module.exports = {

    async signupUser(req, res, next) {
        try {
            console.log(req.body)
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
            const userUsdtBalance = await getTRXBalance(user.trx20DepositAddress);
            console.log("userUsdtBalance", userUsdtBalance)
            const userResponse = {
                id: user.id,
                uid: user.uid,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phoneNumber: user.phoneNumber,
                invitationCode: user.invitationCode,
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
    async getUserTRXBlance(req, res) {
        try {
            const user = await User.findByPk(req.user.id);
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }
            const userUsdtBalance = await getTRXBalance(user.trx20DepositAddress);
            console.log(userUsdtBalance)
            return res.status(200).json({ success: true, userUsdtBalance });
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

            const existingUserPlan = await UserPlan.findOne({
                where: {
                    userId: req.user.id,
                    planId: planId,
                    expiresAt: { [Op.gt]: new Date() },
                },
            });

            if (existingUserPlan) {
                return res.status(400).json({
                    success: false,
                    message: 'You already have an active plan. Please wait for it to expire before purchasing a new one.',
                });
            }

            const userBalance = await getTRXBalance(user.trx20DepositAddress);
            if (userBalance < plan.price) {
                return res.status(400).json({ message: 'Insufficient balance. Deposit more funds on Testnet.' });
            }

            const transactionId = await sendTRX(user, user.trx20DepositAddress, ADMIN_TRX_ADDRESS, plan.price);
            if (!transactionId) {
                return res.status(500).json({ success: false, message: 'Testnet transaction failed' });
            }

            const expiresAt = moment().add(plan.duration, 'days').toDate();

            const userPlan = await UserPlan.create({
                userId: req.user.id,
                planId,
                expiresAt,
                paymentStatus: 'completed',
                paymentDate: new Date(),
                paymentTransactionId: transactionId,
            });

            const totalPlans = await UserPlan.count({ where: { userId: req.user.id } });
            
            if (
                totalPlans === 1 &&
                user.referrerId &&
                (user.firstDepositProcessed === false || user.firstDepositProcessed === null)
            ) {
                const existingInvite = await InvitationAmount.findOne({
                    where: { userId: user.id },
                });

                if (!existingInvite) { // ✅ Check if InvitationAmount already exists
                    const referrer = await User.findByPk(user.referrerId);
                    if (referrer) {
                        const bonusAmount = (plan.price * 0.10).toFixed(2);

                        await InvitationAmount.create({
                            userId: user.id,
                            inviterId: referrer.id,
                            planId: plan.id,
                            amountSent: bonusAmount,
                            status: 'pending',
                        });

                        console.log(`Referral bonus (${bonusAmount} TRX) pending for referrer ID: ${referrer.id}`);
                    }
                } else {
                    console.log('InvitationAmount already exists — skipping bonus creation.');
                }
            } 

            return res.status(200).json({
                success: true,
                message: 'Plan assigned to user successfully (Testnet)',
                userPlan,
            });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: error.message });
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
            const userBalance = await getTRXBalance(user.trx20DepositAddress);
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
    },

    async sendAmountOnUserReferel(req, res) {
        try {
            const userId = req.user.id;
            const user = await User.findByPk(userId);

            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            // Check if the user has a referrer (refererId is not null)
            if (!user.referrerId) {
                return res.status(400).json({ success: false, message: 'User has no referrer' });
            }

            // Fetch the referrer user
            const referrer = await User.findByPk(user.referrerId);
            if (!referrer) {
                return res.status(400).json({ success: false, message: 'Referrer not found' });
            }

            return res.status(200).json({ success: true, message: 'Referrer found and that its trc20Address', address: referrer.trx20DepositAddress });
        } catch (error) {
            console.error("Error processing referral:", error);
            res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },

    async createBTCGame(req, res) {
        // Check if the user exists in req.user
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'User is not authenticated' });
        }

        // Check if the required fields (betAmount, startPrice, endPrice) are provided in the request body
        const { betAmount, betType, startPrice, endPrice } = req.body;

        if (!betAmount || !startPrice || !endPrice || !betType) {
            return res.status(400).json({ success: false, message: 'Bet amount, start price, and end price are required' });
        }

        try {
            // Create the BTCGame without result initially
            const newGame = await BTCGame.create({
                betAmount,
                betType,
                startPrice,
                endPrice, // No result set at this stage
                userId: req.user.id, // Assuming req.user has the user id
            });

            // Return the created BTCGame as a response
            return res.status(201).json({ success: true, message: 'BTC Game created successfully', game: newGame });
        } catch (error) {
            console.error('Error creating BTC Game:', error);
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    },
    async getBTCGamesByUserID(req, res) {
        try {
            const userId = req.user.id; // Assuming the userId is passed as a route parameter, e.g. /btc-games/:userId

            // Check if the userId is provided
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID is required',
                    btcGames: []
                });
            }

            // Fetch BTCGames for the provided userId
            const btcGames = await BTCGame.findAll({
                where: { userId }, // Filter games by userId
                attributes: [
                    'id',
                    'userId',
                    'result',
                    'betType',
                    'startPrice',
                    'endPrice',
                    'createdAt',
                    'betAmount'
                ],
                include: {
                    model: User,  // Assuming your User model is called 'User'
                    attributes: [] // No need to include extra attributes from User model
                },
            });

            // Check if BTC games are found
            if (btcGames.length <= 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No BTC games found for this user',
                    btcGames: []
                });
            }

            // Format the result to return only the necessary fields
            const formattedBTCGames = btcGames.map(game => ({
                id: game.id,
                userId: game.userId,
                result: game.result,
                betType: game.betType,
                startPrice: game.startPrice,
                endPrice: game.endPrice,
                createdAt: game.createdAt,
                betAmount: game.betAmount
            }));

            // Return success response with the formatted BTC games
            return res.status(200).json({
                success: true,
                message: 'BTC games fetched successfully',
                btcGames: formattedBTCGames
            });
        } catch (error) {
            console.error('Error fetching BTC games:', error);
            return res.status(500).json({
                success: false,
                message: 'Error fetching BTC games',
                btcGames: []
            });
        }
    }







}


