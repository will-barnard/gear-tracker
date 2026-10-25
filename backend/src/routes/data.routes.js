const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const { Item, Category, AdditionalCost, Bundle, Attachment, User, sequelize } = require('../models');
const { pick, ITEM_FIELDS, BUNDLE_FIELDS, CATEGORY_FIELDS, normalizeCost } = require('../services/fields');
const backup = require('../services/backup');
const storage = require('../services/storage');
const { httpError } = require('../services/http-error');

const router = express.Router();

// Database backups cover every account, so only the first (owner) account
// can see or trigger them.
async function requireOwner(req, res, next) {
  try {
    const owner = await User.findOne({ order: [['createdAt', 'ASC']], attributes: ['id'] });
    if (!owner || owner.id !== req.user.id) throw httpError(403, 'Only the owner account can manage backups');
    next();
  } catch (err) {
    next(err);
  }
}

// Export all user data
router.get('/export', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const categories = await Category.findAll({ where: { userId } });
    const bundles = await Bundle.findAll({ where: { userId } });
    const items = await Item.findAll({
      where: { userId },
      include: [{ model: AdditionalCost, as: 'additionalCosts' }]
    });
    const attachments = await Attachment.findAll({ where: { userId } });

    const bundleName = (id) => bundles.find((b) => b.id === id)?.name || null;
    const itemName = (id) => items.find((i) => i.id === id)?.name || null;

    const data = {
      version: 2,
      exportedAt: new Date().toISOString(),
      categories: categories.map((c) => pick(c.get({ plain: true }), CATEGORY_FIELDS)),
      bundles: bundles.map((b) => pick(b.get({ plain: true }), BUNDLE_FIELDS)),
      items: items.map((item) => {
        const plain = item.get({ plain: true });
        const rest = pick(plain, ITEM_FIELDS);
        delete rest.categoryId;
        delete rest.purchaseBundleId;
        delete rest.saleBundleId;
        return {
          ...rest,
          costWeight: plain.costWeight,
          categoryName: categories.find((c) => c.id === plain.categoryId)?.name || null,
          purchaseBundleName: bundleName(plain.purchaseBundleId),
          saleBundleName: bundleName(plain.saleBundleId),
          additionalCosts: (plain.additionalCosts || []).map((c) => ({
            description: c.description,
            amount: c.amount,
            date: c.date,
            type: c.type || 'expense',
            category: c.category,
            notes: c.notes
          }))
        };
      }),
      // A manifest only — the files themselves stay in brew-bucket and are not
      // in this JSON, and import doesn't recreate them.
      attachments: attachments.map((a) => ({
        owner: a.itemId ? 'item' : 'bundle',
        ownerName: a.itemId ? itemName(a.itemId) : bundleName(a.bundleId),
        kind: a.kind,
        filename: a.filename,
        contentType: a.contentType,
        size: Number(a.size),
        caption: a.caption,
        storageKey: a.storageKey,
        createdAt: a.createdAt
      }))
    };

    res.setHeader('Content-Disposition', 'attachment; filename="gear-tracker-export.json"');
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// Import user data. Runs in one transaction: a bad row rolls back the whole file
// rather than leaving half an import behind.
router.post('/import', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const data = req.body;

    if (!data || data.version == null) {
      return res.status(400).json({ error: 'Invalid export file format' });
    }

    const stats = { categories: 0, categoriesSkipped: 0, bundles: 0, bundlesSkipped: 0, items: 0, additionalCosts: 0 };

    await sequelize.transaction(async (transaction) => {
      // Categories: skip duplicates by name
      const categoryMap = {};
      for (const cat of await Category.findAll({ where: { userId }, raw: true, transaction })) {
        categoryMap[cat.name] = cat.id;
      }
      for (const cat of data.categories || []) {
        if (!cat?.name) continue;
        if (!categoryMap[cat.name]) {
          const created = await Category.create({ ...pick(cat, CATEGORY_FIELDS), userId }, { transaction });
          categoryMap[cat.name] = created.id;
          stats.categories++;
        } else {
          stats.categoriesSkipped++;
        }
      }

      // Bundles: skip duplicates by name + type
      const bundleMap = {};
      for (const b of await Bundle.findAll({ where: { userId }, raw: true, transaction })) {
        bundleMap[`${b.name}::${b.type}`] = b.id;
      }
      for (const bundle of data.bundles || []) {
        if (!bundle?.name) continue;
        const key = `${bundle.name}::${bundle.type}`;
        if (!bundleMap[key]) {
          const created = await Bundle.create({ ...pick(bundle, BUNDLE_FIELDS), userId }, { transaction });
          bundleMap[key] = created.id;
          stats.bundles++;
        } else {
          stats.bundlesSkipped++;
        }
      }

      for (const itemData of data.items || []) {
        if (!itemData?.name) continue;
        const fields = pick(itemData, ITEM_FIELDS);
        delete fields.categoryId;
        const purchaseBundleId = itemData.purchaseBundleName ? (bundleMap[`${itemData.purchaseBundleName}::buy`] || null) : null;
        const saleBundleId = itemData.saleBundleName ? (bundleMap[`${itemData.saleBundleName}::sell`] || null) : null;

        // v1 exports stored a bundled item's rebalanced share in purchasePrice;
        // that's a weight now (see migration 002).
        let costWeight = itemData.costWeight ?? null;
        if (purchaseBundleId) {
          if (costWeight == null && Number(fields.purchasePrice) > 0) costWeight = fields.purchasePrice;
          fields.purchasePrice = null;
        }
        for (const d of ['purchaseDate', 'saleDate', 'listedAt']) {
          if (fields[d]) fields[d] = String(fields[d]).slice(0, 10);
        }

        const item = await Item.create({
          ...fields,
          userId,
          costWeight,
          categoryId: itemData.categoryName ? (categoryMap[itemData.categoryName] || null) : null,
          purchaseBundleId,
          saleBundleId
        }, { transaction });
        stats.items++;

        for (const cost of itemData.additionalCosts || []) {
          await AdditionalCost.create({ ...normalizeCost(cost, { create: true }), itemId: item.id }, { transaction });
          stats.additionalCosts++;
        }
      }
    });

    res.json({ message: 'Import complete', stats });
  } catch (error) {
    next(error);
  }
});

router.get('/backups', authMiddleware, requireOwner, async (req, res, next) => {
  try {
    let recent = [];
    let listError = null;
    try {
      recent = await backup.listBackups();
    } catch (err) {
      listError = err.message;
    }
    res.json({
      ...backup.status(),
      recent,
      listError,
      storage: { configured: storage.isConfigured(), bucket: storage.BUCKET, prefix: storage.PREFIX }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/backups', authMiddleware, requireOwner, async (req, res, next) => {
  try {
    const result = await backup.runBackup();
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
