# 🛡️ Preventing Git Corruption

## The Problem
Your Git repo keeps getting corrupted because binary iOS build files (Pods, frameworks, etc.) accidentally get tracked by Git. When these large binary files are committed, Git becomes unstable and eventually breaks.

## ✅ ALWAYS Follow These Rules:

### 1. **NEVER commit after iOS builds without checking:**
```bash
git status  # ← ALWAYS check first!
```
If you see `ios/Pods/` or `.xcarchive` files, DO NOT COMMIT.

### 2. **Clean before committing:**
```bash
# Clean iOS build artifacts
rm -rf ios/Pods ios/build ios/*.xcarchive
rm -rf ~/Library/Developer/Xcode/DerivedData

# Then check git status
git status
```

### 3. **Use the safety commit script:**
```bash
./build-scripts/safe-commit.sh "your commit message"
```

### 4. **Before any npm install/remove:**
```bash
# Clean first
rm -rf ios/Pods
npm install  # or npm remove
```

## 🚨 Red Flags - STOP if you see:
- `modified: ios/Pods/hermes-engine/...`
- `modified: ios/Podfile.lock` (sometimes OK, but check)
- `ios/*.xcarchive` files
- Hundreds of modified files after iOS builds

## Recovery:
If Git breaks again, run:
```bash
./build-scripts/git-cleanup.sh
```

## The Root Cause:
React Native/Expo builds create binary files that are too large for Git. Once they're accidentally committed, Git's internal structure gets corrupted and becomes unusable.