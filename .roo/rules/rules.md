Core Principles
Split long files into smaller, focused modules (aim for <300 lines per file)
Refactor lengthy functions into smaller, single-purpose functions (aim for <40 lines per function)
Always analyze code changes for scalability, maintainability, and performance impact
Follow SOLID principles and design patterns appropriate to the codebase
Prioritize readability and testability over clever optimizations
Code Analysis
After code changes, provide a brief analysis (1-2 paragraphs) including:

Potential improvements and technical debt introduced/resolved
Performance considerations and bottlenecks
Test coverage assessment
Recommended next steps with priority levels
Planning Mode
When entering "Planner Mode":

Analyze existing code architecture and identify potential high-risk areas
Ask 4-6 targeted clarifying questions focused on requirements, constraints, and edge cases
Draft a comprehensive implementation plan with time estimates and parallel work opportunities
Include test strategy and potential rollback approaches
Get approval before execution
Implement approved plan with progressive checkpoints
Report completed steps, highlight deviations from plan, and outline remaining work
Document architectural decisions and tradeoffs made during implementation
Debugging Mode
When entering "Debugger Mode":

Identify 5-7 potential issue sources across system layers (if applicable - frontend, API, database, infrastructure)
Focus on 1-2 most likely causes using elimination strategy
Add strategic logs to trace data flow (use consistent log format with correlation IDs)
Review server logs and metrics when accessible, looking for anomalies in timing and resource usage
Analyze root cause thoroughly with evidence-based reasoning
Request additional logging or metrics if needed
Document the issue pattern, root cause, and fix for knowledge sharing
Create regression tests that would catch similar issues
Remove debug logs after fix confirmation and verification
Documentation and Knowledge Management
Use markdown files as structural references and architecture documentation
Do not modify documentation files unless specifically requested
Document non-obvious design decisions in code comments using ADR (Architecture Decision Record) format
Add comprehensive JSDoc/TSDoc comments for public APIs and critical functions
Keep README files updated with setup, usage, and troubleshooting information
Document performance characteristics and limitations of critical components
Code Quality and Review
Write unit tests for new functionality with >90% coverage
Run linting and static analysis before submitting code
Consider security implications of all changes (input validation, authentication, etc.)
Review your own code thoroughly before requesting peer review
GitHub Workflow
Creating PRs:
1. git status
2. git add . (if needed)
3. git commit -m "concise message" (if needed)
4. git push (if needed)
5. git branch
6. git log main..[current branch]
7. git diff --name-status main
8. gh pr create --title "Title" --body "Description"
Creating Commits:
Review changed files with git status
Use descriptive, task-focused commit messages following conventional commits format (feat:, fix:, refactor:)
Group minor changes in single commits, separate logical changes
Keep PR messages single-line without breaks
Link PRs to issues and reference any relevant documentation