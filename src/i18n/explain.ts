import type { Cell, Prompt, Solution, Step } from '../lib/longDivision';
import { M, type Lang } from './strings';

const ar = (l: Lang) => l === 'ar';

export function placeName(place: number, lang: Lang): string {
  const en = ['ones', 'tens', 'hundreds', 'thousands', 'ten-thousands'];
  const arb = ['الآحاد', 'العشرات', 'المئات', 'الآلاف', 'عشرات الآلاف'];
  return (ar(lang) ? arb : en)[Math.min(place, 4)];
}

export interface Explanation { title: string; lines: string[]; why?: string }

export function explainStep(s: Step, sol: Solution, lang: Lang, school = false): Explanation {
  const p = s.params;
  const A = ar(lang);
  switch (s.kind) {
    case 'intro':
      return {
        title: A ? 'لنبدأ' : 'Let’s start',
        lines: [
          A ? `سنحلّ ${M(`${p.n} ÷ ${p.d}`)}.` : `We will solve ${M(`${p.n} ÷ ${p.d}`)}.`,
          A
            ? `${M(p.n)} هو المقسوم (ما سنوزّعه) و${M(p.d)} هو المقسوم عليه (الذي نقسم به).`
            : `${M(p.n)} is the dividend (what we share) and ${M(p.d)} is the divisor (what we divide by).`,
        ],
        why: A ? 'سنكرّر الدائرة: اقسم ← اضرب ← اطرح ← أنزل ← كرّر.' : 'We will repeat one loop: Divide → Multiply → Subtract → Bring down → Repeat.',
      };
    case 'take': {
      if (p.first) {
        if (p.fits)
          return {
            title: A ? 'انظر إلى الرقم الأول' : 'Look at the first digit',
            lines: [
              A
                ? `انظر إلى أول رقم: ${M(p.cur!)}. هل يمكن قسمة ${M(p.cur!)} على ${M(p.d)}؟ نعم! ${M(p.cur!)} ليس أصغر من ${M(p.d)}.`
                : `Look at the first digit: ${M(p.cur!)}. Can ${M(p.d)} fit into ${M(p.cur!)}? Yes! ${M(p.cur!)} is not smaller than ${M(p.d)}.`,
            ],
          };
        if (p.noMore)
          return {
            title: A ? 'الرقم أصغر من المقسوم عليه' : 'The number is too small',
            lines: [
              A
                ? `${M(p.n)} أصغر من ${M(p.d)}، فلا يتسع ${M(p.d)} فيه ولا مرة. الناتج ${M(0)} والباقي ${M(p.n)}.`
                : `${M(p.n)} is smaller than ${M(p.d)}, so ${M(p.d)} fits ${M(0)} times. The quotient is ${M(0)} and the remainder is ${M(p.n)}.`,
            ],
          };
        return {
          title: A ? 'انظر إلى الرقم الأول' : 'Look at the first digit',
          lines: [
            A
              ? `انظر إلى أول رقم: ${M(p.cur!)}. هل يتسع ${M(p.d)} في ${M(p.cur!)}؟ لا، ${M(p.cur!)} أصغر من ${M(p.d)}.`
              : `Look at the first digit: ${M(p.cur!)}. Can ${M(p.d)} fit into ${M(p.cur!)}? No, ${M(p.cur!)} is smaller than ${M(p.d)}.`,
          ],
          why: A ? 'عندما يكون الرقم الأول صغيراً، نأخذ الرقم التالي معه.' : 'When the first digit is too small, we take the next digit too.',
        };
      }
      const nd = p.chunkDigits!;
      const dig = A ? (nd === 2 ? 'أول رقمين' : `أول ${nd} أرقام`) : `the first ${nd} digits`;
      if (p.fits)
        return {
          title: A ? 'خذ رقماً آخر' : 'Take another digit',
          lines: [
            A
              ? `إذن نأخذ ${dig}: ${M(p.cur!)}. هل يتسع ${M(p.d)} في ${M(p.cur!)}؟ نعم!`
              : `So we take ${dig}: ${M(p.cur!)}. Can ${M(p.d)} fit into ${M(p.cur!)}? Yes!`,
          ],
          why: A ? 'الآن لدينا عدد كبير بما يكفي لنبدأ القسمة.' : 'Now the number is big enough to start dividing.',
        };
      if (p.noMore)
        return {
          title: A ? 'لا توجد أرقام أخرى' : 'No more digits',
          lines: [
            A
              ? `أخذنا كل الأرقام: ${M(p.cur!)}، وما زال أصغر من ${M(p.d)}. الناتج ${M(0)} والباقي ${M(p.n)}.`
              : `We took every digit: ${M(p.cur!)} is still smaller than ${M(p.d)}. The quotient is ${M(0)} and the remainder is ${M(p.n)}.`,
          ],
        };
      return {
        title: A ? 'خذ رقماً آخر' : 'Take another digit',
        lines: [
          A
            ? `نأخذ ${dig}: ${M(p.cur!)}. هل يتسع ${M(p.d)} في ${M(p.cur!)}؟ ما زال أصغر. نأخذ رقماً آخر.`
            : `We take ${dig}: ${M(p.cur!)}. Does ${M(p.d)} fit into ${M(p.cur!)}? Still too small, so we take one more digit.`,
        ],
      };
    }
    case 'divide': {
      const place = placeName(p.place!, lang);
      const lines = [
        A
          ? `اقسم: كم مرة يتسع ${M(p.d)} في ${M(p.cur!)}؟  ${M(`${p.cur} ÷ ${p.d} = ${p.q}`)}`
          : `Divide: how many times does ${M(p.d)} fit into ${M(p.cur!)}?  ${M(`${p.cur} ÷ ${p.d} = ${p.q}`)}`,
        A
          ? `قدّر بالضرب: ${M(`${p.d} × ${p.q} = ${p.d! * p.q!}`)} يتسع، لكن ${M(`${p.d} × ${p.q! + 1} = ${p.over}`)} أكبر من ${M(p.cur!)}.`
          : `Estimate with multiplication: ${M(`${p.d} × ${p.q} = ${p.d! * p.q!}`)} fits, but ${M(`${p.d} × ${p.q! + 1} = ${p.over}`)} is bigger than ${M(p.cur!)}.`,
        school
          ? A
            ? `اكتب ${M(p.q!)} على اليمين تحت المقسوم عليه، بجانب أرقام الناتج السابقة. هذا الرقم يخص خانة ${place}.`
            : `Write ${M(p.q!)} on the right, under the divisor, next to the earlier quotient digits. It belongs to the ${place} place.`
          : A
            ? `اكتب ${M(p.q!)} فوق الرقم ${M(sol.digits[p.col!])} في خانة ${place}.`
            : `Write ${M(p.q!)} above the digit ${M(sol.digits[p.col!])}, in the ${place} column.`,
      ];
      const why = p.zero
        ? A
          ? `${M(p.cur!)} أصغر من ${M(p.d)}، فيتسع ${M(0)} مرة. يجب أن نكتب ${M(0)} في خانة ${place}. الصفر يحفظ مكان الأرقام، وبدونه يصبح الناتج أصغر بكثير.`
          : `${M(p.cur!)} is smaller than ${M(p.d)}, so it fits ${M(0)} times. We must still write ${M(0)} in the ${place} column. The zero holds the place so every other digit stays in the right position. Without it the answer would be far too small.`
        : school
          ? A ? 'نكتب أرقام الناتج بالترتيب تحت المقسوم عليه.' : 'Quotient digits are written in order, under the divisor.'
          : A
            ? 'نكتب رقم الناتج دائماً فوق آخر رقم أخذناه.'
            : 'A quotient digit is always written above the LAST digit we used.';
      return { title: A ? 'اقسم' : 'Divide', lines, why };
    }
    case 'multiply':
      return {
        title: A ? 'اضرب' : 'Multiply',
        lines: [
          A
            ? `اضرب رقم الناتج في المقسوم عليه: ${M(`${p.q} × ${p.d} = ${p.prod}`)}.`
            : `Multiply the new quotient digit by the divisor: ${M(`${p.q} × ${p.d} = ${p.prod}`)}.`,
          A
            ? `اكتب ${M(p.prod!)} تحت ${M(p.cur!)} مع محاذاة الأرقام من اليمين.`
            : `Write ${M(p.prod!)} under ${M(p.cur!)}, lined up on the right.`,
        ],
      };
    case 'subtract':
      return {
        title: A ? 'اطرح' : 'Subtract',
        lines: [
          A
            ? `اطرح: ${M(`${p.cur} − ${p.prod} = ${p.rem}`)}. ارسم خطاً واكتب ${M(p.rem!)} تحته.`
            : `Subtract: ${M(`${p.cur} − ${p.prod} = ${p.rem}`)}. Draw a line and write ${M(p.rem!)} underneath.`,
        ],
        why: A
          ? `تحقّق: الباقي ${M(p.rem!)} يجب أن يكون أصغر من ${M(p.d)}: ${M(`${p.rem} < ${p.d}`)} ✓`
          : `Safety check: the result must be smaller than the divisor: ${M(`${p.rem} < ${p.d}`)} ✓`,
      };
    case 'bringdown': {
      const shown = p.rem === 0 ? `${p.digit}` : `${p.newCur}`;
      return {
        title: A ? 'أنزل' : 'Bring down',
        lines: [
          A
            ? `أنزل الرقم التالي من المقسوم: ${M(p.digit!)}. صار عندنا ${M(shown)}.`
            : `Bring down the next digit from the dividend: ${M(p.digit!)}. Now we have ${M(shown)}.`,
          A ? 'كرّر: اقسم من جديد!' : 'Repeat: divide again!',
        ],
        why:
          p.rem === 0
            ? A
              ? `الباقي ${M(0)} لا يغيّر قيمة العدد، لذلك نكمل بالرقم ${M(p.digit!)} فقط.`
              : `The remainder was ${M(0)}, so it adds nothing. We carry on with just ${M(p.digit!)}.`
            : undefined,
      };
    }
    case 'remainder':
      return {
        title: A ? 'الباقي' : 'Remainder',
        lines: [
          A
            ? `لا توجد أرقام أخرى. ${M(p.rem!)} أصغر من ${M(p.d)}، فلا يتسع ${M(p.d)} فيه مرة أخرى.`
            : `No digits are left. ${M(p.rem!)} is smaller than ${M(p.d)}, so ${M(p.d)} cannot fit again.`,
          A ? `الباقي هو ${M(p.rem!)}.` : `The remainder is ${M(p.rem!)}.`,
        ],
        why: A ? 'الباقي دائماً أصغر من المقسوم عليه.' : 'The remainder is always smaller than the divisor.',
      };
    case 'done': {
      const r = p.remainder!;
      return {
        title: A ? 'الإجابة النهائية' : 'Final answer',
        lines: [
          r === 0
            ? A
              ? `الإجابة: ${M(`${p.n} ÷ ${p.d} = ${p.quotient}`)}.`
              : `Final answer: ${M(`${p.n} ÷ ${p.d} = ${p.quotient}`)}.`
            : A
              ? `الإجابة: ${M(p.quotient!)} والباقي ${M(r)}.`
              : `Final answer: ${M(p.quotient!)} remainder ${M(r)}.`,
          r === 0
            ? A ? `تحقّق بالضرب: ${M(`${p.quotient} × ${p.d} = ${p.n}`)} ✓` : `Check by multiplying: ${M(`${p.quotient} × ${p.d} = ${p.n}`)} ✓`
            : A ? `تحقّق: ${M(`${p.quotient} × ${p.d} + ${r} = ${p.n}`)} ✓` : `Check: ${M(`${p.quotient} × ${p.d} + ${r} = ${p.n}`)} ✓`,
        ],
      };
    }
  }
}

