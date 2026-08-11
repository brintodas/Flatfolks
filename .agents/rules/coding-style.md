# Flatfolks Project — Coding Style Rules

## Purpose
This project is a university assignment written by a team of 5 CSE students.
All code must look like it was naturally written by a student developer, not AI-generated.

---

## Code Style Rules

### General
- Write simple, straightforward code. Avoid over-engineering.
- Do NOT add JSDoc comments or block comments above every function.
- Do NOT comment every single line. Only add a comment when something is genuinely confusing.
- Use simple, short variable names where appropriate (e.g., `data`, `res`, `err`, `i`, `item`).
- Leave occasional `console.log()` statements in backend code for debugging (students do this).
- Do NOT handle every possible edge case perfectly. Basic error handling is fine.
- Avoid very advanced patterns like higher-order functions chains everywhere, complex reducers, etc.
- Prefer simple `if/else` blocks over clever one-liners when logic is non-trivial.
- It is okay to have some repeated code rather than always abstracting everything into reusable functions.

### React / Frontend
- Use functional components with hooks. Keep them simple.
- Do NOT add PropTypes definitions unless asked.
- Variable names should feel natural — mix of descriptive and short names is fine.
- Not every component needs to be broken into tiny sub-components. Some length is natural.
- Use basic inline styles occasionally alongside Tailwind — students mix these.
- Leave a TODO comment here and there where a feature is incomplete.
- Import order does not need to be perfectly organized.
- Use `useState`, `useEffect` naturally — no need for useCallback/useMemo everywhere.

### Backend (Node/Express)
- Keep route handlers in the same file as routes sometimes — students don't always separate controllers.
- Use `req, res` as parameter names always.
- Use `console.log(err)` in catch blocks instead of a fancy logger.
- Basic try/catch is fine. No need for custom error middleware classes.
- SQL queries can be written as plain template strings — no need for a fancy query builder layer.
- Responses should be simple JSON: `res.json({ success: true, data: result })`.
- Validation can be done with basic if/else, not a validation library.

### Database
- Table and column names should be simple and clear (snake_case).
- No need for complex database migrations setup — plain SQL CREATE TABLE statements are fine.

### Naming Conventions
- Variables: camelCase
- Files: PascalCase for components, camelCase for routes/utils
- Database columns: snake_case
- CSS classes: follow Tailwind conventions

### What to AVOID (these make code look AI-generated)
- Do NOT write a comment above every function explaining what it does.
- Do NOT add `// Helper function to...` style comments everywhere.
- Do NOT use overly formal variable names like `propertyListingData` when `listing` works.
- Do NOT handle 10 edge cases when the feature only needs 2.
- Do NOT structure every file perfectly with sections labeled with comments like `// ============ CONSTANTS ============`.
- Do NOT add extensive README-style inline documentation.
- Do NOT use `Array.prototype.reduce` when a simple loop works fine.
- Avoid using every ES6+ feature just to show off — write naturally.
