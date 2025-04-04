const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
    class BTCGame extends Model {
        static associate(models) {
            // Foreign Key association with User model
            BTCGame.belongsTo(models.User, {
                foreignKey: 'userId',
                onDelete: 'CASCADE', // Ensure that when a user is deleted, their games are also deleted
            });
        }
    }

    BTCGame.init(
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            betAmount: {
                type: DataTypes.DECIMAL(10, 2), // You can adjust the precision as needed
                allowNull: false,
            },
            startPrice: {
                type: DataTypes.DECIMAL(10, 2), // You can adjust the precision as needed
                allowNull: false,
            },
            endPrice: {
                type: DataTypes.DECIMAL(10, 2), // You can adjust the precision as needed
                allowNull: false,
            },
            result: {
                type: DataTypes.ENUM('win', 'lost', 'pending'), // Added 'pending' as a valid option
                allowNull: true,
                defaultValue: 'pending', // Default result is 'pending'
            },
            betType: {
                type: DataTypes.ENUM('up', 'down'), // Enum for bet type: 'up' or 'down'
                allowNull: false, // Ensure a bet type is always provided
            },
            createdAt: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
            },
            updatedAt: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
            },
            userId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'Users', // Assuming the table name for User model is 'Users'
                    key: 'id', // Foreign key references the 'id' column in Users table
                },
            },
        },
        {
            sequelize,
            modelName: 'BTCGame',
            timestamps: true, // Enable automatic createdAt and updatedAt management
        }
    );

    return BTCGame;
};
