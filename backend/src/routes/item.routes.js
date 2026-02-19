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
    const { Bundle } = require('../models');
    const item = await Item.findOne({
      where: { id: req.params.id, userId: req.user.id },
      include: [
        { model: Category, as: 'category' },
        { model: AdditionalCost, as: 'additionalCosts' },
        { model: Bundle, as: 'purchaseBundle' },
        { model: Bundle, as: 'saleBundle' }
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
    const { sequelize, Bundle } = require('../models');
    
    // Get all items with their bundles
    const items = await Item.findAll({
      where: { userId: req.user.id },
      include: [
        { model: Bundle, as: 'purchaseBundle' },
        { model: Bundle, as: 'saleBundle' },
        { model: AdditionalCost, as: 'additionalCosts' }
      ]
    });
    
    // Get all sell bundles to track their revenue
    const sellBundles = await Bundle.findAll({
      where: { 
        userId: req.user.id,
        type: 'sell',
        salePrice: { [Op.not]: null }
      }
    });
    
    // Calculate stats manually to account for bundles
    const statsByStatus = {
      owned: { count: 0, totalInvestment: 0, totalSalePrice: 0 },
      sold: { count: 0, totalInvestment: 0, totalSalePrice: 0 }
    };
    
    // Get bundle item counts for cost allocation (only for buy bundles)
    const bundleItemCounts = {};
    const bundleItems = await sequelize.query(`
      SELECT b.id as bundle_id, b.type, COUNT(i.*) as item_count
      FROM bundles b
      LEFT JOIN items i ON i.purchase_bundle_id = b.id
      WHERE b.user_id = :userId AND b.type = 'buy'
      GROUP BY b.id, b.type
    `, {
      replacements: { userId: req.user.id },
      type: sequelize.QueryTypes.SELECT
    });
    
    bundleItems.forEach(row => {
      bundleItemCounts[row.bundle_id] = {
        count: parseInt(row.item_count),
        type: row.type
      };
    });
    
    items.forEach(item => {
      const status = item.status;
      statsByStatus[status].count++;
      
      // Calculate item cost
      let itemCost = 0;
      if (item.purchaseBundleId && item.purchaseBundle) {
        const bundleInfo = bundleItemCounts[item.purchaseBundleId];
        if (bundleInfo && bundleInfo.type === 'buy') {
          // For buy bundles: allocate purchase cost across items
          const bundlePrice = parseFloat(item.purchaseBundle.purchasePrice || 0);
          const itemCount = bundleInfo.count || 1;
          itemCost = bundlePrice / itemCount;
        } else {
          // Fallback to individual purchase price
          itemCost = parseFloat(item.purchasePrice || 0);
        }
      } else {
        // Individual item: use its purchase price
        itemCost = parseFloat(item.purchasePrice || 0);
      }
      
      // Add additional costs (expenses add, income subtracts)
      const additionalCosts = item.additionalCosts?.reduce((sum, cost) => {
        const amount = parseFloat(cost.amount || 0);
        return sum + (cost.type === 'income' ? -amount : amount);
      }, 0) || 0;
      
      statsByStatus[status].totalInvestment += itemCost + additionalCosts;
      
      // For items in sell bundles, don't count individual sale prices
      // The bundle sale price will be counted separately
      if (item.saleBundleId && item.saleBundle) {
        // Don't add individual item sale price for sell bundles
      } else {
        statsByStatus[status].totalSalePrice += parseFloat(item.salePrice || 0);
      }
    });
    
    // Add sell bundle revenues to sold items
    sellBundles.forEach(bundle => {
      // Check if all items in the bundle are sold
      const bundleItems = items.filter(item => item.saleBundleId === bundle.id);
      const allSold = bundleItems.length > 0 && bundleItems.every(item => item.status === 'sold');
      
      if (allSold) {
        statsByStatus.sold.totalSalePrice += parseFloat(bundle.salePrice || 0);
      }
    });
    
    // Format stats array
    const enrichedStats = Object.entries(statsByStatus)
      .filter(([_, data]) => data.count > 0)
      .map(([status, data]) => ({
        status,
        count: data.count,
        totalPurchasePrice: data.totalInvestment - (data.totalAdditionalCosts || 0),
        totalSalePrice: data.totalSalePrice,
        totalAdditionalCosts: items
          .filter(i => i.status === status)
          .reduce((sum, item) => sum + (item.additionalCosts?.reduce((s, c) => {
            const amount = parseFloat(c.amount || 0);
            return s + (c.type === 'income' ? -amount : amount);
          }, 0) || 0), 0),
        totalInvestment: data.totalInvestment
      }));
    
    res.json({
      stats: enrichedStats
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
