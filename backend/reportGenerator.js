import ExcelJS from 'exceljs';

export async function generateExcelReport(transactions, stats, periodName, currency = 'UZS') {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Hisobot', {
    views: [{ showGridLines: false }]
  });

  // Calculate totals
  let totalIncome = 0;
  let totalExpense = 0;
  
  const sortedTx = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
  sortedTx.forEach(tx => {
    const amount = parseFloat(tx.amount);
    if (tx.type === 'income') totalIncome += amount;
    else totalExpense += amount;
  });

  const formattedIncome = new Intl.NumberFormat('uz-UZ').format(totalIncome);
  const formattedExpense = new Intl.NumberFormat('uz-UZ').format(totalExpense);
  const formattedBalance = new Intl.NumberFormat('uz-UZ').format(totalIncome - totalExpense);

  // Set column widths
  sheet.columns = [
    { header: '', key: 'margin1', width: 2 },
    { header: 'Sana', key: 'date', width: 15 },
    { header: 'Turi', key: 'type', width: 15 },
    { header: 'Kategoriya', key: 'category', width: 20 },
    { header: `Summa (${currency})`, key: 'amount', width: 20 },
    { header: 'Izoh', key: 'desc', width: 30 },
    { header: '', key: 'margin2', width: 2 }
  ];

  // Header styles
  sheet.mergeCells('B2:F2');
  const titleCell = sheet.getCell('B2');
  titleCell.value = 'MOLIYAVIY HISOBOT';
  titleCell.font = { name: 'Arial', size: 24, bold: true, color: { argb: 'FF1F2937' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  sheet.mergeCells('B3:F3');
  const periodCell = sheet.getCell('B3');
  periodCell.value = `Davr: ${periodName}`;
  periodCell.font = { name: 'Arial', size: 14, italic: true, color: { argb: 'FF6B7280' } };
  periodCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // Summary box
  sheet.mergeCells('B5:D5');
  sheet.getCell('B5').value = 'Umumiy Hisob Kitob:';
  sheet.getCell('B5').font = { name: 'Arial', size: 16, bold: true };

  sheet.getCell('B7').value = '🟢 Jami Daromad:';
  sheet.getCell('C7').value = `+ ${formattedIncome}`;
  sheet.getCell('C7').font = { color: { argb: 'FF10B981' }, bold: true };

  sheet.getCell('B8').value = '🔴 Jami Harajat:';
  sheet.getCell('C8').value = `- ${formattedExpense}`;
  sheet.getCell('C8').font = { color: { argb: 'FFEF4444' }, bold: true };

  sheet.getCell('B10').value = '💰 Sof Qoldiq:';
  sheet.getCell('B10').font = { size: 14, bold: true };
  sheet.getCell('C10').value = `${totalIncome - totalExpense >= 0 ? '+' : ''}${formattedBalance}`;
  sheet.getCell('C10').font = { size: 14, bold: true, color: { argb: (totalIncome - totalExpense) >= 0 ? 'FF10B981' : 'FFEF4444' } };

  // Table Headers
  const tableHeaderRow = 13;
  ['B', 'C', 'D', 'E', 'F'].forEach((col, i) => {
    const cell = sheet.getCell(`${col}${tableHeaderRow}`);
    cell.value = ['Sana', 'Turi', 'Kategoriya', `Summa (${currency})`, 'Izoh'][i];
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: {style:'thin', color: {argb:'FFE5E7EB'}}, left: {style:'thin', color: {argb:'FFE5E7EB'}}, bottom: {style:'thin', color: {argb:'FFE5E7EB'}}, right: {style:'thin', color: {argb:'FFE5E7EB'}}
    };
  });

  let currentRow = tableHeaderRow + 1;

  if (sortedTx.length === 0) {
    sheet.mergeCells(`B${currentRow}:F${currentRow}`);
    const emptyCell = sheet.getCell(`B${currentRow}`);
    emptyCell.value = "Ushbu davrda operatsiyalar yo'q";
    emptyCell.alignment = { horizontal: 'center' };
    currentRow++;
  } else {
    sortedTx.forEach((tx, index) => {
      const isEven = index % 2 === 0;
      const amount = parseFloat(tx.amount);
      const row = sheet.getRow(currentRow);
      
      const dateStr = new Date(tx.date).toLocaleDateString('uz-UZ');
      const typeStr = tx.type === 'income' ? 'Daromad' : 'Harajat';
      const amountColor = tx.type === 'income' ? 'FF10B981' : 'FFEF4444';
      
      row.getCell('B').value = dateStr;
      row.getCell('C').value = typeStr;
      row.getCell('D').value = tx.category;
      row.getCell('E').value = amount;
      row.getCell('F').value = tx.description || '-';

      row.getCell('E').numFmt = '#,##0.00';
      row.getCell('C').font = { color: { argb: amountColor }, bold: true };
      row.getCell('E').font = { color: { argb: amountColor }, bold: true };

      ['B', 'C', 'D', 'E', 'F'].forEach(col => {
        const c = row.getCell(col);
        c.border = { top: {style:'thin', color: {argb:'FFE5E7EB'}}, bottom: {style:'thin', color: {argb:'FFE5E7EB'}} };
        if (!isEven) {
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
        }
        c.alignment = { vertical: 'middle', horizontal: col === 'E' ? 'right' : (col === 'F' ? 'left' : 'center') };
      });

      currentRow++;
    });
  }

  const footerCell = sheet.getCell(`B${currentRow + 2}`);
  footerCell.value = 'Hisob-kitob Boti orqali avtomatik yaratildi.';
  footerCell.font = { italic: true, color: { argb: 'FF9CA3AF' } };
  sheet.mergeCells(`B${currentRow + 2}:F${currentRow + 2}`);
  footerCell.alignment = { horizontal: 'right' };

  // Write to buffer
  const buffer = await workbook.xlsx.writeBuffer();
  // Return the buffer (exceljs returns a typed array, we ensure it's a Node Buffer)
  return Buffer.from(buffer);
}
