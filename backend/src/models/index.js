const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'gear_tracker',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models
db.User = require('./user.model')(sequelize, Sequelize);
db.Item = require('./item.model')(sequelize, Sequelize);
db.Category = require('./category.model')(sequelize, Sequelize);
db.AdditionalCost = require('./additional-cost.model')(sequelize, Sequelize);

// Define associations
db.User.hasMany(db.Item, { foreignKey: 'userId', as: 'items' });
db.Item.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });

db.Category.hasMany(db.Item, { foreignKey: 'categoryId', as: 'items' });
db.Item.belongsTo(db.Category, { foreignKey: 'categoryId', as: 'category' });

db.Item.hasMany(db.AdditionalCost, { foreignKey: 'itemId', as: 'additionalCosts' });
db.AdditionalCost.belongsTo(db.Item, { foreignKey: 'itemId', as: 'item' });

db.User.hasMany(db.Category, { foreignKey: 'userId', as: 'categories' });
db.Category.belongsTo(db.User, { foreignKey: 'userId', as: 'user' });

module.exports = db;
