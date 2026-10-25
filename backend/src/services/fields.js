// Request bodies are whitelisted before they reach a model. The routes used to
// spread req.body straight into create/update, which let a request set userId
// or point an item at someone else's bundle — harmless with one user, not once
// folio (or anything else) talks to this API.
const { Bundle, Category } = require('../models');
const { httpError } = require('./http-error');
const { today, toDateOnly } = require('./dates');

const ITEM_FIELDS = [
  'name', 'description', 'brand', 'model', 'serialNumber', 'condition',
  'status', 'intent', 'categoryId', 'purchaseBundleId', 'saleBundleId',
  'purchasePrice', 'purchaseDate', 'purchaseLocation',
  'salePrice', 'saleDate', 'saleLocation', 'saleFees', 'saleShipping',
  'expectedSalePrice', 'estimatedValue',
  'isListedOnline', 'listingPlatform', 'listingUrl', 'listedAt',
  'notes', 'metafields'
];
const ITEM_MONEY = ['purchasePrice', 'salePrice', 'saleFees', 'saleShipping', 'expectedSalePrice', 'estimatedValue'];
const ITEM_DATES = ['purchaseDate', 'saleDate', 'listedAt'];
const ITEM_STATUSES = ['owned', 'for_sale', 'sold'];

const BUNDLE_FIELDS = [
  'name', 'type', 'description', 'status', 'notes',
  'purchasePrice', 'purchaseDate', 'purchaseLocation',
  'salePrice', 'saleDate', 'saleLocation', 'saleFees', 'saleShipping'
];
const BUNDLE_MONEY = ['purchasePrice', 'salePrice', 'saleFees', 'saleShipping'];
const BUNDLE_DATES = ['purchaseDate', 'saleDate'];

const COST_FIELDS = ['description', 'amount', 'date', 'type', 'category', 'notes'];
const CATEGORY_FIELDS = ['name', 'description', 'color'];

function pick(src, fields) {
  const out = {};
  if (!src || typeof src !== 'object') return out;
  for (const f of fields) {
    if (Object.prototype.hasOwnProperty.call(src, f)) out[f] = src[f] === '' ? null : src[f];
  }
  return out;
}

function cleanMoney(obj, keys) {
  for (const k of keys) {
    if (!(k in obj) || obj[k] == null) continue;
    const n = Number(obj[k]);
    if (!Number.isFinite(n) || n < 0) throw httpError(400, `${k} must be a non-negative number`);
    obj[k] = Math.round(n * 100) / 100;
  }
}

function cleanDates(obj, keys) {
  for (const k of keys) {
    if (!(k in obj) || obj[k] == null) continue;
    const d = toDateOnly(obj[k]);
    if (!d) throw httpError(400, `${k} must be a date (YYYY-MM-DD)`);
    obj[k] = d;
  }
}

async function ownBundle(id, userId, type) {
  const bundle = await Bundle.findOne({ where: { id, userId } });
  if (!bundle) throw httpError(400, `That ${type} bundle doesn't exist`);
  if (bundle.type !== type) throw httpError(400, `That bundle is a ${bundle.type} bundle, not a ${type} bundle`);
  return bundle;
}

