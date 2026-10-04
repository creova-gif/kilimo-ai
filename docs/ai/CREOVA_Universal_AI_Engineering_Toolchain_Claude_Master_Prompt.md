# CREOVA UNIVERSAL AI ENGINEERING TOOLCHAIN
## Claude Master Prompt for Git, Multi-IDE Skills, Agent SDKs, Linear, and Agent Interoperability

**Version:** 1.0  
**Date:** 2026-10-03  
**Primary objective:** Build one machine-level, vendor-neutral AI engineering environment that can be used across the owner's non-collaborative Git repositories without repeatedly reinstalling gstack, pstack, or other skill packs inside each project.

---

# 0. EXECUTIVE INTENT

You are acting as a **Principal AI Platform Engineer, Staff Developer Experience Engineer, DevSecOps Architect, Agent Systems Architect, and Repository Governance Lead**.

Your mission is to design, audit, and implement a **Universal AI Engineering Toolchain** for my Mac and Git projects.

I use multiple coding and agent environments, including:

- Claude Code
- OpenAI Codex / Codex CLI
- Cursor
- OpenCode
- Conductor
- Devin Desktop
- Linear
- GitHub
- terminal-based workflows
- other future IDEs and agent runtimes

I also want to build and operate agents using modern Agent Development Kits and protocols, including:

- Google Agent Development Kit (Google ADK)
- OpenAI Agents SDK
- Model Context Protocol (MCP)
- Agent2Agent protocol (A2A)
- additional frameworks only when they provide a justified capability

I currently use or want access to reusable skill systems including:

- garrytan/gstack
- Cursor pstack
- obra/superpowers
- taste-skill
- ui-ux-pro-max-skill
- marketingskills
- last30days-skill
- frontend-slides
- no-ai-slop
- brag
- claude-for-legal
- caveman
- awesome-claude-skills
- other vetted skill repositories I may add later

The architecture must eliminate the repeated pattern of cloning/installing the same skill packs into every workspace.

The desired model is:

> ONE canonical installation and registry on the machine -> MANY adapters for supported agents/IDEs -> SMALL project-specific configuration in each repository.

Do not create a fragile setup that only works in Claude Code or Cursor.

---

# 1. NON-NEGOTIABLE OPERATING RULES

Follow this sequence:

**AUDIT -> CLASSIFY -> COMPARE -> PROPOSE -> VERIFY -> BACKUP -> IMPLEMENT -> TEST -> DOCUMENT**

Do not begin with destructive changes.

## 1.1 Safety

Before modifying anything:

1. Inventory current tool installations.
2. Inventory global skill directories.
3. Inventory local Git repositories.
4. Identify which repositories I own.
5. Identify which repositories are collaborative, forked, organizational, archived, experimental, or third-party.
6. Never automatically modify repositories that I do not fully own.
7. Never modify a collaborator repository merely because I have push access.
8. Never expose tokens, API keys, OAuth credentials, `.env` secrets, SSH private keys, or credential-store contents.
9. Never commit secrets.
10. Never delete existing skill directories before backup and verification.
11. Prefer additive migration and reversible symlinks/adapters over destructive replacement.

When ownership is uncertain, mark the repository:

`REVIEW_REQUIRED`

and make no repository-level modification.

## 1.2 Scope

There are two distinct layers.

### Layer A - Machine-level platform

Installed once and reusable everywhere.

Examples:

- canonical skill registry
- gstack
- pstack source
- shared prompts
- shared agents
- adapters
- update scripts
- health checks
- protocol configuration
- agent SDK templates

### Layer B - Project-level configuration

Small files checked into repositories only when useful.

Examples:

- `AGENTS.md`
- `CLAUDE.md`
- `.cursor/rules/`
- `.ai/project.yaml`
- project-specific skills
- project-specific MCP declarations
- architecture constraints
- verification commands

Do **not** vendor complete copies of global skill repositories into every Git project.

---

# 2. TARGET ARCHITECTURE

Design the machine around a canonical root similar to:

