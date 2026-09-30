import { Sequelize } from 'sequelize';
import config from '../config/database';
import defineUser, { User } from './User';
import defineEquipment, { Equipment } from './Equipment';
import defineConsumable, { Consumable } from './Consumable';
import defineBorrowRecord, { BorrowRecord } from './BorrowRecord';
import defineBorrowRequest, { BorrowRequest } from './BorrowRequest';
import defineStockMovement, { StockMovement } from './StockMovement';
import defineConsumableRequest, { ConsumableRequest } from './ConsumableRequest';
import defineConsumableRequestItem, { ConsumableRequestItem } from './ConsumableRequestItem';
import definePlannedItem, { PlannedItem } from './PlannedItem';

const env = (process.env.NODE_ENV as 'development' | 'production') || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(dbConfig.database, dbConfig.username, dbConfig.password, {
  host: dbConfig.host, port: dbConfig.port, dialect: dbConfig.dialect, logging: dbConfig.logging, pool: dbConfig.pool,
});

const UserModel = defineUser(sequelize, Sequelize as any);
const EquipmentModel = defineEquipment(sequelize, Sequelize as any);
const ConsumableModel = defineConsumable(sequelize, Sequelize as any);
const BorrowRecordModel = defineBorrowRecord(sequelize, Sequelize as any);
const BorrowRequestModel = defineBorrowRequest(sequelize, Sequelize as any);
const StockMovementModel = defineStockMovement(sequelize, Sequelize as any);
const ConsumableRequestModel = defineConsumableRequest(sequelize, Sequelize as any);
const ConsumableRequestItemModel = defineConsumableRequestItem(sequelize, Sequelize as any);
const PlannedItemModel = definePlannedItem(sequelize, Sequelize as any);

// Equipment
EquipmentModel.belongsTo(UserModel, { foreignKey: 'picLocationId', as: 'picLocation' });
EquipmentModel.belongsTo(UserModel, { foreignKey: 'picBarangId', as: 'picBarang' });
EquipmentModel.hasMany(BorrowRecordModel, { foreignKey: 'equipmentId', as: 'borrowRecords' });
BorrowRecordModel.belongsTo(EquipmentModel, { foreignKey: 'equipmentId', as: 'equipment' });
BorrowRecordModel.belongsTo(UserModel, { foreignKey: 'userId', as: 'user' });
UserModel.hasMany(BorrowRecordModel, { foreignKey: 'userId', as: 'borrowRecords' });

// Borrow Requests
BorrowRequestModel.belongsTo(EquipmentModel, { foreignKey: 'equipmentId', as: 'equipment' });
EquipmentModel.hasMany(BorrowRequestModel, { foreignKey: 'equipmentId', as: 'borrowRequests' });
BorrowRequestModel.belongsTo(UserModel, { foreignKey: 'userId', as: 'user' });
BorrowRequestModel.belongsTo(UserModel, { foreignKey: 'picApprovedBy', as: 'picApprover' });
BorrowRequestModel.belongsTo(UserModel, { foreignKey: 'rejectedBy', as: 'rejector' });
BorrowRequestModel.belongsTo(BorrowRecordModel, { foreignKey: 'borrowRecordId', as: 'borrowRecord' });

// Consumables
ConsumableModel.hasMany(StockMovementModel, { foreignKey: 'consumableId', as: 'stockMovements' });
StockMovementModel.belongsTo(ConsumableModel, { foreignKey: 'consumableId', as: 'consumable' });
ConsumableModel.hasMany(ConsumableRequestItemModel, { foreignKey: 'consumableId', as: 'requestItems' });
ConsumableRequestItemModel.belongsTo(ConsumableModel, { foreignKey: 'consumableId', as: 'consumable' });

// Requests
ConsumableRequestModel.belongsTo(UserModel, { foreignKey: 'userId', as: 'user' });
ConsumableRequestModel.hasMany(ConsumableRequestItemModel, { foreignKey: 'requestId', as: 'items' });
ConsumableRequestItemModel.belongsTo(ConsumableRequestModel, { foreignKey: 'requestId', as: 'request' });
ConsumableRequestModel.belongsTo(UserModel, { foreignKey: 'adminApprovedBy', as: 'adminApprover' });
ConsumableRequestModel.belongsTo(UserModel, { foreignKey: 'admin2ApprovedBy', as: 'admin2Approver' });
ConsumableRequestModel.belongsTo(UserModel, { foreignKey: 'rejectedBy', as: 'rejector' });

// Planned Items
ConsumableRequestModel.hasMany(PlannedItemModel, { foreignKey: 'requestId', as: 'plannedItems' });
PlannedItemModel.belongsTo(ConsumableRequestModel, { foreignKey: 'requestId', as: 'request' });

export interface DB {
  sequelize: Sequelize; Sequelize: typeof Sequelize;
  User: typeof User; Equipment: typeof Equipment; Consumable: typeof Consumable;
  BorrowRecord: typeof BorrowRecord; BorrowRequest: typeof BorrowRequest;
  StockMovement: typeof StockMovement;
  ConsumableRequest: typeof ConsumableRequest; ConsumableRequestItem: typeof ConsumableRequestItem;
  PlannedItem: typeof PlannedItem;
}

const db: DB = {
  sequelize, Sequelize,
  User: UserModel, Equipment: EquipmentModel, Consumable: ConsumableModel,
  BorrowRecord: BorrowRecordModel, BorrowRequest: BorrowRequestModel,
  StockMovement: StockMovementModel,
  ConsumableRequest: ConsumableRequestModel, ConsumableRequestItem: ConsumableRequestItemModel,
  PlannedItem: PlannedItemModel,
};

export default db;
