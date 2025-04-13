// models/RewardHistory.js
'use strict';
const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
  class RewardHistory extends Model {}

  RewardHistory.init(
    {
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      planId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      rewardAmount: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'sent', // or 'failed'
      },
      trxHash: {
        type: DataTypes.STRING,
        allowNull: true, // can be null if sending failed
      },
      rewardDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW // sets it to the current date
      }
    },
    {
      sequelize,
      modelName: "RewardHistory",
      timestamps: true,
    }
  );

  return RewardHistory;
};
