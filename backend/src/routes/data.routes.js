const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const { Item, Category, AdditionalCost, Bundle } = require('../models');

const router = express.Router();

// Export all user data
router.get('/export', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const categories = await Category.findAll({
      where: { userId },
      raw: true
    });

    const bundles = await Bundle.findAll({
      where: { userId },
      raw: true
    });

    const items = await Item.findAll({
      where: { userId },
      include: [{ model: AdditionalCost, as: 'additionalCosts' }]
    });

    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      categories: categories.map(({ id, user_id, created_at, updated_at, ...rest }) => rest),
      bundles: bundles.map(({ id, user_id, created_at, updated_at, ...rest }) => rest),
      items: items.map(item => {
        const plain = item.get({ plain: true });
        const costs = (plain.additionalCosts || []).map(({ id, itemId, item_id, created_at, updated_at, ...rest }) => rest);
        const { id, userId: uid, categoryId, purchaseBundleId, saleBundleId, createdAt, updatedAt, additionalCosts, ...rest } = plain;
        return {
          ...rest,
          categoryName: categories.find(c => c.id === categoryId)?.name || null,
          purchaseBundleName: bundles.find(b => b.id === purchaseBundleId)?.name || null,
          saleBundleName: bundles.find(b => b.id === saleBundleId)?.name || null,
          additionalCosts: costs
        };
      })
    };

    res.setHeader('Content-Disposition', 'attachment; filename="gear-tracker-export.json"');
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// Import user data
router.post('/import', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const data = req.body;

    if (!data || data.version == null) {
      return res.status(400).json({ error: 'Invalid export file format' });
    }

    const stats = { categories: 0, bundles: 0, items: 0, additionalCosts: 0 };

    // Import categories (skip duplicates by name)
    const categoryMap = {};
    const existingCategories = await Category.findAll({ where: { userId }, raw: true });
    for (const cat of existingCategories) {
      categoryMap[cat.name] = cat.id;
    }

    if (data.categories) {
      for (const cat of data.categories) {
        if (!categoryMap[cat.name]) {
          const created = await Category.create({ ...cat, userId });
          categoryMap[cat.name] = created.id;
          stats.categories++;
        }
      }
    }

    // Import bundles (skip duplicates by name + type)
    const bundleMap = {};
    const existingBundles = await Bundle.findAll({ where: { userId }, raw: true });
    for (const b of existingBundles) {
      bundleMap[`${b.name}::${b.type}`] = b.id;
    }

    if (data.bundles) {
      for (const bundle of data.bundles) {
        const key = `${bundle.name}::${bundle.type}`;
        if (!bundleMap[key]) {
          const created = await Bundle.create({ ...bundle, userId });
          bundleMap[key] = created.id;
          stats.bundles++;
        }
      }
    }

    // Import items
    if (data.items) {
      for (const itemData of data.items) {
        const { categoryName, purchaseBundleName, saleBundleName, additionalCosts, ...rest } = itemData;

        const categoryId = categoryName ? (categoryMap[categoryName] || null) : null;
        const purchaseBundleId = purchaseBundleName
          ? Object.entries(bundleMap).find(([k]) => k.startsWith(`${purchaseBundleName}::`))?.[1] || null
          : null;
        const saleBundleId = saleBundleName
          ? Object.entries(bundleMap).find(([k]) => k.startsWith(`${saleBundleName}::`))?.[1] || null
          : null;

        const item = await Item.create({
          ...rest,
          userId,
          categoryId,
          purchaseBundleId,
          saleBundleId
        });
        stats.items++;

        if (additionalCosts?.length) {
          for (const cost of additionalCosts) {
            await AdditionalCost.create({ ...cost, itemId: item.id });
            stats.additionalCosts++;
          }
        }
      }
    }

    res.json({ message: 'Import complete', stats });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