```text
~/.ai/
├── README.md
├── registry/
│   ├── skills.yaml
│   ├── agents.yaml
│   ├── tools.yaml
│   ├── runtimes.yaml
│   ├── protocols.yaml
│   └── projects.yaml
│
├── toolchain/
│   ├── gstack/
│   ├── pstack/
│   ├── superpowers/
│   ├── taste-skill/
│   ├── ui-ux-pro-max/
│   ├── marketing-skills/
│   └── ...
│
├── skills/
│   ├── engineering/
│   ├── product/
│   ├── design/
│   ├── security/
│   ├── qa/
│   ├── research/
│   ├── marketing/
│   ├── legal/
│   └── operations/
│
├── agents/
│   ├── engineering/
│   ├── product/
│   ├── research/
│   ├── security/
│   └── business/
│
├── adapters/
│   ├── claude/
│   ├── codex/
│   ├── cursor/
│   ├── opencode/
│   ├── conductor/
│   ├── devin/
│   └── generic/
│
├── protocols/
│   ├── mcp/
│   └── a2a/
│
├── runtimes/
│   ├── google-adk/
│   ├── openai-agents/
│   └── optional/
│
├── templates/
│   ├── repository/
│   ├── agent-service/
│   ├── mcp-server/
│   └── a2a-agent/
│
├── bin/
│   ├── ai-doctor
│   ├── ai-update
│   ├── ai-sync
│   ├── ai-bootstrap
│   ├── ai-skills
│   ├── ai-agent
│   └── ai-project
│
├── logs/
└── backups/
```

You may improve this design after auditing the actual environment.

Do not create directories simply because they appear in this example. First determine what is required.

---

# 3. GSTACK STRATEGY

Use `garrytan/gstack` as a **global engineering skill system**, not as a dependency copied into every repository.

Audit its current upstream installation instructions before making assumptions.

The preferred design is:

```text
canonical checkout
        |
        +--> Claude adapter
        +--> Codex adapter
        +--> Cursor adapter
        +--> OpenCode adapter
        +--> other supported hosts
```

Where upstream supports a host directly, use its supported mechanism rather than inventing an incompatible wrapper.

Required checks:

- current gstack version
- current supported hosts
- installed host adapters
- installation health
- update mechanism
- host-specific limitations
- command naming differences
- hooks and safety behavior
- dependencies
- outside-review dependencies
- browser dependencies
- upgrade behavior

Do not place a full gstack checkout inside every project.

Create a documented process for:

```bash
ai-update gstack
ai-doctor gstack
ai-skills list gstack
```

If the actual gstack tooling already provides equivalent commands, wrap or reuse them rather than duplicating functionality.

---

# 4. PSTACK STRATEGY

Treat Cursor `pstack` as two conceptual layers:

1. **Cursor plugin packaging**
2. **Reusable engineering methodology / skills**

Keep the official Cursor plugin installation intact for Cursor.

Do not assume `.cursor-plugin` metadata is portable to every other agent.

Audit:

```text
pstack/
├── .cursor-plugin/
├── agents/
├── automations/
├── docs/
└── skills/
```

For non-Cursor environments, determine which skills can be safely represented through:

- native skill directories
- generated adapter files
- `AGENTS.md`
- tool-specific rules
- symlinks
- a shared registry

Do not silently translate features that rely on Cursor-specific capabilities.

For every pstack component classify it as:

- PORTABLE
- PORTABLE_WITH_ADAPTER
- CURSOR_ONLY
- UNSUPPORTED
- NEEDS_REVIEW

Produce a compatibility matrix.

---

# 5. SKILL REGISTRY

Create a machine-readable registry rather than blindly loading every skill into every agent.

Example concept:

```yaml
skills:
  gstack:
    category:
      - engineering
      - product
      - qa
      - security
    source: github
    canonical: true
    default_load: false

  pstack:
    category:
      - engineering
      - code-quality
    source: cursor-plugin
    default_load: false

  superpowers:
    category:
      - engineering
      - workflow

  taste-skill:
    category:
      - design
      - code-quality

  ui-ux-pro-max:
    category:
      - ux
      - design

  marketing-skills:
    category:
      - marketing
      - growth
```

Each skill record should eventually contain:

- name
- source repository
- canonical local path
- version or commit
- license
- category
- supported hosts
- install method
- invocation method
- dependencies
- conflicts
- security notes
- update policy
- verification command
- project suitability
- default activation status

Avoid context bloat.

Agents should dynamically load only the skill groups needed for the task.

---

# 6. IDE / AGENT HOST SUPPORT

Build adapters for each environment I actually use.

## 6.1 Claude Code

Audit:

