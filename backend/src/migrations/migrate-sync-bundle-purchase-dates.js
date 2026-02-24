const { Item, Bundle } = require('../models');

async function migrate() {
  try {
    console.log('Starting migration: Sync item purchase dates and sale dates from bundles...');
    
    // Find all items that are in purchase bundles
    const purchaseItems = await Item.findAll({
      where: {
        purchaseBundleId: { [require('sequelize').Op.ne]: null }
      },
      include: [
        { model: Bundle, as: 'purchaseBundle', attributes: ['id', 'purchaseDate'] }
      ]
    });
    
    console.log(`Found ${purchaseItems.length} items in purchase bundles`);
    
    let purchaseUpdated = 0;
    for (const item of purchaseItems) {
      if (item.purchaseBundle && item.purchaseBundle.purchaseDate) {
        // Update item's purchaseDate to match bundle's purchaseDate
        await item.update({ 
          purchaseDate: item.purchaseBundle.purchaseDate 
        });
        purchaseUpdated++;
      }
    }
    
    console.log(`Updated ${purchaseUpdated} items with bundle purchase dates`);
    
    // Find all items that are in sale bundles
    const saleItems = await Item.findAll({
      where: {
        saleBundleId: { [require('sequelize').Op.ne]: null }
      },
      include: [
        { model: Bundle, as: 'saleBundle', attributes: ['id', 'saleDate'] }
      ]
    });
    
    console.log(`Found ${saleItems.length} items in sale bundles`);
    
    let saleUpdated = 0;
    for (const item of saleItems) {
      if (item.saleBundle && item.saleBundle.saleDate) {
        // Update item's saleDate to match bundle's saleDate
        await item.update({ 
          saleDate: item.saleBundle.saleDate 
        });
        saleUpdated++;
      }
    }
    
    console.log(`Updated ${saleUpdated} items with bundle sale dates`);
    console.log(`Migration complete: Updated ${purchaseUpdated} purchase dates and ${saleUpdated} sale dates`);
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Allow running directly or as a module
if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { migrate };