/** Explains what a tapped number on the board is doing right now. */
export function explainCell(c: Cell, step: number, sol: Solution, lang: Lang, school = false): string {
  const A = ar(lang);
  const m = c.meta ?? {};
  switch (c.role) {
    case 'dividend': {
      const used = c.usedStep !== undefined && step >= c.usedStep;
      const place = placeName(sol.digits.length - 1 - c.col, lang);
      return A
        ? `الرقم ${M(c.text)} في خانة ${place} من المقسوم. ${used ? 'استخدمناه بالفعل.' : 'لم نستخدمه بعد، سننزله لاحقاً.'}`
        : `The digit ${M(c.text)} in the ${place} place of the dividend. ${used ? 'We have already used it.' : 'We have not used it yet. It will be brought down later.'}`;
    }
    case 'divisor':
      return A
        ? `${M(sol.d)} هو المقسوم عليه. نقسم به في كل دورة.`
        : `${M(sol.d)} is the divisor. We divide by it in every round.`;
    case 'quotient':
      return A
        ? `${M(c.text)} رقم من الناتج: ${M(`${m.cur} ÷ ${m.d} = ${m.q}`)}. ${school ? 'كُتب تحت المقسوم عليه بالترتيب.' : 'كُتب فوق آخر رقم استخدمناه.'}`
        : `${M(c.text)} is a digit of the answer: ${M(`${m.cur} ÷ ${m.d} = ${m.q}`)}. ${school ? 'It is written under the divisor, in order.' : 'It sits above the last digit we used.'}`;
    case 'product':
      return A
        ? `الصف ${M(m.prod!)} هو ${M(`${m.q} × ${m.d}`)}. سنطرحه من ${M(m.cur!)}.`
        : `The row ${M(m.prod!)} is ${M(`${m.q} × ${m.d}`)}. We subtract it from ${M(m.cur!)}.`;
    case 'minus':
      return A ? 'علامة الطرح: نطرح هذا الصف من الصف الذي فوقه.' : 'The minus sign: we subtract this row from the row above it.';
    case 'remainder':
      return A
        ? `الصف ${M(m.rem!)} هو ما تبقّى: ${M(`${m.cur} − ${m.prod} = ${m.rem}`)}. يجب أن يكون أصغر من ${M(m.d!)}.`
        : `The row ${M(m.rem!)} is what is left: ${M(`${m.cur} − ${m.prod} = ${m.rem}`)}. It must be smaller than ${M(m.d!)}.`;
    case 'bring':
      return A
        ? `${M(c.text)} نزل من المقسوم ليصنع مع الباقي عدداً جديداً نقسمه.`
        : `${M(c.text)} was brought down from the dividend to make a new number to divide.`;
    case 'rlabel':
      return A ? `R تعني الباقي، وهنا الباقي ${M(m.rem!)}.` : `R means remainder. Here the remainder is ${M(m.rem!)}.`;
  }
}

