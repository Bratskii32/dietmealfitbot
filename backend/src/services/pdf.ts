import PdfPrinter from 'pdfmake';
import path from 'path';
import { fileURLToPath } from 'url';
import type { WeekPlan } from './claude.js';
import type { Content } from 'pdfmake/interfaces';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fontDir = path.join(__dirname, '../../node_modules/pdfmake/examples/fonts');

const printer = new PdfPrinter({
  Roboto: {
    normal: path.join(fontDir, 'Roboto-Regular.ttf'),
    bold: path.join(fontDir, 'Roboto-Medium.ttf'),
    italics: path.join(fontDir, 'Roboto-Italic.ttf'),
    bolditalics: path.join(fontDir, 'Roboto-MediumItalic.ttf'),
  },
});

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  dinner: 'Ужин',
  snack: 'Перекус',
};

export async function generateMenuPdfBuffer(plan: WeekPlan, title: string): Promise<Buffer> {
  const content: Content[] = [
    { text: title, style: 'header' },
    {
      text: `Суточная норма: ${plan.dailyCalories} ккал | Б:${plan.dailyProtein}г Ж:${plan.dailyFat}г У:${plan.dailyCarbs}г`,
      fontSize: 10,
      margin: [0, 0, 0, 16] as [number, number, number, number],
    },
  ];

  for (const day of plan.days) {
    content.push({ text: `День ${day.dayNumber}`, style: 'subheader' });
    for (const meal of day.meals) {
      const r = meal.recipe;
      content.push(
        { text: `${MEAL_LABELS[meal.type] || meal.type}: ${r.name}`, bold: true, margin: [0, 6, 0, 2] as [number, number, number, number] },
        { text: `${r.calories} ккал | Б:${r.protein}г Ж:${r.fat}г У:${r.carbs}г | ${r.cookingTime} мин`, fontSize: 9 },
        { text: r.description || '', fontSize: 9, color: '#555555', margin: [0, 0, 0, 8] as [number, number, number, number] }
      );
    }
  }

  content.push({
    text: '⚕️ Не является медицинской рекомендацией. @dietmealfitbot',
    fontSize: 8,
    color: '#888888',
    margin: [0, 20, 0, 0] as [number, number, number, number],
  });

  const docDefinition = {
    content,
    styles: {
      header: { fontSize: 18, bold: true, margin: [0, 0, 0, 8] as [number, number, number, number] },
      subheader: { fontSize: 14, bold: true, margin: [0, 14, 0, 4] as [number, number, number, number] },
    },
    defaultStyle: { font: 'Roboto', fontSize: 11 },
  };

  return new Promise((resolve, reject) => {
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const chunks: Buffer[] = [];
    pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
    pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
    pdfDoc.on('error', reject);
    pdfDoc.end();
  });
}
