const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class InvitationAmount extends Model {}
  
  InvitationAmount.associate = (models) => {
    InvitationAmount.belongsTo(models.Plan, { foreignKey: 'planId', as: 'plan' });

    // Relationships to both users
    InvitationAmount.belongsTo(models.User, { foreignKey: 'userId', as: 'referredUser' }); // who bought plan
    InvitationAmount.belongsTo(models.User, { foreignKey: 'inviterId', as: 'inviterUser' }); // who referred
  };

  InvitationAmount.init(
    {
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        comment: 'The referred user who used a referral code',
      },
      inviterId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        comment: 'The user who invited the referred user',
      },
      planId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'Plans', key: 'id' },
      },
      amountSent: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('pending', 'sent'),
        defaultValue: 'pending',
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'InvitationAmount',
      timestamps: true,
    }
  );

  return InvitationAmount;
};
