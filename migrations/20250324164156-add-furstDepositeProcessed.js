module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Users', 'firstDepositProcessed', {
      type: Sequelize.BOOLEAN,
      allowNull: true, // Allow null initially
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Users', 'firstDepositProcessed');
  }
};
