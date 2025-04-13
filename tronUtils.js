const TronWeb = require('tronweb').TronWeb;
const fetch = require('node-fetch');
const cron = require('node-cron');

const { Op } = require('sequelize');
const { User,Timer,Plan,UserPlan,RewardHistory,InvitationAmount } = require('./models/index');
const tronWeb = new TronWeb({
    fullHost: 'https://nile.trongrid.io',
});

const ADMIN_TRX_ADDRESS = "TKjf3ykrNy8xmjEQuNfhz9yrK7b4ctzV1P";
const ADMIN_PRIVATE_KEY = "FF15689965555B7AD3FF193FC81B38B9E236FBFE1AAE8552AD876FF0263905AD";

/**
 * Get TRX balance of an address
 */
async function getTRXBalance(address) {
    try {
        if (!tronWeb.isAddress(address)) throw new Error("Invalid TRX address");

        const balance = await tronWeb.trx.getBalance(address);
        // console.log("User TRX balance is:", balance / 1e6);
        return balance / 1e6;
    } catch (error) {
        console.error(`Error getting TRX balance:`, error.message || error);
        return 0;
    }
}

/**
 * Send TRX from the logged-in user's TRC20 address
 */
async function sendTRX(user, fromAddress, toAddress, amount) {
    try {
      if (!user.trx20PrivateKey) throw new Error("User private key is missing");
      if (!tronWeb.isAddress(toAddress)) throw new Error("Invalid recipient TRX address");
  
      const userTronWeb = new TronWeb({
        fullHost: 'https://nile.trongrid.io',
        privateKey: user.trx20PrivateKey,
      });
  
      const amountInSun = userTronWeb.toSun(amount);
      console.log(`Sending ${amount} TRX to ${toAddress} on Testnet`);
  
      const transaction = await userTronWeb.trx.sendTransaction(toAddress, amountInSun, { from: fromAddress });
      
      if (transaction && transaction.txid) {
        console.log(`Transaction successful: ${transaction.txid}`);
        return transaction.txid;
      } else {
        console.error("Transaction response doesn't contain txid");
        return null;
      }
    } catch (error) {
      console.error("Error sending TRX:", error);
      return null;
    }
  }

async function sendWithDrawAmount(toAddress, amount) {
    try {
        const tronWeb = new TronWeb({
            fullHost: 'https://nile.trongrid.io',
            privateKey: ADMIN_PRIVATE_KEY,
        });
        if (!tronWeb.isAddress(toAddress)) throw new Error("Invalid recipient TRX address");

        const amountInSun = tronWeb.toSun(amount);
        console.log(`Sending ${amount} TRX to ${toAddress} on Testnet`);


        const transaction = await tronWeb.trx.sendTransaction(toAddress, amountInSun, { from: ADMIN_TRX_ADDRESS });
        console.log(`Transaction successful: ${transaction?.txid}`);
        return transaction.txid;
    } catch (error) {
        console.error(`Error sending TRX:`, error.message || error);
        return null;
    }
}

async function getAdminDetails(ADMIN_ADDRESS) {
    try {
        return {
            usdtBalance: await getTRXBalance(ADMIN_ADDRESS),
            transactionHistory: await fetchTRXTransactions(ADMIN_ADDRESS)
        };
    } catch (error) {
        console.error("Error getting admin details:", error);
        return null;
    }
}
async function fetchTRXTransactions(ADMIN_ADDRESS) {
    try {
        const url = `https://nile.trongrid.io/v1/accounts/${ADMIN_ADDRESS}/transactions?limit=200`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const { data } = await response.json();

        // Filter only TransferContract transactions (TRX transactions)
        const trxTransactions = data.filter(txn => 
            txn.raw_data.contract[0].type === 'TransferContract'
        );

        const formattedTransactions = trxTransactions.map(txn => {
            const amount = txn.raw_data.contract[0]?.parameter.value?.amount; // Amount in SUN (1 TRX = 1e6 SUN)
            const fromAddress = tronWeb.address.fromHex(txn.raw_data.contract[0].parameter.value.owner_address);
            const toAddress = tronWeb.address.fromHex(txn.raw_data.contract[0].parameter.value.to_address);

            return {
                transaction_id: txn.txID,
                block_timestamp: formatDate(txn.block_timestamp),
                amount: amount ? amount / 1e6 : 0, // Convert from SUN to TRX
                type: fromAddress === ADMIN_ADDRESS ? "SENT" : "RECEIVED",
                from: fromAddress,
                to: toAddress
            };
        });

        // Calculate totals for SENT and RECEIVED amounts
        const totalSentBN = trxTransactions
            .filter(t => tronWeb.address.fromHex(t.raw_data.contract[0].parameter.value.owner_address) === ADMIN_ADDRESS)
            .reduce((sum, t) => {
                const amount = t.raw_data.contract[0]?.parameter.value?.amount || 0;
                return sum.plus(tronWeb.toBigNumber(amount));
            }, tronWeb.toBigNumber(0))
            .dividedBy(1e6); // Convert from SUN to TRX

        const totalReceivedBN = trxTransactions
            .filter(t => tronWeb.address.fromHex(t.raw_data.contract[0].parameter.value.to_address) === ADMIN_ADDRESS)
            .reduce((sum, t) => {
                const amount = t.raw_data.contract[0]?.parameter.value?.amount || 0;
                return sum.plus(tronWeb.toBigNumber(amount));
            }, tronWeb.toBigNumber(0))
            .dividedBy(1e6); // Convert from SUN to TRX

        const totalSent = totalSentBN.toFixed(2);
        const totalReceived = totalReceivedBN.toFixed(2);

        return {
            transactions: formattedTransactions,
            totals: { totalSent, totalReceived }
        };

    } catch (error) {
        console.error("Error fetching transactions:", error);
        return { transactions: [], totals: { totalSent: "0.00", totalReceived: "0.00" } };
    }
}



