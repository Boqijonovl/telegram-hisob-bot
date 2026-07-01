import ExcelJS from 'exceljs';
import { db } from './db.js';

export async function generateBackupExcel() {
  const workbook = new ExcelJS.Workbook();
  
  // Sheet 1: Users
  const usersSheet = workbook.addWorksheet('Foydalanuvchilar');
  usersSheet.columns = [
    { header: 'ID', key: 'id', width: 15 },
    { header: 'Ism', key: 'first_name', width: 20 },
    { header: 'Username', key: 'username', width: 20 },
    { header: 'Valyuta', key: 'currency', width: 10 },
    { header: 'Admin', key: 'is_admin', width: 10 },
    { header: 'Bloklangan', key: 'is_blocked', width: 15 },
  ];
  usersSheet.getRow(1).font = { bold: true };

  const users = await db.getAllUserSettings();
  users.forEach(u => {
    usersSheet.addRow({
      id: u.user_id,
      first_name: u.first_name || '',
      username: u.username || '',
      currency: u.currency,
      is_admin: u.is_admin ? 'Ha' : 'Yo\'q',
      is_blocked: u.is_blocked ? 'Ha' : 'Yo\'q'
    });
  });

  // Sheet 2: Transactions
  const txSheet = workbook.addWorksheet('Tranzaksiyalar');
  txSheet.columns = [
    { header: 'Tx ID', key: 'id', width: 20 },
    { header: 'User ID', key: 'user_id', width: 15 },
    { header: 'Sana', key: 'date', width: 20 },
    { header: 'Turi', key: 'type', width: 15 },
    { header: 'Kategoriya', key: 'category', width: 20 },
    { header: 'Summa', key: 'amount', width: 15 },
    { header: 'Izoh', key: 'description', width: 30 }
  ];
  txSheet.getRow(1).font = { bold: true };

  // Fetch all transactions using direct supabase call to bypass any user specific logic
  const { data: allTx, error } = await db.supabase
    .from('transactions')
    .select('*')
    .limit(100000); // adjust limit if necessary

  if (allTx) {
    allTx.forEach(tx => {
      txSheet.addRow({
        id: tx.id,
        user_id: tx.user_id,
        date: new Date(tx.date).toLocaleString('uz-UZ'),
        type: tx.type === 'income' ? 'Daromad' : 'Harajat',
        category: tx.category,
        amount: parseFloat(tx.amount),
        description: tx.description || ''
      });
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
