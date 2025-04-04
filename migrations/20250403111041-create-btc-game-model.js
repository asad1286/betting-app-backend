module.exports = {
  up: async (queryInterface, Sequelize) => {
      await queryInterface.createTable('BTCGames', {
          id: {
              type: Sequelize.INTEGER,
              allowNull: false,
              primaryKey: true,
              autoIncrement: true,
          },
          betAmount: {
              type: Sequelize.DECIMAL(10, 2),
              allowNull: false,
          },
          startPrice: {
              type: Sequelize.DECIMAL(10, 2),
              allowNull: false,
          },
          endPrice: {
              type: Sequelize.DECIMAL(10, 2),
              allowNull: false,
          },
          result: {
              type: Sequelize.ENUM('win', 'lost'),
              allowNull: false,
          },
          userId: {
              type: Sequelize.INTEGER,
              allowNull: false,
              references: {
                  model: 'Users',
                  key: 'id',
              },
              onDelete: 'CASCADE',
          },
          createdAt: {
              type: Sequelize.DATE,
              allowNull: false,
              defaultValue: Sequelize.NOW,
          },
          updatedAt: {
              type: Sequelize.DATE,
              allowNull: false,
              defaultValue: Sequelize.NOW,
          },
      });
  },
  down: async (queryInterface, Sequelize) => {
      await queryInterface.dropTable('BTCGames');
  },
};
