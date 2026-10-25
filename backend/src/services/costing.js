// The one place that decides what an item cost, what it sold (or should sell)
// for, and what it made. Every endpoint that shows money goes through here;
// the frontend displays these numbers and never recomputes them.
//
// Before this, the same math lived in four places (summary, stats detail,
// bundle stats, three Vue views) and they disagreed — income credits added to
// cost in the list, bundle items showing $0, rebalanced bundles showing the
// even split in one card and the weighted split in the next.
//
// Rules:
//   Cost basis
//     standalone item  → its purchasePrice
//     in a buy bundle  → the bundle price split by costWeight when EVERY item
//                        in the bundle has a weight, otherwise split evenly
//     + additional costs (expenses add, income/credits subtract)
//   Sale
//     in a sell bundle → an even share of the bundle's price, fees, shipping
//     sold             → salePrice − saleFees − saleShipping
//     not sold         → expectedSalePrice (no fees assumed), as an estimate
//   Profit = net sale − total cost, only when there is a sale or an estimate.
const { QueryTypes } = require('sequelize');
const { today, daysBetween } = require('./dates');

const num = (v) => (v == null || v === '' ? 0 : Number(v) || 0);
const has = (v) => v != null && v !== '' && !Number.isNaN(Number(v));
const round2 = (n) => (n == null ? null : Math.round(n * 100) / 100);

// Loads the per-bundle numbers allocation needs, for one user, in two queries.
async function loadContext(sequelize, userId) {
  const buyRows = await sequelize.query(`
    SELECT b.id, b.name, b.purchase_price, b.purchase_date, b.purchase_location,
           COUNT(i.id)::int AS item_count,
           COUNT(i.id) FILTER (WHERE i.cost_weight > 0)::int AS weighted_count,
           COALESCE(SUM(i.cost_weight) FILTER (WHERE i.cost_weight > 0), 0)::float AS weight_sum
    FROM bundles b
    LEFT JOIN items i ON i.purchase_bundle_id = b.id
    WHERE b.user_id = :userId AND b.type = 'buy'
    GROUP BY b.id
  `, { replacements: { userId }, type: QueryTypes.SELECT });

  const sellRows = await sequelize.query(`
    SELECT b.id, b.name, b.sale_price, b.sale_fees, b.sale_shipping, b.sale_date, b.sale_location,
           COUNT(i.id)::int AS item_count
    FROM bundles b
    LEFT JOIN items i ON i.sale_bundle_id = b.id
    WHERE b.user_id = :userId AND b.type = 'sell'
    GROUP BY b.id
  `, { replacements: { userId }, type: QueryTypes.SELECT });

  const buy = new Map();
  for (const r of buyRows) {
    buy.set(r.id, {
      id: r.id,
      name: r.name,
      price: num(r.purchase_price),
      purchaseDate: r.purchase_date,
      purchaseLocation: r.purchase_location,
      itemCount: r.item_count,
      weightedCount: r.weighted_count,
      weightSum: Number(r.weight_sum),
      allocation: allocationMode(r.item_count, r.weighted_count)
    });
  }
  const sell = new Map();
  for (const r of sellRows) {
    sell.set(r.id, {
      id: r.id,
      name: r.name,
      price: has(r.sale_price) ? Number(r.sale_price) : null,
      fees: num(r.sale_fees) + num(r.sale_shipping),
      saleDate: r.sale_date,
      saleLocation: r.sale_location,
      itemCount: r.item_count
    });
  }
  return { buy, sell, today: today() };
}

// 'weighted' — every item has a weight; 'even' — none do; 'partial' — some do,
// which allocates evenly and is flagged in the UI so you can rebalance.
function allocationMode(itemCount, weightedCount) {
  if (!itemCount || !weightedCount) return 'even';
  return weightedCount === itemCount ? 'weighted' : 'partial';
}

function costAdjustments(costs = []) {
  return costs.reduce((sum, c) => sum + (c.type === 'income' ? -num(c.amount) : num(c.amount)), 0);
}

