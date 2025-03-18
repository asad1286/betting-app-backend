const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
    class WithdrawalRequest extends Model {
        static associate(models) {
            // A WithdrawalRequest belongs to a User
            WithdrawalRequest.belongsTo(models.User, {
                foreignKey: 'userId',
                onDelete: 'CASCADE',
            });
        }
    }

    WithdrawalRequest.init(
        {
            userId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: 'Users',
                    key: 'id',
                },
            },
            withdrawAmount: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: false,
                validate: {
                    min: 0.01,
                },
            },
            status: {
                type: DataTypes.ENUM('pending', 'approved', 'rejected', 'sent'),
                allowNull: false,
                defaultValue: 'pending',
            },
            trc20WithdrawAddress: {
                type: DataTypes.STRING,
                allowNull: false,
                
            }
        },
        {
            sequelize,
            modelName: 'WithdrawalRequest',
            timestamps: true, // Enable createdAt and updatedAt fields
            paranoid: true, // Soft delete support
        }
    );

    return WithdrawalRequest;
};
