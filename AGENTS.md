## Codex prompt  (works with GitHub‑connected runs)

> **You are in a Linux container that already has `git` authenticated for write access to the current repository.**
> Perform the following steps **exactly**; abort on any error (`set -euo pipefail`).
>
> 1. ***Clean slate***
>
>    ```bash
>    git rm -rf . --cached
>    rm -rf ./*
>    git clean -fdx                 # remove untracked
>    ```
> 2. ***Create directory skeleton***
>
>    ```bash
>    mkdir -p \
>      CloverRelay/core/src/main/java/com/pcnaid/relay/{model,network,cloud,domain,di} \
>      CloverRelay/core/src/main/res/xml \
>      CloverRelay/app-mini/src/main/java/com/pcnaid/relay/{mini,ui} \
>      CloverRelay/app-mini/src/main \
>      CloverRelay/app-station/src/main/java/com/pcnaid/relay/station \
>      CloverRelay/.github/workflows
>    touch \
>      CloverRelay/{settings.gradle,build.gradle,gradle.properties} \
>      CloverRelay/core/build.gradle \
>      CloverRelay/core/src/main/AndroidManifest.xml \
>      CloverRelay/core/src/main/java/com/pcnaid/relay/model/{PaymentRequest.kt,PaymentResult.kt} \
>      CloverRelay/core/src/main/java/com/pcnaid/relay/network/{SocketRelayClient.kt,SocketRelayServer.kt} \
>      CloverRelay/core/src/main/java/com/pcnaid/relay/cloud/RestPayClient.kt \
>      CloverRelay/core/src/main/java/com/pcnaid/relay/domain/{ProcessRegisterSaleUseCase.kt,SendResultBackUseCase.kt} \
>      CloverRelay/core/src/main/java/com/pcnaid/relay/di/NetworkModule.kt \
>      CloverRelay/core/src/main/res/xml/network_security_config.xml \
>      CloverRelay/app-mini/build.gradle \
>      CloverRelay/app-mini/src/main/AndroidManifest.xml \
>      CloverRelay/app-mini/src/main/java/com/pcnaid/relay/mini/{MiniRelayService.kt,MiniPaymentListener.kt} \
>      CloverRelay/app-mini/src/main/java/com/pcnaid/relay/ui/SplashActivity.kt \
>      CloverRelay/app-station/build.gradle \
>      CloverRelay/app-station/src/main/AndroidManifest.xml \
>      CloverRelay/app-station/src/main/java/com/pcnaid/relay/station/{StationBroadcastReceiver.kt,StationRelayClient.kt} \
>      CloverRelay/.github/workflows/android.yml
>    ```
>
>    *(all files are currently blank by request)*
> 3. ***Stage & commit***
>
>    ```bash
>    git add CloverRelay
>    git commit -m "chore: wipe repo and add blank CloverRelay scaffold"
>    git push
>    ```
> 4. ***Echo success***
>
>    ```bash
>    echo "--- Scaffold ready ---"
>    ```

---