/** Hints for the guided solver. level 1 is gentle, level 2 is much clearer. */
export function promptText(p: Prompt, sol: Solution, lang: Lang, school = false): { ask: string; hint1: string; hint2: string } {
  const A = ar(lang);
  const q = p.params;
  const d = sol.d;
  const firstDigit = sol.digits[0];
  switch (p.kind) {
    case 'take':
      return {
        ask: A
          ? `خذ أرقاماً من اليسار حتى يصبح العدد ${M(`≥ ${d}`)}. ما العدد الذي أخذته؟`
          : `Take digits from the left until the number is ${M(`≥ ${d}`)}. Which number do you get?`,
        hint1: A
          ? `هل الرقم ${M(firstDigit)} أكبر من ${M(d)} أو يساويه؟ إن لم يكن، أضف الرقم التالي.`
          : `Is ${M(firstDigit)} at least ${M(d)}? If not, add the next digit.`,
        hint2: A ? `نحتاج أول ${String(p.answer).length} أرقام. العدد يبدأ بـ ${M(String(p.answer)[0])}.` : `We need the first ${String(p.answer).length} digit(s). The number starts with ${M(String(p.answer)[0])}.`,
      };
    case 'divide':
      return {
        ask: A ? `كم مرة يتسع ${M(d)} في ${M(q.cur!)}؟` : `How many times does ${M(d)} fit into ${M(q.cur!)}?`,
        hint1: A ? `عدّ بقفزات ${M(d)}: ${skip(d, 5)} ... حتى تقترب من ${M(q.cur!)} من دون أن تتجاوزه.` : `Count by ${M(d)}s: ${skip(d, 5)} … until you get close to ${M(q.cur!)} without going over.`,
        hint2: A ? `${M(`${d} × ${q.q} = ${d * q.q!}`)} يتسع، أما ${M(`${d} × ${q.q! + 1} = ${q.over}`)} فكبير جداً.` : `${M(`${d} × ${q.q} = ${d * q.q!}`)} fits, but ${M(`${d} × ${q.q! + 1} = ${q.over}`)} is too big.`,
      };
    case 'place':
      return {
        ask: school
          ? A ? `اضغط على آخر رقم أخذناه من المقسوم. سنكتب ${M(q.q!)} على اليمين تحت المقسوم عليه.` : `Tap the LAST digit we took from the dividend. Then ${M(q.q!)} is written on the right, under the divisor.`
          : A ? `أين نكتب ${M(q.q!)}؟ اضغط على الرقم الذي سيكون الناتج فوقه.` : `Where do we write ${M(q.q!)}? Tap the digit it should sit above.`,
        hint1: A ? 'رقم الناتج يخص آخر رقم أخذناه من المقسوم.' : 'A quotient digit belongs to the LAST digit we took from the dividend.',
        hint2: A ? `آخر رقم أخذناه هو الرقم ${M(sol.digits[q.col!])}.` : `The last digit we took is ${M(sol.digits[q.col!])}.`,
      };
    case 'multiply':
      return {
        ask: A ? `اضرب: ${M(`${q.q} × ${d}`)} = ؟` : `Multiply: ${M(`${q.q} × ${d}`)} = ?`,
        hint1: A ? `اضرب رقم الناتج ${M(q.q!)} في المقسوم عليه ${M(d)}.` : `Multiply the quotient digit ${M(q.q!)} by the divisor ${M(d)}.`,
        hint2: A ? `${M(d)} مكرراً ${M(q.q!)} مرات: ${M(Array(q.q!).fill(d).join(' + ') || '0')}` : `${M(d)} added ${M(q.q!)} times: ${M(Array(q.q!).fill(d).join(' + ') || '0')}`,
      };
    case 'subtract':
      return {
        ask: A ? `اطرح: ${M(`${q.cur} − ${q.prod}`)} = ؟` : `Subtract: ${M(`${q.cur} − ${q.prod}`)} = ?`,
        hint1: A ? `ابدأ من ${M(q.prod!)} وعُدّ صعوداً حتى ${M(q.cur!)}.` : `Start at ${M(q.prod!)} and count up to ${M(q.cur!)}.`,
        hint2: A ? `${M(`${q.prod} + ${q.rem} = ${q.cur}`)}، إذن الفرق ${M(q.rem!)}.` : `${M(`${q.prod} + ${q.rem} = ${q.cur}`)}, so the difference is ${M(q.rem!)}.`,
      };
    case 'bring':
      return {
        ask: A ? 'أي رقم ننزل الآن؟ اضغط عليه في المقسوم.' : 'Which digit do we bring down now? Tap it in the dividend.',
        hint1: A ? 'ننزل الرقم التالي الذي لم نستخدمه بعد، من اليسار إلى اليمين.' : 'Bring down the next digit we have not used yet, moving left to right.',
        hint2: A ? `الرقم التالي هو ${M(sol.digits[p.answer])}.` : `The next digit is ${M(sol.digits[p.answer])}.`,
      };
    case 'remainder':
      return {
        ask: A ? 'لا توجد أرقام أخرى. ما هو الباقي؟' : 'No digits are left. What is the remainder?',
        hint1: A ? `الباقي هو آخر عدد في أسفل اللوحة. يجب أن يكون أصغر من ${M(d)}.` : `The remainder is the last number at the bottom. It must be smaller than ${M(d)}.`,
        hint2: A ? `${M(`${q.cur} − ${q.prod}`)} = ؟` : `${M(`${q.cur} − ${q.prod}`)} = ?`,
      };
    case 'final':
      return {
        ask: A ? 'اقرأ الأرقام فوق اللوحة. ما ناتج القسمة؟' : 'Read the digits above the bracket. What is the quotient?',
        hint1: A ? 'اقرأ أرقام الناتج من اليسار إلى اليمين.' : 'Read the quotient digits from left to right.',
        hint2: A ? `الناتج يتكوّن من ${sol.digits.length - sol.startCol} أرقام.` : `The quotient has ${sol.digits.length - sol.startCol} digit(s).`,
      };
  }
}

