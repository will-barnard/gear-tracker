const express = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const { Item, Category, AdditionalCost, Bundle, Attachment, sequelize } = require('../models');
const { Sequelize, Op } = require('sequelize');
const costing = require('../services/costing');
const att = require('../services/attachments');
const { normalizeItem } = require('../services/fields');
const { httpError } = require('../services/http-error');

const router = express.Router();

const BUNDLE_ATTRS = ['id', 'name', 'type', 'status', 'purchasePrice', 'purchaseDate', 'purchaseLocation', 'salePrice', 'saleDate', 'saleLocation', 'saleFees', 'saleShipping'];

const belongsToIncludes = [
  { model: Category, as: 'category' },
  { model: Bundle, as: 'purchaseBundle', attributes: BUNDLE_ATTRS, required: false },
  { model: Bundle, as: 'saleBundle', attributes: BUNDLE_ATTRS, required: false }
];

// Attach costs, costing and cover photos to a list of Item rows. Costs are
// loaded in one query rather than as a hasMany include: with subQuery:false a
// hasMany join made LIMIT count cost rows, so pages came up short and the last
// item on a page could lose some of its costs.
async function enrich(rows, userId, { ctx } = {}) {
  const ids = rows.map((r) => r.id);
  const costs = ids.length
    ? await AdditionalCost.findAll({ where: { itemId: ids }, order: [['date', 'DESC'], ['createdAt', 'DESC']] })
    : [];
  const byItem = new Map();
  for (const c of costs) {
    if (!byItem.has(c.itemId)) byItem.set(c.itemId, []);
    byItem.get(c.itemId).push(c.get({ plain: true }));
  }
  const context = ctx || await costing.loadContext(sequelize, userId);
  const covers = await att.coversFor('item', ids);
  return rows.map((r) => {
    const plain = typeof r.get === 'function' ? r.get({ plain: true }) : r;
    plain.additionalCosts = byItem.get(plain.id) || [];
    plain.costing = costing.computeItem(plain, context);
    plain.coverPhoto = covers.get(plain.id) || null;
    return plain;
  });
}

async function loadDetail(id, userId) {
  const item = await Item.findOne({ where: { id, userId }, include: belongsToIncludes });
  if (!item) return null;
  const [plain] = await enrich([item], userId);
  plain.attachments = await att.listFor('item', id);
  return plain;
}

// Sort: "date" is the effective date — when it sold, else when it was bought,
// taking bundle dates over item dates.
const EFFECTIVE_DATE = `COALESCE(
  (SELECT b.sale_date FROM bundles b WHERE b.id = "Item".sale_bundle_id),
  "Item".sale_date,
  (SELECT b.purchase_date FROM bundles b WHERE b.id = "Item".purchase_bundle_id),
  "Item".purchase_date)`;

// Base cost in SQL, mirroring services/costing.js, so "sort by cost" works
// across pages. (Additional costs aren't included — this orders by what you paid.)
const BASE_COST = `CASE WHEN "Item".purchase_bundle_id IS NULL THEN COALESCE("Item".purchase_price, 0) ELSE (
  SELECT CASE
    WHEN COUNT(*) FILTER (WHERE i2.cost_weight > 0) = COUNT(*) AND SUM(i2.cost_weight) > 0
      THEN COALESCE(b.purchase_price, 0) * COALESCE("Item".cost_weight, 0) / SUM(i2.cost_weight)
    ELSE COALESCE(b.purchase_price, 0) / COUNT(*)
  END
  FROM bundles b JOIN items i2 ON i2.purchase_bundle_id = b.id
  WHERE b.id = "Item".purchase_bundle_id
  GROUP BY b.purchase_price) END`;

const SORTS = {
  date: EFFECTIVE_DATE,
  purchaseDate: EFFECTIVE_DATE, // old name, kept for saved links
  cost: BASE_COST,
  purchasePrice: BASE_COST,
  name: '"Item".name',
  createdAt: '"Item".created_at',
  updatedAt: '"Item".updated_at',
  listedAt: '"Item".listed_at'
};

