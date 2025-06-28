P_ID_HERE"

Flex Connection: The WebSocketCloverTransport must be configured with the correct IP address and port of the Clover Flex running the SNPD app. This should be made configurable for the merchant.

External Payment ID: Every SaleRequest sent to the Flex must have a unique externalId (UUID.randomUUID().toString()). This is critical for transaction tracking and reconciliation.

Response Handling: The onSaleResponse callback is the single source of truth for the transaction outcome.

If response.isSuccess() is true, the payment was successful. The app must call setResult(Activity.RESULT_OK) before finishing.

If response.isSuccess() is false, the payment failed or was canceled. The response.reason should be logged or displayed. The app must call setResult(Activity.RESULT_CANCELED) before finishing.

Resource Management: Both the OrderConnector and the CloverConnector must be properly disposed of in the onDestroy() lifecycle method of the activity (orderConnector.disconnect() and cloverConnector.dispose()).

4. Testing & Deployment
Sideloading Protocol (Mandatory)
Due to Clover's security model, a developer-signed APK cannot be installed over a version downloaded from the App Market. Follow this procedure:

Install from Market First: Install the app on the Station Solo from the More Tools app once. This registers the app's permissions.

Uninstall via ADB: Connect the Station to your computer and run:

adb uninstall com.pcnaid.cloverairbridge

Sideload Dev Build: Now, install your debug/development APK:

adb install path/to/your/app-debug.apk

Test Plan
A full end-to-end test must validate the following:

Successful Payment: The order is marked as paid in the Register app.

Canceled Payment: The customer cancels on the Flex; the Register app returns to the payment selection screen, and the order remains open.

Declined Payment: A card is declined on the Flex; the Register app returns to the payment selection screen.

Network Disconnection: The app gracefully handles cases where the Flex is unreachable (e.g., wrong IP, not on network, SNPD not running).

5. CI Blueprint (GitHub Actions)
Use this skeleton for any CI/CD workflows.

name: Android CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'
      - name: Grant execute permission for gradlew
        run: chmod +x ./gradlew
      - name: Build with Gradle
        run: ./gradlew build
      - name: Upload Debug APK
        uses: actions/upload-artifact@v4
        with:
          name: app-debug-apk
          path: app/build/outputs/apk/debug/app-debug.apk

6. Common Local Commands
# Sideload the debug build
./gradlew installDebug

# View logs from the app
adb logcat -s "CloverAirBridge"

# Uninstall the app
adb uninstall com.pcnaid.cloverairbridge