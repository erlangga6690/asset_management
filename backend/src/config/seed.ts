import bcrypt from 'bcryptjs';
import db from '../models';

async function seed() {
  try {
    console.log('🌱 Seeding database v2...');

    // Hash default passwords
    const password = await bcrypt.hash('password123', 10);

    // Create users with roles (with hashed passwords)
    const users = await db.User.bulkCreate([
      { name: 'Admin Utama', email: 'admin@company.com', password, companyId: 'ADM-001', department: 'IT', role: 'admin' },
      { name: 'Pak Amri', email: 'amri@company.com', password, companyId: 'ADM-002', department: 'Management', role: 'admin2' },
      { name: 'Budi Lokasi', email: 'budi.loc@company.com', password, companyId: 'PIC-001', department: 'Ops', role: 'pic_location' },
      { name: 'Citra Barang', email: 'citra.brg@company.com', password, companyId: 'PIC-002', department: 'Logistics', role: 'pic_barang' },
      { name: 'Alice Johnson', email: 'alice@company.com', password, companyId: 'STF-001', department: 'Engineering', role: 'user' },
      { name: 'Bob Smith', email: 'bob@company.com', password, companyId: 'STF-002', department: 'Design', role: 'user' },
      { name: 'Charlie Brown', email: 'charlie@company.com', password, companyId: 'STF-003', department: 'Marketing', role: 'user' },
      { name: 'Diana Prince', email: 'diana@company.com', password, companyId: 'STF-004', department: 'HR', role: 'user' },
    ], { individualHooks: false });

    console.log(`✅ ${users.length} users created`);

    // Create equipment
    const equipment = await db.Equipment.bulkCreate([
      { assetTag: 'LAP-001', name: 'MacBook Pro 16"', brand: 'Apple', price: 2499, supplier: 'Apple Store', datePurchased: '2024-06-01', location: 'Office A - Floor 2', status: 'available', picLocationId: users[2].id, picBarangId: users[3].id },
      { assetTag: 'LAP-002', name: 'ThinkPad X1 Carbon', brand: 'Lenovo', price: 1899, supplier: 'Lenovo Official', datePurchased: '2024-07-15', location: 'Office B - Floor 3', status: 'available', picLocationId: users[2].id },
      { assetTag: 'MON-001', name: 'Dell UltraSharp 27"', brand: 'Dell', price: 599, supplier: 'Dell Indonesia', datePurchased: '2024-05-20', location: 'Office A - Floor 2', status: 'available', picLocationId: users[2].id, picBarangId: users[3].id },
      { assetTag: 'PHN-001', name: 'iPhone 15 Pro', brand: 'Apple', price: 1099, supplier: 'iBox', datePurchased: '2024-09-10', location: 'IT Storage', status: 'available', picLocationId: users[2].id },
      { assetTag: 'TAB-001', name: 'iPad Pro 12.9"', brand: 'Apple', price: 1299, supplier: 'iBox', datePurchased: '2024-08-01', location: 'IT Storage', status: 'available', picBarangId: users[3].id },
      { assetTag: 'PRN-001', name: 'HP LaserJet Pro', brand: 'HP', price: 349, supplier: 'HP Official', datePurchased: '2024-04-15', location: 'Office A - Floor 2', status: 'maintenance' },
      { assetTag: 'HDD-001', name: 'External SSD 1TB', brand: 'Samsung', price: 159, supplier: 'Samsung Store', datePurchased: '2024-08-20', location: 'IT Storage', status: 'available', picBarangId: users[3].id },
    ]);

    console.log(`✅ ${equipment.length} equipment created`);

    // Create consumables
    const consumables = await db.Consumable.bulkCreate([
      { name: 'Printer Toner Cartridge', brand: 'HP', price: 89, supplier: 'HP Official', stock: 20, description: 'Black toner for HP LaserJet', photo: 'https://placehold.co/400x300/4f46e5/white?text=Toner' },
      { name: 'A4 Paper Box (500 sheets)', brand: 'Ecolife', price: 45, supplier: 'Stationery Plus', stock: 50, description: 'Standard 80gsm A4 paper', photo: 'https://placehold.co/400x300/059669/white?text=A4+Paper' },
      { name: 'USB-C Hub 7-in-1', brand: 'Anker', price: 35, supplier: 'Anker Indonesia', stock: 25, photo: 'https://placehold.co/400x300/d97706/white?text=USB-C+Hub' },
      { name: 'Mouse Pad', brand: 'Logitech', price: 12, supplier: 'Logitech Store', stock: 30, photo: 'https://placehold.co/400x300/7c3aed/white?text=Mouse+Pad' },
      { name: 'Webcam HD 1080p', brand: 'Logitech', price: 79, supplier: 'Logitech Store', stock: 8, photo: 'https://placehold.co/400x300/dc2626/white?text=Webcam' },
      { name: 'Ethernet Cable CAT6 3m', brand: 'Belkin', price: 15, supplier: 'Belkin Official', stock: 3, description: 'Low stock warning!', photo: 'https://placehold.co/400x300/0891b2/white?text=Ethernet' },
      { name: 'Keyboard Wireless', brand: 'Keychron', price: 99, supplier: 'Keychron ID', stock: 6, photo: 'https://placehold.co/400x300/be185d/white?text=Keyboard' },
      { name: 'Headset Bluetooth', brand: 'Jabra', price: 149, supplier: 'Jabra Official', stock: 12, photo: 'https://placehold.co/400x300/1e40af/white?text=Headset' },
    ]);

    console.log(`✅ ${consumables.length} consumables created`);

    console.log('\n📋 Default login credentials:');
    console.log('   Admin:     admin@company.com / password123');
    console.log('   Admin2:    amri@company.com / password123');
    console.log('   PIC Loc:   budi.loc@company.com / password123');
    console.log('   PIC Brg:   citra.brg@company.com / password123');
    console.log('   User:      alice@company.com / password123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seed();
