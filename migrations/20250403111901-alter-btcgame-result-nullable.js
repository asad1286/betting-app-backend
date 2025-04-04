'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('BTCGames', 'result', {
      type: Sequelize.ENUM('win', 'lost'),
      allowNull: true, // Allow the result to be nullable
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('BTCGames', 'result', {
      type: Sequelize.ENUM('win', 'lost'),
      allowNull: false, // Set it back to not nullable if needed for rollback
    });
  },
};
