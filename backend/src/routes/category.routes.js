const express = require('express');
const { body, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth.middleware');
const { Category } = require('../models');

const router = express.Router();

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Get all categories
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const categories = await Category.findAll({
      where: { userId: req.user.id },
      order: [['name', 'ASC']]
    });
    
    res.json(categories);
  } catch (error) {
    next(error);
  }
});

// Get single category
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const category = await Category.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json(category);
  } catch (error) {
    next(error);
  }
});

// Create category
router.post('/',
  authMiddleware,
  [body('name').trim().notEmpty()],
  validateRequest,
  async (req, res, next) => {
    try {
      const category = await Category.create({
        ...req.body,
        userId: req.user.id
      });
      
      res.status(201).json(category);
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ error: 'Category with this name already exists' });
      }
      next(error);
    }
  }
);

// Update category
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const category = await Category.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    await category.update(req.body);
    res.json(category);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Category with this name already exists' });
    }
    next(error);
  }
});

// Delete category
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const category = await Category.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    await category.destroy();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