// item: plain object (toJSON) with additionalCosts loaded.
function computeItem(item, ctx) {
  const bundle = item.purchaseBundleId ? ctx.buy.get(item.purchaseBundleId) : null;

  let baseCost;
  let costSource;
  if (bundle) {
    if (bundle.allocation === 'weighted' && bundle.weightSum > 0) {
      baseCost = (bundle.price * num(item.costWeight)) / bundle.weightSum;
      costSource = 'bundle-weighted';
    } else {
      baseCost = bundle.price / Math.max(bundle.itemCount, 1);
      costSource = 'bundle-even';
    }
  } else {
    baseCost = num(item.purchasePrice);
    costSource = 'item';
  }

  const adjustments = costAdjustments(item.additionalCosts);
  const totalCost = baseCost + adjustments;

  const sellBundle = item.saleBundleId ? ctx.sell.get(item.saleBundleId) : null;
  let saleKind = null; // 'sold' | 'expected' | null
  let grossSale = null;
  let saleFees = 0;
  let saleSource = null;

  if (sellBundle && sellBundle.price != null) {
    const n = Math.max(sellBundle.itemCount, 1);
    grossSale = sellBundle.price / n;
    saleFees = sellBundle.fees / n;
    saleKind = item.status === 'sold' ? 'sold' : 'expected';
    saleSource = 'bundle';
  } else if (item.status === 'sold') {
    grossSale = num(item.salePrice);
    saleFees = num(item.saleFees) + num(item.saleShipping);
    saleKind = 'sold';
    saleSource = 'item';
  } else if (has(item.expectedSalePrice) && Number(item.expectedSalePrice) > 0) {
    grossSale = Number(item.expectedSalePrice);
    saleKind = 'expected';
    saleSource = 'expected';
  }

  const netSale = grossSale == null ? null : grossSale - saleFees;
  const profit = netSale == null ? null : netSale - totalCost;
  const roi = profit != null && totalCost > 0 ? profit / totalCost : null;

  const purchaseDate = bundle?.purchaseDate || item.purchaseDate || null;
  const saleDate = sellBundle?.saleDate || item.saleDate || null;
  const endDate = item.status === 'sold' ? (saleDate || ctx.today) : ctx.today;
  const daysHeld = purchaseDate ? Math.max(daysBetween(purchaseDate, endDate), 0) : null;
  const daysListed = item.listedAt && item.status !== 'owned'
    ? Math.max(daysBetween(item.listedAt, endDate), 0)
    : null;

  // What the item is "worth" right now, for collection value: your estimate if
  // you gave one, otherwise what you have in it.
  const hasEstimate = has(item.estimatedValue);
  const currentValue = item.status === 'sold' ? null : (hasEstimate ? Number(item.estimatedValue) : totalCost);

  return {
    baseCost: round2(baseCost),
    costSource,
    allocation: bundle ? bundle.allocation : null,
    adjustments: round2(adjustments),
    totalCost: round2(totalCost),
    saleKind,
    saleSource,
    grossSale: round2(grossSale),
    saleFees: round2(saleFees),
    netSale: round2(netSale),
    profit: round2(profit),
    roi: roi == null ? null : Math.round(roi * 1000) / 1000,
    purchaseDate,
    saleDate,
    daysHeld,
    daysListed,
    currentValue: round2(currentValue),
    valueIsEstimate: hasEstimate
  };
}

function withCosting(items, ctx) {
  return items.map((it) => ({ ...it, costing: computeItem(it, ctx) }));
}

const COUNT_KEYS = new Set(['count', 'listedOnlineCount', 'keeperCount', 'estimatedCount', 'pricedCount']);

// Dashboard numbers, grouped by status.
function summarize(items) {
  const blank = () => ({
    count: 0, listedOnlineCount: 0, keeperCount: 0,
    totalPurchasePrice: 0, totalAdditionalCosts: 0, totalInvestment: 0,
    totalGrossSale: 0, totalFees: 0, totalSalePrice: 0,
    // Profit over just the items that have a sale (sold) or a price (unsold),
    // so an unpriced item doesn't drag "projected profit" down by its cost.
    totalProfit: 0, pricedCount: 0, pricedCost: 0,
    estimatedValue: 0, estimatedCount: 0, currentValue: 0
  });
  const by = { owned: blank(), for_sale: blank(), sold: blank() };

  for (const it of items) {
    const s = by[it.status];
    if (!s) continue;
    const c = it.costing;
    s.count++;
    if (it.isListedOnline) s.listedOnlineCount++;
    if (it.intent === 'keep') s.keeperCount++;
    s.totalPurchasePrice += c.baseCost;
    s.totalAdditionalCosts += c.adjustments;
    s.totalInvestment += c.totalCost;
    if (c.netSale != null && ((it.status === 'sold' && c.saleKind === 'sold') || (it.status !== 'sold' && c.saleKind === 'expected'))) {
      s.totalGrossSale += c.grossSale;
      s.totalFees += c.saleFees;
      s.totalSalePrice += c.netSale;
      s.totalProfit += c.profit;
      s.pricedCost += c.totalCost;
      s.pricedCount++;
    }
    if (c.valueIsEstimate) {
      s.estimatedValue += Number(it.estimatedValue);
      s.estimatedCount++;
    }
    if (c.currentValue != null) s.currentValue += c.currentValue;
  }

  return Object.entries(by)
    .filter(([, d]) => d.count > 0)
    .map(([status, d]) => {
      const out = { status };
      for (const [k, v] of Object.entries(d)) out[k] = COUNT_KEYS.has(k) ? v : round2(v);
      return out;
    });
}

