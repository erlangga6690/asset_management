import db from '../models';

async function migrate() {
  try {
    console.log('🔄 Running migrations...');
    await db.sequelize.sync({ force: false, alter: true });
    console.log('✅ Migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
