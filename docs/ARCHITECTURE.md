# Prompt Engine architecture

## Required pipeline

```text
Natural Language
      |
      v
    Parser
      |
      v
  VisualSpec
      |
      v
Prompt Doctor
      |
      v
   Compiler
      |
      v
Model Adapter
      |
      v
    Output
```

There is deliberately no `Natural Language -> Prompt` shortcut. Every prompt must be derived from a validated `VisualSpec`, which is the system's canonical intermediate representation.

## Module responsibilities

### Natural Language input

The boundary accepts the user's description and, later, optional edit instructions or reference identifiers. It preserves the original text for traceability but does not attach model-specific prompt syntax.

### Parser

The Parser extracts visual intent into candidate `VisualSpec` fields. It may identify uncertainty or missing information, but it must not format a final prompt or make model-specific decisions. Its output is untrusted until validated by the Zod schema.

Inputs:

- Natural-language description
- Optional existing `VisualSpec` for an edit operation
- Optional reference metadata

Outputs:

- A candidate `VisualSpec`
- Parse-time ambiguities, missing-information records, and confidence metadata

The deterministic Chinese parser exposes `ParserInputSchema` and `ParserOutputSchema`. Its result contains the validated specification, blocking or non-blocking ambiguities, missing-information questions, an overall confidence score, and evidence-backed field confidence scores. It is conservative: unmatched details are not invented.

The optional enhanced path is deliberately ordered:

```text
Deterministic rules -> LLM supplement -> protected merge -> Zod validation -> VisualSpec
```

`parseVisualIntentEnhanced` receives an injected provider function, so the Prompt Engine stays pure and provider-neutral. Rule-recognized paths are authoritative: an LLM attempt to change one is ignored and recorded. Added fields carry `llm` provenance; deterministic fields carry `rule` provenance. The server adapter currently supports OpenAI Structured Outputs and DeepSeek JSON Output, selected only through server-side environment variables.

### VisualSpec

`VisualSpec` is the versioned intermediate representation shared by all downstream modules. It separates subject, identity, appearance, wardrobe, pose, composition, camera, environment, lighting, color, aesthetic, constraints, and negative constraints.

It owns domain structure and validation, not parsing behavior, diagnostics, or final prompt wording. Model-specific tokens, command flags, aspect-ratio syntax, quality switches, and provider policies do not belong here.

Identity, wardrobe, pose, camera, environment, and lighting remain independently lockable. Lock-aware merge operations preserve those modules during a reparse or LLM supplement. Reference IDs and explicit identity locks provide the foundation for future multi-reference editing without implementing image analysis now.

### Prompt Doctor

Prompt Doctor receives a valid `VisualSpec` and returns diagnostics. It detects issues such as incompatible camera directions, a full-body requirement combined with a close crop, missing placement for removed wardrobe, conflicting light instructions, or constraints that a selected model cannot reliably express.

It returns structured diagnostics with severity, affected paths, explanation, and optional suggested changes. It does not mutate the specification silently and does not render model prompts.

The first rule set covers camera/lens mismatches, camera-distance and framing conflicts, crop and viewpoint conflicts, action and limb/pose conflicts, spatial placement conflicts, and contradictory wardrobe state or color. Diagnostics use `error`, `warning`, or `suggestion`; only errors block compilation.

### Compiler

The Compiler converts a diagnosed `VisualSpec` into a deterministic, model-neutral compiled representation. It resolves ordering, removes redundant wording, and translates structured values into clear visual concepts.

The Compiler must not know provider command syntax. It may consume accepted Doctor corrections explicitly supplied by the caller; it must not hide unresolved high-severity conflicts.

The model-neutral `CompiledVisualPlan` contains ordered semantic sections, normalized requirements and avoidances, reference metadata, and source schema version. It contains no provider flags or API parameters.

### Model Adapter

An Adapter converts the model-neutral compiled representation into the format expected by one image-generation model. This is the only layer that owns model-specific syntax, supported capabilities, parameter conventions, negative-prompt behavior, and safe degradation when a feature is unsupported.

The first complete adapter targets the GPT Image family and currently emits prompts for `gpt-image-2`. It follows the official GPT Image guidance by using a stable scene-first order, short labeled sections, explicit requirements, explicit avoidances, and separately identified references. It does not call the OpenAI API. Other models implement the small `ModelAdapter` contract only when scheduled.

### Output

The output boundary returns the compiled prompt plus provenance needed for inspection:

- Target model and adapter version
- Compiled positive prompt
- Negative prompt or equivalent constraints when supported
- Diagnostics and unsupported-feature notices
- The validated `VisualSpec` version used for compilation

Output does not persist data or call an image model inside the pure prompt-engine library.

## Current implementation map

```text
lib/prompt-engine/
  parser/       Deterministic rules, LLM supplement merge, provenance
  diff/         Lock-aware merge and leaf-level VisualSpec diff
  schemas/      VisualSpec and IdentitySpec
  doctor/       Diagnostic contracts and cross-field rules
  compiler/     Model-neutral CompiledVisualPlan
  adapters/     ModelAdapter contract and GPT Image adapter
  pipeline/     Doctor-gated compile orchestration
  fixtures/     Validated schema and compiler cases
  __tests__/    Unit and pipeline tests

app/
  studio/       Local three-rail Studio workbench
  api/parse/    Server-only enhanced parser endpoint

lib/server/
  llm-parser-provider.ts  OpenAI/DeepSeek provider boundary
```

`compileGptImagePrompt` is the current end-to-end pure-library entry point. It validates the `VisualSpec`, runs Doctor, refuses blocking errors, compiles the neutral plan, and renders the GPT Image prompt.

## Boundaries and dependencies

```text
Next.js application
  -> Zustand Studio orchestration
    -> pure TypeScript prompt engine
      -> Zod

Next.js API route
  -> provider adapter (OpenAI or DeepSeek)
    -> injected prompt-engine enhancement function

Model APIs, database, authentication, and UI must not be imported by the prompt engine. API keys remain server-side. If no LLM key exists, deterministic parsing remains fully usable.
```

Dependencies flow inward toward domain schemas and pure transformations. Next.js may call the prompt engine; the prompt engine must never import Next.js. Database records may store a validated `VisualSpec`, but persistence models must not become the domain model.

## Error handling

- Schema validation errors identify invalid paths and values.
- Parser ambiguity is represented separately from schema invalidity.
- Doctor findings are domain diagnostics, not thrown exceptions.
- Compilation fails explicitly when required information is absent or blocking conflicts remain.
- Adapter limitations are surfaced as structured notices rather than silently discarding intent.

## Evolution strategy

The `version` field controls schema evolution. Add fields as optional when possible. Once specifications are persisted, breaking changes require an explicit migration at the application boundary. Avoid plugin registries, event systems, queues, or generalized service layers until a current requirement needs them.
