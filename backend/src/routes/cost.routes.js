const express = require('express');
const { body, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth.middleware');
const { AdditionalCost, Item } = require('../models');

const router = express.Router();

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Get all costs for an item
router.get('/item/:itemId', authMiddleware, async (req, res, next) => {
  try {
    // Verify item belongs to user
    const item = await Item.findOne({
      where: { id: req.params.itemId, userId: req.user.id }
    });
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    const costs = await AdditionalCost.findAll({
      where: { itemId: req.params.itemId },
      order: [['date', 'DESC']]
    });
    
    res.json(costs);
  } catch (error) {
    next(error);
  }
});

// Create additional cost
router.post('/',
  authMiddleware,
  [
    body('itemId').notEmpty(),
    body('description').trim().notEmpty(),
    body('amount').isFloat({ min: 0 })
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      // Verify item belongs to user
      const item = await Item.findOne({
        where: { id: req.body.itemId, userId: req.user.id }
      });
      
      if (!item) {
        return res.status(404).json({ error: 'Item not found' });
      }
      
      const cost = await AdditionalCost.create(req.body);
      res.status(201).json(cost);
    } catch (error) {
      next(error);
    }
  }
);

// Update additional cost
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const cost = await AdditionalCost.findByPk(req.params.id, {
      include: [{ model: Item, as: 'item' }]
    });
    
    if (!cost || cost.item.userId !== req.user.id) {
      return res.status(404).json({ error: 'Cost not found' });
    }
    
    await cost.update(req.body);
    res.json(cost);
  } catch (error) {
    next(error);
  }
});

// Delete additional cost
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const cost = await AdditionalCost.findByPk(req.params.id, {
      include: [{ model: Item, as: 'item' }]
    });
    
    if (!cost || cost.item.userId !== req.user.id) {
      return res.status(404).json({ error: 'Cost not found' });
    }
    
    await cost.destroy();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