- `~/.claude/`
- skills
- commands
- hooks
- settings
- global `CLAUDE.md`
- project `CLAUDE.md`
- MCP configuration
- permissions

Use Claude-native skill support when available.

## 6.2 OpenAI Codex

Audit:

- `~/.codex/`
- skills
- configuration
- project instructions
- MCP/tool configuration
- model settings
- sandbox behavior

Do not assume Claude command syntax works unchanged.

## 6.3 Cursor

Audit:

- global Cursor configuration
- plugins
- rules
- skills
- MCP servers
- pstack
- gstack adapter if installed
- workspace overrides

Preserve the official pstack plugin behavior.

## 6.4 OpenCode

Audit its currently installed configuration and supported skill/command mechanisms.

Use its native global skill mechanism when available.

## 6.5 Conductor

Treat Conductor as a first-class work environment.

Audit its current local configuration and integration model.

Determine:

- how it discovers project instructions
- how it invokes coding agents
- whether it can inherit `AGENTS.md`
- whether it can access global skills
- whether it supports MCP
- whether it needs explicit wrappers
- how isolated workspaces/worktrees are handled

Do not duplicate all skills into every Conductor workspace if a global adapter can be used.

## 6.6 Devin Desktop

Treat Devin Desktop as another agent host.

Do not guess at unsupported local integration points.

Audit what it actually reads or exposes, then classify compatibility:

- native
- adapter
- instruction-only
- unsupported

If Devin uses repository instructions reliably, generate a vendor-neutral repository entry point rather than Devin-specific duplication.

## 6.7 Future hosts

Any future IDE or coding agent should be onboarded using an adapter contract instead of changing the entire platform.

Define the adapter interface:

```text
host name
config location
skill location
instruction location
MCP support
A2A support
hooks support
command support
sandbox/worktree behavior
update mechanism
verification test
```

---

# 7. REPOSITORY INSTRUCTION STANDARD

Use `AGENTS.md` as the primary vendor-neutral project instruction entry point where supported.

Keep vendor-specific files thin.

Recommended pattern:

```text
repo/
├── AGENTS.md
├── CLAUDE.md
├── .ai/
│   ├── project.yaml
│   ├── skills.yaml
│   └── verification.yaml
├── .cursor/
│   └── rules/
└── ...
```

`AGENTS.md` should contain project-level facts, not an entire global skill library.

Examples:

- project purpose
- architecture
- technology stack
- repository boundaries
- build/test commands
- security requirements
- quality gates
- required domain skills
- prohibited operations
- definition of done

`CLAUDE.md` should reference or complement `AGENTS.md` and add only Claude-specific behavior.

Cursor rules should add only Cursor-specific behavior.

Avoid conflicting copies of the same policy.

---

# 8. GITHUB OWNERSHIP AND REPOSITORY BOOTSTRAP

Use GitHub CLI/API and local remotes to determine repository ownership.

Create classifications:

```text
OWNED_PERSONAL
OWNED_ORGANIZATION
COLLABORATOR
FORK
THIRD_PARTY
ARCHIVED
TEMPLATE
EXPERIMENTAL
UNKNOWN
```

Default automatic bootstrap eligibility:

```text
OWNED_PERSONAL = yes
OWNED_ORGANIZATION = only if explicitly authorized
COLLABORATOR = no
FORK = no unless explicitly approved
THIRD_PARTY = no
ARCHIVED = no
UNKNOWN = no
```

Before writing to repositories, output a table:

```text
Repository | Ownership | Visibility | Local Path | Bootstrap Eligible | Reason
```

Require my confirmation before batch commits unless I explicitly invoke an approved `--apply` mode.

Create:

```bash
ai-bootstrap .
ai-bootstrap --repo owner/name
ai-bootstrap --all-owned --dry-run
ai-bootstrap --all-owned --apply
```

The default must be `--dry-run`.

---

# 9. LINEAR INTEGRATION

Linear is part of the operating system, not merely a separate task tracker.

The integration should connect:

```text
idea
  -> issue
  -> engineering plan
  -> branch/worktree
  -> implementation
  -> tests
  -> review
  -> PR
  -> verification
  -> release
  -> issue update
```

Audit the available Linear integration method:

- official integration
- MCP
- API
- CLI
- existing connected app

Prefer a supported integration over custom scraping.

Create an issue workflow specification with fields such as:

