import { Router, Response } from 'express';
import { Op } from 'sequelize';
import db from '../models';
import { requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// All routes require authentication (applied at apiRouter level)

// GET /api/users — admin & admin2 can view all users
router.get('/', requireRole('admin', 'admin2'), async (req: AuthRequest, res: Response) => {
  try {
    const { search, role } = req.query;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;
    const where: any = {};

    if (role) where.role = role;
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { companyId: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count: total, rows: users } = await db.User.findAndCountAll({
      where,
      order: [['name', 'ASC']],
      limit,
      offset,
      attributes: { exclude: ['password'] },
    });
    res.json({ success: true, data: users, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/users/pic — any authenticated user can get PIC list
router.get('/pic', async (_req: AuthRequest, res: Response) => {
  try {
    const users = await db.User.findAll({
      where: { role: { [Op.in]: ['pic_location', 'pic_barang'] } },
      order: [['name', 'ASC']],
      attributes: ['id', 'name', 'email', 'role'],
    });
    res.json({ success: true, data: users });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/users/me — current user info (alias)
router.get('/me', async (req: AuthRequest, res: Response) => {
  try {
    const user = await db.User.findByPk(req.user!.id, {
      attributes: { exclude: ['password'] },
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/users/:id
router.get('/:id', requireRole('admin', 'admin2'), async (req: AuthRequest, res: Response) => {
  try {
    const user = await db.User.findByPk(req.params.id as string, {
      attributes: { exclude: ['password'] },
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/users — admin only
router.post('/', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const user = await db.User.create(req.body);
    const { password, ...userData } = user.toJSON();
    res.status(201).json({ success: true, data: userData });
  } catch (error: any) {
    if (error.name === 'SequelizeUniqueConstraintError')
      return res.status(400).json({ success: false, message: 'Email already exists' });
    if (error.name === 'SequelizeValidationError')
      return res.status(400).json({ success: false, message: error.errors.map((e: any) => e.message).join(', ') });
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/users/:id — admin only
router.put('/:id', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const user = await db.User.findByPk(req.params.id as string);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    await user.update(req.body);
    const { password, ...userData } = user.toJSON();
    res.json({ success: true, data: userData });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/users/:id — admin only
router.delete('/:id', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const user = await db.User.findByPk(req.params.id as string);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    await user.destroy();
    res.json({ success: true, message: 'User deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
