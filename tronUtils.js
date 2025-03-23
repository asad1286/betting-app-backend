const TronWeb = require('tronweb').TronWeb;
const fetch = require('node-fetch');
const tronWeb = new TronWeb({
    fullHost: 'https://nile.trongrid.io', // TRON Testnet
});

// USDT Contract Address (Testnet)
const USDT_CONTRACT_ADDRESS = "TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf";
const ADMIN_TRX_ADDRESS = "TKjf3ykrNy8xmjEQuNfhz9yrK7b4ctzV1P"; 
const ADMIN_HEX_ADDRESS = tronWeb.address.toHex(ADMIN_TRX_ADDRESS);
/**
 * Get USDT balance of an address
 */
async function getUsdtBalance(address) {
    try {
        if (!tronWeb.isAddress(address)) throw new Error("Invalid TRX address");

        // console.log(`Checking USDT balance for: ${address}`);
        
        // ✅ Explicitly set an address before interacting with the contract
        tronWeb.setAddress(address);

        const contract = await tronWeb.contract().at(USDT_CONTRACT_ADDRESS);
        const balance = await contract.methods.balanceOf(address).call();
        console.log("user blance is :",tronWeb.toBigNumber(balance).dividedBy(1e6).toNumber())
        return tronWeb.toBigNumber(balance).dividedBy(1e6).toNumber(); // Convert from Sun to USDT
    } catch (error) {
        console.error(`Error getting USDT balance:`, error.message || error);
        return 0;
    }
}


/**
 * Send USDT from the logged-in user's TRC20 address
 */
async function sendUsdt(user, fromAddress, toAddress, amount) {
    // console.log(user.trx20PrivateKey)
    try {
        // console.log(req.user);
        if (!user.trx20PrivateKey) throw new Error("User private key is missing");
        if (!tronWeb.isAddress(toAddress)) throw new Error("Invalid recipient TRX address");

        // Initialize TronWeb with the user's private key
        const userTronWeb = new TronWeb({
            fullHost: 'https://nile.trongrid.io', // TRON Testnet
            privateKey: user.trx20PrivateKey, // Logged-in user's private key
        });

        const contract = await userTronWeb.contract().at(USDT_CONTRACT_ADDRESS);
        const amountInSun = userTronWeb.BigNumber(amount).multipliedBy(1e6).toFixed();

        console.log(`Sending ${amount} USDT to ${toAddress} on Testnet`);

        // Send the USDT transaction
        const transaction = await contract.methods.transfer(toAddress, amountInSun).send({
            from: fromAddress
        });

        console.log(`Transaction successful: ${transaction}`);
        return transaction; // Transaction Hash
    } catch (error) {
        console.error(`Error sending USDT:`, error.message || error);
        return null;
    }
}

async function sendWithDrawAmount(toAddress, amount) {

    try {
        const tronWeb = new TronWeb({
            fullHost: 'https://nile.trongrid.io',
            privateKey: "FF15689965555B7AD3FF193FC81B38B9E236FBFE1AAE8552AD876FF0263905AD", // Admin’s private key
        });
        if (!tronWeb.isAddress(toAddress)) throw new Error("Invalid recipient TRX address");

        const contract = await tronWeb.contract().at(USDT_CONTRACT_ADDRESS);
        const amountInSun = tronWeb.BigNumber(amount).multipliedBy(1e6).toFixed();

        console.log(`Sending ${amount} USDT to ${toAddress} on Testnet`);

        // Send the USDT transaction
        const transaction = await contract.methods.transfer(toAddress, amountInSun).send({
            from: ADMIN_TRX_ADDRESS
        });

        console.log(`Transaction successful: ${transaction}`);
        return transaction; // Transaction Hash
    } catch (error) {
        console.error(`Error sending USDT:`, error.message || error);
        return null;
    }
}

async function getAdminDetails() {
    try {
        return {
            usdtBalance: await getUsdtBalance(ADMIN_TRX_ADDRESS),
            transactionHistory: await fetchTRC20Transactions()
        };
    } catch (error) {
        console.error("Error getting admin details:", error);
        return null;
    }
}

async function fetchTRC20Transactions() {
    try {
        const url = `https://nile.trongrid.io/v1/accounts/${ADMIN_TRX_ADDRESS}/transactions/trc20?contract=${USDT_CONTRACT_ADDRESS}&limit=200`;

        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const { data } = await response.json();
        // console.log("Fetched transactions:", data); // Debugging log

        // Format transactions
        const formattedTransactions = (data || []).map(txn => ({
            transaction_id: txn.transaction_id,
            type: tronWeb.address.fromHex(txn.from) === ADMIN_TRX_ADDRESS ? 'sent' : 'received',
            block_timestamp: formatDate(txn.block_timestamp),
            amount: (tronWeb.toBigNumber(txn.value).dividedBy(1e6)).toFixed(2), // Convert to correct format
            from: tronWeb.address.fromHex(txn.from),
            to: tronWeb.address.fromHex(txn.to)
        }));

        // Ensure BigNumber calculations are correct
        const totalSentBN = data
            .filter(t => tronWeb.address.fromHex(t.from) === ADMIN_TRX_ADDRESS)
            .reduce((sum, t) => sum.plus(tronWeb.toBigNumber(t.value)), tronWeb.toBigNumber(0))
            .dividedBy(1e6); // Convert to USDT format

        const totalReceivedBN = data
            .filter(t => tronWeb.address.fromHex(t.to) === ADMIN_TRX_ADDRESS)
            .reduce((sum, t) => sum.plus(tronWeb.toBigNumber(t.value)), tronWeb.toBigNumber(0))
            .dividedBy(1e6); // Convert to USDT format

        // Ensure proper decimal formatting
        const totalSent = totalSentBN.toFixed(2);
        const totalReceived = totalReceivedBN.toFixed(2);

        // console.log("Total Sent:", totalSent, "Total Received:", totalReceived); // Debugging log

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

function formatAmount(value) {
    try {
        return parseFloat(
            tronWeb.toBigNumber(value)
                .dividedBy(1e6) // USDT has 6 decimals
                .toFixed(2) // 2 decimal places
        );
    } catch (error) {
        console.error("Error formatting amount:", error);
        return 0.00;
    }
}




module.exports = { getUsdtBalance, sendUsdt,sendWithDrawAmount,getAdminDetails };
