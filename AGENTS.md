**AGENTS.md – Project Guide for AI Coding Assistants
(clover‑relay‑mini Android / Kotlin / Clover SDK)**
*Last updated 2025‑06‑26*

---

## 0. Mission

This repository turns a **Clover Mini Dev Kit** into a USB ⇄ LAN relay so that a demo‑mode **Clover Station Solo** can outsource every card‑present transaction to a **Clover Flex 4** running *Secure Network Pay Display* (SNPD) or *REST Pay Display*.

Your job as an automated coding / testing agent (OpenAI Codex, Google Gemini Code Assist, etc.) is to:

1. **Navigate** the Gradle/Kotlin project confidently.
2. **Compile** reproducible *debug* and *release* APKs.
3. **Guard** critical invariants (e.g., `remoteApplicationId` must match our Clover App ID).
4. **Generate or maintain** tests and CI scripts that respect our device‑driven workflow.
5. **Adhere** to the coding conventions and security rules documented here.

---

## 1. Repository layout

```
clover-relay-mini/
├─ settings.gradle              # Gradle workspace definition
├─ build.gradle                 # Root build script (SDK version declared here)
├─ local.properties             # NOT in VCS • holds CLOVER_APP_ID / SECRET, sdk.dir
└─ app/
   ├─ build.gradle              # Module build script + dependencies
   └─ src/main/
      ├─ AndroidManifest.xml
      └─ java/com/pcnaid/cloverrelay/
         ├─ MainActivity.kt
         ├─ RelayService.kt
         └─ UsbDeviceObserver.kt
```

*AI agents must not create new top‑level folders without project‑owner approval.*

---

## 2. Environment prerequisites

| Toolchain component | Minimum version | Install / verify command  |
| ------------------- | --------------- | ------------------------- |
| **JDK**             | 17              | `java -version`           |
| **Android SDK**     | Platform 34     | `sdkmanager --list`       |
| **Gradle plugin**   | 8.3.0           | locked in `build.gradle`  |
| **Clover SDK**      | 3.2.3 (323)     | pulled from Maven Central |

AI agents should ensure all licences are accepted **once per runner**:

```bash
yes | sdkmanager --licenses
```

---

## 3. Secrets & configuration

`local.properties` (excluded via `.gitignore`) **must** contain:

```properties
CLOVER_APP_ID=WP53JDCG2MANT
CLOVER_APP_SECRET=<redacted if unused>
sdk.dir=/home/runner/android-sdk   # or $ANDROID_HOME
```

Expose them in `app/build.gradle` exactly like this:

```gradle
def props = new Properties()
file("$rootDir/local.properties").withInputStream { props.load(it) }

android.defaultConfig {
    buildConfigField "String", "CLOVER_APP_ID", "\"${props['CLOVER_APP_ID']}\""
    buildConfigField "String", "CLOVER_APP_SECRET", "\"${props['CLOVER_APP_SECRET']}\""
}
```

*Agents must never hard‑code secrets in source files or test fixtures.*

---

## 4. Build & signing tasks

| Variant                | Command                                                                                            | Output                                                   |
| ---------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| **Debug**              | `./gradlew :app:assembleDebug`                                                                     | `app/build/outputs/apk/debug/app-debug.apk`              |
| **Release (unsigned)** | `./gradlew :app:assembleRelease`                                                                   | `app/build/outputs/apk/release/app-release-unsigned.apk` |
| **Release (signed)**   | Add a `keystore.jks` reference under `signingConfigs.release` and execute `assembleRelease` again. |                                                          |

CI runners must set the following **secret env‑vars** when producing a signed build:

* `KS_PATH` – absolute path to the keystore
* `KS_PASS` – store & key password (both identical)

---

## 5. Coding conventions

* **Language:** Kotlin 1.9.x
* **Style:** `ktlint:standard` (80‑char soft wrap) – run `./gradlew ktlintCheck` before committing.
* **Null‑safety:** favour `val`, avoid platform types.
* **Logging:** use `android.util.Log` with tag `"CloverRelay"` – no printlns.
* **Threading:** all Clover SDK calls occur on the binder/IO thread provided by the SDK; heavy work must be off‑loaded to `Dispatchers.IO`.

---

## 6. Testing strategy

| Layer               | Tool                            | Notes                                                                 |
| ------------------- | ------------------------------- | --------------------------------------------------------------------- |
| **Unit**            | JUnit 5 (`testDebugUnitTest`)   | Mock `USBConnector` and `CloverConnector` with Mockito‑Kotlin.        |
| **Instrumentation** | AndroidX Test + UIAutomator     | Optional – requires physical Clover Mini Dev Kit.                     |
| **Smoke**           | Shell script `scripts/smoke.sh` | Runs ADB install → triggers sample sale over loopback connector stub. |

CI should run `./gradlew testDebugUnitTest` on every PR.
Instrumentation and smoke tests are **manual or self‑hosted‑runner only** because they need Clover hardware.

---

## 7. CI blueprint (GitHub Actions)

```yaml
name: Android CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v3
        with: { distribution: 'temurin', java-version: '17' }
      - uses: maxim-lobanov/setup-android-tools@v1
        with: { cmdline-tools-version: "latest" }
      - run: yes | sdkmanager --licenses
      - run: ./gradlew ktlintCheck testDebugUnitTest :app:assembleRelease
```

*Agents creating new workflows must base them on this skeleton.*

---

## 8. Critical invariants (❗ DO NOT BREAK)

1. `remoteApplicationId` in **`RelayService.kt`** **must equal** `${BuildConfig.CLOVER_APP_ID}` at runtime.
2. `SaleRequest.externalId` **must be unique** (`UUID.randomUUID()`).
3. All socket traffic to the Flex must use **WSS** (`wss://<ip>:12345/remote_pay`) unless the merchant explicitly disables TLS for testing.
4. No PAN or cryptogram ever touches on‑disk logs.

AI agents should add regression tests or assertions if touching these areas.

---

## 9. Common local commands cheat‑sheet

```bash
# Fast incremental build
./gradlew :app:installDebug

# Logcat filter
adb logcat | grep CloverRelay

# Uninstall old build from Mini
adb uninstall com.pcnaid.cloverrelay
```

---

## 10. When extending functionality

* **Multiple Flex support:** create a `Map<String, ICloverConnector>` keyed by IP.
* **Cloud analytics:** add a `webhooks/` module – follow Clover REST OAuth; reuse `CLOVER_APP_SECRET`.
* **Kiosk mode:** add `BootReceiver` + `DEVICE_OWNER` config; do **not** replace the Clover launcher.

Each new feature must come with **unit tests + doc update** in this Agents.md file.

---

## 11. Support contacts

| Role            | Handle                                        | Channel                 |
| --------------- | --------------------------------------------- | ----------------------- |
| Tech lead       | *Abood*                                       | GitHub @abood‑pcnaid    |
| Build/CI        | *Dev Infra Bot*                               | GitHub Actions comments |
| Clover SDK bugs | [devrel@clover.com](mailto:devrel@clover.com) | Email                   |

---

Happy coding! Follow these rules and every automated assistant will integrate smoothly with the Clover ecosystem while keeping our merchant environments secure.
