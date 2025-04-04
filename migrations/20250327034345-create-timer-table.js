"use strict";

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable("timers", {
            id: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false,
            },
            endTime: {
                type: Sequelize.DATE,
                allowNull: false,
            },
            statusClosed: {
                type: Sequelize.BOOLEAN,
                defaultValue: true,
            },
            createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
            },
            updatedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"),
            },
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable("timers");
    },
};
