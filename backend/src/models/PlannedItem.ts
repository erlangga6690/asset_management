import { Sequelize, DataTypes, Model, UUIDV4 } from 'sequelize';

export interface PlannedItemAttributes {
  id?: string;
  requestId: string;
  name: string;
  brand?: string | null;
  quantity: number;
  estimatedPrice?: number | null;
  purchased: boolean;
  purchasedAt?: Date | null;
  notes?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class PlannedItem extends Model<PlannedItemAttributes> implements PlannedItemAttributes {
  public id!: string;
  public requestId!: string;
  public name!: string;
  public brand!: string | null;
  public quantity!: number;
  public estimatedPrice!: number | null;
  public purchased!: boolean;
  public purchasedAt!: Date | null;
  public notes!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export default (sequelize: Sequelize, _dataTypes: any) => {
  PlannedItem.init(
    {
      id: { type: DataTypes.UUID, defaultValue: UUIDV4, primaryKey: true },
      requestId: { type: DataTypes.UUID, allowNull: false, references: { model: 'consumable_requests', key: 'id' } },
      name: { type: DataTypes.STRING(200), allowNull: false },
      brand: { type: DataTypes.STRING(150), allowNull: true },
      quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1, validate: { min: 1 } },
      estimatedPrice: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
      purchased: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      purchasedAt: { type: DataTypes.DATE, allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      tableName: 'planned_items',
      timestamps: true,
      sequelize,
      indexes: [
        { fields: ['requestId'] },
        { fields: ['purchased'] },
      ],
    }
  );
  return PlannedItem;
};
