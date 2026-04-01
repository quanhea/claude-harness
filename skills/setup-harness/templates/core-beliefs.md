# Template: docs/design-docs/core-beliefs.md

> Article: "a set of core beliefs that define agent-first operating principles"
> This is a TEMPLATE. Adapt the beliefs to the specific project's context.

---

```markdown
# Core Beliefs

> Agent-first operating principles for {{project-name}}.
> These beliefs govern how we build and maintain the codebase.
> Updated when our understanding changes — this is a living document.

## 1. The Repository Is the Single Source of Truth

If knowledge isn't in the repo, it doesn't exist for agents. Every design decision,
architectural constraint, and operating principle must be encoded as versioned,
discoverable artifacts (code, markdown, schemas, plans).

## 2. Optimize for Agent Legibility

The codebase is the agent's workspace. Structure, naming, and documentation are
optimized for the agent's reasoning ability — not human aesthetic preferences.
This means: explicit over implicit, mechanical over fuzzy, discoverable over clever.

## 3. Enforce Invariants, Not Implementations

We care about boundaries, correctness, and reproducibility. Within those boundaries,
agents have freedom in how solutions are expressed. We enforce dependency direction,
boundary validation, and structural constraints — but don't micromanage code style.

## 4. Parse at Boundaries, Trust Internally

All external data (API responses, user input, file reads, environment variables)
is parsed and validated at system entry points. Internal code trusts this validated
data — no redundant checks or defensive programming deep in the call stack.

## 5. Boring Technology Wins

We favor dependencies that are composable, API-stable, and well-represented in
training data. "Boring" technology is easier for agents to model and reason about.
When an external dependency is opaque, we reimplement the subset we need.

## 6. Continuous Garbage Collection

Technical debt is a high-interest loan. We pay it down continuously in small
increments. Recurring quality scans detect drift and open targeted fixes.
We don't wait for "cleanup sprints" — every day is cleanup day.

## 7. Progressive Disclosure of Knowledge

Agents start with a small, stable entry point (CLAUDE.md, ~100 lines) and are
taught where to look for deeper context. The knowledge base is layered:
overview → architecture → domain details → design decisions.

## 8. Every Capability Unlocks the Next

We build the stack bottom-up: structure first, then rules, then skills, then agents.
Each layer makes the next more effective. When an agent struggles, the fix is never
"try harder" — it's "what capability is missing?"

## 9. Corrections Are Cheap, Waiting Is Expensive

We favor throughput over gatekeeping. Pull requests are short-lived. Test flakes
get follow-up fixes, not blocking gates. We'd rather fix a mistake quickly than
prevent all mistakes slowly.

## 10. Human Taste, Agent Execution

Humans define the principles, boundaries, and quality standards. Agents execute
within those constraints. Human taste is captured once in rules and documentation,
then enforced continuously on every line of code.
```

## Adaptation Instructions

1. Replace `{{project-name}}`
2. Remove or modify beliefs that don't apply to the project
3. Add project-specific beliefs (e.g., regulatory requirements, performance SLAs)
4. This file should reflect the TEAM's actual beliefs, not just copy the template
