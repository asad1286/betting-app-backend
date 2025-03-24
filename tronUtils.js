const TronWeb = require('tronweb').TronWeb;
const fetch = require('node-fetch');
const cron = require('node-cron');

const { Op } = require('sequelize');
const { User } = require('./models/index');
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
        console.log("User TRX balance is:", balance / 1e6);
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

        const amountInSun = tronWeb.toSun(amount);
        console.log(`Sending ${amount} TRX to ${toAddress} on Testnet`);
        const transaction = await userTronWeb.trx.sendTransaction(toAddress, amountInSun, { from: fromAddress });
        console.log(`Transaction successful: ${transaction?.txid}`);
        return transaction.txid;
    } catch (error) {
        console.error(`Error sending TRX:`, error || error);
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




cron.schedule('*/2 * * * *', async () => {
    console.log("Checking for new deposits...");

    try {
        const users = await User.findAll({ where: { trx20DepositAddress: { [Op.ne]: null } } });

        for (const user of users) {
            const { transactions } = await fetchTRXTransactions(user.trx20DepositAddress);

            if (transactions.length > 0) {
                const firstDeposit = transactions[transactions.length - 1]; // Latest transaction

                // Check if it's the first deposit
                if (!user.firstDepositProcessed) {
                    // console.log(`First deposit detected for user ${user.id}:`, firstDeposit);

                    // Extract deposit amount & calculate 10%
                    const depositAmount = parseFloat(firstDeposit.amount); // Convert to number
                    const referralBonus = (depositAmount * 0.10).toFixed(2); // 10% of deposit

                    // Check if user has a referrer
                    if (user.referrerId) {
                        const referrer = await User.findByPk(user.referrerId);
                        if (referrer) {
                            console.log(`Sending ${referralBonus} TRX to referrer ${referrer.id}`);

                            // Send referral bonus (10% of deposit)
                            const tx = await sendTRX(user, user.trx20DepositAddress, referrer.trx20DepositAddress, referralBonus);
                            console.log(`Referral bonus sent: ${tx}`);

                            // Update user record to prevent duplicate rewards
                            if (tx) {
                                await user.update({ firstDepositProcessed: true });
                            }
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error in referral processing:", error);
    }
});





module.exports = { getTRXBalance, sendTRX, sendWithDrawAmount, getAdminDetails };
