import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const sourcePath = join(process.cwd(), 'src/app/shared/product-customization-price.util.ts');
const source = readFileSync(sourcePath, 'utf8').replace(
  /import type \{ ProductQuestion \} from '[^']+';\s*/,
  'type ProductQuestion = any;\n',
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const sandbox = { exports: {}, console };
vm.createContext(sandbox);
vm.runInContext(compiled.outputText, sandbox, { filename: 'product-customization-price.util.js' });

const {
  questionOptionPriceCents,
  customizationSurchargeCents,
  effectiveProductPriceCents,
  questionOptionLabel,
} = sandbox.exports;

const question = {
  id: 12,
  type: 'choice',
  label: 'Extra noodles',
  options: {
    choices: ['No extra noodles', 'Add noodles', 'Double noodles'],
    prices_cents: { 'Add noodles': 150, 'Double noodles': 300 },
  },
};

if (questionOptionPriceCents(question, 'Add noodles') !== 150) throw new Error('single option surcharge failed');
if (customizationSurchargeCents([question], { 12: 'Double noodles' }) !== 300) throw new Error('answer surcharge failed');
if (effectiveProductPriceCents(1280, [question], { 12: 'Add noodles' }) !== 1430) throw new Error('effective price failed');
if (questionOptionLabel(question, 'Add noodles', (cents) => `SGD ${(cents / 100).toFixed(2)}`) !== 'Add noodles (+SGD 1.50)') {
  throw new Error('priced choice label failed');
}
if (questionOptionPriceCents(question, 'No extra noodles') !== 0) throw new Error('zero-price choice failed');

console.log('[product-customization-pricing] all add-on pricing checks passed');
