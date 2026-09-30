import { Sequelize, DataTypes, Model, UUIDV4 } from 'sequelize';

export interface BorrowRecordAttributes {
  id?: string;
  equipmentId: string;
  userId: string;
  borrowDate?: Date;
  expectedReturnDate?: string | null;
  actualReturnDate?: Date | null;
  status: 'active' | 'returned' | 'overdue';
  reminderSent?: boolean;
  reminderSentAt?: Date | null;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class BorrowRecord extends Model<BorrowRecordAttributes> implements BorrowRecordAttributes {
  public id!: string;
  public equipmentId!: string;
  public userId!: string;
  public borrowDate!: Date;
  public expectedReturnDate!: string | null;
  public actualReturnDate!: Date | null;
  public status!: 'active' | 'returned' | 'overdue';
  public reminderSent!: boolean;
  public reminderSentAt!: Date | null;
  public notes!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export default (sequelize: Sequelize, _dataTypes: any) => {
  BorrowRecord.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: UUIDV4,
        primaryKey: true,
      },
      equipmentId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'equipment', key: 'id' },
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      borrowDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      expectedReturnDate: { type: DataTypes.DATEONLY, allowNull: true },
      actualReturnDate: { type: DataTypes.DATE, allowNull: true },
      status: {
        type: DataTypes.ENUM('active', 'returned', 'overdue'),
        allowNull: false,
        defaultValue: 'active',
      },
      reminderSent: { type: DataTypes.BOOLEAN, defaultValue: false },
      reminderSentAt: { type: DataTypes.DATE, allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      tableName: 'borrow_records',
      timestamps: true,
      sequelize,
      indexes: [
        { fields: ['equipmentId'] },
        { fields: ['userId'] },
        { fields: ['status'] },
        { fields: ['expectedReturnDate'] },
      ],
    }
  );

  return BorrowRecord;
};
