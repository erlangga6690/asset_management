import { Sequelize, DataTypes, Model, UUIDV4 } from 'sequelize';

export type BorrowRequestStatus = 'pending_pic' | 'approved' | 'rejected';

export interface BorrowRequestAttributes {
  id?: string;
  equipmentId: string;
  userId: string;
  status: BorrowRequestStatus;
  expectedReturnDate?: string | null;
  notes?: string | null;
  picApprovedBy?: string | null;
  picApprovedAt?: Date | null;
  rejectedBy?: string | null;
  rejectedAt?: Date | null;
  rejectionReason?: string | null;
  borrowRecordId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class BorrowRequest extends Model<BorrowRequestAttributes> implements BorrowRequestAttributes {
  public id!: string;
  public equipmentId!: string;
  public userId!: string;
  public status!: BorrowRequestStatus;
  public expectedReturnDate!: string | null;
  public notes!: string | null;
  public picApprovedBy!: string | null;
  public picApprovedAt!: Date | null;
  public rejectedBy!: string | null;
  public rejectedAt!: Date | null;
  public rejectionReason!: string | null;
  public borrowRecordId!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export default (sequelize: Sequelize, _dataTypes: any) => {
  BorrowRequest.init(
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
      status: {
        type: DataTypes.ENUM('pending_pic', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending_pic',
      },
      expectedReturnDate: { type: DataTypes.DATEONLY, allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
      picApprovedBy: { type: DataTypes.UUID, allowNull: true, references: { model: 'users', key: 'id' } },
      picApprovedAt: { type: DataTypes.DATE, allowNull: true },
      rejectedBy: { type: DataTypes.UUID, allowNull: true, references: { model: 'users', key: 'id' } },
      rejectedAt: { type: DataTypes.DATE, allowNull: true },
      rejectionReason: { type: DataTypes.TEXT, allowNull: true },
      borrowRecordId: { type: DataTypes.UUID, allowNull: true, references: { model: 'borrow_records', key: 'id' } },
    },
    {
      tableName: 'borrow_requests',
      timestamps: true,
      sequelize,
      indexes: [
        { fields: ['equipmentId'] },
        { fields: ['userId'] },
        { fields: ['status'] },
      ],
    }
  );

  return BorrowRequest;
};
