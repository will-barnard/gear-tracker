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
    type: {
      type: DataTypes.ENUM('buy', 'sell'),
      allowNull: false,
      defaultValue: 'buy'
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
    salePrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    saleDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    saleLocation: {
      type: DataTypes.STRING,
      allowNull: true
    },
    saleFees: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    saleShipping: {
      type: DataTypes.DECIMAL(10, 2),
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


  return Bundle;
};