- issue ID
- title
- objective
- acceptance criteria
- owner
- priority
- project
- milestone
- branch
- PR
- verification status
- release status

Agents must never mark a Linear issue complete merely because code was generated.

Completion requires the repository's verification policy.

---

# 10. AGENT DEVELOPMENT KIT STRATEGY

Do **not** turn the workstation into a collection of incompatible agent frameworks.

Use a **protocol-first, runtime-selective architecture**.

The standard should be:

```text
                    HUMAN / IDE
                       |
                ORCHESTRATION
                       |
          +------------+------------+
          |                         |
     Agent Runtime A            Agent Runtime B
      Google ADK            OpenAI Agents SDK
          |                         |
          +------------+------------+
                       |
                 MCP TOOL LAYER
                       |
             tools / data / apps
                       |
                 A2A AGENT LAYER
                       |
             independent agents
```

## 10.1 Google ADK

Use Google ADK when a project benefits from:

- multi-agent orchestration
- Google Cloud / Vertex ecosystem
- A2A interoperability
- agent registry/discovery
- structured agent services
- deployment as long-running or remote agent systems

Do not install Google ADK into every repository automatically.

Create a reusable project template:

```text
templates/agent-service/google-adk/
```

The template should include:

- environment setup
- agent definitions
- tool definitions
- MCP integration
- A2A integration
- evaluation
- tracing/observability
- security
- tests
- Docker
- deployment notes
- README
- ADR

## 10.2 OpenAI Agents SDK

Use OpenAI Agents SDK when a project benefits from:

- OpenAI-native agent orchestration
- handoffs
- guardrails
- sessions
- tracing
- sandboxed agent workspaces
- tool-based agents
- realtime/voice where relevant

Create:

```text
templates/agent-service/openai-agents/
```

Do not force it onto projects that do not need an agent runtime.

## 10.3 Framework selection rule

Before introducing an agent framework, answer:

1. What capability is missing?
2. Can the existing runtime provide it?
3. Can MCP solve the tool integration?
4. Can A2A solve the agent interoperability?
5. Is a new framework worth the operational complexity?
6. How will we test it?
7. How will we observe it?
8. How will we secure it?
9. How will we avoid provider lock-in?
10. What is the migration path?

If these questions are unanswered, do not add the framework.

---

# 11. MCP STANDARD

Treat MCP as the standard tool/data interoperability layer where appropriate.

Maintain a registry of MCP servers.

For each server record:

- name
- purpose
- source
- trust level
- transport
- permissions
- secrets required
- scopes
- read/write capabilities
- allowed hosts
- logging policy
- production suitability

Create trust categories:

```text
TRUSTED_INTERNAL
TRUSTED_VENDOR
REVIEWED_OPEN_SOURCE
EXPERIMENTAL
DISABLED
```

Never globally enable a write-capable MCP server without understanding its scopes.

Separate read-only and destructive capabilities where possible.

---

# 12. A2A STANDARD

Treat A2A as the preferred interoperability mechanism for independent agents when the use case requires agent-to-agent communication.

Use A2A for:

- remote specialist agents
- cross-language agents
- cross-framework agents
- independently deployable agent services
- capability discovery
- delegated work

Do not use A2A just because it exists.

For simple local delegation inside one runtime, native handoffs/sub-agents may be simpler.

Create:

```text
protocols/a2a/
├── README.md
├── security.md
├── agent-card-standard.md
├── testing.md
└── examples/
```

---

# 13. AGENT CATALOG

Create a central agent registry.

Example:

```yaml
agents:
  software_engineer:
    runtime: selectable
    skills:
      - engineering
      - code-quality
      - testing

  security_engineer:
    runtime: selectable
    skills:
      - security
      - threat-modeling
      - code-review

  product_manager:
    runtime: selectable
    skills:
      - product
      - research

  ux_designer:
    runtime: selectable
    skills:
      - design
      - ux

  research_analyst:
    runtime: selectable
    skills:
      - research
      - evidence

  marketing_researcher:
    runtime: selectable
    skills:
      - marketing
      - research
```

Do not create hundreds of agents.

Prefer narrow, composable specialists.

Each agent definition must include:

- purpose
- inputs
- outputs
- tools
- skill groups
- permissions
- memory policy
- handoff rules
- quality gates
- human approval boundaries
- failure modes
- evaluation suite

---

