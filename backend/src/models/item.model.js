const INTENTS = ['flip', 'keep'];

module.exports = (sequelize, DataTypes) => {
  const Item = sequelize.define('Item', {
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
      }
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'categories',
        key: 'id'
      }
    },
    purchaseBundleId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'bundles',
        key: 'id'
      }
    },
    saleBundleId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'bundles',
        key: 'id'
      }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    brand: {
      type: DataTypes.STRING,
      allowNull: true
    },
    model: {
      type: DataTypes.STRING,
      allowNull: true
    },
    serialNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },
    condition: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('owned', 'for_sale', 'sold'),
      allowNull: false,
      defaultValue: 'owned'
    },
    // flip = bought to resell; keep = part of the collection. Keepers carry an
    // estimated market value rather than an asking price.
    intent: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'flip',
      validate: { isIn: [INTENTS] }
    },
    // For items in a buy bundle this stays null — the bundle owns the cost and
    // services/costing.js allocates it. Only standalone purchases set it.
    purchasePrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    // Relative weight of this item inside its buy bundle, set by "rebalance"
    // (from expected/actual sale prices). Weights are only honoured when every
    // item in the bundle has one; otherwise the bundle splits evenly.
    costWeight: {
      type: DataTypes.DECIMAL(12, 4),
      allowNull: true
    },
    // Calendar dates, not instants. Stored as DATE so a purchase on the 5th is
    // the 5th in every timezone (TIMESTAMPTZ midnight UTC rendered as the 4th
    // in Central).
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
    // Marketplace + payment processing fees taken out of the sale.
    saleFees: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    // Outbound shipping you paid to get it to the buyer.
    saleShipping: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    expectedSalePrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    // What it would fetch today. Used for keepers' collection value.
    estimatedValue: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    isListedOnline: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    listingPlatform: {
      type: DataTypes.STRING(40),
      allowNull: true
    },
    listingUrl: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    listedAt: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metafields: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    }
  }, {
    tableName: 'items',
    timestamps: true,
    underscored: true
  });

  Item.INTENTS = INTENTS;
  return Item;
};
