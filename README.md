# Math Adventure — Learn, Understand & Master
### مغامرة الرياضيات — تعلّم، افهم، أتقن

A bilingual (English / Arabic, with full RTL support) interactive course that helps a Grade 7 student
rebuild multiplication tables and traditional long division from the ground up.

Prepared by **Miss Eya Ghober, Teacher** · إعداد: المعلمة Eya Ghober

## What is inside
- **Multiplication** as animated equal groups (stars, apples, balloons, candy, blocks, arrays).
- **Tables 1–12** with skip counting, memory tricks, digit patterns and quick quizzes.
- **Division** as fair sharing, including remainders.
- **Long division simulator**: every step (divide → multiply → subtract → bring down → repeat) is animated,
  with play / pause / next / back / replay, speed control and tap-a-digit explanations.
- **Guided practice**: the student answers each intermediate step and gets gentle hints.
- **Seven games** (timers always optional) and a **progress dashboard** saved in the browser (no account).

## The long-division engine
`src/lib/longDivision.ts` generates every step and the exact grid position of every digit for any
positive whole numbers (one- or two-digit divisors, zero quotient digits, remainders, first digit
smaller than the divisor). Nothing is hard-coded per example. `npm test` checks it on thousands of
generated problems.

## Run it
```bash
npm install
npm run dev      # development
npm test         # engine tests
npm run build    # single-file build in dist/index.html
```

Stack: React 18, TypeScript, Vite, Framer Motion, Vitest.

## License
MIT — see [LICENSE](LICENSE).
