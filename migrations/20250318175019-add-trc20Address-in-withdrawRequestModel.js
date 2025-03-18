module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('WithdrawalRequests', 'trc20WithdrawAddress', {
      type: Sequelize.STRING,
      allowNull: false,
      
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('WithdrawalRequests', 'trc20WithdrawAddress');
  }
};
