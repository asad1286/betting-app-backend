'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add the 'betType' column to the BTCGame table
    await queryInterface.addColumn('BTCGames', 'betType', {
      type: Sequelize.ENUM('up', 'down'), // Enum for 'up' and 'down' bet types
      allowNull: false, // Ensure that a bet type is always provided
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert the addition of the 'betType' column
    await queryInterface.removeColumn('BTCGames', 'betType');
    // Optionally, you may want to drop the enum itself if it's no longer used
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_BTCGames_betType";');
  }
};
