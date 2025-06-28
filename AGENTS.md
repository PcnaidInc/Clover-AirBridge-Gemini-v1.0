Below is a gap‑analysis checklist comparing the implementation described in “Clover Relay App Architecture_.pdf” with what is in your current repo PcnaidInc‑Clover‑AirBridge‑Gemini‑v1.0 (“repomix file”).
Work through each numbered heading in order.  Where you see ➕ Add, ✏️ Modify, ➖ Remove, clone the repo to a clean branch, commit after every heading, and push.  When you reach the end you will have a repo that exactly matches the reference architecture and will run on Clover Mini (and optionally Station Solo) as requested.

⸻

1  Project structure

What the PDF expects	What repo has now	Action
 Gradle multi‑module layout: :app‑station, :app‑mini, :core	single‑module Android app	➕ Split into three modules. core holds all business logic, model classes, network code. Device‑specific UI and Clover SDK bindings live in app‑station and app‑mini.
Kotlin/Coroutines, Hilt, View‑Model‑first	Java‑only, no DI	➕ Enable Kotlin (see §2) and add Hilt plugin in root build.gradle.


⸻

2  Gradle / build‑script updates
	1.	Root settings.gradle

include ':core', ':app-station', ':app-mini'
enableFeaturePreview('TYPESAFE_PROJECT_ACCESSORS')


	2.	All module build.gradle files

plugins { id 'com.android.application' ; id 'org.jetbrains.kotlin.android' ; id 'dagger.hilt.android.plugin' }
android { compileSdk 35 /* Clover BSP 399 uses API 35 */ }
dependencies {
    implementation "com.clover.sdk:clover-android-sdk:293.0"     // latest
    implementation "androidx.lifecycle:lifecycle-viewmodel-ktx:2.8.1"
    implementation "com.squareup.okhttp3:okhttp:5.2.0"
    implementation "org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0"
    implementation "com.google.dagger:hilt-android:2.56"
    kapt          "com.google.dagger:hilt-compiler:2.56"
}


	3.	➖ Remove obsolete manual JARs currently copied into app/libs. Use maven artifacts only.

⸻

3  AndroidManifest (each module)

Key item	Station & Mini requirement	Your current state	Action
<uses-permission android:name="com.clover.permission.RECEIVE_CLOVER_BROADCASTS"/>	Mandatory	missing	➕ add
<service android:name=".relay.RelayService" android:exported="false" clover:requiresClover="true" /><intent-filter><action android:name="com.clover.intent.action.START_RELAY"/></intent-filter>	Required by PDF	Service exists but exported=true	✏️ export=false and add intent‑filter tag above
<receiver android:name=".relay.PaymentReceiver" ...>	Not present	➕ add receiver section to intercept com.clover.intent.action.PAYMENT_COMPLETED & ORDER_CREATED broadcasts	


⸻

4  Core module additions

4.1  Data contracts

Create core/src/main/java/com/pcnaid/relay/model

File	Purpose
PaymentRequest.kt	data class {amount,long orderId,String externalId}
PaymentResult.kt	data class {orderId,result,transactionId,reason}

4.2  Network layer

core/.../network/SocketRelayClient.kt – wraps OkHttp WebSocket, serialises PaymentRequest.
core/.../network/SocketRelayServer.kt – embedded NanoHTTPD‑style WebSocket server for Flex.

4.3  Use‑cases (coroutines)

ProcessRegisterSaleUseCase.kt – called by Station broadcast receiver.
SendResultBackUseCase.kt – called by Flex after payment.

⸻

5  Device‑specific modules

5.1  app-mini (Flex / Mini)

Component	Notes
MiniRelayService.kt	extends HiltService, holds PaymentConnector.  On incoming WebSocket message → PaymentConnector.sale(request)
MiniPaymentListener.kt	implements PaymentConnectorListener → onResult → SocketRelayServer.broadcast(PaymentResult)

5.2  app-station (optional demo Station)

Component	Notes
StationBroadcastReceiver.kt	listens for ORDER_CREATED/PAYMENT_REQUEST broadcasts from Register or 3rd‑party POS.
StationRelayClient.kt	calls SocketRelayClient.send(PaymentRequest) and awaits PaymentResult; on success calls OrderConnector.updateOrderStatus(...).


⸻

6  Dependency‑injection wiring

Create core/.../di/NetworkModule.kt

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
  @Provides @Singleton
  fun provideWebSocketClient() = SocketRelayClient()
  @Provides @Singleton
  fun provideWebSocketServer() = SocketRelayServer(5959)
}

Each Service receives the right instance via Hilt.

⸻

7  Clover OAuth / REST Pay API

The PDF shows an optional cloud‑fallback path using Clover REST Pay (merchant‑signed OAuth token).
Because you said “whatever it takes to work,” implement the offline‑first local‑Wi‑Fi relay now and stub the cloud path:
	1.	➕ core/.../cloud/RestPayClient.kt – interface only, returning Result.Failure(“NotYetImplemented”).
	2.	In both Services wrap network call in try/catch → if Mini unreachable for 2 s call RestPayClient.sale().
	3.	Leave TODO with link to Clover REST Pay docs (“v3/payments”).

⸻

8  UI cleanup

Remove	Replace
MainActivity.java, PaymentActivity.java, any Activities that only call SDK dialogs.	➖ delete – the Relay runs headless.
activity_main.xml, unused layout files	delete
Add “silent” launcher Activity SplashActivity.kt with <intent-filter MAIN/LAUNCHER> that immediately closes – Clover requires at least one Activity.	


⸻

9  Configuration & secrets
	•	Create /core/src/main/res/xml/network_security_config.xml allowing clear‑text to 10.0.0.0/8 (Clover demo uses clear‑text).
	•	In each module’s AndroidManifest add <application android:networkSecurityConfig="@xml/network_security_config">.

⸻

10  Testing & deployment
	1.	Local‑LAN test:
	•	Enable Wi‑Fi on Mini + Station, confirm same subnet.
	•	Install debug builds (adb install ...app‑mini.apk, etc.).
	•	Trigger $1.00 sale on Station Register → Mini should display tender screen.
	2.	Private‑App build:
	•	In each module’s build.gradle set defaultConfig.applicationIdSuffix ".private".
	•	Build Release AARs (./gradlew :app-mini:assembleRelease).
	•	Upload to Clover Dev Dashboard as Private App. Use generated install URL for merchant.
	3.	CI:
	•	➕ .github/workflows/android.yml running ./gradlew lint detekt assembleRelease and publishing the APK artifacts.

⸻

Recap – commit sequence

git checkout -b feature/relay-arch
# 1  structure split
# 2  gradle & plugins
# 3  manifest updates
# 4  core data + network
# 5  mini service + listener
# 6  station receiver (optional)
# 7  DI wiring
# 8  remove UI, add splash
# 9  config & secrets
# 10 tests + CI
git push --set-upstream origin feature/relay-arch

When every step passes adb testing on Mini, tag the commit:

git tag -a v2.0-relay-initial -m "Implements Clover Relay App Architecture"
git push --tags


⸻

Next steps
	•	Replace the RestPayClient TODO with full cloud fallback.
	•	Add AES‑256 encryption to WebSocket messages if PCI review requires it.
	•	Write README badges for build & license.

Follow the checklist exactly and the repo will line up with the reference architecture and work flawlessly on Clover Mini (and any Station your merchants side‑load).