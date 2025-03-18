const { Plan, User, UserPlan, WithdrawalRequest } = require('../models/index'); // Import the models
const moment = require('moment'); // To format dates
 // We will use this to set the expiry date for the plan

// Controller to add a new plan
module.exports = {

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
                attributes: ['id', 'userId', 'trc20WithdrawAddress', 'withdrawAmount', 'status', 'createdAt'], // Fetch specific attributes
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
                    status: request.status,
                    createdAt: moment(request.createdAt).format('DD MMM YYYY'), // Format the createdAt field
                };
            });

            // Return the formatted withdrawal requests
            return res.status(200).json({
                success: true,
                data: formattedRequests,
            });
        } catch (error) {
            console.error("Error fetching withdrawal requests:", error);
            return res.status(500).json({ success: false, message: "Internal Server Error" });
        }
    },

    // Controller to assign a plan to a user


};
