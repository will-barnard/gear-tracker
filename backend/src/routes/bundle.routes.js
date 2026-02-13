const express = require('express');
const { body, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth.middleware');
const { Bundle, Item } = require('../models');
const { Op } = require('sequelize');

const router = express.Router();

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Get all bundles for user
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const bundles = await Bundle.findAll({
      where: { userId: req.user.id },
      include: [
        {
          model: Item,
          as: 'purchasedItems',
          attributes: ['id', 'name', 'status', 'salePrice']
        },
        {
          model: Item,
          as: 'soldItems',
          attributes: ['id', 'name', 'status', 'salePrice', 'purchasePrice']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    // Flatten items based on bundle type for frontend compatibility
    const bundlesWithItems = bundles.map(bundle => {
      const bundleData = bundle.toJSON();
      bundleData.items = bundle.type === 'buy' ? bundleData.purchasedItems : bundleData.soldItems;
      return bundleData;
    });
    
    res.json(bundlesWithItems);
  } catch (error) {
    next(error);
  }
});

// Get single bundle
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const bundle = await Bundle.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });
    
    if (!bundle) {
      return res.status(404).json({ error: 'Bundle not found' });
    }
    
    // Query items based on bundle type
    const includeOptions = bundle.type === 'buy'
      ? {
          model: Item,
          as: 'purchasedItems',
          include: [
            { model: require('../models').AdditionalCost, as: 'additionalCosts' }
          ]
        }
      : {
          model: Item,
          as: 'soldItems',
          include: [
            { model: require('../models').AdditionalCost, as: 'additionalCosts' }
          ]
        };
    
    const bundleWithItems = await Bundle.findOne({
      where: { id: req.params.id, userId: req.user.id },
      include: [includeOptions]
    });
    
    // Flatten items based on bundle type for frontend compatibility
    const bundleData = bundleWithItems.toJSON();
    bundleData.items = bundle.type === 'buy' ? bundleData.purchasedItems : bundleData.soldItems;
    
    res.json(bundleData);
  } catch (error) {
    next(error);
  }
});

// Create bundle
router.post('/',
  authMiddleware,
  [body('name').trim().notEmpty()],
  validateRequest,
  async (req, res, next) => {
    try {
      const bundle = await Bundle.create({
        ...req.body,
        userId: req.user.id
      });
      
      res.status(201).json(bundle);
    } catch (error) {
      next(error);
    }
  }
);

// Update bundle
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const bundle = await Bundle.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });
    
    if (!bundle) {
      return res.status(404).json({ error: 'Bundle not found' });
    }
    
    await bundle.update(req.body);
    
    // Determine which association to include based on bundle type
    const includeOptions = bundle.type === 'buy'
      ? {
          model: Item,
          as: 'purchasedItems',
          attributes: ['id', 'name', 'status', 'salePrice']
        }
      : {
          model: Item,
          as: 'soldItems',
          attributes: ['id', 'name', 'status', 'salePrice', 'purchasePrice']
        };
    
    const updatedBundle = await Bundle.findByPk(bundle.id, {
      include: [includeOptions]
    });
    
    // Flatten items for frontend compatibility
    const bundleData = updatedBundle.toJSON();
    bundleData.items = bundle.type === 'buy' ? bundleData.purchasedItems : bundleData.soldItems;
    
    res.json(bundleData);
  } catch (error) {
    next(error);
  }
});

// Delete bundle
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const bundle = await Bundle.findOne({
      where: { id: req.params.id, userId: req.user.id },
      include: [
        { model: Item, as: 'purchasedItems' },
        { model: Item, as: 'soldItems' }
      ]
    });
    
    if (!bundle) {
      return res.status(404).json({ error: 'Bundle not found' });
    }
    
    // Check if bundle has items
    const hasItems = (bundle.purchasedItems && bundle.purchasedItems.length > 0) || 
                     (bundle.soldItems && bundle.soldItems.length > 0);
    
    if (hasItems) {
      return res.status(400).json({ 
        error: 'Cannot delete bundle with items. Please remove or reassign items first.' 
      });
    }
    
    await bundle.destroy();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Get bundle statistics
router.get('/:id/stats', authMiddleware, async (req, res, next) => {
  try {
    const bundle = await Bundle.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });
    
    if (!bundle) {
      return res.status(404).json({ error: 'Bundle not found' });
    }
    
    // Query items based on bundle type
    const includeOptions = bundle.type === 'buy' 
      ? { model: Item, as: 'purchasedItems', include: [{ model: require('../models').AdditionalCost, as: 'additionalCosts' }] }
      : { model: Item, as: 'soldItems', include: [{ model: require('../models').AdditionalCost, as: 'additionalCosts' }] };
    
    const bundleWithItems = await Bundle.findOne({
      where: { id: req.params.id, userId: req.user.id },
      include: [includeOptions]
    });
    
    const items = bundle.type === 'buy' ? bundleWithItems.purchasedItems : bundleWithItems.soldItems;
    const totalItems = items.length;
    const ownedItems = items.filter(item => item.status === 'owned').length;
    const soldItems = items.filter(item => item.status === 'sold').length;
    
    const totalAdditionalCosts = items.reduce((sum, item) => {
      const itemCosts = item.additionalCosts?.reduce((s, c) => s + parseFloat(c.amount || 0), 0) || 0;
      return sum + itemCosts;
    }, 0);
    
    let costPerItem = 0;
    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfit = 0;
    
    if (bundle.type === 'buy') {
      // Buy bundle: distribute purchase cost across items
      costPerItem = totalItems > 0 ? parseFloat(bundle.purchasePrice || 0) / totalItems : 0;
      totalRevenue = items
        .filter(item => item.status === 'sold')
        .reduce((sum, item) => sum + parseFloat(item.salePrice || 0), 0);
      totalCost = costPerItem * soldItems + totalAdditionalCosts;
      totalProfit = totalRevenue - totalCost;
    } else {
      // Sell bundle: sum item costs, bundle sale price is revenue
      totalCost = items.reduce((sum, item) => 
        sum + parseFloat(item.purchasePrice || 0), 0) + totalAdditionalCosts;
      totalRevenue = parseFloat(bundle.salePrice || 0);
      totalProfit = totalRevenue - totalCost;
      costPerItem = totalItems > 0 ? totalCost / totalItems : 0;
    }
    
    res.json({
      totalItems,
      ownedItems,
      soldItems,
      totalRevenue,
      costPerItem,
      totalCost,
      totalAdditionalCosts,
      totalProfit,
      bundleType: bundle.type,
      isComplete: bundle.type === 'buy' ? (ownedItems === 0 && totalItems > 0) : (bundle.status === 'complete')
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
