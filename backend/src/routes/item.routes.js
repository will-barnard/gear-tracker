const express = require('express');
const { body, query, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth.middleware');
const { Item, Category, AdditionalCost } = require('../models');
const { Op } = require('sequelize');

const router = express.Router();

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Get all items with filtering
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const {
      status,
      categoryId,
      search,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      page = 1,
      limit = 50
    } = req.query;
    
    const where = { userId: req.user.id };
    
    // Status filter
    if (status) {
      where.status = status;
    }
    
    // Category filter
    if (categoryId) {
      where.categoryId = categoryId;
    }
    
    // Search filter
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { brand: { [Op.iLike]: `%${search}%` } },
        { model: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    // Price filters
    if (minPrice || maxPrice) {
      where.purchasePrice = {};
      if (minPrice) where.purchasePrice[Op.gte] = minPrice;
      if (maxPrice) where.purchasePrice[Op.lte] = maxPrice;
    }
    
    const offset = (page - 1) * limit;
    
    const { count, rows } = await Item.findAndCountAll({
      where,
      include: [
        { model: Category, as: 'category' },
        { model: AdditionalCost, as: 'additionalCosts' }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({
      items: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get single item
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const item = await Item.findOne({
      where: { id: req.params.id, userId: req.user.id },
      include: [
        { model: Category, as: 'category' },
        { model: AdditionalCost, as: 'additionalCosts' }
      ]
    });
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json(item);
  } catch (error) {
    next(error);
  }
});

// Create item (quick add - minimal required fields)
router.post('/',
  authMiddleware,
  [body('name').trim().notEmpty()],
  validateRequest,
  async (req, res, next) => {
    try {
      const item = await Item.create({
        ...req.body,
        userId: req.user.id
      });
      
      res.status(201).json(item);
    } catch (error) {
      next(error);
    }
  }
);

// Update item
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const item = await Item.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    await item.update(req.body);
    
    const updatedItem = await Item.findByPk(item.id, {
      include: [
        { model: Category, as: 'category' },
        { model: AdditionalCost, as: 'additionalCosts' }
      ]
    });
    
    res.json(updatedItem);
  } catch (error) {
    next(error);
  }
});

// Delete item
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const item = await Item.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    await item.destroy();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Get inventory summary
router.get('/stats/summary', authMiddleware, async (req, res, next) => {
  try {
    const { sequelize } = require('../models');
    
    const stats = await Item.findAll({
      where: { userId: req.user.id },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('purchase_price')), 'totalPurchasePrice'],
        [sequelize.fn('SUM', sequelize.col('sale_price')), 'totalSalePrice']
      ],
      group: ['status'],
      raw: true
    });
    
    // Calculate total additional costs
    const additionalCostsQuery = await sequelize.query(`
      SELECT SUM(ac.amount) as total_additional_costs
      FROM additional_costs ac
      INNER JOIN items i ON ac.item_id = i.id
      WHERE i.user_id = :userId
    `, {
      replacements: { userId: req.user.id },
      type: sequelize.QueryTypes.SELECT
    });
    
    res.json({
      stats,
      totalAdditionalCosts: additionalCostsQuery[0]?.total_additional_costs || 0
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
