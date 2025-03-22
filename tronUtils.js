const TronWeb = require('tronweb').TronWeb;

const tronWeb = new TronWeb({
    fullHost: 'https://nile.trongrid.io', // TRON Testnet
});

// USDT Contract Address (Testnet)
const USDT_CONTRACT_ADDRESS = "TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf";
const ADMIN_TRX_ADDRESS = "TKjf3ykrNy8xmjEQuNfhz9yrK7b4ctzV1P"; 
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

module.exports = { getUsdtBalance, sendUsdt,sendWithDrawAmount };
