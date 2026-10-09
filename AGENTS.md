# Repository conventions

- Use Aurelia 2 with TC39 decorators, `.trigger` events, `resolve()` or explicit DI, and lazy routes. Do not enable legacy TypeScript decorators.
- Keep feature endpoints and DTOs together under `src/Starter.Api/Features`. Use typed results, async EF queries, cancellation tokens, and Problem Details.
- Generate browser contracts with `npm run api:types` after changing API contracts. Never edit the generated schema by hand.
- Commit EF migrations and both npm and NuGet lockfiles. Production startup must not silently migrate a database unless explicitly configured.
- Keep styling in the Aurelia pink palette. Check keyboard interaction, contrast, and narrow layouts after UI changes.
- Run `npm run check`, `npm run format:check`, and `npm run test:e2e` for changes spanning the stack. Smaller changes need the relevant checks.
- Tests use isolated databases. Never point test processes at a developer's database. Read configuration inside service factories, not before `builder.Build()`: `WebApplicationFactory` applies its overrides during `Build()`.
- Keep keyboard focus on the control a user acted on. Busy buttons use `aria-disabled` and view-model guards, because a natively disabled button drops focus.
- Use the configured human Git identity. Do not add tooling attribution or co-author trailers to commits.