const skip = (d: number, n: number) => M(Array.from({ length: n }, (_, i) => d * (i + 1)).join(', '));

/** Arabic number words for the multiplication narration. */
const F = ['', 'مجموعة واحدة', 'مجموعتان', 'ثلاث مجموعات', 'أربع مجموعات', 'خمس مجموعات', 'ست مجموعات', 'سبع مجموعات', 'ثماني مجموعات', 'تسع مجموعات', 'عشر مجموعات', 'إحدى عشرة مجموعة', 'اثنتا عشرة مجموعة'];
const MS = ['', 'عنصر واحد', 'عنصران', 'ثلاثة عناصر', 'أربعة عناصر', 'خمسة عناصر', 'ستة عناصر', 'سبعة عناصر', 'ثمانية عناصر', 'تسعة عناصر', 'عشرة عناصر', 'أحد عشر عنصراً', 'اثنا عشر عنصراً'];
const EN = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];

export function multNarration(a: number, b: number, lang: Lang): string {
  const t = a * b;
  if (lang === 'ar') return `${F[a]}، في كل مجموعة ${MS[b]}، يعني المجموع ${t}.`;
  const w = EN[a];
  const bw = EN[b].toLowerCase();
  const tw = t <= 12 ? EN[t].toLowerCase() : String(t);
  return `${w} group${a > 1 ? 's' : ''} of ${bw} make${a > 1 ? '' : 's'} ${tw}.`;
}

