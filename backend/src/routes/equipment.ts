import { Router, Response } from "express";
import { Op } from "sequelize";
import multer from "multer";
import * as XLSX from "xlsx";
import fs from "fs";
import db from "../models";
import { requireRole, AuthRequest } from "../middleware/auth";

const router = Router();
const upload = multer({
  dest: "/tmp/uploads/",
  limits: { fileSize: 5 * 1024 * 1024 },
});

// ═══ NON-PARAMETERIZED ROUTES (must come before /:id) ═══

// GET / — list all equipment
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const { status, location, search } = req.query;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit as string) || 20),
    );
    const offset = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (location) where.location = { [Op.iLike]: `%${location}%` };
    if (search)
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { assetTag: { [Op.iLike]: `%${search}%` } },
        { brand: { [Op.iLike]: `%${search}%` } },
        { supplier: { [Op.iLike]: `%${search}%` } },
      ];

    const { count: total, rows: equipment } =
      await db.Equipment.findAndCountAll({
        where,
        order: [["createdAt", "DESC"]],
        limit,
        offset,
        include: [
          {
            model: db.BorrowRecord,
            as: "borrowRecords",
            where: { status: "active" },
            required: false,
            include: [
              {
                model: db.User,
                as: "user",
                attributes: ["id", "name", "email"],
              },
            ],
          },
        ],
      });
    res.json({
      success: true,
      data: equipment,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST / — admin only
router.post(
  "/",
  requireRole("admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      const data = { ...req.body };
      const equipment = await db.Equipment.create(data);
      res.status(201).json({ success: true, data: equipment });
    } catch (error: any) {
      if (error.name === "SequelizeUniqueConstraintError")
        return res
          .status(400)
          .json({ success: false, message: "Asset tag already exists" });
      if (error.name === "SequelizeValidationError")
        return res.status(400).json({
          success: false,
          message: error.errors.map((e: any) => e.message).join(", "),
        });
      res.status(500).json({ success: false, message: error.message });
    }
  },
);

// GET /borrow-requests — list borrow requests (before /:id!)
router.get("/borrow-requests", async (req: AuthRequest, res: Response) => {
  try {
    const { status, equipmentId } = req.query;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit as string) || 20),
    );
    const offset = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (equipmentId) where.equipmentId = equipmentId;
    if (req.user!.role === "user") where.userId = req.user!.id;

    const { count: total, rows: requests } =
      await db.BorrowRequest.findAndCountAll({
        where,
        order: [["createdAt", "DESC"]],
        limit,
        offset,
        include: [
          {
            model: db.Equipment,
            as: "equipment",
          },
          {
            model: db.User,
            as: "user",
            attributes: ["id", "name", "email", "department"],
          },
          {
            model: db.User,
            as: "picApprover",
            attributes: ["id", "name"],
            required: false,
          },
          {
            model: db.User,
            as: "rejector",
            attributes: ["id", "name"],
            required: false,
          },
        ],
      });
    res.json({
      success: true,
      data: requests,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /borrow-records — list borrow records
router.get("/borrow-records", async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 8));
    const offset = (page - 1) * limit;

    const status = String(req.query.status || "");
    const search = String(req.query.search || "").trim();

    const where: any = {};
    const equipmentWhere: any = {};

    if (status === "active" || status === "returned") {
      where.status = status;
    } else if (status === "overdue") {
      where.status = "active";
      where.expectedReturnDate = {
        [Op.lt]: new Date(),
      };
    }

    if (search) {
      equipmentWhere[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { assetTag: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows } = await db.BorrowRecord.findAndCountAll({
      where,
      include: [
        {
          model: db.Equipment,
          as: "equipment",
          where: search ? equipmentWhere : undefined,
          required: Boolean(search),
        },
        {
          model: db.User,
          as: "user",
          attributes: ["id", "name", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
      distinct: true,
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error: any) {
    console.error("GET BORROW RECORDS ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// GET /export — export equipment to Excel (before /:id!)
router.get("/export", async (_req: AuthRequest, res: Response) => {
  try {
    const equipment = await db.Equipment.findAll({
      order: [["assetTag", "ASC"]],
      include: [
        {
          model: db.BorrowRecord,
          as: "borrowRecords",
          where: { status: "active" },
          required: false,
          include: [
            {
              model: db.User,
              as: "user",
              attributes: ["id", "name", "email"],
            },
          ],
        },
      ],
    });
    const data = equipment.map((eq: any) => [
      eq.assetTag,
      eq.name,
      eq.brand || "",
      eq.price ? Number(eq.price).toString() : "",
      eq.supplier || "",
      eq.datePurchased || "",
      eq.status,
      eq.borrowRecords?.[0]?.user?.name || "",
      eq.location || "",
      eq.description || "",
    ]);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      [
        "Asset Tag",
        "Name",
        "Brand",
        "Price",
        "Supplier",
        "Date Purchased",
        "Status",
        "Borrower",
        "Location",
        "Description",
      ],
      ...data,
    ]);
    ws["!cols"] = [
      { wch: 12 }, // Asset Tag
      { wch: 25 }, // Name
      { wch: 15 }, // Brand
      { wch: 10 }, // Price
      { wch: 20 }, // Supplier
      { wch: 15 }, // Date Purchased
      { wch: 12 }, // Status
      { wch: 20 }, // Borrower
      { wch: 20 }, // Location
      { wch: 30 }, // Description
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Equipment");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="equipment_${new Date().toISOString().split("T")[0]}.xlsx"`,
    );
    res.send(buf);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /template — download Excel template (before /:id!)
router.get("/template", async (_req: AuthRequest, res: Response) => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    [
      "Asset Tag*",
      "Name*",
      "Brand",
      "Price",
      "Supplier",
      "Date Purchased",
      "Location",
      "Status",
      "Description",
    ],
    [
      "LAP-001",
      "MacBook Pro",
      "Apple",
      "2499",
      "Apple Store",
      "2024-06-01",
      "Office A",
      "available",
      "M3 Pro",
    ],
  ]);
  ws["!cols"] = [
    { wch: 15 },
    { wch: 25 },
    { wch: 15 },
    { wch: 12 },
    { wch: 20 },
    { wch: 18 },
    { wch: 22 },
    { wch: 15 },
    { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Equipment");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="equipment_template.xlsx"',
  );
  res.send(buf);
});

// POST /bulk-upload — admin only (before /:id!)
router.post(
  "/bulk-upload",
  requireRole("admin"),
  upload.single("file"),
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file)
        return res
          .status(400)
          .json({ success: false, message: "No file uploaded" });
      const wb = XLSX.readFile(req.file.path);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      fs.unlink(req.file.path, () => {});
      if (!rows.length)
        return res.status(400).json({ success: false, message: "Empty file" });
      const results = {
        created: 0,
        updated: 0,
        errors: 0,
        errorsList: [] as string[],
      };
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const rn = i + 2;
        try {
          const tag = (r["Asset Tag*"] || r["Asset Tag"] || "")
            .toString()
            .trim();
          const name = (r["Name*"] || r["Name"] || "").toString().trim();
          if (!tag) {
            results.errors++;
            results.errorsList.push(`Row ${rn}: Missing Asset Tag`);
            continue;
          }
          if (!name) {
            results.errors++;
            results.errorsList.push(`Row ${rn}: Missing Name`);
            continue;
          }
          const ps = (r["Price"] || "").toString().replace(/[^0-9.]/g, "");
          const data: any = {
            assetTag: tag,
            name,
            brand: (r["Brand"] || "").toString().trim() || null,
            price: ps ? parseFloat(ps) : null,
            supplier: (r["Supplier"] || "").toString().trim() || null,
            datePurchased:
              (r["Date Purchased"] || "").toString().trim() || null,
            location: (r["Location"] || "").toString().trim() || null,
            status:
              (r["Status"] || "available").toString().trim().toLowerCase() ||
              "available",
            description: (r["Description"] || "").toString().trim() || null,
          };
          const ex = await db.Equipment.findOne({ where: { assetTag: tag } });
          if (ex) {
            await ex.update(data);
            results.updated++;
          } else {
            await db.Equipment.create(data);
            results.created++;
          }
        } catch (err: any) {
          results.errors++;
          results.errorsList.push(`Row ${rn}: ${err.message}`);
        }
      }
      res.json({
        success: true,
        data: results,
        message: `Created: ${results.created}, Updated: ${results.updated}, Errors: ${results.errors}`,
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
);

// ═══ PARAMETERIZED BORROW-REQUEST ROUTES ═══

// POST /borrow-request/:requestId/approve
router.post(
  "/borrow-request/:requestId/approve",
  requireRole("admin", "admin2"),
  async (req: AuthRequest, res: Response) => {
    try {
      const borrowRequest = await db.BorrowRequest.findByPk(
        req.params.requestId as string,
        { include: [{ model: db.Equipment, as: "equipment" }] },
      );
      if (!borrowRequest)
        return res
          .status(404)
          .json({ success: false, message: "Borrow request not found" });
      if (borrowRequest.status !== "pending_admin")
        return res.status(400).json({
          success: false,
          message: `Cannot process request. Status: ${borrowRequest.status}`,
        });
      const equipment = (borrowRequest as any).equipment;

      const borrowRecord = await db.BorrowRecord.create({
        equipmentId: equipment.id,
        userId: borrowRequest.userId,
        expectedReturnDate: borrowRequest.expectedReturnDate,
        borrowDate: new Date(),
        status: "active",
        notes: borrowRequest.notes,
      });
      await equipment.update({ status: "borrowed" });
      await borrowRequest.update({
        status: "approved",
        picApprovedBy: req.user!.id,
        picApprovedAt: new Date(),
        borrowRecordId: borrowRecord.id,
      });

      const result = await db.BorrowRequest.findByPk(borrowRequest.id, {
        include: [
          { model: db.Equipment, as: "equipment" },
          { model: db.User, as: "user", attributes: ["id", "name", "email"] },
          {
            model: db.User,
            as: "picApprover",
            attributes: ["id", "name"],
            required: false,
          },
          { model: db.BorrowRecord, as: "borrowRecord" },
        ],
      });
      res.json({
        success: true,
        data: result,
        message: "Approved. Equipment borrowed.",
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
);

// POST /borrow-request/:requestId/reject
router.post(
  "/borrow-request/:requestId/reject",
  requireRole("admin", "admin2"),
  async (req: AuthRequest, res: Response) => {
    try {
      const borrowRequest = await db.BorrowRequest.findByPk(
        req.params.requestId as string,
      );
      if (!borrowRequest)
        return res
          .status(404)
          .json({ success: false, message: "Borrow request not found" });
      if (borrowRequest.status !== "pending_admin")
        return res.status(400).json({
          success: false,
          message: `Cannot reject. Status: ${borrowRequest.status}`,
        });
      await borrowRequest.update({
        status: "rejected",
        rejectedBy: req.user!.id,
        rejectedAt: new Date(),
        rejectionReason: req.body.reason || null,
      });
      const result = await db.BorrowRequest.findByPk(borrowRequest.id, {
        include: [
          {
            model: db.Equipment,
            as: "equipment",
          },
          {
            model: db.User,
            as: "user",
            attributes: ["id", "name", "email"],
          },
        ],
      });
      res.json({ success: true, data: result, message: "Rejected" });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
);

// POST /borrow-record/:recordId/remind
router.post(
  "/borrow-record/:recordId/remind",
  async (req: AuthRequest, res: Response) => {
    try {
      const record = await db.BorrowRecord.findByPk(
        req.params.recordId as string,
        {
          include: [
            { model: db.Equipment, as: "equipment" },
            { model: db.User, as: "user", attributes: ["id", "name", "email"] },
          ],
        },
      );
      if (!record)
        return res.status(404).json({ success: false, message: "Not found" });
      await record.update({ reminderSent: true, reminderSentAt: new Date() });
      res.json({ success: true, message: "Reminder sent", data: record });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
);

// ═══ /:id ROUTES ═══

// GET /:id
router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const equipment = await db.Equipment.findByPk(req.params.id as string, {
      include: [
        {
          model: db.BorrowRecord,
          as: "borrowRecords",
          include: [
            { model: db.User, as: "user", attributes: ["id", "name", "email"] },
          ],
        },
      ],
    });
    if (!equipment)
      return res
        .status(404)
        .json({ success: false, message: "Equipment not found" });
    res.json({ success: true, data: equipment });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /:id — admin or assigned PIC
router.put(
  "/:id",
  requireRole("admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      const equipment = await db.Equipment.findByPk(req.params.id as string);
      if (!equipment)
        return res
          .status(404)
          .json({ success: false, message: "Equipment not found" });
      const data = { ...req.body };
      await equipment.update(data);
      res.json({ success: true, data: equipment });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
);

// DELETE /:id — admin only
router.delete(
  "/:id",
  requireRole("admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      const equipment = await db.Equipment.findByPk(req.params.id as string);
      if (!equipment)
        return res
          .status(404)
          .json({ success: false, message: "Equipment not found" });
      const activeBorrow = await db.BorrowRecord.findOne({
        where: { equipmentId: req.params.id as string, status: "active" },
      });
      if (activeBorrow)
        return res.status(400).json({
          success: false,
          message: "Cannot delete equipment with active borrow records",
        });
      await equipment.destroy();
      res.json({ success: true, message: "Equipment deleted" });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
);

// POST /:id/request-borrow
router.post("/:id/request-borrow", async (req: AuthRequest, res: Response) => {
  try {
    const { expectedReturnDate, notes } = req.body;
    const equipment = await db.Equipment.findByPk(req.params.id as string, {});
    if (!equipment)
      return res
        .status(404)
        .json({ success: false, message: "Equipment not found" });
    if (equipment.status !== "available")
      return res
        .status(400)
        .json({ success: false, message: `Equipment is ${equipment.status}` });
    if (!expectedReturnDate)
      return res
        .status(400)
        .json({ success: false, message: "Expected return date is required" });

    const borrowRequest = await db.BorrowRequest.create({
      equipmentId: equipment.id,
      userId: req.user!.id,
      expectedReturnDate,
      notes,
      status: "pending_admin",
    });

    const result = await db.BorrowRequest.findByPk(borrowRequest.id, {
      include: [
        {
          model: db.Equipment,
          as: "equipment",
        },
        {
          model: db.User,
          as: "user",
          attributes: ["id", "name", "email"],
        },
      ],
    });
    res.status(201).json({
      success: true,
      data: result,
      message: `Request submitted. Waiting for admin approval.`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /:id/return
router.post("/:id/return", async (req: AuthRequest, res: Response) => {
  try {
    const equipment = await db.Equipment.findByPk(req.params.id as string);
    if (!equipment)
      return res
        .status(404)
        .json({ success: false, message: "Equipment not found" });
    if (equipment.status !== "borrowed")
      return res
        .status(400)
        .json({ success: false, message: "Equipment is not borrowed" });
    const record = await db.BorrowRecord.findOne({
      where: { equipmentId: equipment.id, status: "active" },
    });
    if (!record)
      return res
        .status(404)
        .json({ success: false, message: "No active borrow record" });
    await record.update({ status: "returned", actualReturnDate: new Date() });
    await equipment.update({ status: "available" });
    const result = await db.BorrowRecord.findByPk(record.id, {
      include: [
        { model: db.Equipment, as: "equipment" },
        { model: db.User, as: "user", attributes: ["id", "name", "email"] },
      ],
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
