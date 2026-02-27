const express = require('express');
const { body, query, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth.middleware');
const { Item, Category, AdditionalCost, Bundle } = require('../models');
const { Sequelize, Op } = require('sequelize');

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
    
    // Include purchase bundle for all queries to get bundle purchase dates
    const includeOptions = [
      { model: Category, as: 'category' },
      { model: AdditionalCost, as: 'additionalCosts' }
    ];
    
    // Add bundle if sorting by purchase date to get bundle's purchase date
    if (sortBy === 'purchaseDate') {
      includeOptions.push({ 
        model: Bundle, 
        as: 'purchaseBundle', 
        attributes: ['id', 'name', 'purchaseDate'], 
        required: false 
      });
    }
    
    // Handle purchaseDate sorting - use item's purchaseDate (items in bundles should have bundle's date copied)
    const orderClause = [[sortBy, sortOrder]];
    
    const { count, rows } = await Item.findAndCountAll({
      where,
      include: includeOptions,
      order: orderClause,
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

// Get detailed stats data for charts and stat detail views
router.get('/stats/detail', authMiddleware, async (req, res, next) => {
  try {
    const { sequelize } = require('../models');

    const items = await Item.findAll({
      where: { userId: req.user.id },
      include: [
        { model: Category, as: 'category' },
        { model: AdditionalCost, as: 'additionalCosts' },
        { model: Bundle, as: 'purchaseBundle' },
        { model: Bundle, as: 'saleBundle' }
      ],
      order: [['purchaseDate', 'ASC'], ['createdAt', 'ASC']]
    });

    // Get bundle item counts for buy-bundle cost allocation
    const bundleItemCounts = {};
    const bundleRows = await sequelize.query(`
      SELECT b.id as bundle_id, COUNT(i.*) as item_count
      FROM bundles b
      LEFT JOIN items i ON i.purchase_bundle_id = b.id
      WHERE b.user_id = :userId AND b.type = 'buy'
      GROUP BY b.id
    `, {
      replacements: { userId: req.user.id },
      type: sequelize.QueryTypes.SELECT
    });
    bundleRows.forEach(row => {
      bundleItemCounts[row.bundle_id] = parseInt(row.item_count);
    });

    // Get sell bundle prices
    const sellBundles = await Bundle.findAll({
      where: { userId: req.user.id, type: 'sell', salePrice: { [Op.not]: null } }
    });
    const sellBundlePrices = {};
    sellBundles.forEach(b => {
      sellBundlePrices[b.id] = parseFloat(b.salePrice || 0);
    });

    // Count items per sell bundle for allocation
    const sellBundleItemCounts = {};
    items.forEach(item => {
      if (item.saleBundleId) {
        sellBundleItemCounts[item.saleBundleId] = (sellBundleItemCounts[item.saleBundleId] || 0) + 1;
      }
    });

    // Enrich items with computed costs
    const enrichedItems = items.map(item => {
      const plain = item.toJSON();

      // Effective purchase cost
      let effectiveCost = 0;
      if (plain.purchaseBundleId && plain.purchaseBundle) {
        const count = bundleItemCounts[plain.purchaseBundleId] || 1;
        effectiveCost = parseFloat(plain.purchaseBundle.purchasePrice || 0) / count;
      } else {
        effectiveCost = parseFloat(plain.purchasePrice || 0);
      }

      // Additional costs
      const additionalCostTotal = (plain.additionalCosts || []).reduce((sum, cost) => {
        const amount = parseFloat(cost.amount || 0);
        return sum + (cost.type === 'income' ? -amount : amount);
      }, 0);
      effectiveCost += additionalCostTotal;

      // Effective sale price (accounting for sell bundles)
      let effectiveSalePrice = 0;
      if (plain.saleBundleId) {
        const bundlePrice = sellBundlePrices[plain.saleBundleId] || 0;
        const count = sellBundleItemCounts[plain.saleBundleId] || 1;
        effectiveSalePrice = bundlePrice / count;
      } else {
        effectiveSalePrice = parseFloat(plain.salePrice || 0);
      }

      return {
        id: plain.id,
        name: plain.name,
        brand: plain.brand,
        model: plain.model,
        status: plain.status,
        condition: plain.condition,
        purchaseDate: plain.purchaseDate,
        saleDate: plain.saleDate,
        purchasePrice: parseFloat(plain.purchasePrice || 0),
        salePrice: parseFloat(plain.salePrice || 0),
        expectedSalePrice: parseFloat(plain.expectedSalePrice || 0),
        isListedOnline: plain.isListedOnline || false,
        category: plain.category ? { id: plain.category.id, name: plain.category.name } : null,
        effectiveCost: Math.round(effectiveCost * 100) / 100,
        additionalCostTotal: Math.round(additionalCostTotal * 100) / 100,
        effectiveSalePrice: Math.round(effectiveSalePrice * 100) / 100,
        createdAt: plain.createdAt
      };
    });

    res.json({ items: enrichedItems });
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
      const itemData = {
        ...req.body,
        userId: req.user.id
      };
      
      // If item is in a purchase bundle, set purchaseDate from bundle
      if (itemData.purchaseBundleId) {
        const bundle = await Bundle.findByPk(itemData.purchaseBundleId);
        if (bundle && bundle.purchaseDate) {
          itemData.purchaseDate = bundle.purchaseDate;
        }
      }
      
      // If item is in a sale bundle, set saleDate from bundle
      if (itemData.saleBundleId) {
        const bundle = await Bundle.findByPk(itemData.saleBundleId);
        if (bundle && bundle.saleDate) {
          itemData.saleDate = bundle.saleDate;
        }
      }
      
      const item = await Item.create(itemData);
      
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
    
    const updateData = { ...req.body };
    
    // If purchaseBundleId is being set or changed, update purchaseDate from bundle
    if (updateData.purchaseBundleId && updateData.purchaseBundleId !== item.purchaseBundleId) {
      const bundle = await Bundle.findByPk(updateData.purchaseBundleId);
      if (bundle && bundle.purchaseDate) {
        updateData.purchaseDate = bundle.purchaseDate;
      }
    }
    
    // If saleBundleId is being set or changed, update saleDate from bundle
    if (updateData.saleBundleId && updateData.saleBundleId !== item.saleBundleId) {
      const bundle = await Bundle.findByPk(updateData.saleBundleId);
      if (bundle && bundle.saleDate) {
        updateData.saleDate = bundle.saleDate;
      }
    }
    
    await item.update(updateData);
    
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
      attributes: { 
        exclude: [] // Let Sequelize handle missing columns gracefully
      },
      include: [
        { model: Bundle, as: 'purchaseBundle' },
        { model: Bundle, as: 'saleBundle' },
        { model: AdditionalCost, as: 'additionalCosts' }
      ],
      raw: false
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
      for_sale: { count: 0, totalInvestment: 0, totalSalePrice: 0 },
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
        // For sold items, use actual sale price; for for_sale items, use expected price
        if (status === 'sold') {
          statsByStatus[status].totalSalePrice += parseFloat(item.salePrice || 0);
        } else if (status === 'for_sale') {
          statsByStatus[status].totalSalePrice += parseFloat(item.expectedSalePrice || 0);
        }
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
        listedOnlineCount: items.filter(i => {
          // Handle case where isListedOnline doesn't exist yet (migration not run)
          return i.status === status && i.isListedOnline === true;
        }).length,
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
    // Check if error is due to missing column (migration not run)
    if (error.message && error.message.includes('is_listed_online')) {
      console.error('❌ Migration required: is_listed_online column is missing');
      console.error('Run: docker-compose exec backend node src/migrations/run-migrations.js');
      return res.status(500).json({ 
        error: 'Database migration required. Please run migrations.',
        details: 'The is_listed_online column is missing. Run: docker-compose exec backend node src/migrations/run-migrations.js'
      });
    }
    next(error);
  }
});

module.exports = router;
