module.exports = (sequelize, DataTypes) => {
  const Bundle = sequelize.define('Bundle', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    purchasePrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    purchaseDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    purchaseLocation: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('active', 'complete'),
      defaultValue: 'active'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'bundles',
    timestamps: true,
    underscored: true
  });

  Bundle.associate = (models) => {
    Bundle.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    Bundle.hasMany(models.Item, {
      foreignKey: 'bundleId',
      as: 'items'
    });
  };

  return Bundle;
};
