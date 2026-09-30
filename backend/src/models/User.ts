import { Sequelize, DataTypes, Model, UUIDV4 } from 'sequelize';

export type UserRole = 'admin' | 'admin2' | 'pic_location' | 'pic_barang' | 'user';

export interface UserAttributes {
  id?: string;
  name: string;
  email: string;
  companyId?: string | null;
  department?: string | null;
  password?: string | null;
  role: UserRole;
  photo?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class User extends Model<UserAttributes> implements UserAttributes {
  public id!: string;
  public name!: string;
  public email!: string;
  public companyId!: string | null;
  public department!: string | null;
  public password!: string | null;
  public role!: UserRole;
  public photo!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export default (sequelize: Sequelize, _dataTypes: any) => {
  User.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        validate: { notEmpty: { msg: 'User name is required' } },
      },
      email: {
        type: DataTypes.STRING(200),
        allowNull: false,
        unique: true,
        validate: { isEmail: { msg: 'Must be a valid email' } },
      },
      companyId: { type: DataTypes.STRING(50), allowNull: true },
      department: { type: DataTypes.STRING(100), allowNull: true },
      password: { type: DataTypes.STRING(255), allowNull: true },
      role: {
        type: DataTypes.ENUM('admin', 'admin2', 'pic_location', 'pic_barang', 'user'),
        allowNull: false,
        defaultValue: 'user',
      },
      photo: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      tableName: 'users',
      timestamps: true,
      sequelize,
      indexes: [
        { unique: true, fields: ['email'] },
        { fields: ['role'] },
      ],
    }
  );

  return User;
};
