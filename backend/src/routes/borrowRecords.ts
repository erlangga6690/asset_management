import { Router, Request, Response } from 'express';
import { Op, QueryTypes } from 'sequelize';
import db from '../models';

const router = Router();

// GET /api/borrow-records — with borrower & approver info
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, search } = req.query;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;
    const where: any = {};

    if (status) {
      if (status === 'overdue') {
        where.status = 'active';
        where.expectedReturnDate = { [Op.lt]: new Date().toISOString().split('T')[0] };
      } else {
        where.status = status;
      }
    }

    const equipmentWhere: any = {};
    if (search) {
      equipmentWhere.name = { [Op.iLike]: `%${search}%` };
    }

    const { count: total, rows: records } = await db.BorrowRecord.findAndCountAll({
      where,
      include: [
        {
          model: db.Equipment,
          as: 'equipment',
          where: Object.keys(equipmentWhere).length ? equipmentWhere : undefined,
          include: [
            { model: db.User, as: 'picLocation', attributes: ['id', 'name'], required: false },
          ],
        },
        { model: db.User, as: 'user', attributes: ['id', 'name', 'email', 'department'] },
      ],
      limit, offset,
      order: [['createdAt', 'DESC']],
    });

    // Get approver info for each record by finding the associated BorrowRequest
    const recordIds = records.map((r: any) => r.id);
    const borrowRequests = recordIds.length > 0 ? await db.BorrowRequest.findAll({
      where: { borrowRecordId: { [Op.in]: recordIds } },
      include: [{ model: db.User, as: 'picApprover', attributes: ['id', 'name'], required: false }],
    }) : [];

    const approverMap: Record<string, string> = {};
    borrowRequests.forEach((br: any) => {
      if (br.picApprover) approverMap[br.borrowRecordId] = br.picApprover.name;
    });

    const data = records.map((r: any) => ({
      ...r.toJSON(),
      approvedBy: approverMap[r.id] || null,
    }));

    res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/borrow-records/overdue
router.get('/overdue', async (_req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const records = await db.BorrowRecord.findAll({
      where: { status: 'active', expectedReturnDate: { [Op.lt]: today } },
      include: [
        { model: db.Equipment, as: 'equipment' },
        { model: db.User, as: 'user', attributes: ['id', 'name', 'email'] },
      ],
      order: [['expectedReturnDate', 'ASC']],
    });
    res.json({ success: true, data: records });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/borrow-records/reminders-pending
router.get('/reminders-pending', async (_req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const records = await db.BorrowRecord.findAll({
      where: { status: 'active', expectedReturnDate: { [Op.lt]: today }, reminderSent: false },
      include: [
        { model: db.Equipment, as: 'equipment' },
        { model: db.User, as: 'user', attributes: ['id', 'name', 'email'] },
      ],
    });
    res.json({ success: true, data: records });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