export function trickFor(n: number, lang: Lang): string {
  const T: Record<number, [string, string]> = {
    1: ['Any number times 1 stays the same. One group of anything is just that thing.', 'أي عدد مضروب في 1 يبقى كما هو. مجموعة واحدة من أي شيء تساوي ذلك الشيء.'],
    2: ['Doubles! Every answer is even and ends in 0, 2, 4, 6 or 8. Count 2, 4, 6, 8…', 'الضعف! كل الإجابات زوجية وتنتهي بـ 0 أو 2 أو 4 أو 6 أو 8. عدّ 2، 4، 6، 8…'],
    3: ['Double it, then add one more: 3 × 7 = 14 + 7 = 21. Digit sums are 3, 6 or 9.', 'ضاعف ثم أضف مرة أخرى: 3 × 7 = 14 + 7 = 21. مجموع أرقام الناتج هو 3 أو 6 أو 9.'],
    4: ['Double the double. 4 × 7: 7 → 14 → 28.', 'ضاعف الضعف. 4 × 7: ‏7 ← 14 ← 28.'],
    5: ['Answers end in 0 or 5. Take half of the ×10: 5 × 8 = 80 ÷ 2 = 40.', 'الإجابات تنتهي بـ 0 أو 5. خذ نصف ×10: 5 × 8 = 80 ÷ 2 = 40.'],
    6: ['Use the ×5 table and add one more group: 6 × 7 = 5 × 7 + 7 = 35 + 7 = 42.', 'استخدم جدول ×5 وأضف مجموعة: 6 × 7 = 5 × 7 + 7 = 35 + 7 = 42.'],
    7: ['Split 7 into 5 + 2. 7 × 8 = 40 + 16 = 56. Remember 5, 6, 7, 8: 56 = 7 × 8.', 'قسّم 7 إلى 5 + 2. ‏7 × 8 = 40 + 16 = 56. تذكّر 5، 6، 7، 8: ‏56 = 7 × 8.'],
    8: ['Double three times. 8 × 6: 6 → 12 → 24 → 48. Or 10 × 6 − 2 × 6 = 60 − 12.', 'ضاعف ثلاث مرات. 8 × 6: ‏6 ← 12 ← 24 ← 48. أو 10 × 6 − 2 × 6 = 60 − 12.'],
    9: ['The digits of every answer add up to 9 (9 × 7 = 63, 6 + 3 = 9). Or do ×10 and take one group away: 9 × 7 = 70 − 7.', 'مجموع أرقام كل إجابة هو 9 (9 × 7 = 63، ‏6 + 3 = 9). أو اضرب في 10 وانقص مجموعة: 9 × 7 = 70 − 7.'],
    10: ['Just put a zero on the end. 10 × 14 = 140.', 'ضع صفراً في آخر العدد فقط. 10 × 14 = 140.'],
    11: ['Up to 9 the digit repeats: 11 × 4 = 44. For two digits, add them in the middle: 11 × 36 = 3 (3+6) 6 = 396.', 'حتى 9 يتكرر الرقم: 11 × 4 = 44. ولعدد من رقمين اجمع رقميه في الوسط: 11 × 36 = 3 (3+6) 6 = 396.'],
    12: ['12 = 10 + 2. 12 × 7 = 70 + 14 = 84.', '12 = 10 + 2. ‏12 × 7 = 70 + 14 = 84.'],
  };
  return T[n][lang === 'en' ? 0 : 1];
}

export function factHint(a: number, b: number, lang: Lang): string {
  const big = Math.max(a, b);
  const small = Math.min(a, b);
  const P = a * b;
  if (small === 1 || small === 10) return lang === 'ar' ? `${M(`${a} × ${b} = ${P}`)}` : `${M(`${a} × ${b} = ${P}`)}`;
  if (big > 5 && small > 1) {
    const split = `${small} × 5 + ${small} × ${big - 5} = ${small * 5} + ${small * (big - 5)} = ${P}`;
    return lang === 'ar' ? `قسّم ${M(big)} إلى ${M('5 + ' + (big - 5))}: ${M(split)}` : `Split ${M(big)} into ${M('5 + ' + (big - 5))}: ${M(split)}`;
  }
  const add = Array(small).fill(big).join(' + ');
  return lang === 'ar' ? `الجمع المتكرر: ${M(add + ' = ' + P)}` : `Repeated addition: ${M(add + ' = ' + P)}`;
}
