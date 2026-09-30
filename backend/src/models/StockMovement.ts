import { Sequelize, DataTypes, Model, UUIDV4 } from 'sequelize';

export interface StockMovementAttributes {
  id?: string;
  consumableId: string;
  changeType: 'restock' | 'consumption';
  quantityChange: number;
  newStock: number;
  previousStock: number;
  notes?: string | null;
  performedBy?: string | null;
  requestId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class StockMovement extends Model<StockMovementAttributes> implements StockMovementAttributes {
  public id!: string;
  public consumableId!: string;
  public changeType!: 'restock' | 'consumption';
  public quantityChange!: number;
  public newStock!: number;
  public previousStock!: number;
  public notes!: string | null;
  public performedBy!: string | null;
  public requestId!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export default (sequelize: Sequelize, _dataTypes: any) => {
  StockMovement.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: UUIDV4,
        primaryKey: true,
      },
      consumableId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'consumables', key: 'id' },
      },
      changeType: {
        type: DataTypes.ENUM('restock', 'consumption'),
        allowNull: false,
      },
      quantityChange: { type: DataTypes.INTEGER, allowNull: false },
      newStock: { type: DataTypes.INTEGER, allowNull: false },
      previousStock: { type: DataTypes.INTEGER, allowNull: false },
      notes: { type: DataTypes.TEXT, allowNull: true },
      performedBy: { type: DataTypes.STRING(200), allowNull: true },
      requestId: { type: DataTypes.UUID, allowNull: true },
    },
    {
      tableName: 'stock_movements',
      timestamps: true,
      sequelize,
      indexes: [
        { fields: ['consumableId'] },
        { fields: ['changeType'] },
        { fields: ['createdAt'] },
      ],
    }
  );

  return StockMovement;
};