// Get all items with filtering
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const {
      status, categoryId, search, intent, bundleId, listedBefore,
      sortBy = 'date', sortOrder = 'DESC'
    } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 500);

    const where = { userId: req.user.id };
    if (status) where.status = String(status).split(',');
    if (categoryId) where.categoryId = categoryId === 'none' ? null : categoryId;
    if (intent) where.intent = intent;
    if (bundleId) where[Op.and] = [{ [Op.or]: [{ purchaseBundleId: bundleId }, { saleBundleId: bundleId }] }];
    if (listedBefore) where.listedAt = { [Op.lte]: listedBefore };
    if (search) {
      const term = `%${String(search).trim()}%`;
      where[Op.or] = ['name', 'brand', 'model', 'description', 'serialNumber', 'notes']
        .map((f) => ({ [f]: { [Op.iLike]: term } }));
    }

    const dir = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const sortSql = SORTS[sortBy] || EFFECTIVE_DATE;
    const order = [
      [Sequelize.literal(`${sortSql} ${dir} NULLS LAST`)],
      ['createdAt', 'DESC'],
      ['id', 'ASC']
    ];

    const { count, rows } = await Item.findAndCountAll({
      where,
      include: belongsToIncludes,
      order,
      limit,
      offset: (page - 1) * limit,
      distinct: true
    });

    res.json({
      items: await enrich(rows, req.user.id),
      pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) }
    });
  } catch (error) {
    next(error);
  }
});

// Everything, with costing, for charts and the stat detail pages.
router.get('/stats/detail', authMiddleware, async (req, res, next) => {
  try {
    const rows = await Item.findAll({
      where: { userId: req.user.id },
      include: belongsToIncludes,
      order: [['purchaseDate', 'ASC'], ['createdAt', 'ASC']]
    });
    const items = await enrich(rows, req.user.id);
    res.json({
      items: items.map((it) => ({
        id: it.id,
        name: it.name,
        brand: it.brand,
        model: it.model,
        status: it.status,
        intent: it.intent,
        condition: it.condition,
        category: it.category ? { id: it.category.id, name: it.category.name, color: it.category.color } : null,
        purchaseDate: it.costing.purchaseDate,
        saleDate: it.costing.saleDate,
        purchasePrice: it.costing.baseCost,
        salePrice: it.costing.grossSale || 0,
        expectedSalePrice: Number(it.expectedSalePrice || 0),
        estimatedValue: it.estimatedValue == null ? null : Number(it.estimatedValue),
        isListedOnline: !!it.isListedOnline,
        listedAt: it.listedAt,
        effectiveCost: it.costing.totalCost,
        additionalCostTotal: it.costing.adjustments,
        // Net of fees. 0 when there's neither a sale nor an estimate.
        effectiveSalePrice: it.costing.netSale || 0,
        saleFees: it.costing.saleFees,
        profit: it.costing.profit,
        roi: it.costing.roi,
        daysHeld: it.costing.daysHeld,
        daysListed: it.costing.daysListed,
        currentValue: it.costing.currentValue,
        coverPhoto: it.coverPhoto,
        createdAt: it.createdAt
      }))
    });
  } catch (error) {
    next(error);
  }
});

// Inventory summary for the dashboard.
router.get('/stats/summary', authMiddleware, async (req, res, next) => {
  try {
    const rows = await Item.findAll({ where: { userId: req.user.id }, include: belongsToIncludes });
    const items = await enrich(rows, req.user.id);
    const keepers = items.filter((i) => i.intent === 'keep' && i.status !== 'sold');
    res.json({
      stats: costing.summarize(items),
      keepers: {
        count: keepers.length,
        cost: Math.round(keepers.reduce((s, i) => s + i.costing.totalCost, 0) * 100) / 100,
        value: Math.round(keepers.reduce((s, i) => s + (i.costing.currentValue || 0), 0) * 100) / 100,
        estimated: keepers.filter((i) => i.costing.valueIsEstimate).length
      },
      staleListings: items.filter((i) => i.status === 'for_sale' && (i.costing.daysListed || 0) >= 60).length
    });
  } catch (error) {
    next(error);
  }
});

// Get single item
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const item = await loadDetail(req.params.id, req.user.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (error) {
    next(error);
  }
});

// Create item (quick add - only a name is required)
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const data = await normalizeItem(req.body, { userId: req.user.id });
    if (!data.name) throw httpError(400, 'Name is required');
    const item = await Item.create({ ...data, userId: req.user.id });
    res.status(201).json(await loadDetail(item.id, req.user.id));
  } catch (error) {
    next(error);
  }
});

// Update item — partial updates are fine; only the fields sent change.
router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const item = await Item.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    const data = await normalizeItem(req.body, { userId: req.user.id, existing: item });
    await item.update(data);
    res.json(await loadDetail(item.id, req.user.id));
  } catch (error) {
    next(error);
  }
});

// Delete item, its costs (FK cascade) and its stored files.
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const item = await Item.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    const files = await Attachment.findAll({ where: { itemId: item.id } });
    await att.destroyAttachments(files);
    await item.destroy();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
module.exports.enrich = enrich;
module.exports.belongsToIncludes = belongsToIncludes;
