# Git Workflow

## Branch Strategy

```
main
  ↑ (merge periodically)
development
  ↑ (merge via PR)
feature/* | fix/* | chore/*
```

### Branch Types

| Branch Pattern       | Purpose                              | Base        | Target      |
|---------------------|--------------------------------------|-------------|-------------|
| `main`              | Production-ready code                | —           | —           |
| `development`       | Integration branch                   | `main`      | `main`      |
| `feature/<name>`    | New features                         | `development` | `development` |
| `fix/<name>`        | Bug fixes                            | `development` | `development` |
| `chore/<name>`      | Tooling, config, refactoring         | `development` | `development` |
| `hotfix/<name>`     | Critical production fixes            | `main`      | `main` + `development` |

### Team Feature Branches

| Developer | Feature Branches                                          |
|-----------|----------------------------------------------------------|
| Dev 1     | `feature/auth-rbac`, `feature/user-management`           |
| Dev 2     | `feature/student-module`, `feature/evidence-module`      |
| Dev 3     | `feature/placement-module`, `feature/eligibility-engine` |
| Dev 4     | `feature/recruiter-module`, `feature/analytics`          |

---

## Workflow Steps

### 1. Start a Feature

```bash
# Ensure you're up to date
git checkout development
git pull origin development

# Create feature branch
git checkout -b feature/auth-rbac
```

### 2. Develop

- Make small, focused commits
- Follow conventional commit format
- Run checks before committing:

```bash
npm run typecheck
npm run lint
npm run test
```

### 3. Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add JWT authentication guard
fix: prevent recruiter access to unauthorized drives
docs: add API documentation for evidence endpoints
test: add eligibility engine unit tests
refactor: extract skill matching into separate service
chore: update dependencies
```

### 4. Push and Create PR

```bash
git push origin feature/auth-rbac
```

Create a Pull Request targeting `development`.

### 5. Code Review

- **Reviewer**: Another team member (not the author)
- **Check**: Types pass, lint passes, tests pass, no `any` usage
- **Review**: Business logic correctness, security implications
- **Approve**: At least 1 approval required

### 6. Merge

- Use **Squash and Merge** for clean history
- Delete the feature branch after merge

### 7. Release

Periodically merge `development` → `main` when stable:

```bash
git checkout main
git merge development
git push origin main
```

---

## Rules

1. **Never push directly to `main` or `development`**
2. **Always create a PR for code changes**
3. **At least 1 reviewer must approve**
4. **All CI checks must pass before merge**
5. **Keep feature branches short-lived (< 1 week)**
6. **Resolve merge conflicts on your feature branch, not on `development`**
7. **Don't modify another developer's feature branch files unless coordinating**

---

## Conflict Resolution

If your feature branch conflicts with `development`:

```bash
git checkout feature/your-feature
git fetch origin
git merge origin/development
# Resolve conflicts
git add .
git commit -m "chore: resolve merge conflicts with development"
git push origin feature/your-feature
```
