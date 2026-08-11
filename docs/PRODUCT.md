# Visual Prompt Compiler

## Product positioning

Visual Prompt Compiler is an AI image-prompt compilation and diagnostic platform. It helps people express a visual idea in everyday Chinese, turns that idea into a structured and inspectable `VisualSpec`, identifies likely prompt failures, and compiles the specification into model-appropriate prompts.

The product is not a generic chat wrapper and is not a content-moderation bypass tool. Its value comes from preserving intent, exposing visual decisions, reducing contradictions, and adapting one stable specification to different image models.

## User scenarios

### Turn an idea into a professional prompt

A user describes a scene without knowing terms such as focal length, framing, lighting ratio, fabric, or composition. The system asks only for material ambiguities, structures the intent, and produces a prompt that uses appropriate visual language.

### Diagnose an unsuccessful prompt

A user has a prompt that produces cropped bodies, inconsistent clothing, incorrect poses, weak identity similarity, or badly exposed faces. Prompt Doctor identifies conflicting, underspecified, or model-incompatible instructions and explains likely consequences.

### Preserve selected visual dimensions while iterating

A user can eventually lock identity while changing wardrobe, lock identity and wardrobe while changing pose, or combine separate identity, wardrobe, and pose references. The MVP defines the data model for this workflow but does not analyze images.

### Compile once for different models

A validated `VisualSpec` can eventually target GPT Image, Grok, Midjourney, or FLUX without rewriting the user's original intent. Model-specific syntax stays in adapters.

## MVP functionality

- Accept Chinese natural-language visual descriptions.
- Parse intent into a versioned `VisualSpec`.
- Let users inspect and adjust structured visual dimensions.
- Diagnose ambiguity, omissions, and internal conflicts.
- Compile a validated specification through one complete model adapter.
- Return the compiled prompt together with actionable diagnostic messages.
- Capture simple user feedback about whether the result matched intent.
- Preserve architecture interfaces for other named adapters without implementing them prematurely.

The current repository milestone implements the pure TypeScript engine path from deterministic Chinese parsing through diagnostics, model-neutral compilation, and a GPT Image adapter. It does not implement the application UI or call an image model API.

## Explicitly out of scope

- Payments, subscriptions, credits, or membership tiers
- Community features or a prompt marketplace
- ComfyUI, LoRA, or model-training workflows
- Multi-tenancy or complex permissions
- PostgreSQL and Drizzle persistence during the current milestone
- User accounts and authentication during the current milestone
- UI implementation during the current milestone
- LLM or image-model API integration during the current milestone
- Image analysis and reference-image extraction during the current milestone
- Multiple production-ready model adapters in the first MVP iteration

## Core product metrics

### Intent fidelity

- User-rated match between the requested scene and generated result
- Percentage of important `VisualSpec` fields preserved after compilation
- Frequency of manual corrections to identity, pose, wardrobe, and composition

### Prompt quality

- Prompt Doctor contradiction rate before and after correction
- Rate of generations with common failures such as unwanted crops, identity drift, wardrobe drift, or incorrect pose
- Percentage of sessions that reach a valid, compilable specification

### Workflow efficiency

- Time from natural-language input to accepted compiled prompt
- Number of correction turns before acceptance
- Compile success rate by model adapter

### Product usefulness

- Percentage of users who copy, export, or generate from a compiled prompt
- Explicit positive/negative feedback on compiled outputs
- Repeat use of saved or revised specifications once persistence exists

Early evaluation should prioritize intent fidelity and failure reduction over engagement volume.
