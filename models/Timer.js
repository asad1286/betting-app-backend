const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
    class Timer extends Model {
        static associate(models) {
            // Define associations if necessary
        }
    }

    Timer.init(
        {
            startTime: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize.fn('NOW'), // If not provided, set to current time
            },
            endTime: {
                type: DataTypes.DATE,
                allowNull: false,
            },
            statusClosed: {
                type: DataTypes.BOOLEAN,
                defaultValue: true, // Initially closed
            },
        },
        {
            sequelize,
            modelName: "Timer",
            tableName: "timers",
            timestamps: true,
        }
    );

    return Timer;
};
