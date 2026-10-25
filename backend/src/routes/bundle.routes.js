const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const { Bundle, Item, Attachment, sequelize } = require('../models');
const costing = require('../services/costing');
const att = require('../services/attachments');
const { normalizeBundle } = require('../services/fields');
const { httpError } = require('../services/http-error');
const { enrich, belongsToIncludes } = require('./item.routes');

const router = express.Router();

const itemFk = (bundle) => (bundle.type === 'buy' ? 'purchaseBundleId' : 'saleBundleId');

// Bundle + its items (with costing and covers) + stats + attachments.
async function loadDetail(id, userId) {
  const bundle = await Bundle.findOne({ where: { id, userId } });
  if (!bundle) return null;
  const ctx = await costing.loadContext(sequelize, userId);
  const rows = await Item.findAll({
    where: { [itemFk(bundle)]: bundle.id, userId },
    include: belongsToIncludes,
    order: [['name', 'ASC']]
  });
  const items = await enrich(rows, userId, { ctx });
  const data = bundle.get({ plain: true });
  data.items = items;
  data.stats = costing.bundleStats(data, items, ctx);
  data.attachments = await att.listFor('bundle', bundle.id);
  return data;
}

// Get all bundles for user
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const bundles = await Bundle.findAll({
      where: { userId: req.user.id },
      include: [
        { model: Item, as: 'purchasedItems', attributes: ['id', 'name', 'status'] },
        { model: Item, as: 'soldItems', attributes: ['id', 'name', 'status'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    const ctx = await costing.loadContext(sequelize, req.user.id);
    const covers = await att.coversFor('bundle', bundles.map((b) => b.id));

    res.json(bundles.map((bundle) => {
      const data = bundle.toJSON();
      data.items = bundle.type === 'buy' ? data.purchasedItems : data.soldItems;
      delete data.purchasedItems;
      delete data.soldItems;
      data.allocation = bundle.type === 'buy' ? (ctx.buy.get(bundle.id)?.allocation || 'even') : null;
      data.coverPhoto = covers.get(bundle.id) || null;
      return data;
    }));
  } catch (error) {
    next(error);
  }
});

// Get single bundle
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const data = await loadDetail(req.params.id, req.user.id);
    if (!data) return res.status(404).json({ error: 'Bundle not found' });
    res.json(data);
  } catch (error) {
    next(error);
  }
});

// Kept for anything still calling it; the detail response includes the same stats.
router.get('/:id/stats', authMiddleware, async (req, res, next) => {
  try {
    const data = await loadDetail(req.params.id, req.user.id);
    if (!data) return res.status(404).json({ error: 'Bundle not found' });
    res.json(data.stats);
  } catch (error) {
    next(error);
  }
});

// Create bundle
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const data = await normalizeBundle(req.body);
    if (!data.name) throw httpError(400, 'Name is required');
    const bundle = await Bundle.create({ ...data, userId: req.user.id });
    res.status(201).json(await loadDetail(bundle.id, req.user.id));
  } catch (error) {
    next(error);
  }
});

// Update bundle; its dates flow down to its items.
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const bundle = await Bundle.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!bundle) return res.status(404).json({ error: 'Bundle not found' });
    const data = await normalizeBundle(req.body, { existing: bundle });

    await sequelize.transaction(async (transaction) => {
      await bundle.update(data, { transaction });
      if (bundle.type === 'buy' && 'purchaseDate' in data && data.purchaseDate) {
        await Item.update({ purchaseDate: data.purchaseDate }, { where: { purchaseBundleId: bundle.id }, transaction });
      }
      if (bundle.type === 'sell' && 'saleDate' in data && data.saleDate) {
        await Item.update({ saleDate: data.saleDate }, { where: { saleBundleId: bundle.id }, transaction });
      }
    });

    res.json(await loadDetail(bundle.id, req.user.id));
  } catch (error) {
    next(error);
  }
});

// Delete bundle (only when empty) and its stored files.
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const bundle = await Bundle.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!bundle) return res.status(404).json({ error: 'Bundle not found' });
    const itemCount = await Item.count({ where: { [itemFk(bundle)]: bundle.id } });
    if (itemCount > 0) {
      throw httpError(400, 'Cannot delete a bundle with items. Remove or reassign its items first.');
    }
    const files = await Attachment.findAll({ where: { bundleId: bundle.id } });
    await att.destroyAttachments(files);
    await bundle.destroy();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Weight each item's share of the bundle cost by its sale price (actual if
// sold, expected otherwise). Stores weights, not dollars, so the split keeps
// tracking the bundle price if that changes later.
router.post('/:id/rebalance', authMiddleware, async (req, res, next) => {
  try {
    const bundle = await Bundle.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!bundle) return res.status(404).json({ error: 'Bundle not found' });
    if (bundle.type !== 'buy') throw httpError(400, 'Rebalancing is only supported for buy bundles');

    const items = await Item.findAll({ where: { purchaseBundleId: bundle.id, userId: req.user.id } });
    if (!items.length) throw httpError(400, 'Bundle has no items to rebalance');

    const weights = items.map((item) => ({
      item,
      weight: Number(item.status === 'sold' ? item.salePrice : item.expectedSalePrice) || 0
    }));
    const missing = weights.filter((w) => w.weight <= 0).map((w) => w.item.name);
    if (missing.length) {
      throw httpError(400, `Every item needs an expected sale price (or its sale price, if sold) before rebalancing. Missing: ${missing.join(', ')}`);
    }

    await sequelize.transaction(async (transaction) => {
      for (const { item, weight } of weights) {
        await item.update({ costWeight: weight }, { transaction });
      }
    });

    res.json(await loadDetail(bundle.id, req.user.id));
  } catch (error) {
    next(error);
  }
});

// Back to an even split.
router.delete('/:id/rebalance', authMiddleware, async (req, res, next) => {
  try {
    const bundle = await Bundle.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!bundle) return res.status(404).json({ error: 'Bundle not found' });
    await Item.update({ costWeight: null }, { where: { purchaseBundleId: bundle.id, userId: req.user.id } });
    res.json(await loadDetail(bundle.id, req.user.id));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
