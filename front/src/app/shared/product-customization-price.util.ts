import type { ProductQuestion } from '../services/api.service';

export type ProductCustomizationAnswers = Record<string, string | number | string[]>;

export function questionChoiceOptions(question: ProductQuestion): string[] {
  if (Array.isArray(question.options)) return question.options.map(String);
  if (question.options && 'choices' in question.options && Array.isArray(question.options.choices)) {
    return question.options.choices.map(String);
  }
  return [];
}

export function questionOptionPriceCents(question: ProductQuestion, option: string): number {
  if (!question.options || Array.isArray(question.options) || !('prices_cents' in question.options)) {
    return 0;
  }
  const raw = question.options.prices_cents?.[option];
  return Number.isInteger(raw) && Number(raw) > 0 ? Number(raw) : 0;
}

export function customizationSurchargeCents(
  questions: ProductQuestion[] | undefined,
  answers: ProductCustomizationAnswers | undefined,
): number {
  if (!questions?.length || !answers) return 0;
  return questions.reduce((total, question) => {
    const answer = answers[String(question.id)];
    const selected = (Array.isArray(answer) ? answer : [answer]) as Array<string | number>;
    return total + selected.reduce<number>(
      (subtotal, option) => subtotal + (typeof option === 'string' ? questionOptionPriceCents(question, option) : 0),
      0,
    );
  }, 0);
}

export function effectiveProductPriceCents(
  basePriceCents: number,
  questions: ProductQuestion[] | undefined,
  answers: ProductCustomizationAnswers | undefined,
): number {
  return basePriceCents + customizationSurchargeCents(questions, answers);
}

export function questionOptionLabel(
  question: ProductQuestion,
  option: string,
  formatPrice: (priceCents: number) => string,
): string {
  const price = questionOptionPriceCents(question, option);
  return price > 0 ? `${option} (+${formatPrice(price)})` : option;
}
