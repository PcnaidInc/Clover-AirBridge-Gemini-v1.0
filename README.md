Below is the **shortest path from the URL you just shared to a card‑approved test swipe on your Clover Flex 4**.
Everything is written for the Firebase Studio (IDX) workspace that’s running at:

> **[https://9000-firebase‑studio‑175087…cloudworkstations.dev](https://9000-firebase‑studio‑175087…cloudworkstations.dev)** ([9000-firebase-studio-1750879596277.cluster-hf4yr35cmnbd4vhbxvfvc6cp5q.cloudworkstations.dev][1])

---

## 1 · Open the workspace console

1. Visit the link in Chrome.
2. Log in with the same Google account you used when you created the workspace.
3. In the left sidebar click **Terminal › New Terminal** – you’re now inside the Linux container that hosts the project.

*(If you see only the documentation page, use the folder icon ⬅️ top‑left to switch to the file explorer, then open a terminal.)*

---

## 2 · Build the APK inside the container

```bash
# make sure you are at the project root
ls -1            # you should see settings.gradle, app/ etc.

# accept any pending Android licence prompts (one‑time)
yes | sdkmanager --licenses

# pull Clover SDK jars & compile release build
./gradlew :app:assembleRelease
```

Successful output ends with:

```
BUILD SUCCESSFUL
...
app/build/outputs/apk/release/app-release.apk
```

---

## 3 · Download the APK to your laptop

1. In the file tree, expand
   `app → build → outputs → apk → release`.
2. Right‑click **app‑release.apk** → **Download**.
   (Chrome will save it to *Downloads*.)

---

## 4 · Prepare your development PC for Clover ADB

```bash
# Only once per computer
echo 0x28f3 >> ~/.android/adb_usb.ini
adb kill-server && adb start-server
```

*`0x28f3` is Clover’s USB vendor ID.*

---

## 5 · Enable USB debugging on the Clover Mini Dev Kit

1. **Settings → About device → Build number** – tap 7 times.
2. Back → **Developer options**

   * Turn on **USB debugging**
   * Turn on **Install via USB / Allow unknown sources**
3. Plug the Mini into your computer with a micro‑USB B cable.
4. When the RSA fingerprint prompt appears on the Mini, tap **Allow**.

---

## 6 · Sideload the APK

```bash
adb devices               # should list the Mini as “device”
adb install -r ~/Downloads/app-release.apk
```

A successful install prints *“Success”*.

---

## 7 · Bring the other devices online

| Device           | What to do                                                                                                |
| ---------------- | --------------------------------------------------------------------------------------------------------- |
| **Flex 4**       | Launch **Secure Network Pay Display** → **Start** → note its IP (e.g. 192.168.1.90).                      |
| **Station Solo** | Make sure **USB Pay Display** is installed. Leave Register in Demo Mode.                                  |
| **Mini (Relay)** | Open **Clover Relay** (your app) → type the Flex IP → tap **Start relay** (service starts in foreground). |

All three devices **must be on the same Wi‑Fi/LAN**.

---

## 8 · Run a live test sale

1. On the Station, add an item and press **Pay → Credit/Debit**.
2. The Flex should instantly display the amount; tap or insert a card.
3. Flex shows **Approved** → Mini relays the response → Station prints receipt and marks the order **Paid**.

---

## 9 · Real‑time debugging (optional)

Open another terminal on your PC:

```bash
adb logcat | grep CloverRelay
```

You’ll see:

```
SaleRequest received: amount=...
Forwarded to Flex 192.168.1.90
SaleResponse APPROVED, auth=...
```

---

### Common road‑blocks & quick remedies

| Symptom                               | Fix                                                              |
| ------------------------------------- | ---------------------------------------------------------------- |
| `adb devices` shows *unauthorized*    | Re‑plug USB and accept the RSA dialog on the Mini.               |
| Station error “Pay Display not found” | Cable is in the wrong Mini port or USB debugging got turned off. |
| Relay toast “Flex disconnected”       | Wrong IP or SNPD not running – restart SNPD and re‑enter IP.     |
| Payment times out                     | Store firewall is blocking TCP 12345 between Mini ↔ Flex.        |

---

## 10 · Next steps

* **Wi‑Fi ADB** (`adb tcpip 5555`) to develop without the cable.
* **Auto‑start on boot** – add a `BOOT_COMPLETED` receiver that launches `RelayService`.
* **Push to GitHub** from the workspace terminal:

  ```bash
  git init
  git remote add origin https://github.com/<user>/clover-relay-mini.git
  git add .
  git commit -m "Initial import"
  git push -u origin main
  ```

You now have a closed‑loop lab: the APK is generated in Firebase Studio, sideloaded onto the Mini, and end‑to‑end card transactions flow through the Flex—all in under ten minutes. Let me know if any step feels off or if you hit an edge‑case I didn’t cover.

[1]: https://9000-firebase-studio-1750879596277.cluster-hf4yr35cmnbd4vhbxvfvc6cp5q.cloudworkstations.dev/ "AirBridge Assistant"
