import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, HeadingLevel, AlignmentType, WidthType } from 'docx';

export async function generateWordReport(transactions, stats, periodName, currency = 'UZS') {
  // Sorting transactions by date descending
  const sortedTx = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

  // Calculate totals for the provided transactions
  let totalIncome = 0;
  let totalExpense = 0;

  const tableRows = [
    // Header Row
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Sana", bold: true })] })],
          shading: { fill: "f3f4f6" },
          width: { size: 20, type: WidthType.PERCENTAGE }
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Turi", bold: true })] })],
          shading: { fill: "f3f4f6" },
          width: { size: 15, type: WidthType.PERCENTAGE }
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Kategoriya", bold: true })] })],
          shading: { fill: "f3f4f6" },
          width: { size: 20, type: WidthType.PERCENTAGE }
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: `Summa (${currency})`, bold: true })] })],
          shading: { fill: "f3f4f6" },
          width: { size: 20, type: WidthType.PERCENTAGE }
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Izoh", bold: true })] })],
          shading: { fill: "f3f4f6" },
          width: { size: 25, type: WidthType.PERCENTAGE }
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

    tableRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(dateStr)] }),
          new TableCell({ children: [new Paragraph(typeStr)] }),
          new TableCell({ children: [new Paragraph(tx.category)] }),
          new TableCell({ children: [new Paragraph(amountStr)] }),
          new TableCell({ children: [new Paragraph(tx.description || '-')] }),
        ],
      })
    );
  });

  if (sortedTx.length === 0) {
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph("Ushbu davrda operatsiyalar yo'q")], columnSpan: 5 })
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
              new TextRun({ text: `💰 Sof Qoldiq: ${formattedBalance} ${currency}`, bold: true })
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
