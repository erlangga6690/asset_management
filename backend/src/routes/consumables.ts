import { Router, Response } from 'express';
import { Op } from 'sequelize';
import * as XLSX from 'xlsx';
import db from '../models';
import { requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /export — export to Excel (must be before /:id)
router.get('/export', async (_req: AuthRequest, res: Response) => {
  try {
    const consumables = await db.Consumable.findAll({ order: [['name', 'ASC']] });
    const data = consumables.map((c: any) => [
      c.name, c.brand || '', c.stock.toString(), c.price ? Number(c.price).toString() : '',
      c.supplier || '', c.photo || '', c.description || '',
    ]);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([['Nama','Merek','Stok','Harga','Supplier','Foto URL','Deskripsi'], ...data]);
    ws['!cols'] = [{wch:30},{wch:20},{wch:8},{wch:12},{wch:25},{wch:30},{wch:30}];
    XLSX.utils.book_append_sheet(wb, ws, 'Consumables');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="consumables_${new Date().toISOString().split('T')[0]}.xlsx"`);
    res.send(buf);
  } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
});

// GET — any authenticated user
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { search, lowStock } = req.query;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { brand: { [Op.iLike]: `%${search}%` } },
        { supplier: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (lowStock === 'true') {
      where.stock = { [Op.lte]: 5 };
    }

    const { count: total, rows: consumables } = await db.Consumable.findAndCountAll({
      where, order: [['name', 'ASC']], limit, offset,
    });
    res.json({ success: true, data: consumables, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const consumable = await db.Consumable.findByPk(req.params.id as string, {
      include: [{ model: db.StockMovement, as: 'stockMovements', limit: 20, order: [['createdAt', 'DESC']] }],
    });
    if (!consumable) return res.status(404).json({ success: false, message: 'Consumable not found' });
    res.json({ success: true, data: consumable });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST — admin only
router.post('/', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const consumable = await db.Consumable.create(req.body);
    res.status(201).json({ success: true, data: consumable });
  } catch (error: any) {
    if (error.name === 'SequelizeValidationError')
      return res.status(400).json({ success: false, message: error.errors.map((e: any) => e.message).join(', ') });
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT — admin only
router.put('/:id', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const consumable = await db.Consumable.findByPk(req.params.id as string);
    if (!consumable) return res.status(404).json({ success: false, message: 'Consumable not found' });
    await consumable.update(req.body);
    res.json({ success: true, data: consumable });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE — admin only
router.delete('/:id', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const consumable = await db.Consumable.findByPk(req.params.id as string);
    if (!consumable) return res.status(404).json({ success: false, message: 'Consumable not found' });
    await consumable.destroy();
    res.json({ success: true, message: 'Consumable deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Restock — admin only
router.post('/:id/restock', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { quantity, notes } = req.body;
    const addQty = parseInt(quantity);
    if (!addQty || addQty <= 0)
      return res.status(400).json({ success: false, message: 'Quantity must be a positive number' });

    const consumable = await db.Consumable.findByPk(req.params.id as string);
    if (!consumable) return res.status(404).json({ success: false, message: 'Consumable not found' });

    const previousStock = consumable.stock;
    const newStock = previousStock + addQty;

    await consumable.update({ stock: newStock });

    await db.StockMovement.create({
      consumableId: consumable.id,
      changeType: 'restock',
      quantityChange: addQty,
      previousStock,
      newStock,
      notes: notes || null,
      performedBy: req.user!.name,
    });

    res.json({
      success: true,
      data: { consumable, previousStock, newStock },
      message: `Added ${addQty} units. Stock: ${previousStock} → ${newStock}`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id/stock-movements', async (req: AuthRequest, res: Response) => {
  try {
    const { limit } = req.query;
    const movements = await db.StockMovement.findAll({
      where: { consumableId: req.params.id as string },
      order: [['createdAt', 'DESC']],
      limit: Math.min(100, parseInt(limit as string) || 50),
    });
    res.json({ success: true, data: movements });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
