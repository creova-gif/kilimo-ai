#!/bin/bash
# setup-git-pipeline.sh
# Automates the local setup for a secure feature-dev-staging-main branching workflow.

set -e

# Print styled messages
log_info() { echo -e "\033[0;34m[INFO]\033[0m $1"; }
log_success() { echo -e "\033[0;32m[SUCCESS]\033[0m $1"; }
log_warn() { echo -e "\033[0;33m[WARNING]\033[0m $1"; }
log_error() { echo -e "\033[0;31m[ERROR]\033[0m $1"; exit 1; }

# Step 1: Verify we are in a git repository or initialize one
if [ ! -d ".git" ]; then
    log_info "No local Git repository found. Initializing..."
    git init
else
    log_info "Existing Git repository detected."
fi

# Step 2: Ensure main branch exists
log_info "Ensuring 'main' branch exists..."

# In Git >= 2.28, we can set default branch to main. 
# If it's a new repository, we might not have a HEAD commit, so we create main.
current_branch=$(git symbolic-ref --short HEAD 2>/dev/null || echo "")

if [ -z "$current_branch" ]; then
    log_info "Repository is empty. Configuring 'main' as the default branch..."
    # Attempt to use git checkout to create main
    git checkout -b main 2>/dev/null || git checkout -b main --orphan 2>/dev/null || true
    current_branch="main"
elif [ "$current_branch" = "master" ]; then
    log_warn "Renaming legacy branch 'master' to 'main'..."
    git branch -m master main
    current_branch="main"
fi

# Step 3: Create 'staging' and 'dev' branches
# Staging branch (if it doesn't exist, branch off main or current HEAD)
if git show-ref --quiet refs/heads/staging; then
    log_info "Branch 'staging' already exists."
else
    log_info "Creating 'staging' branch (the dress rehearsal)..."
    git branch staging 2>/dev/null || git checkout -b staging 2>/dev/null || true
fi

# Dev branch (if it doesn't exist)
if git show-ref --quiet refs/heads/dev; then
    log_info "Branch 'dev' already exists."
else
    log_info "Creating 'dev' branch (active development)..."
    git branch dev 2>/dev/null || git checkout -b dev 2>/dev/null || true
fi

# If we have commits, switch to dev as default workspace
if [ -n "$(git rev-parse --all 2>/dev/null)" ]; then
    git checkout dev 2>/dev/null || true
fi

# Step 4: Write local pre-push git hook to lock down 'main' and 'staging'
log_info "Installing local pre-push security hooks..."
HOOK_PATH=".git/hooks/pre-push"

cat << 'EOF' > "$HOOK_PATH"
#!/bin/bash
# Local Git pre-push hook to prevent pushing directly to main or staging.
# Guided by: "You should never push directly to the main branch ever."

protected_branches="main staging"
current_branch=$(git symbolic-ref --short HEAD 2>/dev/null)

if [ -z "$current_branch" ]; then
    exit 0
fi

for branch in $protected_branches; do
    if [ "$current_branch" = "$branch" ]; then
        echo -e "\n\033[0;31m[GIT PROTECT] Error: You are attempting to push directly to the protected branch '$branch'!\033[0m"
        echo -e "Remember: 'Branch, PR, and merge every single time.'\n"
        exit 1
    fi
done

exit 0
EOF

chmod +x "$HOOK_PATH"
log_success "Pre-push safety hook active! Direct pushes to 'main' or 'staging' are blocked locally."

# Step 5: Instructions
echo -e "\n============================================="
log_success "Local Git Pipeline Setup Complete!"
echo -e "=============================================\n"
echo -e "Recommended Daily Workflow:"
echo -e "  1. Create feature branch:  \033[0;32mgit checkout -b feature/your-feature-name\033[0m"
echo -e "  2. Work, commit, and push: \033[0;32mgit push origin feature/your-feature-name\033[0m"
echo -e "  3. Open Pull Request (PR) targeting \033[0;33mdev\033[0m on GitHub."
echo -e "  4. Merge dev into \033[0;35mstaging\033[0m (dress rehearsal testing) via PR."
echo -e "  5. Merge staging into \033[0;31mmain\033[0m (sacred production deployment) via PR."
echo -e "=============================================\n"
