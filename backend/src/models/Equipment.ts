import { Sequelize, DataTypes, Model, UUIDV4 } from "sequelize";

export interface EquipmentAttributes {
  id?: string;
  assetTag: string;
  name: string;
  brand?: string | null;
  price?: number | null;
  supplier?: string | null;
  datePurchased?: string | null;
  location?: string | null;
  photo?: string | null;
  status: "available" | "borrowed" | "maintenance" | "retired";
  description?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Equipment
  extends Model<EquipmentAttributes>
  implements EquipmentAttributes
{
  public id!: string;
  public assetTag!: string;
  public name!: string;
  public brand!: string | null;
  public price!: number | null;
  public supplier!: string | null;
  public datePurchased!: string | null;
  public location!: string | null;
  public photo!: string | null;
  public status!: "available" | "borrowed" | "maintenance" | "retired";
  public description!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export default (sequelize: Sequelize, _dataTypes: any) => {
  Equipment.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: UUIDV4,
        primaryKey: true,
      },
      assetTag: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        validate: { notEmpty: { msg: "Asset tag is required" } },
      },
      name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        validate: { notEmpty: { msg: "Equipment name is required" } },
      },
      brand: { type: DataTypes.STRING(150), allowNull: true },
      price: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
      supplier: { type: DataTypes.STRING(200), allowNull: true },
      datePurchased: { type: DataTypes.DATEONLY, allowNull: true },
      location: { type: DataTypes.STRING(200), allowNull: true },
      photo: { type: DataTypes.TEXT, allowNull: true },
      status: {
        type: DataTypes.ENUM("available", "borrowed", "maintenance", "retired"),
        allowNull: false,
        defaultValue: "available",
      },
      description: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      tableName: "equipment",
      timestamps: true,
      sequelize,
      indexes: [{ unique: true, fields: ["assetTag"] }, { fields: ["status"] }],
    },
  );

  return Equipment;
};