// Bundle-level stats, from that bundle's items (already passed through
// withCosting) and the bundle row.
function bundleStats(bundle, items, ctx) {
  const totalItems = items.length;
  const soldItems = items.filter((i) => i.status === 'sold').length;
  const forSaleItems = items.filter((i) => i.status === 'for_sale').length;
  const ownedItems = items.filter((i) => i.status === 'owned').length;
  const totalAdditionalCosts = items.reduce((s, i) => s + i.costing.adjustments, 0);

  if (bundle.type === 'buy') {
    const info = ctx.buy.get(bundle.id);
    const sold = items.filter((i) => i.status === 'sold');
    const realizedRevenue = sold.reduce((s, i) => s + (i.costing.netSale || 0), 0);
    const realizedCost = sold.reduce((s, i) => s + i.costing.totalCost, 0);
    const withSale = items.filter((i) => i.costing.netSale != null);
    const expectedRevenue = withSale.reduce((s, i) => s + i.costing.netSale, 0);
    const totalCost = num(bundle.purchasePrice) + totalAdditionalCosts;
    // Over priced items only: an item with no asking price yet would otherwise
    // count as a total loss and make a healthy lot look underwater.
    const expectedProfit = withSale.reduce((s, i) => s + i.costing.profit, 0);
    return {
      bundleType: 'buy',
      totalItems, ownedItems, forSaleItems, soldItems,
      unpricedItems: totalItems - withSale.length,
      allocation: info ? info.allocation : 'even',
      purchasePrice: round2(num(bundle.purchasePrice)),
      evenShare: round2(totalItems ? num(bundle.purchasePrice) / totalItems : 0),
      totalAdditionalCosts: round2(totalAdditionalCosts),
      totalCost: round2(totalCost),
      realizedRevenue: round2(realizedRevenue),
      realizedCost: round2(realizedCost),
      realizedProfit: round2(realizedRevenue - realizedCost),
      expectedRevenue: round2(expectedRevenue),
      expectedProfit: round2(expectedProfit),
      expectedMargin: expectedRevenue > 0 ? Math.round((expectedProfit / expectedRevenue) * 1000) / 10 : null,
      // Cost recovered so far, as a share of what the bundle cost in total.
      recoveredPct: totalCost > 0 ? Math.round((realizedRevenue / totalCost) * 1000) / 10 : null,
      isComplete: totalItems > 0 && ownedItems + forSaleItems === 0
    };
  }

  const totalCost = items.reduce((s, i) => s + i.costing.totalCost, 0);
  const gross = has(bundle.salePrice) ? Number(bundle.salePrice) : 0;
  const fees = num(bundle.saleFees) + num(bundle.saleShipping);
  const net = gross - fees;
  return {
    bundleType: 'sell',
    totalItems, ownedItems, forSaleItems, soldItems,
    totalAdditionalCosts: round2(totalAdditionalCosts),
    totalCost: round2(totalCost),
    grossSale: round2(gross),
    saleFees: round2(fees),
    netSale: round2(net),
    profit: round2(net - totalCost),
    roi: totalCost > 0 ? Math.round(((net - totalCost) / totalCost) * 1000) / 1000 : null,
    isComplete: bundle.status === 'complete'
  };
}

module.exports = { loadContext, computeItem, withCosting, summarize, bundleStats, costAdjustments, allocationMode };
