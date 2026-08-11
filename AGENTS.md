# Visual Prompt Compiler engineering guide

## Project goal

Visual Prompt Compiler turns a user's natural-language visual intent into a structured `VisualSpec`, diagnoses ambiguity and contradictions, and compiles the result for a target image-generation model. The product improves clarity and model fit; it must not be designed or described as a content-safety bypass.

The MVP supports one complete model adapter. GPT Image, Grok, Midjourney, and FLUX share an adapter contract, but adapters that are not part of the current milestone must remain unimplemented until needed.

## Architecture principles

- The required pipeline is `Natural Language -> Parser -> VisualSpec -> Prompt Doctor -> Compiler -> Model Adapter -> Prompt`.
- Never introduce a direct `Natural Language -> Prompt` path.
- `VisualSpec` is the canonical intermediate representation. Parsing, diagnostics, compilation, and model formatting must remain separate concerns.
- Keep the prompt engine a pure TypeScript library. Core modules must not depend on Next.js, React, browser APIs, database clients, or network access.
- Put model-specific syntax and defaults only in adapters. Do not leak them into `VisualSpec` or the parser.
- Prefer deterministic, side-effect-free functions with explicit inputs and outputs.
- Apply KISS, YAGNI, and separation of concerns. Add abstractions only when a current use case proves the need.

## TypeScript rules

- Keep TypeScript strict mode enabled. Do not use `any`; use `unknown` at untrusted boundaries and validate it.
- Derive public schema types with `z.infer` instead of maintaining duplicate interfaces.
- Validate all external or generated data with Zod before treating it as domain data.
- Prefer discriminated unions and enums for closed vocabularies; use free text only where the domain is genuinely open-ended.
- Export explicit public types and schemas. Avoid default exports in prompt-engine modules.
- Do not use non-null assertions to silence unresolved states.

## Naming conventions

- Files and directories: `kebab-case`.
- React components, Zod schemas, and exported types: `PascalCase`.
- Functions, variables, and object fields: `camelCase`.
- Constants: `UPPER_SNAKE_CASE`.
- Zod schema values end with `Schema`; inferred types use the same base name without the suffix.
- Tests use `*.test.ts` and fixtures use `*.fixture.ts`.

## File organization

- `app/`: Next.js App Router routes and layouts only.
- `components/`: shared UI components; shadcn-generated primitives belong in `components/ui/`.
- `lib/prompt-engine/`: framework-independent prompt engine.
- `lib/prompt-engine/schemas/`: Zod schemas and inferred domain types.
- `lib/prompt-engine/fixtures/`: reusable, validated examples for tests and documentation.
- `lib/prompt-engine/__tests__/`: prompt-engine unit tests.
- `docs/`: product and architecture decisions.

Do not create repositories, service layers, event buses, queues, microservices, or speculative shared packages without a concrete current requirement.

## Prompt Engine design rules

- Preserve user intent; do not silently invent important visual facts.
- Keep identity, wardrobe, pose, environment, camera, composition, lighting, and aesthetics independently addressable.
- Represent reusable references by stable IDs and their intended roles. A reference strength is a normalized value from `0` through `1`.
- Keep locks and immutable identity features explicit so later edits can change one dimension without drifting others.
- The Prompt Doctor reports issues and suggested corrections; it does not own model formatting.
- The compiler converts validated intent into a model-neutral compiled form; an adapter performs the final model-specific rendering.
- Negative constraints describe unwanted output characteristics. They are not a mechanism for bypassing provider safeguards.
- Schema evolution must be explicit through the `version` field and backward-compatible migrations when persisted data exists.

## Testing rules

- Every schema change requires success and failure cases.
- Tests must cover boundary values, invalid enums, omitted optional fields, and representative complete fixtures.
- Tests must be deterministic and must not require a network, an LLM, a database, or environment secrets.
- Prefer behavior assertions over snapshots for core domain schemas.
- Future parser, doctor, compiler, and adapter tests should be separate unit suites, plus a small number of pipeline integration tests.

## Change discipline

- Keep each change scoped to the requested milestone; do not pre-build future product features.
- Do not add payment, membership, community, marketplace, ComfyUI, LoRA, multi-tenant, complex authorization, database, user, UI, or LLM integration until explicitly requested.
- Every modification must leave `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` passing.
- Update relevant documentation when a domain boundary or public schema changes.
- Record every completed update as a focused local Git commit with an imperative Conventional Commit message.
- Keep secrets, `.env` files, build output, logs, and dependency directories out of Git. Commit `.env.example` only with empty values.
- Push completed, verified commits to `origin/main` when network access and repository authentication are available; never rewrite shared history unless explicitly requested.
