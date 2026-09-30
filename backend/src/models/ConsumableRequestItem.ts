import { Sequelize, DataTypes, Model, UUIDV4 } from 'sequelize';

export interface ConsumableRequestItemAttributes {
  id?: string;
  requestId: string;
  consumableId: string;
  quantity: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class ConsumableRequestItem extends Model<ConsumableRequestItemAttributes> implements ConsumableRequestItemAttributes {
  public id!: string;
  public requestId!: string;
  public consumableId!: string;
  public quantity!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export default (sequelize: Sequelize, _dataTypes: any) => {
  ConsumableRequestItem.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: UUIDV4,
        primaryKey: true,
      },
      requestId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'consumable_requests', key: 'id' },
      },
      consumableId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'consumables', key: 'id' },
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: { args: [1], msg: 'Quantity must be at least 1' } },
      },
    },
    {
      tableName: 'consumable_request_items',
      timestamps: true,
      sequelize,
      indexes: [
        { fields: ['requestId'] },
        { fields: ['consumableId'] },
      ],
    }
  );

  return ConsumableRequestItem;
};
