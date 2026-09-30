import { Sequelize, DataTypes, Model, UUIDV4 } from 'sequelize';

export interface ConsumableAttributes {
  id?: string;
  name: string;
  brand?: string | null;
  price?: number | null;
  supplier?: string | null;
  stock: number;
  photo?: string | null;
  description?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Consumable extends Model<ConsumableAttributes> implements ConsumableAttributes {
  public id!: string;
  public name!: string;
  public brand!: string | null;
  public price!: number | null;
  public supplier!: string | null;
  public stock!: number;
  public photo!: string | null;
  public description!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export default (sequelize: Sequelize, _dataTypes: any) => {
  Consumable.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        validate: { notEmpty: { msg: 'Consumable name is required' } },
      },
      brand: { type: DataTypes.STRING(150), allowNull: true },
      price: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
      supplier: { type: DataTypes.STRING(200), allowNull: true },
      stock: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: { min: { args: [0], msg: 'Stock cannot be negative' } },
      },
      photo: { type: DataTypes.TEXT, allowNull: true },
      description: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      tableName: 'consumables',
      timestamps: true,
      sequelize,
    }
  );

  return Consumable;
};