// Helper functions
function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = new Date(parseInt(timestamp));
    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }).format(date).replace(/ /g, ' ');
}


// Function to add a delay
// Function to add a random delay between 3 to 4 seconds
function delay() {
    const randomDelay = Math.floor(Math.random() * 1000) + 3000; // Random delay between 3000 ms (3 seconds) and 4000 ms (4 seconds)
    return new Promise(resolve => setTimeout(resolve, randomDelay));
  }
  
  cron.schedule('*/2 * * * *', async () => {
    try {
      const now = new Date();
      console.log("🏁 Running daily reward cron...");
  
      const activeUserPlans = await UserPlan.findAll({
        where: {
          paymentStatus: 'completed',
          expiresAt: { [Op.gt]: now },
        },
        include: [
          { model: Plan },
          { model: User }
        ]
      });
  
      for (const userPlan of activeUserPlans) {
        const { userId, Plan: plan, User: user } = userPlan;
        const reward = parseFloat(plan.dailyReward);
  
        if (!user.trx20DepositAddress) {
          console.log(`⚠️ User ${userId} has no TRX address`);
          continue;
        }
  
        // Check if reward was already sent today
        const alreadySent = await RewardHistory.findOne({
          where: {
            userId,
            planId: plan.id,
            createdAt: {
              [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)), // today
            }
          }
        });
  
        if (alreadySent) {
          console.log(`⏩ Reward already sent today to user ${userId} for plan ${plan.id}`);
          continue;
        }
  
        // Delay each transaction by a random time (between 3 to 4 seconds)
        await delay();
  
        // Try to send TRX
        try {
          const txHash = await sendWithDrawAmount(user.trx20DepositAddress, reward);
  
          if (txHash) {
            await RewardHistory.create({
              userId,
              planId: plan.id,
              rewardAmount: reward,
              status: 'sent',
              trxHash: txHash
            });
  
            console.log(`✅ Sent ${reward} TRX to user ${userId} | TX: ${txHash}`);
          } else {
            console.error(`❌ Failed to send TRX to user ${userId}: Transaction failed, no txHash`);
          }
        } catch (err) {
          console.error(`❌ Failed to send TRX to user ${userId}:`, err.message);
          // Skip creating RewardHistory record for failed transaction
        }
      }
  
      console.log("✅ Daily reward cron finished.");
    } catch (error) {
      console.error("🔥 Error in daily reward cron:", error);
    }
  });
  
  
  

// cron.schedule('*/2 * * * *', async () => {
//     try {
//         const now = new Date();
//         console.log("Checking Invited Users")
//         // Find users who were referred and have an active plan
//         const referredUsers = await User.findAll({
//             where: {
//                 referrerId: { [Op.ne]: null }
//             },
//             include: [{
//                 model: UserPlan,
//                 where: {
//                     expiresAt: { [Op.gt]: now },
//                     paymentStatus: 'completed'
//                 },
//                 include: [Plan]
//             }]
//         });

//         for (const user of referredUsers) {
//             const activePlan = user.UserPlans[0]; // Assuming one active plan at a time
//             const plan = activePlan.Plan;

//             const reward = (parseFloat(plan.price) * 0.10).toFixed(2);

//             // Check if a record already exists for this plan & user
//             const existing = await InvitationAmount.findOne({
//                 where: {
//                     userId: user.referrerId,
//                     planId: plan.id
//                 }
//             });

//             if (!existing) {
//                 await InvitationAmount.create({
//                     userId: user.referrerId,
//                     planId: plan.id,
//                     amountSent: reward,
//                     status: 'pending'
//                 });

//                 console.log(`Reward ${reward} TRX set for referrer ${user.referrerId} from user ${user.id}`);
//             }
//         }
//     } catch (error) {
//         console.error("Error in referral reward cron:", error);
//     }
// });







const checkTimers = async () => {
    try {
        const now = new Date();

        // 1️⃣ Find the latest timer (most recent startTime)
        const latestTimer = await Timer.findOne({
            order: [["startTime", "DESC"]], // Get the latest timer by startTime
        });

        if (latestTimer) {
            const latestStartTime = new Date(latestTimer.startTime);
            const latestEndTime = new Date(latestTimer.endTime);

            // Case 1: If startTime is in the past or now, update statusClosed to false
            if (latestStartTime <= now && latestTimer.statusClosed) {
                await latestTimer.update({ statusClosed: false });
                console.log(`Updated latest timer (ID: ${latestTimer.id}) to open (startTime condition).`);
            }

            // Case 2: If endTime has passed, update statusClosed to false
            if (latestEndTime <= now && latestTimer.statusClosed) {
                await latestTimer.update({ statusClosed: false });
                console.log(`Updated latest timer (ID: ${latestTimer.id}) to open (endTime condition).`);
            }
        }

    } catch (error) {
        console.error("Error checking timers:", error);
    }
};

// Run this job every 1 minute
cron.schedule("*/1 * * * *", checkTimers);




module.exports = { getTRXBalance, sendTRX, sendWithDrawAmount, getAdminDetails };