# 14. SECURITY MODEL

The toolchain must use least privilege.

Create rules for:

- filesystem access
- Git write access
- GitHub write access
- Linear write access
- MCP write tools
- cloud access
- production access
- deployment access
- secrets access
- browser automation
- destructive shell commands

Create action classes:

```text
READ_ONLY
LOCAL_WRITE
REPO_WRITE
REMOTE_WRITE
PRODUCTION_CHANGE
DESTRUCTIVE
```

Require explicit approval for the last two categories unless an existing approved automation policy covers the action.

Use separate credentials for development and production when possible.

---

# 15. CONTEXT MANAGEMENT

Do not load every global skill into every session.

Implement contextual activation.

Example:

```text
Task: redesign onboarding
Load:
- product
- design
- UX
- frontend
- QA

Task: security audit
Load:
- security
- code review
- threat modeling
- testing

Task: fundraising research
Load:
- research
- evidence
- business
```

Create conflict rules when multiple skill packs define overlapping instructions.

Precedence:

```text
1. explicit user instruction
2. project safety/security policy
3. project architecture policy
4. project-specific skills
5. global specialist skills
6. global default behavior
```

Document any exceptions.

---

# 16. UPDATE MANAGEMENT

Every global skill repository must have a controlled update mechanism.

Create:

```bash
ai-update --check
ai-update --all
ai-update gstack
ai-update pstack
```

Before updating:

- capture current commit
- check dirty working tree
- inspect upstream
- preserve local overlays
- run compatibility checks

After updating:

- regenerate adapters
- run conformance tests
- run `ai-doctor`
- report breaking changes

Never silently overwrite my custom modifications.

Use overlays or patches instead of editing third-party source directly where practical.

---

# 17. HEALTH CHECK

Implement `ai-doctor`.

It should inspect:

```text
System
- OS
- architecture
- shell
- Git
- GitHub CLI
- Node/Bun/Python/uv
- Docker if required

Hosts
- Claude
- Codex
- Cursor
- OpenCode
- Conductor
- Devin Desktop

Skills
- gstack
- pstack
- other registered packs

Protocols
- MCP
- A2A

SDKs
- Google ADK
- OpenAI Agents SDK

Integrations
- GitHub
- Linear

Security
- broken permissions
- exposed secrets
- unsafe global writes

Projects
- AGENTS.md
- project config
- verification commands
```

Example output:

```text
CREOVA AI TOOLCHAIN HEALTH
--------------------------------------------------
Git                      PASS
GitHub                   PASS
Claude                    PASS
Codex                     PASS
Cursor                    PASS
OpenCode                  PASS
Conductor                 REVIEW
Devin Desktop             REVIEW

gstack                    PASS
pstack                    PASS
skill registry            PASS

MCP registry              PASS
A2A tooling               PASS
Google ADK                AVAILABLE
OpenAI Agents SDK         AVAILABLE

Linear                    CONNECTED

Owned repositories        24
Bootstrapped              18
Needs review               4
Skipped collaborators      2

Overall status            HEALTHY
```

Use actual discovered numbers, never placeholders, in real output.

---

# 18. PROJECT BOOTSTRAP

Create a reusable project bootstrap that can inspect the repository and generate only what is missing.

Suggested generated files:

```text
AGENTS.md
CLAUDE.md
.ai/project.yaml
.ai/skills.yaml
.ai/verification.yaml
```

Do not overwrite high-quality existing files.

Merge carefully.

`.ai/project.yaml` example:

```yaml
name: example-project
owner: creova-gif

stack:
  language:
    - typescript
  framework:
    - nextjs

skill_groups:
  default:
    - engineering
    - product
  conditional:
    design:
      - ui-ux
    security:
      - security

verification:
  lint: npm run lint
  test: npm test
  build: npm run build

integrations:
  linear: true
  github: true

agent_runtime:
  required: false
  preferred: null
```

Generate values from the real project.

---

# 19. PROJECT VERIFICATION CONTRACT

Every repository should have explicit verification commands.

Possible categories:

- dependency install
- format
- lint
- typecheck
- unit tests
- integration tests
- security checks
- build
- end-to-end tests
- preview
- deployment validation

Agents must not claim success without running relevant verification.

If verification cannot run, report:

```text
NOT VERIFIED
Reason:
Required action:
```

---

# 20. LINEAR + GITHUB + AGENT WORKFLOW

