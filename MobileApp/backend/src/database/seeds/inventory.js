// Seed: Inventory Materials (60 items - all categories & stock scenarios)
// Also: Inventory Movements (100), Purchase Orders (30)
const { v4: uuidv4 } = require('uuid');

module.exports = async function seedInventory(db, { log, helpers, users, orders, ownerId }) {
  const { randomInt, pickRandom, formatDateTime, randomDate, randomFloat } = helpers;

  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());

  // ==================== INVENTORY MATERIALS ====================
  log('Seeding inventory materials (60 items - all categories & stock scenarios)...');
  const materials = [
    // PAPER - Various stock levels
    {
      id: uuidv4(),
      name: 'Art Paper 260gsm White',
      category: 'paper',
      supplier: 'PT. Kertas Nusantara',
      unit_cost: 1500,
      current_stock: 500,
      reorder_level: 100,
      unit: 'lembar',
    },
    {
      id: uuidv4(),
      name: 'Art Paper 260gsm Ivory',
      category: 'paper',
      supplier: 'PT. Kertas Nusantara',
      unit_cost: 1600,
      current_stock: 350,
      reorder_level: 80,
      unit: 'lembar',
    },
    {
      id: uuidv4(),
      name: 'Art Paper 310gsm White',
      category: 'paper',
      supplier: 'PT. Kertas Nusantara',
      unit_cost: 2000,
      current_stock: 400,
      reorder_level: 80,
      unit: 'lembar',
    },
    {
      id: uuidv4(),
      name: 'Duplex 300gsm',
      category: 'paper',
      supplier: 'CV. Paper Indo',
      unit_cost: 1200,
      current_stock: 800,
      reorder_level: 150,
      unit: 'lembar',
    },
    {
      id: uuidv4(),
      name: 'Kraft Paper Brown',
      category: 'paper',
      supplier: 'PT. Kertas Nusantara',
      unit_cost: 900,
      current_stock: 600,
      reorder_level: 120,
      unit: 'lembar',
    },
    {
      id: uuidv4(),
      name: 'Metallic Paper Gold',
      category: 'paper',
      supplier: 'PT. Kertas Premium',
      unit_cost: 4500,
      current_stock: 120,
      reorder_level: 30,
      unit: 'lembar',
    },
    {
      id: uuidv4(),
      name: 'Metallic Paper Silver',
      category: 'paper',
      supplier: 'PT. Kertas Premium',
      unit_cost: 4200,
      current_stock: 100,
      reorder_level: 25,
      unit: 'lembar',
    },
    {
      id: uuidv4(),
      name: 'Texture Paper Premium',
      category: 'paper',
      supplier: 'Special Effects Co',
      unit_cost: 5500,
      current_stock: 3,
      reorder_level: 10,
      unit: 'lembar',
    }, // LOW STOCK
    {
      id: uuidv4(),
      name: 'Recycled Paper Eco',
      category: 'paper',
      supplier: 'CV. Eco Paper',
      unit_cost: 800,
      current_stock: 0,
      reorder_level: 50,
      unit: 'lembar',
    }, // OUT OF STOCK

    // CARDBOARD
    {
      id: uuidv4(),
      name: 'Premium Cardboard 400gsm',
      category: 'cardboard',
      supplier: 'PT. Kertas Premium',
      unit_cost: 3500,
      current_stock: 200,
      reorder_level: 50,
      unit: 'lembar',
    },
    {
      id: uuidv4(),
      name: 'Recycled Cardboard',
      category: 'cardboard',
      supplier: 'CV. Eco Paper',
      unit_cost: 800,
      current_stock: 1000,
      reorder_level: 200,
      unit: 'lembar',
    },
    {
      id: uuidv4(),
      name: 'Black Cardboard 350gsm',
      category: 'cardboard',
      supplier: 'PT. Kertas Premium',
      unit_cost: 2800,
      current_stock: 180,
      reorder_level: 40,
      unit: 'lembar',
    },
    {
      id: uuidv4(),
      name: 'White Cardboard 350gsm',
      category: 'cardboard',
      supplier: 'PT. Kertas Premium',
      unit_cost: 2500,
      current_stock: 5,
      reorder_level: 40,
      unit: 'lembar',
    }, // LOW STOCK
    {
      id: uuidv4(),
      name: 'Navy Cardboard 350gsm',
      category: 'cardboard',
      supplier: 'PT. Kertas Premium',
      unit_cost: 2700,
      current_stock: 0,
      reorder_level: 30,
      unit: 'lembar',
    }, // OUT OF STOCK

    // RIBBON - Various colors and types
    {
      id: uuidv4(),
      name: 'Satin Ribbon Gold 2.5cm',
      category: 'ribbon',
      supplier: 'Ribbon House',
      unit_cost: 500,
      current_stock: 150,
      reorder_level: 30,
      unit: 'meter',
    },
    {
      id: uuidv4(),
      name: 'Satin Ribbon Red 2.5cm',
      category: 'ribbon',
      supplier: 'Ribbon House',
      unit_cost: 450,
      current_stock: 200,
      reorder_level: 40,
      unit: 'meter',
    },
    {
      id: uuidv4(),
      name: 'Satin Ribbon Navy 2.5cm',
      category: 'ribbon',
      supplier: 'Ribbon House',
      unit_cost: 450,
      current_stock: 180,
      reorder_level: 35,
      unit: 'meter',
    },
    {
      id: uuidv4(),
      name: 'Satin Ribbon White 2.5cm',
      category: 'ribbon',
      supplier: 'Ribbon House',
      unit_cost: 420,
      current_stock: 250,
      reorder_level: 50,
      unit: 'meter',
    },
    {
      id: uuidv4(),
      name: 'Satin Ribbon Black 2.5cm',
      category: 'ribbon',
      supplier: 'Ribbon House',
      unit_cost: 450,
      current_stock: 220,
      reorder_level: 45,
      unit: 'meter',
    },
    {
      id: uuidv4(),
      name: 'Velvet Ribbon Rose Gold 2cm',
      category: 'ribbon',
      supplier: 'Premium Ribbon Co',
      unit_cost: 850,
      current_stock: 80,
      reorder_level: 20,
      unit: 'meter',
    },
    {
      id: uuidv4(),
      name: 'Grosgrain Ribbon White 3cm',
      category: 'ribbon',
      supplier: 'Ribbon House',
      unit_cost: 400,
      current_stock: 250,
      reorder_level: 50,
      unit: 'meter',
    },
    {
      id: uuidv4(),
      name: 'Organza Ribbon Pink 4cm',
      category: 'ribbon',
      supplier: 'Premium Ribbon Co',
      unit_cost: 600,
      current_stock: 120,
      reorder_level: 25,
      unit: 'meter',
    },
    {
      id: uuidv4(),
      name: 'Metallic Ribbon Gold 2cm',
      category: 'ribbon',
      supplier: 'Premium Ribbon Co',
      unit_cost: 750,
      current_stock: 60,
      reorder_level: 15,
      unit: 'meter',
    },
    {
      id: uuidv4(),
      name: 'Lace Ribbon Cream 5cm',
      category: 'ribbon',
      supplier: 'Premium Ribbon Co',
      unit_cost: 1200,
      current_stock: 8,
      reorder_level: 10,
      unit: 'meter',
    }, // LOW STOCK
    {
      id: uuidv4(),
      name: 'Silk Ribbon Premium',
      category: 'ribbon',
      supplier: 'Premium Ribbon Co',
      unit_cost: 1500,
      current_stock: 0,
      reorder_level: 15,
      unit: 'meter',
    }, // OUT OF STOCK

    // FABRIC
    {
      id: uuidv4(),
      name: 'Velvet Fabric Black',
      category: 'fabric',
      supplier: 'Textile World',
      unit_cost: 5000,
      current_stock: 100,
      reorder_level: 25,
      unit: 'meter',
    },
    {
      id: uuidv4(),
      name: 'Velvet Fabric Navy',
      category: 'fabric',
      supplier: 'Textile World',
      unit_cost: 5000,
      current_stock: 80,
      reorder_level: 20,
      unit: 'meter',
    },
    {
      id: uuidv4(),
      name: 'Velvet Fabric Burgundy',
      category: 'fabric',
      supplier: 'Textile World',
      unit_cost: 5200,
      current_stock: 60,
      reorder_level: 15,
      unit: 'meter',
    },
    {
      id: uuidv4(),
      name: 'Satin Fabric Cream',
      category: 'fabric',
      supplier: 'Textile World',
      unit_cost: 3500,
      current_stock: 150,
      reorder_level: 30,
      unit: 'meter',
    },
    {
      id: uuidv4(),
      name: 'Satin Fabric White',
      category: 'fabric',
      supplier: 'Textile World',
      unit_cost: 3200,
      current_stock: 180,
      reorder_level: 35,
      unit: 'meter',
    },
    {
      id: uuidv4(),
      name: 'Silk Fabric Premium',
      category: 'fabric',
      supplier: 'Textile World',
      unit_cost: 15000,
      current_stock: 2,
      reorder_level: 5,
      unit: 'meter',
    }, // LOW STOCK

    // ACCESSORIES
    {
      id: uuidv4(),
      name: 'Cardboard Divider Set',
      category: 'accessories',
      supplier: 'Box Supplies Co',
      unit_cost: 2000,
      current_stock: 200,
      reorder_level: 40,
      unit: 'set',
    },
    {
      id: uuidv4(),
      name: 'Pearl Accent Beads',
      category: 'accessories',
      supplier: 'Bead Paradise',
      unit_cost: 150,
      current_stock: 500,
      reorder_level: 100,
      unit: 'pcs',
    },
    {
      id: uuidv4(),
      name: 'Crystal Accent Beads',
      category: 'accessories',
      supplier: 'Bead Paradise',
      unit_cost: 250,
      current_stock: 300,
      reorder_level: 60,
      unit: 'pcs',
    },
    {
      id: uuidv4(),
      name: 'Magnetic Closure Gold',
      category: 'accessories',
      supplier: 'Hardware Pro',
      unit_cost: 3000,
      current_stock: 80,
      reorder_level: 20,
      unit: 'set',
    },
    {
      id: uuidv4(),
      name: 'Magnetic Closure Silver',
      category: 'accessories',
      supplier: 'Hardware Pro',
      unit_cost: 2800,
      current_stock: 100,
      reorder_level: 25,
      unit: 'set',
    },
    {
      id: uuidv4(),
      name: 'Hinges Brass Small',
      category: 'accessories',
      supplier: 'Hardware Pro',
      unit_cost: 1500,
      current_stock: 150,
      reorder_level: 30,
      unit: 'pair',
    },
    {
      id: uuidv4(),
      name: 'Lock Clasp Premium',
      category: 'accessories',
      supplier: 'Hardware Pro',
      unit_cost: 5000,
      current_stock: 4,
      reorder_level: 10,
      unit: 'pcs',
    }, // LOW STOCK
    {
      id: uuidv4(),
      name: 'Decorative Corner Gold',
      category: 'accessories',
      supplier: 'Hardware Pro',
      unit_cost: 2000,
      current_stock: 0,
      reorder_level: 20,
      unit: 'set',
    }, // OUT OF STOCK

    // PACKAGING
    {
      id: uuidv4(),
      name: 'Gold Foil Roll',
      category: 'packaging',
      supplier: 'Foil Masters',
      unit_cost: 150000,
      current_stock: 15,
      reorder_level: 5,
      unit: 'roll',
    },
    {
      id: uuidv4(),
      name: 'Silver Foil Roll',
      category: 'packaging',
      supplier: 'Foil Masters',
      unit_cost: 120000,
      current_stock: 12,
      reorder_level: 4,
      unit: 'roll',
    },
    {
      id: uuidv4(),
      name: 'Rose Gold Foil Roll',
      category: 'packaging',
      supplier: 'Foil Masters',
      unit_cost: 180000,
      current_stock: 2,
      reorder_level: 5,
      unit: 'roll',
    }, // LOW STOCK
    {
      id: uuidv4(),
      name: 'UV Varnish',
      category: 'packaging',
      supplier: 'Print Supplies ID',
      unit_cost: 250000,
      current_stock: 8,
      reorder_level: 3,
      unit: 'liter',
    },
    {
      id: uuidv4(),
      name: 'Matte Lamination Film',
      category: 'packaging',
      supplier: 'Print Supplies ID',
      unit_cost: 85000,
      current_stock: 20,
      reorder_level: 5,
      unit: 'roll',
    },
    {
      id: uuidv4(),
      name: 'Gloss Lamination Film',
      category: 'packaging',
      supplier: 'Print Supplies ID',
      unit_cost: 75000,
      current_stock: 18,
      reorder_level: 5,
      unit: 'roll',
    },
    {
      id: uuidv4(),
      name: 'Holographic Film',
      category: 'packaging',
      supplier: 'Special Effects Co',
      unit_cost: 350000,
      current_stock: 0,
      reorder_level: 2,
      unit: 'roll',
    }, // OUT OF STOCK
    {
      id: uuidv4(),
      name: 'Soft Touch Lamination',
      category: 'packaging',
      supplier: 'Print Supplies ID',
      unit_cost: 120000,
      current_stock: 6,
      reorder_level: 3,
      unit: 'roll',
    },

    // TOOLS
    {
      id: uuidv4(),
      name: 'Embossing Die Custom',
      category: 'tools',
      supplier: 'Die Cut Pro',
      unit_cost: 500000,
      current_stock: 1,
      reorder_level: 3,
      unit: 'pcs',
    }, // LOW STOCK
    {
      id: uuidv4(),
      name: 'Cutting Blade Set',
      category: 'tools',
      supplier: 'Tools Pro',
      unit_cost: 25000,
      current_stock: 50,
      reorder_level: 10,
      unit: 'set',
    },
    {
      id: uuidv4(),
      name: 'Scoring Tool',
      category: 'tools',
      supplier: 'Tools Pro',
      unit_cost: 15000,
      current_stock: 30,
      reorder_level: 8,
      unit: 'pcs',
    },
    {
      id: uuidv4(),
      name: 'Bone Folder',
      category: 'tools',
      supplier: 'Tools Pro',
      unit_cost: 8000,
      current_stock: 45,
      reorder_level: 10,
      unit: 'pcs',
    },
    {
      id: uuidv4(),
      name: 'Corner Punch',
      category: 'tools',
      supplier: 'Tools Pro',
      unit_cost: 35000,
      current_stock: 12,
      reorder_level: 5,
      unit: 'pcs',
    },
    {
      id: uuidv4(),
      name: 'Hot Glue Gun Industrial',
      category: 'tools',
      supplier: 'Tools Pro',
      unit_cost: 150000,
      current_stock: 0,
      reorder_level: 2,
      unit: 'pcs',
    }, // OUT OF STOCK

    // HIGH VALUE ITEMS
    {
      id: uuidv4(),
      name: 'Leather Premium Italian',
      category: 'fabric',
      supplier: 'Leather Imports',
      unit_cost: 500000,
      current_stock: 10,
      reorder_level: 3,
      unit: 'sqm',
    },
    {
      id: uuidv4(),
      name: 'Crystal Swarovski Set',
      category: 'accessories',
      supplier: 'Crystal Imports',
      unit_cost: 250000,
      current_stock: 20,
      reorder_level: 5,
      unit: 'set',
    },
    {
      id: uuidv4(),
      name: '24K Gold Leaf',
      category: 'accessories',
      supplier: 'Gold Supplies',
      unit_cost: 1000000,
      current_stock: 5,
      reorder_level: 2,
      unit: 'book',
    },

    // VERY LOW COST ITEMS (for bulk testing)
    {
      id: uuidv4(),
      name: 'Tissue Paper White',
      category: 'packaging',
      supplier: 'Paper Supplies',
      unit_cost: 100,
      current_stock: 5000,
      reorder_level: 1000,
      unit: 'lembar',
    },
    {
      id: uuidv4(),
      name: 'Price Tag String',
      category: 'accessories',
      supplier: 'Supplies Co',
      unit_cost: 50,
      current_stock: 10000,
      reorder_level: 2000,
      unit: 'pcs',
    },
  ];

  const insertMaterial = db.prepare(
    `INSERT INTO inventory_materials (id, name, category, supplier, unit_cost, current_stock, reorder_level, unit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  materials.forEach((m) =>
    insertMaterial.run(
      m.id,
      m.name,
      m.category,
      m.supplier,
      m.unit_cost,
      m.current_stock,
      m.reorder_level,
      m.unit
    )
  );
  log(`   Created ${materials.length} inventory materials`);

  // ==================== INVENTORY MOVEMENTS ====================
  log('Seeding inventory movements (100 movements)...');
  const movementTypes = ['purchase', 'usage', 'adjustment', 'waste', 'sale'];
  const movements = [];

  for (let i = 0; i < 100; i++) {
    const material = pickRandom(materials);
    const type = pickRandom(movementTypes);
    const quantity = type === 'purchase' ? randomInt(10, 200) : randomInt(1, 50);
    const order =
      ['usage', 'sale'].includes(type) && Math.random() > 0.3 ? pickRandom(orders) : null;

    movements.push({
      id: uuidv4(),
      type: type,
      item_id: material.id,
      item_type: 'material',
      quantity: quantity,
      unit_cost: material.unit_cost,
      total_cost: quantity * material.unit_cost,
      reason: `${type} - ${material.name}`,
      order_id: order ? order.id : null,
      notes: Math.random() > 0.7 ? `Note for movement ${i + 1}` : null,
      created_by: pickRandom(users.filter((u) => u.is_active)).id,
    });
  }

  const insertMovement = db.prepare(
    `INSERT INTO inventory_movements (id, type, item_id, item_type, quantity, unit_cost, total_cost, reason, order_id, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  movements.forEach((m) =>
    insertMovement.run(
      m.id,
      m.type,
      m.item_id,
      m.item_type,
      m.quantity,
      m.unit_cost,
      m.total_cost,
      m.reason,
      m.order_id,
      m.notes,
      m.created_by
    )
  );
  log(`   Created ${movements.length} inventory movements`);

  // ==================== PURCHASE ORDERS ====================
  log('Seeding purchase orders (30 purchase orders - all statuses)...');
  const poStatuses = ['pending', 'ordered', 'received', 'cancelled'];
  const purchaseOrders = [];

  for (let i = 1; i <= 30; i++) {
    const items = [];
    const itemCount = randomInt(1, 8);
    let totalAmount = 0;

    for (let j = 0; j < itemCount; j++) {
      const material = pickRandom(materials);
      const qty = randomInt(10, 200);
      const cost = material.unit_cost * qty;
      totalAmount += cost;
      items.push({
        material_id: material.id,
        name: material.name,
        quantity: qty,
        unit_cost: material.unit_cost,
        total: cost,
      });
    }

    const status = pickRandom(poStatuses);
    const createdDate = randomDate(sixMonthsAgo, now);
    const expectedDelivery = new Date(
      createdDate.getTime() + randomInt(7, 30) * 24 * 60 * 60 * 1000
    );

    purchaseOrders.push({
      id: uuidv4(),
      po_number: `PO-${String(i).padStart(4, '0')}`,
      supplier: pickRandom([
        'PT. Kertas Nusantara',
        'Ribbon House',
        'Textile World',
        'Hardware Pro',
        'Foil Masters',
        'Box Supplies Co',
        'Premium Ribbon Co',
      ]),
      items: JSON.stringify(items),
      total_amount: totalAmount,
      status: status,
      expected_delivery: formatDateTime(expectedDelivery),
      received_date:
        status === 'received'
          ? formatDateTime(
              new Date(expectedDelivery.getTime() + randomInt(-3, 5) * 24 * 60 * 60 * 1000)
            )
          : null,
      notes: Math.random() > 0.7 ? `PO Note ${i}` : null,
      created_by: ownerId,
    });
  }

  const insertPO = db.prepare(
    `INSERT INTO purchase_orders (id, po_number, supplier, items, total_amount, status, expected_delivery, received_date, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  purchaseOrders.forEach((po) =>
    insertPO.run(
      po.id,
      po.po_number,
      po.supplier,
      po.items,
      po.total_amount,
      po.status,
      po.expected_delivery,
      po.received_date,
      po.notes,
      po.created_by
    )
  );
  log(`   Created ${purchaseOrders.length} purchase orders`);

  return { materials, movements, purchaseOrders };
};
