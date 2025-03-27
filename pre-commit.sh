 #!/bin/bash

CHANGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E "\\.(js|ts|tsx|json|md)$"); 

print_banner() {
    echo "========================================"
}

run_prettier() {
    if ! npx prettier --write $CHANGED_FILES; then
        echo "ERROR: Prettier failed to run"
        print_banner
        exit 1
    fi
}

run_linter() {
    if ! (cd server && npm run lint && cd ..); then
        echo "ERROR: Linter failed. Please fix the linting errors and try again."
        print_banner
        exit 1
    fi
}

run_add_files() {
    git add $CHANGED_FILES
}

if [ -n "$CHANGED_FILES" ]; then 
   
    steps=(
        "run_prettier"
        "run_linter"
        "run_add_files"
    )

    idx=0
    total_steps=${#steps[@]}

    for step in "${steps[@]}"; do
        idx=$((idx + 1))

        print_banner
        echo "[$idx of $total_steps] $step"
        $step

    done
    print_banner

else 
    echo "WARN: No changes to commit, commit pipeline skipped"
fi 