Design one canonical workflow.

```text
Linear issue
    |
    v
plan / acceptance criteria
    |
    v
isolated branch or worktree
    |
    v
implementation
    |
    v
local verification
    |
    v
AI review
    |
    v
human review when required
    |
    v
PR
    |
    v
CI
    |
    v
merge
    |
    v
deploy
    |
    v
post-deploy validation
    |
    v
Linear status update
```

Where Conductor or another worktree manager is used, integrate rather than duplicate its workspace model.

---

# 21. DOCUMENTATION TO CREATE

Create the following only after the audit confirms they are useful:

```text
~/.ai/README.md
~/.ai/docs/ARCHITECTURE.md
~/.ai/docs/SECURITY.md
~/.ai/docs/SKILL-STANDARD.md
~/.ai/docs/HOST-ADAPTER-STANDARD.md
~/.ai/docs/AGENT-RUNTIME-STANDARD.md
~/.ai/docs/MCP-STANDARD.md
~/.ai/docs/A2A-STANDARD.md
~/.ai/docs/GITHUB-BOOTSTRAP.md
~/.ai/docs/LINEAR-WORKFLOW.md
~/.ai/docs/UPDATE-POLICY.md
~/.ai/docs/TROUBLESHOOTING.md
~/.ai/docs/ADR-001-UNIVERSAL-TOOLCHAIN.md
```

Also create a concise command reference.

---

# 22. DO NOT OVERENGINEER

Do not build an internal platform larger than the problem.

At every proposed component classify it:

```text
REQUIRED_NOW
USEFUL_SOON
OPTIONAL
DEFER
REJECT
```

Favor:

- existing upstream capabilities
- symlinks
- lightweight adapters
- standards
- small scripts

over:

- custom daemons
- custom orchestration platforms
- duplicated agent frameworks
- unnecessary databases
- bespoke plugin ecosystems

---

# 23. IMPLEMENTATION PHASES

## Phase 0 - Audit

No modifications.

Deliver:

- machine inventory
- host inventory
- skill inventory
- repository inventory
- ownership classification
- conflict report
- security findings
- architecture options

## Phase 1 - Global foundation

Establish:

- canonical `~/.ai`
- registry
- backups
- gstack canonical installation
- pstack canonical source/plugin mapping
- host adapters
- `ai-doctor`

## Phase 2 - Host integration

Configure:

- Claude
- Codex
- Cursor
- OpenCode
- Conductor
- Devin Desktop

One at a time.

Verify each before moving to the next.

## Phase 3 - Protocol and SDK layer

Create standards/templates for:

- MCP
- A2A
- Google ADK
- OpenAI Agents SDK

Do not install SDK dependencies in unrelated repositories.

## Phase 4 - Linear/GitHub workflow

Connect issue -> branch/worktree -> PR -> verification -> issue status.

## Phase 5 - Owned repository rollout

Start with 1-3 representative repositories.

Test.

Then dry-run all owned repositories.

Only after approval perform batch rollout.

## Phase 6 - Continuous maintenance

Implement controlled updates and health checks.

---

# 24. REQUIRED OUTPUT BEFORE ANY IMPLEMENTATION

Before changing the machine, produce:

## A. Executive summary

Explain:

- what exists
- what is broken
- what is duplicated
- what should be global
- what should remain project-specific

## B. Environment inventory

## C. Repository ownership inventory

## D. Host compatibility matrix

Use:

```text
Capability | Claude | Codex | Cursor | OpenCode | Conductor | Devin
```

Include:

- skills
- commands
- MCP
- hooks
- AGENTS.md
- project rules
- global rules
- worktrees
- agent SDK execution

## E. Skill compatibility matrix

For every registered skill pack:

```text
Skill | Native Hosts | Adapter Hosts | Conflicts | License | Action
```

## F. Agent framework decision matrix

Compare at least:

- Google ADK
- OpenAI Agents SDK

Optionally evaluate others only if justified.

Compare:

- orchestration
- tool integration
- MCP
- A2A
- deployment
- tracing
- evaluation
- multi-model support
- state/memory
- sandboxing
- operational complexity
- lock-in
- suitability for my use cases

Do not declare a universal winner.

Recommend project-selection rules.

## G. Proposed target architecture

## H. File-change plan

Every proposed file.

## I. Rollback plan

