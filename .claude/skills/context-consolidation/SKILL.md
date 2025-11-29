---
name: Context Consolidation
description: Consolidate learnings from action logs into project docs and skills. Use when user asks to "consolidate", "compile learnings", "summarize sessions", or update project knowledge from .claude/action-log.jsonl.
---

# Context Consolidation

Transform accumulated learnings into organized project knowledge.

## Schema

Each action log entry:
```json
{"timestamp": "...", "transcript": "...", "learned": "...", "context": "..."}
```

- `learned`: The specific command, pattern, or fix
- `context`: When this applies (the trigger condition)

## Process

### 1. Read Entries Since Last Consolidation

```bash
cat .claude/action-log.jsonl | jq -s '.'
```

Find last `"event": "consolidation"` marker. Process entries after that timestamp.

### 2. Group by Context

Group entries with similar `context` values - these are related learnings.

| Context Pattern | Destination |
|-----------------|-------------|
| Config/setup values | claude.md |
| Commands/procedures | skill candidate |
| Facts/constraints | claude.md |

### 3. Decide: Skill vs Doc

**Create skill when:**
- Same context appears 2+ times
- `learned` contains commands or multi-step procedure
- Pattern is reusable across projects

**Add to claude.md when:**
- Single occurrence
- Project-specific config/values
- Facts or constraints

### 4. Create Outputs

**For claude.md entries:**
```markdown
## Learnings

### [Context Category]
- `learned` value here
```

**For skills:**
```
skills/[name]/SKILL.md
```

Skill template:
```yaml
---
name: [Descriptive Name]
description: Use when [context]. [What it does].
---

# [Name]

[learned content, expanded if multi-step]
```

### 5. Append Consolidation Marker

```json
{"event": "consolidation", "timestamp": "2025-11-25T12:00:00Z", "summary": "Added X to docs, created Y skill"}
```

## Key Principles

- **Concrete over generic**: Keep actual values, actual commands
- **Context = trigger**: The `context` field IS the "use when" condition
- **Skip duplicates**: Don't add same learning twice
- **Minimal skills**: Only create skills for repeated, multi-step patterns
