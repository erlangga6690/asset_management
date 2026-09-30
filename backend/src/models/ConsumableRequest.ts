import { Sequelize, DataTypes, Model, UUIDV4 } from 'sequelize';

export type RequestStatus = 'draft' | 'pending_admin' | 'pending_admin2' | 'approved' | 'rejected';
export type RequestType = 'immediate' | 'planned';

export interface ConsumableRequestAttributes {
  id?: string;
  userId: string;
  status: RequestStatus;
  requestType: RequestType;
  notes?: string | null;
  adminApprovedBy?: string | null;
  adminApprovedAt?: Date | null;
  admin2ApprovedBy?: string | null;
  admin2ApprovedAt?: Date | null;
  rejectedBy?: string | null;
  rejectedAt?: Date | null;
  rejectionReason?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class ConsumableRequest extends Model<ConsumableRequestAttributes> implements ConsumableRequestAttributes {
  public id!: string;
  public userId!: string;
  public status!: RequestStatus;
  public requestType!: RequestType;
  public notes!: string | null;
  public adminApprovedBy!: string | null;
  public adminApprovedAt!: Date | null;
  public admin2ApprovedBy!: string | null;
  public admin2ApprovedAt!: Date | null;
  public rejectedBy!: string | null;
  public rejectedAt!: Date | null;
  public rejectionReason!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export default (sequelize: Sequelize, _dataTypes: any) => {
  ConsumableRequest.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      status: {
        type: DataTypes.ENUM('draft', 'pending_admin', 'pending_admin2', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'draft',
      },
      requestType: {
        type: DataTypes.ENUM('immediate', 'planned'),
        allowNull: false,
        defaultValue: 'immediate',
      },
      notes: { type: DataTypes.TEXT, allowNull: true },
      adminApprovedBy: { type: DataTypes.UUID, allowNull: true, references: { model: 'users', key: 'id' } },
      adminApprovedAt: { type: DataTypes.DATE, allowNull: true },
      admin2ApprovedBy: { type: DataTypes.UUID, allowNull: true, references: { model: 'users', key: 'id' } },
      admin2ApprovedAt: { type: DataTypes.DATE, allowNull: true },
      rejectedBy: { type: DataTypes.UUID, allowNull: true, references: { model: 'users', key: 'id' } },
      rejectedAt: { type: DataTypes.DATE, allowNull: true },
      rejectionReason: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      tableName: 'consumable_requests',
      timestamps: true,
      sequelize,
      indexes: [
        { fields: ['userId'] },
        { fields: ['status'] },
        { fields: ['requestType'] },
      ],
    }
  );

  return ConsumableRequest;
};
