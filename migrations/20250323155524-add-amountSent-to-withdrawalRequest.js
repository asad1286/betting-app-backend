module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('WithdrawalRequests', 'amountSent', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true, // Allow null initially
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('WithdrawalRequests', 'amountSent');
  }
};
