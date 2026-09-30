import { Router, Response } from 'express';
import { Op } from 'sequelize';
import db from '../models';
import { requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/planned-items — list all planned items (approved planned requests)
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { purchased } = req.query;
    const where: any = {};
    if (purchased === 'true') where.purchased = true;
    else if (purchased === 'false') where.purchased = false;

    const items = await db.PlannedItem.findAll({
      where,
      order: [['createdAt', 'DESC']],
      include: [
        { model: db.ConsumableRequest, as: 'request', include: [{ model: db.User, as: 'user', attributes: ['id', 'name'] }] },
      ],
    });

    res.json({ success: true, data: items });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/planned-items/:id/toggle-purchased — mark as purchased/not purchased
router.put('/:id/toggle-purchased', requireRole('admin', 'admin2'), async (req: AuthRequest, res: Response) => {
  try {
    const item = await db.PlannedItem.findByPk(req.params.id as string);
    if (!item) return res.status(404).json({ success: false, message: 'Planned item not found' });

    const newStatus = !item.purchased;
    await item.update({
      purchased: newStatus,
      purchasedAt: newStatus ? new Date() : null,
    });

    res.json({ success: true, data: item, message: newStatus ? 'Marked as purchased' : 'Unmarked as purchased' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
