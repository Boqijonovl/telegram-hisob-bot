import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, HeadingLevel, AlignmentType, WidthType, BorderStyle, TableLayoutType } from 'docx';

export async function generateWordReport(transactions, stats, periodName, currency = 'UZS') {
  // Sorting transactions by date descending
  const sortedTx = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

  // Calculate totals for the provided transactions
  let totalIncome = 0;
  let totalExpense = 0;

  const tableBorders = {
    top: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
    left: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
    right: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
    insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "E5E7EB" },
  };

  const headerShading = { fill: "F3F4F6" };
  const cellMargin = { top: 100, bottom: 100, left: 100, right: 100 };

  const tableRows = [
    // Header Row
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Sana", bold: true, color: "374151" })], alignment: AlignmentType.CENTER })],
          shading: headerShading,
          margins: cellMargin
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Turi", bold: true, color: "374151" })], alignment: AlignmentType.CENTER })],
          shading: headerShading,
          margins: cellMargin
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Kategoriya", bold: true, color: "374151" })], alignment: AlignmentType.CENTER })],
          shading: headerShading,
          margins: cellMargin
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: `Summa (${currency})`, bold: true, color: "374151" })], alignment: AlignmentType.CENTER })],
          shading: headerShading,
          margins: cellMargin
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Izoh", bold: true, color: "374151" })], alignment: AlignmentType.CENTER })],
          shading: headerShading,
          margins: cellMargin
        }),
      ],
    })
  ];

  sortedTx.forEach(tx => {
    const amount = parseFloat(tx.amount);
    if (tx.type === 'income') totalIncome += amount;
    else totalExpense += amount;

    const dateStr = new Date(tx.date).toLocaleDateString('uz-UZ');
    const typeStr = tx.type === 'income' ? 'Daromad' : 'Harajat';
    const amountStr = new Intl.NumberFormat('uz-UZ').format(amount);

    const amountColor = tx.type === 'income' ? "10B981" : "EF4444"; // green / red

    tableRows.push(
      new TableRow({
        children: [
          new TableCell({ margins: cellMargin, children: [new Paragraph({ text: dateStr, alignment: AlignmentType.CENTER })] }),
          new TableCell({ margins: cellMargin, children: [new Paragraph({ children: [new TextRun({ text: typeStr, color: amountColor, bold: true })], alignment: AlignmentType.CENTER })] }),
          new TableCell({ margins: cellMargin, children: [new Paragraph({ text: tx.category, alignment: AlignmentType.CENTER })] }),
          new TableCell({ margins: cellMargin, children: [new Paragraph({ children: [new TextRun({ text: amountStr, color: amountColor, bold: true })], alignment: AlignmentType.RIGHT })] }),
          new TableCell({ margins: cellMargin, children: [new Paragraph({ text: tx.description || '-', alignment: AlignmentType.LEFT })] }),
        ],
      })
    );
  });

  if (sortedTx.length === 0) {
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({ margins: cellMargin, children: [new Paragraph("Ushbu davrda operatsiyalar yo'q")], columnSpan: 5 })
        ]
      })
    );
  }

  const formattedIncome = new Intl.NumberFormat('uz-UZ').format(totalIncome);
  const formattedExpense = new Intl.NumberFormat('uz-UZ').format(totalExpense);
  const formattedBalance = new Intl.NumberFormat('uz-UZ').format(totalIncome - totalExpense);

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: "Moliyaviy Hisobot",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: `Davr: ${periodName}`,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Umumiy Hisob Kitob:", bold: true, size: 28 }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            text: `🟢 Jami Daromad: ${formattedIncome} ${currency}`,
            spacing: { after: 50 },
          }),
          new Paragraph({
            text: `🔴 Jami Harajat: ${formattedExpense} ${currency}`,
            spacing: { after: 50 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `💰 Sof Qoldiq: `, size: 28, bold: true, color: "374151" }),
              new TextRun({ text: `${formattedBalance} ${currency}`, size: 28, bold: true, color: (totalIncome - totalExpense) >= 0 ? "10B981" : "EF4444" })
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            text: "Barcha tranzaksiyalar ro'yxati:",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 100 },
          }),
          new Table({
            rows: tableRows,
            width: { size: 100, type: WidthType.PERCENTAGE },
            layout: TableLayoutType.FIXED,
            columnWidths: [1800, 1500, 2200, 2000, 2500],
            borders: tableBorders
          }),
          new Paragraph({
            text: "\nHisob-kitob Boti orqali avtomatik yaratildi.",
            alignment: AlignmentType.RIGHT,
            spacing: { before: 400 },
          })
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
