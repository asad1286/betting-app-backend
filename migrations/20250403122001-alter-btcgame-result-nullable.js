module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('BTCGames', 'result', {
      type: Sequelize.ENUM('win', 'lost', 'pending'),
      allowNull: true,
      defaultValue: 'pending', // Set default value to 'pending'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('BTCGames', 'result', {
      type: Sequelize.ENUM('win', 'lost'),
      allowNull: true,
      defaultValue: 'win', // Or some other default based on your needs
    });
  },
};