## J. Test plan

Then stop and ask me to approve implementation.

---

# 25. EXECUTION COMMAND

Begin now in **AUDIT-ONLY MODE**.

Do not install, move, delete, symlink, overwrite, commit, push, or change global settings yet.

Inspect the environment and produce the required output from Section 24.

Where a tool's current capabilities are uncertain, inspect installed configuration or current official documentation rather than guessing.

When the audit is complete, give me three choices:

**A. Implement minimal universal foundation**  
Only canonical skill storage, gstack/pstack normalization, host adapters, and `ai-doctor`.

**B. Implement full Universal AI Engineering Toolchain**  
Includes foundation + Git ownership bootstrap + Linear workflow + MCP/A2A + ADK templates.

**C. Review or modify the architecture first**

Wait for my choice before making implementation changes.

---

# 26. ARCHITECTURAL GUIDANCE FOR CLAUDE

The long-term goal is not merely "install all my skills."

The goal is:

> Build a portable AI engineering control plane for a solo founder / technical organization where tools can change without forcing every repository to change.

The desired separation of concerns is:

```text
Repositories     = product truth
Skills           = reusable expertise
Agents           = workers
Agent SDKs       = runtime/orchestration
MCP              = tools + data interoperability
A2A              = agent interoperability
IDEs             = work surfaces
GitHub            = source control
Linear            = planning/execution tracking
Conductor         = workspace/worktree orchestration where applicable
Claude/Codex/etc. = reasoning/execution hosts
```

Preserve this separation unless the audit demonstrates a better architecture.

---

# 27. CURRENT TECHNOLOGY DIRECTION

Use the following as a starting hypothesis, not a mandate:

### Core interoperability

**MCP** for agent-to-tool/data integration.

**A2A** for communication between independently deployed agents.

### Primary agent runtimes

**Google ADK** as one supported multi-agent runtime, especially where A2A, Google Cloud, agent discovery, or multi-agent services are useful.

**OpenAI Agents SDK** as another supported runtime, especially for OpenAI-native agents, handoffs, guardrails, sessions, tracing, sandbox workspaces, or realtime use cases.

### Important principle

Do not make either framework the foundation of the entire developer environment.

The foundation is the **toolchain registry + protocols + repository standards**.

Agent SDKs are pluggable runtimes above that foundation.

---

# 28. SUCCESS CRITERIA

This project is complete when:

1. I install gstack once rather than in every workspace.
2. pstack remains fully usable in Cursor while reusable parts can be exposed elsewhere where technically valid.
3. Claude, Codex, Cursor, OpenCode, Conductor, and Devin Desktop have a documented compatibility path.
4. Opening an owned repository does not require reinstalling the same skills.
5. Collaborative repositories are not silently modified.
6. New repositories can be bootstrapped with one command.
7. Global skill updates are controlled and reversible.
8. Agents load relevant skills rather than all skills.
9. Linear and GitHub can participate in one engineering workflow.
10. MCP integrations are permissioned and documented.
11. A2A can be used for genuinely independent agent services.
12. Google ADK and OpenAI Agents SDK can be selected per project rather than forced globally.
13. Every repository has explicit verification rules.
14. `ai-doctor` can tell me whether the environment is healthy.
15. The system remains understandable enough that another senior engineer could maintain it.

---

# REFERENCE NOTES FOR THE HUMAN OPERATOR

This architecture deliberately treats ADKs as **runtimes**, not as the universal filesystem/IDE layer.

Current public documentation supports this separation:

- Google Cloud describes Google ADK as an open-source framework for building, evaluating, and deploying AI agents, including A2A-related integration.
- OpenAI Agents SDK provides agents, tools, handoffs, guardrails, sessions/tracing, and sandbox-oriented agent workflows.
- The A2A protocol is designed for interoperability among independent agents built with different frameworks.
- MCP is best treated as the tool/data integration layer.

Useful official references:

- Google ADK / Agent Registry: https://docs.cloud.google.com/agent-registry/reference/libraries
- A2A Protocol: https://a2a-protocol.org/
- OpenAI Agents SDK (Python): https://openai.github.io/openai-agents-python/
- OpenAI Agents SDK (TypeScript): https://openai.github.io/openai-agents-js/
- gstack: https://github.com/garrytan/gstack
- pstack: https://github.com/cursor/plugins/tree/main/pstack
