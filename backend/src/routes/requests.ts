import { Router, Response } from 'express';
import db from '../models';
import { requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// GET — list (users see own, admin/admin2 see all)
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { status, userId } = req.query;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (req.user!.role === 'user') where.userId = req.user!.id;
    else if (userId) where.userId = userId;

    const { count: total, rows: requests } = await db.ConsumableRequest.findAndCountAll({
      where, order: [['createdAt', 'DESC']], limit, offset,
      include: [
        { model: db.User, as: 'user', attributes: ['id', 'name', 'email', 'department'] },
        { model: db.ConsumableRequestItem, as: 'items', include: [{ model: db.Consumable, as: 'consumable' }] },
        { model: db.User, as: 'adminApprover', attributes: ['id', 'name'], required: false },
        { model: db.User, as: 'admin2Approver', attributes: ['id', 'name'], required: false },
      ],
    });
    res.json({ success: true, data: requests, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const request = await db.ConsumableRequest.findByPk(req.params.id as string, {
      include: [
        { model: db.User, as: 'user', attributes: ['id', 'name', 'email', 'department'] },
        { model: db.ConsumableRequestItem, as: 'items', include: [{ model: db.Consumable, as: 'consumable' }] },
        { model: db.User, as: 'adminApprover', attributes: ['id', 'name'], required: false },
        { model: db.User, as: 'admin2Approver', attributes: ['id', 'name'], required: false },
        { model: db.User, as: 'rejector', attributes: ['id', 'name'], required: false },
      ],
    });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (req.user!.role === 'user' && request.userId !== req.user!.id)
      return res.status(403).json({ success: false, message: 'Access denied' });
    res.json({ success: true, data: request });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /user/me/draft
router.get('/user/me/draft', async (req: AuthRequest, res: Response) => {
  try {
    const draft = await db.ConsumableRequest.findOne({
      where: { userId: req.user!.id, status: 'draft' },
      include: [
        { model: db.ConsumableRequestItem, as: 'items', include: [{ model: db.Consumable, as: 'consumable' }] },
      ],
    });
    res.json({ success: true, data: draft });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /cart/add
router.post('/cart/add', async (req: AuthRequest, res: Response) => {
  try {
    const { consumableId, quantity, customName, customBrand, customPrice } = req.body;
    const userId = req.user!.id;

    // Planned items: store as cart items with custom fields in notes
    if (customName) {
      if (!customName || !quantity || quantity < 1)
        return res.status(400).json({ success: false, message: 'Custom name and quantity required' });

      let [draft] = await db.ConsumableRequest.findOrCreate({
        where: { userId, status: 'draft' },
        defaults: { userId, status: 'draft', requestType: 'planned' },
      });
      // Store custom item data as a JSON note on the item
      // We use a fake consumable lookup or create a placeholder
      // Better: use the consumableId as null and store data in a note field
      // But ConsumableRequestItem requires a consumableId FK
      // Workaround: find or create a "planned" consumable placeholder
      let [placeholder] = await db.Consumable.findOrCreate({
        where: { name: '[PLANNED] ' + customName },
        defaults: {
          name: '[PLANNED] ' + customName,
          stock: 0,
          brand: customBrand || null,
          price: customPrice ? parseFloat(customPrice) : null,
          description: JSON.stringify({ isPlanned: true, originalName: customName }),
        },
      });

      const existing = await db.ConsumableRequestItem.findOne({ where: { requestId: draft.id, consumableId: placeholder.id } });
      if (existing) await existing.update({ quantity: existing.quantity + quantity });
      else await db.ConsumableRequestItem.create({ requestId: draft.id, consumableId: placeholder.id, quantity });

      const result = await db.ConsumableRequest.findByPk(draft.id, {
        include: [{ model: db.ConsumableRequestItem, as: 'items', include: [{ model: db.Consumable, as: 'consumable' }] }],
      });
      return res.json({ success: true, data: result, message: 'Planned item added to cart' });
    }

    // Regular item from stock
    if (!consumableId || !quantity || quantity < 1)
      return res.status(400).json({ success: false, message: 'consumableId and quantity required' });

    let [draft] = await db.ConsumableRequest.findOrCreate({
      where: { userId, status: 'draft' },
      defaults: { userId, status: 'draft', requestType: 'immediate' },
    });

    const existing = await db.ConsumableRequestItem.findOne({ where: { requestId: draft.id, consumableId } });
    if (existing) await existing.update({ quantity: existing.quantity + quantity });
    else await db.ConsumableRequestItem.create({ requestId: draft.id, consumableId, quantity });

    const result = await db.ConsumableRequest.findByPk(draft.id, {
      include: [{ model: db.ConsumableRequestItem, as: 'items', include: [{ model: db.Consumable, as: 'consumable' }] }],
    });
    res.json({ success: true, data: result, message: 'Item added to cart' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /cart/remove
router.post('/cart/remove', async (req: AuthRequest, res: Response) => {
  try {
    const { itemId } = req.body;
    const item = await db.ConsumableRequestItem.findByPk(itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Cart item not found' });
    const request = await db.ConsumableRequest.findByPk(item.requestId);
    if (!request || request.userId !== req.user!.id)
      return res.status(403).json({ success: false, message: 'Access denied' });
    await item.destroy();
    res.json({ success: true, message: 'Item removed from cart' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /cart/update
router.post('/cart/update', async (req: AuthRequest, res: Response) => {
  try {
    const { itemId, quantity } = req.body;
    if (!quantity || quantity < 1) return res.status(400).json({ success: false, message: 'Quantity must be >= 1' });
    const item = await db.ConsumableRequestItem.findByPk(itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Cart item not found' });
    const request = await db.ConsumableRequest.findByPk(item.requestId);
    if (!request || request.userId !== req.user!.id)
      return res.status(403).json({ success: false, message: 'Access denied' });
    await item.update({ quantity });
    res.json({ success: true, data: item });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /:id/submit
router.post('/:id/submit', async (req: AuthRequest, res: Response) => {
  try {
    const request = await db.ConsumableRequest.findByPk(req.params.id as string, {
      include: [{ model: db.ConsumableRequestItem, as: 'items' }],
    });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.userId !== req.user!.id) return res.status(403).json({ success: false, message: 'Access denied' });
    if (request.status !== 'draft') return res.status(400).json({ success: false, message: 'Only draft requests can be submitted' });

    const items = (request as any).items || [];
    if (items.length === 0) return res.status(400).json({ success: false, message: 'Cart is empty' });

    const { notes, requestType } = req.body;
    const type = requestType || 'immediate';

    // Validate stock for immediate requests
    if (type === 'immediate') {
      for (const item of items) {
        const consumable = await db.Consumable.findByPk(item.consumableId);
        if (!consumable) return res.status(400).json({ success: false, message: 'Consumable not found' });
        if (consumable.stock < item.quantity)
          return res.status(400).json({ success: false, message: `Insufficient stock for "${consumable.name}"` });
      }
    }

    await request.update({ status: 'pending_admin', notes: notes || request.notes, requestType: type });

    const result = await db.ConsumableRequest.findByPk(request.id, {
      include: [
        { model: db.User, as: 'user', attributes: ['id', 'name', 'email'] },
        { model: db.ConsumableRequestItem, as: 'items', include: [{ model: db.Consumable, as: 'consumable' }] },
      ],
    });

    res.json({ success: true, data: result, message: type === 'planned' ? 'Submitted. Needs 2 approvals (Admin + Pak Amri).' : 'Submitted. Needs 1 admin approval.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /:id/approve-admin — admin: immediate→approved+reduce stock, planned→pending_admin2
router.post('/:id/approve-admin', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const request = await db.ConsumableRequest.findByPk(req.params.id as string, {
      include: [{ model: db.ConsumableRequestItem, as: 'items' }],
    });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status !== 'pending_admin')
      return res.status(400).json({ success: false, message: `Cannot approve. Status: ${request.status}` });

    if (request.requestType === 'immediate') {
      // Reduce stock immediately
      const items = (request as any).items || [];
      for (const item of items) {
        const consumable = await db.Consumable.findByPk(item.consumableId);
        if (!consumable) continue;
        const prevStock = consumable.stock;
        const newStock = Math.max(0, prevStock - item.quantity);
        await consumable.update({ stock: newStock });
        await db.StockMovement.create({
          consumableId: consumable.id, changeType: 'consumption',
          quantityChange: item.quantity, previousStock: prevStock, newStock,
          notes: `Approved request #${request.id}`, performedBy: req.user!.name, requestId: request.id,
        });
      }
      await request.update({ status: 'approved', adminApprovedBy: req.user!.id, adminApprovedAt: new Date() });

      const result = await db.ConsumableRequest.findByPk(request.id, {
        include: [
          { model: db.User, as: 'user', attributes: ['id', 'name', 'email'] },
          { model: db.ConsumableRequestItem, as: 'items', include: [{ model: db.Consumable, as: 'consumable' }] },
          { model: db.User, as: 'adminApprover', attributes: ['id', 'name'], required: false },
        ],
      });
      return res.json({ success: true, data: result, message: 'Approved. Stock reduced.' });
    }

    // Planned: → pending_admin2
    await request.update({ status: 'pending_admin2', adminApprovedBy: req.user!.id, adminApprovedAt: new Date() });

    const result = await db.ConsumableRequest.findByPk(request.id, {
      include: [
        { model: db.User, as: 'user', attributes: ['id', 'name', 'email'] },
        { model: db.ConsumableRequestItem, as: 'items', include: [{ model: db.Consumable, as: 'consumable' }] },
        { model: db.User, as: 'adminApprover', attributes: ['id', 'name'], required: false },
      ],
    });
    res.json({ success: true, data: result, message: 'Admin approved. Waiting for admin 2 (Pak Amri) for planned purchase.' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /:id/approve-admin2 — admin2 only (for planned requests)
router.post('/:id/approve-admin2', requireRole('admin2', 'admin'), async (req: AuthRequest, res: Response) => {
  try {
    const request = await db.ConsumableRequest.findByPk(req.params.id as string, {
      include: [{ model: db.ConsumableRequestItem, as: 'items' }],
    });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status !== 'pending_admin2')
      return res.status(400).json({ success: false, message: `Cannot approve. Status: ${request.status}` });

    await request.update({ status: 'approved', admin2ApprovedBy: req.user!.id, admin2ApprovedAt: new Date() });

    // Create PlannedItem records for planned requests
    if (request.requestType === 'planned') {
      const plannedItems = (request as any).items || [];
      for (const item of plannedItems) {
        const consumable = await db.Consumable.findByPk(item.consumableId);
        const desc = consumable?.description ? JSON.parse(consumable.description) : {};
        await db.PlannedItem.create({
          requestId: request.id,
          name: desc.isPlanned ? desc.originalName : consumable?.name || 'Unknown',
          brand: consumable?.brand || null,
          quantity: item.quantity,
          estimatedPrice: consumable?.price ? Number(consumable.price) : null,
          purchased: false,
        });
      }
    }

    const result = await db.ConsumableRequest.findByPk(request.id, {
      include: [
        { model: db.User, as: 'user', attributes: ['id', 'name', 'email'] },
        { model: db.ConsumableRequestItem, as: 'items', include: [{ model: db.Consumable, as: 'consumable' }] },
        { model: db.User, as: 'adminApprover', attributes: ['id', 'name'], required: false },
        { model: db.User, as: 'admin2Approver', attributes: ['id', 'name'], required: false },
      ],
    });
    res.json({ success: true, data: result, message: 'Fully approved (planned purchase).' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /:id/reject
router.post('/:id/reject', requireRole('admin', 'admin2'), async (req: AuthRequest, res: Response) => {
  try {
    const { reason } = req.body;
    const request = await db.ConsumableRequest.findByPk(req.params.id as string);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (request.status === 'approved' || request.status === 'draft')
      return res.status(400).json({ success: false, message: `Cannot reject status: ${request.status}` });

    await request.update({ status: 'rejected', rejectedBy: req.user!.id, rejectedAt: new Date(), rejectionReason: reason || null });

    const result = await db.ConsumableRequest.findByPk(request.id, {
      include: [
        { model: db.User, as: 'user', attributes: ['id', 'name', 'email'] },
        { model: db.ConsumableRequestItem, as: 'items', include: [{ model: db.Consumable, as: 'consumable' }] },
        { model: db.User, as: 'rejector', attributes: ['id', 'name'], required: false },
      ],
    });
    res.json({ success: true, data: result, message: 'Request rejected' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
