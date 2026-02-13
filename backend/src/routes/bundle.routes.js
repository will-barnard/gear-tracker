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
          as: 'items',
          attributes: ['id', 'name', 'status', 'salePrice']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    res.json(bundles);
  } catch (error) {
    next(error);
  }
});

// Get single bundle
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const bundle = await Bundle.findOne({
      where: { id: req.params.id, userId: req.user.id },
      include: [
        {
          model: Item,
          as: 'items',
          include: [
            { model: require('../models').AdditionalCost, as: 'additionalCosts' }
          ]
        }
      ]
    });
    
    if (!bundle) {
      return res.status(404).json({ error: 'Bundle not found' });
    }
    
    res.json(bundle);
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
    
    const updatedBundle = await Bundle.findByPk(bundle.id, {
      include: [
        {
          model: Item,
          as: 'items',
          attributes: ['id', 'name', 'status', 'salePrice']
        }
      ]
    });
    
    res.json(updatedBundle);
  } catch (error) {
    next(error);
  }
});

// Delete bundle
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const bundle = await Bundle.findOne({
      where: { id: req.params.id, userId: req.user.id },
      include: [{ model: Item, as: 'items' }]
    });
    
    if (!bundle) {
      return res.status(404).json({ error: 'Bundle not found' });
    }
    
    // Check if bundle has items
    if (bundle.items && bundle.items.length > 0) {
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
      where: { id: req.params.id, userId: req.user.id },
      include: [
        {
          model: Item,
          as: 'items',
          include: [
            { model: require('../models').AdditionalCost, as: 'additionalCosts' }
          ]
        }
      ]
    });
    
    if (!bundle) {
      return res.status(404).json({ error: 'Bundle not found' });
    }
    
    const totalItems = bundle.items.length;
    const ownedItems = bundle.items.filter(item => item.status === 'owned').length;
    const soldItems = bundle.items.filter(item => item.status === 'sold').length;
    
    const totalAdditionalCosts = bundle.items.reduce((sum, item) => {
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
      totalRevenue = bundle.items
        .filter(item => item.status === 'sold')
        .reduce((sum, item) => sum + parseFloat(item.salePrice || 0), 0);
      totalCost = costPerItem * soldItems + totalAdditionalCosts;
      totalProfit = totalRevenue - totalCost;
    } else {
      // Sell bundle: sum item costs, bundle sale price is revenue
      totalCost = bundle.items.reduce((sum, item) => 
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
