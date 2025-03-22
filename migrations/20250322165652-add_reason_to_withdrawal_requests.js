module.exports = {
  up: async (queryInterface, Sequelize) => {
      await queryInterface.addColumn('WithdrawalRequests', 'reason', {
          type: Sequelize.STRING,
          allowNull: true,
      });
  },

  down: async (queryInterface, Sequelize) => {
      await queryInterface.removeColumn('WithdrawalRequests', 'reason');
  }
};