// Returns the fields to write for an item create (existing = null) or update.
// Derived rules live here so every caller (form, bundle page, import) gets
// the same behaviour.
async function normalizeItem(body, { userId, existing = null } = {}) {
  const data = pick(body, ITEM_FIELDS);
  cleanMoney(data, ITEM_MONEY);
  cleanDates(data, ITEM_DATES);

  if ('name' in data) {
    data.name = typeof data.name === 'string' ? data.name.trim() : data.name;
    if (!data.name) throw httpError(400, 'Name is required');
  }
  if ('status' in data && !ITEM_STATUSES.includes(data.status)) throw httpError(400, 'Unknown status');
  if ('intent' in data && data.intent != null && !['flip', 'keep'].includes(data.intent)) throw httpError(400, 'Intent must be flip or keep');
  if ('intent' in data && data.intent == null) delete data.intent;
  if ('isListedOnline' in data) data.isListedOnline = !!data.isListedOnline;
  if ('listingUrl' in data && data.listingUrl != null) {
    const url = String(data.listingUrl).trim();
    if (!/^https?:\/\//i.test(url)) throw httpError(400, 'Listing URL must start with http:// or https://');
    data.listingUrl = url;
  }
  if ('metafields' in data && (data.metafields == null || typeof data.metafields !== 'object')) data.metafields = {};

  if (data.categoryId) {
    const cat = await Category.findOne({ where: { id: data.categoryId, userId } });
    if (!cat) throw httpError(400, "That category doesn't exist");
  }

  const merged = { ...(existing ? existing.get({ plain: true }) : {}), ...data };

  // Buy bundle owns purchase cost and date.
  if ('purchaseBundleId' in data) {
    if (data.purchaseBundleId) {
      const bundle = await ownBundle(data.purchaseBundleId, userId, 'buy');
      if (bundle.purchaseDate) data.purchaseDate = bundle.purchaseDate;
    }
    if (!existing || existing.purchaseBundleId !== data.purchaseBundleId) {
      // A weight only means something relative to the bundle it was set in.
      data.costWeight = null;
    }
  }
  if (merged.purchaseBundleId) data.purchasePrice = null;

  if ('saleBundleId' in data && data.saleBundleId) {
    const bundle = await ownBundle(data.saleBundleId, userId, 'sell');
    if (bundle.saleDate) data.saleDate = bundle.saleDate;
  }

  // Status changes clear what no longer applies, so an item moved back to
  // "owned" doesn't keep counting a sale.
  if ('status' in data && (!existing || existing.status !== data.status)) {
    if (data.status === 'owned') {
      Object.assign(data, {
        salePrice: null, saleDate: null, saleLocation: null, saleFees: null, saleShipping: null,
        saleBundleId: null, isListedOnline: false
      });
    } else if (data.status === 'for_sale') {
      Object.assign(data, { salePrice: null, saleDate: null, saleFees: null, saleShipping: null });
      // Keep the date it went up if it was already listed.
    } else if (data.status === 'sold') {
      if (!merged.saleDate && !data.saleDate && !merged.saleBundleId) data.saleDate = today();
      data.isListedOnline = false;
    }
  }

  // Record when it went live so "days listed" means something.
  const listedNow = 'isListedOnline' in data ? data.isListedOnline : merged.isListedOnline;
  if (listedNow && !merged.listedAt && !data.listedAt) data.listedAt = today();

  return data;
}

async function normalizeBundle(body, { existing = null } = {}) {
  const data = pick(body, BUNDLE_FIELDS);
  cleanMoney(data, BUNDLE_MONEY);
  cleanDates(data, BUNDLE_DATES);
  if ('name' in data) {
    data.name = typeof data.name === 'string' ? data.name.trim() : data.name;
    if (!data.name) throw httpError(400, 'Name is required');
  }
  if ('type' in data && !['buy', 'sell'].includes(data.type)) throw httpError(400, 'Type must be buy or sell');
  if ('status' in data && !['active', 'complete'].includes(data.status)) throw httpError(400, 'Status must be active or complete');
  if (existing && 'type' in data && data.type !== existing.type) {
    const { Item } = require('../models');
    const fk = existing.type === 'buy' ? 'purchaseBundleId' : 'saleBundleId';
    const count = await Item.count({ where: { [fk]: existing.id } });
    if (count > 0) throw httpError(400, "Can't change the type of a bundle that has items in it");
  }
  return data;
}

function normalizeCost(body, { create = false } = {}) {
  const data = pick(body, COST_FIELDS);
  if (create || 'amount' in data) {
    const n = Number(data.amount);
    if (!Number.isFinite(n) || n < 0) throw httpError(400, 'Amount must be a non-negative number');
    data.amount = Math.round(n * 100) / 100;
  }
  if ('description' in data) {
    data.description = String(data.description || '').trim();
    if (!data.description) throw httpError(400, 'Description is required');
  }
  if ('type' in data && !['expense', 'income'].includes(data.type)) throw httpError(400, 'Type must be expense or income');
  if ('date' in data) data.date = toDateOnly(data.date) || today();
  if (create && !data.date) data.date = today();
  return data;
}

module.exports = {
  pick, normalizeItem, normalizeBundle, normalizeCost,
  ITEM_FIELDS, BUNDLE_FIELDS, COST_FIELDS, CATEGORY_FIELDS
};
