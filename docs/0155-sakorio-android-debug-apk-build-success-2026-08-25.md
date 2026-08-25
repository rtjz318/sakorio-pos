# Sakorio Android Debug APK Build Success

Date: 2026-08-25  
Branch: development  
Purpose: record the first successful Sakorio Android debug APK build for XP-80T Bluetooth printer testing.

## 1. Build result

The Android debug APK build succeeded:

```text
BUILD SUCCESSFUL in 1m 12s
93 actionable tasks: 93 executed
```

APK output:

```text
front/android/app/build/outputs/apk/debug/app-debug.apk
```

Full Windows path:

```text
C:\Users\rickt\OneDrive\Pictures\Documents\Sakorio\front\android\app\build\outputs\apk\debug\app-debug.apk
```

## 2. Build command used

PowerShell:

```powershell
cd "C:\Users\rickt\OneDrive\Pictures\Documents\Sakorio\front\android"
$env:JAVA_HOME = "C:\Users\rickt\.jdks\jbr-21.0.11-1"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
.\gradlew.bat assembleDebug
```

## 3. Important fixes / discoveries

### 3.1 Java 25 failed

Android Studio's bundled JBR was Java 25:

```text
C:\Program Files\Android\Android Studio\jbr
```

That failed with:

```text
Unsupported class file major version 69
```

### 3.2 JDK 21 worked

The installed JDK 21 worked:

```text
C:\Users\rickt\.jdks\jbr-21.0.11-1
```

Java version:

```text
openjdk version "21.0.11"
```

### 3.3 Host Gradle needed Capacitor Android visible

The project uses Docker with `/app/node_modules` in an internal container volume. Android Studio/Gradle on Windows needed the Capacitor Android module visible from the host path:

```text
front/node_modules/@capacitor/android
```

The required package was copied from the running `pos-front` container to the host so Gradle could resolve:

```text
:capacitor-android
```

## 4. Notes from compilation

The XP-80T plugin compiled successfully.

Compiler note:

```text
Xp80tPrinterPlugin.java uses or overrides a deprecated API.
```

This is not a build blocker. It should be reviewed later when polishing the Android Bluetooth implementation.

## 5. Next physical test

1. Transfer/install:

```text
app-debug.apk
```

to the Android tablet.

2. Pair XP-80T in Android Bluetooth settings:

```text
Printer001 / XP-80T
PIN: 0000 if prompted
```

3. Open Sakorio app.
4. Log in to staff POS.
5. Go to Settings → Printing.
6. Scan paired devices.
7. Connect XP-80T.
8. Print a test receipt.
9. Run a real POS flow:

```text
Select table
→ add 3 items
→ send order
→ kitchen receipt print
→ pay bill
→ customer receipt print
→ close table
```

## 6. Current status

Android app build gate is passed.

Remaining gate:

```text
Physical Android tablet + XP-80T Bluetooth print test
```

