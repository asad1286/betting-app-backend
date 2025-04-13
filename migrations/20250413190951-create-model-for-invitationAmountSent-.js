'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('InvitationAmounts', 'inviterId', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      comment: 'The user who invited the referred user',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('InvitationAmounts', 'inviterId');
  },
};
