import { Router, Request, Response } from 'express';
import { Op, fn, literal, QueryTypes } from 'sequelize';
import db from '../models';

const router = Router();

// ── Investment Dashboard (Equipment) ─────────────────────────────────────────

router.get('/investment', async (_req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [
      totalEquipment,
      availableCount,
      borrowedCount,
      maintenanceCount,
      retiredCount,
      activeBorrows,
      overdueCount,
      totalValueResult,
      thisMonthBorrows,
      thisMonthReturns,
      recentBorrows,
      overdueRecords,
      topBorrowersRaw,
      activeByDeptRaw,
    ] = await Promise.all([
      db.Equipment.count(),
      db.Equipment.count({ where: { status: 'available' } }),
      db.Equipment.count({ where: { status: 'borrowed' } }),
      db.Equipment.count({ where: { status: 'maintenance' } }),
      db.Equipment.count({ where: { status: 'retired' } }),
      db.BorrowRecord.count({ where: { status: 'active' } }),
      db.BorrowRecord.count({ where: { status: 'active', expectedReturnDate: { [Op.lt]: today } } }),
      db.Equipment.findOne({
        attributes: [[fn('COALESCE', fn('SUM', literal('price')), 0), 'totalValue']],
        raw: true,
      }),
      db.BorrowRecord.count({ where: { createdAt: { [Op.gte]: monthStart } } }),
      db.BorrowRecord.count({ where: { status: 'returned', actualReturnDate: { [Op.gte]: monthStart } } }),
      db.BorrowRecord.findAll({
        limit: 10,
        order: [['createdAt', 'DESC']],
        include: [
          { model: db.Equipment, as: 'equipment', attributes: ['name', 'assetTag'] },
          { model: db.User, as: 'user', attributes: ['name', 'email', 'companyId'] },
        ],
      }),
      db.BorrowRecord.findAll({
        where: { status: 'active', expectedReturnDate: { [Op.lt]: today } },
        order: [['expectedReturnDate', 'ASC']],
        include: [
          { model: db.Equipment, as: 'equipment', attributes: ['name', 'assetTag'] },
          { model: db.User, as: 'user', attributes: ['name', 'email', 'companyId'] },
        ],
      }),
      db.sequelize.query(
        `SELECT br."userId", CAST(COUNT(br.id) AS integer) as total,
                u.name, u.email, u."companyId", u.department
         FROM borrow_records br
         JOIN users u ON u.id = br."userId"
         GROUP BY br."userId", u.id
         ORDER BY total DESC
         LIMIT 5`,
        { type: QueryTypes.SELECT }
      ),
      db.sequelize.query(
        `SELECT u.department, CAST(COUNT(br.id) AS integer) as total
         FROM borrow_records br
         JOIN users u ON u.id = br."userId"
         WHERE br.status = 'active'
         GROUP BY u.department
         ORDER BY total DESC
         LIMIT 5`,
        { type: QueryTypes.SELECT }
      ),
    ]);

    const totalValue = (totalValueResult as any)?.totalValue || '0';

    res.json({
      success: true,
      data: {
        stats: {
          totalEquipment,
          availableCount,
          borrowedCount,
          maintenanceCount,
          retiredCount,
          activeBorrows,
          overdueCount,
          totalValue: parseFloat(totalValue as string).toFixed(2),
          borrowRate: totalEquipment > 0 ? Math.round((borrowedCount / totalEquipment) * 100) : 0,
          thisMonthBorrows,
          thisMonthReturns,
        },
        recentBorrows,
        overdueRecords,
        topBorrowers: (topBorrowersRaw as any[]).map((r: any) => ({
          userId: r.userId,
          total: r.total,
          user: { name: r.name, email: r.email, companyId: r.companyId, department: r.department },
        })),
        activeByDepartment: activeByDeptRaw,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── Expense Dashboard (Consumables) ──────────────────────────────────────────

router.get('/expense', async (_req: Request, res: Response) => {
  try {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [
      totalConsumables,
      totalStock,
      totalValueResult,
      lowStockConsumables,
      pendingRequests,
      approvedThisMonth,
      thisMonthConsumed,
      thisMonthConsumedValue,
      recentRequests,
      recentStockMovements,
    ] = await Promise.all([
      db.Consumable.count(),
      db.Consumable.findOne({
        attributes: [[fn('COALESCE', fn('SUM', literal('stock')), 0), 'totalStock']],
        raw: true,
      }),
      db.Consumable.findOne({
        attributes: [[fn('COALESCE', fn('SUM', literal('price * stock')), 0), 'totalValue']],
        raw: true,
      }),
      db.Consumable.findAll({
        where: { stock: { [Op.lte]: 5 } },
        order: [['stock', 'ASC']],
        limit: 10,
      }),
      db.ConsumableRequest.count({ where: { status: { [Op.in]: ['pending_admin', 'pending_admin2'] } } }),
      db.ConsumableRequest.count({ where: { status: 'approved', updatedAt: { [Op.gte]: monthStart } } }),
      db.StockMovement.count({ where: { changeType: 'consumption', createdAt: { [Op.gte]: monthStart } } }),
      db.StockMovement.findOne({
        where: { changeType: 'consumption', createdAt: { [Op.gte]: monthStart } },
        attributes: [[fn('COALESCE', fn('SUM', literal('quantity_change')), 0), 'total']],
        raw: true,
      }),
      db.ConsumableRequest.findAll({
        limit: 10,
        order: [['createdAt', 'DESC']],
        include: [
          { model: db.User, as: 'user', attributes: ['id', 'name', 'email'] },
          { model: db.ConsumableRequestItem, as: 'items', include: [{ model: db.Consumable, as: 'consumable' }] },
        ],
      }),
      db.StockMovement.findAll({
        where: { changeType: 'consumption' },
        limit: 10,
        order: [['createdAt', 'DESC']],
        include: [{ model: db.Consumable, as: 'consumable', attributes: ['id', 'name'] }],
      }),
    ]);

    const totalValue = (totalValueResult as any)?.totalValue || '0';
    const consumedTotal = (thisMonthConsumedValue as any)?.total || 0;

    res.json({
      success: true,
      data: {
        stats: {
          totalConsumables,
          totalStock: parseInt((totalStock as any)?.totalStock || '0'),
          totalValue: parseFloat(totalValue as string).toFixed(2),
          lowStockCount: lowStockConsumables.length,
          pendingRequests,
          approvedThisMonth,
          thisMonthConsumed,
          thisMonthConsumedQty: consumedTotal,
        },
        lowStockConsumables,
        recentRequests,
        recentStockMovements,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
