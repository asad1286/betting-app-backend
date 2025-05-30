const { DataTypes, Model } = require('sequelize');
const TronWeb = require('tronweb').TronWeb;

// Initialize TronWeb for Testnet
const tronWeb = new TronWeb({
    fullHost: 'https://api.trongrid.io', // Use Shasta: 'https://api.shasta.trongrid.io'
});

// Function to generate Testnet TRC20 address and private key
const generateTestnetTrx20Address = async () => {
    try {
        const newAccount = await tronWeb.createAccount();
        // console.log("New TRC20 Testnet Address:", newAccount.address.base58);
        // console.log("Private Key:", newAccount.privateKey); // Log private key for debugging (do not expose in production)
        
        return {
            address: newAccount.address.base58, // Generated TRC20 address
            privateKey: newAccount.privateKey,  // Private key for the address
        };
    } catch (error) {
        console.error("Error generating testnet address:", error);
        return null;
    }
};

module.exports = (sequelize) => {
    class User extends Model {
        static associate(models) {
            User.hasMany(models.UserPlan, {
                foreignKey: 'userId',
                onDelete: 'CASCADE',
            });
            User.hasMany(models.WithdrawalRequest, {
                foreignKey: 'userId',
                onDelete: 'CASCADE',
            });
        }
    }

    User.init(
        {
            uid: {
                type: DataTypes.STRING(8),
                allowNull: false,
                unique: true,
                defaultValue: () => Math.floor(10000000 + Math.random() * 90000000).toString(),
            },
            firstName: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    notEmpty: { msg: 'First name cannot be empty' },
                },
            },
            lastName: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    notEmpty: { msg: 'Last name cannot be empty' },
                },
            },
            email: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
                validate: {
                    isEmail: { msg: 'Must be a valid email address' },
                },
            },
            phoneNumber: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
                validate: {
                    notEmpty: { msg: 'Phone number cannot be empty' },
                },
            },
            firstDepositProcessed:{
             type:DataTypes.BOOLEAN,
             allowNull:true
            },
            password: {
                type: DataTypes.STRING,
                allowNull: false,
                validate: {
                    notEmpty: { msg: 'Password cannot be empty' },
                },
            },
            withdrawPassword: {
                type: DataTypes.STRING,
                allowNull: true,
                // validate: {
                //     notEmpty: { msg: 'Withdraw password cannot be empty' },
                // },
            },
            invitationCode: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
                defaultValue: () => Math.floor(100000000000 + Math.random() * 900000000000).toString(),
            },
            referrerId: {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'Users',
                    key: 'id',
                },
            },
            role: {
                type: DataTypes.ENUM('user', 'admin'),
                allowNull: false,
                defaultValue: 'user',
            },
            trx20DepositAddress: {
                type: DataTypes.STRING,
                allowNull: true,
                unique: true,
            },
            trx20PrivateKey: {
                type: DataTypes.STRING,
                allowNull: true, // Store the private key securely (avoid exposing it in production)
            },
        },
        {
            sequelize,
            modelName: 'User',
            paranoid: true,
            hooks: {
                // Generate TRC20 Testnet Address and Private Key Before Creating a User
                beforeCreate: async (user) => {
                    const { address, privateKey } = await generateTestnetTrx20Address();
                    user.trx20DepositAddress = address;
                    user.trx20PrivateKey = privateKey; // Store the private key
                },
            },
        }
    );

    return User;
};
