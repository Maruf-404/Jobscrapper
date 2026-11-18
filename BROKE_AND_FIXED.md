# Broke and Fixed Log

Records any failures, root causes, and resolutions encountered during build and execution.

## Entry 1: PowerShell script execution policy blocked `npm`
- **Symptom**: Running `npm` in PowerShell produced `File C:\Program Files\nodejs\npm.ps1 cannot be loaded because running scripts is disabled on this system`.
- **Cause**: Windows PowerShell `ExecutionPolicy` by default restricts unverified `.ps1` execution.
- **Fix**: Invoked `npm.cmd` and `npx.cmd` directly instead of relying on PowerShell script wrappers.

## Entry 2: Package `@google/genai@^0.1.1` not found
- **Symptom**: `npm install` failed with `npm error notarget No matching version found for @google/genai@^0.1.1`.
- **Cause**: `@google/genai` published releases starting at `0.2.0` up to `3.6.0`.
- **Fix**: Updated `package.json` to `"@google/genai": "^3.6.0"`.

## Entry 3: PowerShell does not support `&&` operator
- **Symptom**: `git add . && git commit` failed with `The token '&&' is not a valid statement separator in this version`.
- **Cause**: Windows PowerShell 5.1 uses semicolon `;` instead of bash-style `&&`.
- **Fix**: Separated commands using `;` in PowerShell.

## Entry 4: Git author identity unset
- **Symptom**: `git commit` failed with `fatal: unable to auto-detect email address`.
- **Cause**: Fresh workspace lacked repository git user identity.
- **Fix**: Configured local `user.name` and `user.email` via `git config`.
