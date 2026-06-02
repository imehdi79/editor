export interface DimensionLabel {
  // نقطه وسط برای label متن
  midX: number;
  midY: number;
  // offset هوشمند — label کجا بره تا با خط تداخل نداشته باشه
  offsetX: number;
  offsetY: number;
  // متن نهایی (فرمت شده)
  text: string;
  // زاویه خط — برای rotate کردن label
  angleDeg: number;
  // طول خط به px
  lengthPx: number;
}

const LABEL_OFFSET = 18; // فاصله label از خط

export const computeDimensionLabel = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  formattedText: string,
): DimensionLabel => {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthPx = Math.hypot(dx, dy);

  // زاویه به درجه — برای rotate label
  let angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);

  // همیشه label خوانا باشه — اگه وارونه بود برگردون
  if (angleDeg > 90 || angleDeg < -90) angleDeg += 180;

  // offset عمود بر خط — label کنار خط باشه نه روش
  const perpAngle = Math.atan2(dy, dx) - Math.PI / 2;
  const offsetX = Math.cos(perpAngle) * LABEL_OFFSET;
  const offsetY = Math.sin(perpAngle) * LABEL_OFFSET;

  return { midX, midY, offsetX, offsetY, text: formattedText, angleDeg, lengthPx };
};
