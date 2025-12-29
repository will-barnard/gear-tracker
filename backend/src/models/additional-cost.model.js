module.exports = (sequelize, DataTypes) => {
  const AdditionalCost = sequelize.define('AdditionalCost', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    itemId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'items',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    type: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'E.g., repair, shipping, parts, etc.'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'additional_costs',
    timestamps: true,
    underscored: true
  });

  return AdditionalCost;
};
