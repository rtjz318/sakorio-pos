# Sakorio XP-80T Implementation Pass 14 — Capacitor CLI Dependency Gate

Date: 2026-08-25  
Branch: development  
Purpose: document the remaining dependency gate for generating the Sakorio iPad app.

## 1. Intended task

The next planned step is to add/pin:

```text
@capacitor/cli@8.5.0
```

This is required before the Mac/Xcode build machine can run:

```bash
npx cap add ios
npx cap sync ios
```

## 2. Current repository state

Already pinned:

```text
@capacitor/core 8.5.0
@capacitor/ios  8.5.0
```

Missing:

```text
@capacitor/cli  8.5.0
```

Current readiness check:

```text
[xp80t-scaffold] OK
[capacitor-ios-readiness] OK with expected warnings
```

Expected warnings:

- `@capacitor/cli` is not installed/pinned yet.
- Capacitor iOS project is not generated yet.

## 3. Why this pass did not hand-edit the lockfile

Adding `@capacitor/cli` correctly requires updating `package.json` and `package-lock.json` with the full transitive dependency tree.

This local Windows environment currently has:

- bundled Node available;
- no `npm` command available on PATH;
- Docker Desktop not running;
- `pnpm` available, but this project uses `package-lock.json`, not `pnpm-lock.yaml`.

Using pnpm would create the wrong lockfile style. Hand-editing only the top-level lock entry would make the lockfile incomplete and could break `npm ci`.

So the safe outcome is: do not mutate dependencies from this environment.

## 4. Safe command for the Mac/build machine

On the Mac/Xcode build machine, run the dependency update in the `front` folder using npm and no install scripts:

```bash
cd front
npm install --package-lock-only --ignore-scripts --save-exact --save-dev @capacitor/cli@8.5.0
npm ci --ignore-scripts
npm run test:xp80t-native-scaffold
npm run test:capacitor-ios-readiness
```

Important:

- Review `package.json` and `package-lock.json`.
- Commit both files together.
- Do not add `node_modules`.
- Do not run arbitrary install scripts.

## 5. After the dependency gate is complete

Generate and prepare the iOS project on Mac:

```bash
cd front
npm run build -- --configuration production-static
npx cap add ios
npx cap sync ios
npm run ios:prepare-xp80t
npm run ios:check-native-scaffold
```

Then open:

```text
front/ios/App/App.xcodeproj
```

and wire the official Xprinter iOS SDK into the native app target.

## 6. Acceptance checkpoint

This dependency gate is complete only when:

- `@capacitor/cli` appears in `front/package.json`;
- `@capacitor/cli` and its dependencies appear correctly in `front/package-lock.json`;
- `npm ci --ignore-scripts` succeeds;
- `npm run test:xp80t-native-scaffold` succeeds;
- `npm run test:capacitor-ios-readiness` no longer warns about missing `@capacitor/cli`.

