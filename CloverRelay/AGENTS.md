## Codex

Add the code below to its designated file in the repo.


gradle.properties
ini
Copy
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
android.enableJetifier=true
kotlin.code.style=official
core/build.gradle
groovy
Copy
plugins {
    id 'com.android.library'
    id 'kotlin-android'
}

android {
    compileSdkVersion 29
    defaultConfig {
        minSdkVersion 27
        targetSdkVersion 29
        consumerProguardFiles "consumer-rules.pro"
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
    kotlinOptions {
        jvmTarget = "1.8"
    }
}

dependencies {
    implementation "org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3"
    implementation "com.squareup.retrofit2:retrofit:2.9.0"
    implementation "com.squareup.retrofit2:converter-gson:2.9.0"
    implementation "com.squareup.okhttp3:logging-interceptor:4.10.0"
    implementation "com.google.code.gson:gson:2.9.0"
}
core/src/main/AndroidManifest.xml
xml
Copy
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android" />
core/src/main/java/com/pcnaid/relay/model/PaymentRequest.kt
kotlin
Copy
package com.pcnaid.relay.model

import com.google.gson.annotations.SerializedName

/**
 * Data model representing a payment request, containing the details needed for processing a payment.
 */
data class PaymentRequest(
    @SerializedName("amount") val amount: Long,
    @SerializedName("externalPaymentId") val externalPaymentId: String,
    @SerializedName("capture") val capture: Boolean = true,
    val taxAmount: Long = 0L
)
core/src/main/java/com/pcnaid/relay/model/PaymentResult.kt
kotlin
Copy
package com.pcnaid.relay.model

/**
 * Data model representing the outcome of a processed payment.
 * Indicates whether the payment was successful and provides relevant details.
 */
data class PaymentResult(
    val success: Boolean,
    val externalPaymentId: String,
    val paymentId: String? = null,
    val message: String? = null,
    val amount: Long? = null
)
core/src/main/java/com/pcnaid/relay/network/SocketRelayClient.kt
kotlin
Copy
package com.pcnaid.relay.network

import android.util.Log
import com.google.gson.Gson
import com.pcnaid.relay.model.PaymentRequest
import com.pcnaid.relay.model.PaymentResult
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.PrintWriter
import java.net.Socket

/**
 * A simple socket client used by the Clover Station (or any client) to send payment requests to the Clover Mini's socket server and receive payment results.
 */
object SocketRelayClient {
    private const val TAG = "SocketRelayClient"
    private const val DEFAULT_PORT = 5000  // Default port for socket communications

    /**
     * Connects to the relay server on the Clover Mini and sends the payment request.
     * Waits for a response, then returns the PaymentResult or null if communication failed.
     */
    fun sendPaymentRequest(request: PaymentRequest, serverIp: String, port: Int = DEFAULT_PORT): PaymentResult? {
        return try {
            Log.i(TAG, "Connecting to relay server at $serverIp:$port")
            Socket(serverIp, port).use { socket ->
                socket.soTimeout = 15000  // timeout for response
                // Send the request as JSON
                val out = PrintWriter(socket.getOutputStream(), true)
                val requestJson = Gson().toJson(request)
                out.println(requestJson)
                Log.d(TAG, "Sent payment request: $requestJson")

                // Read the response
                val input = BufferedReader(InputStreamReader(socket.getInputStream()))
                val responseJson = input.readLine()
                if (responseJson != null) {
                    Log.d(TAG, "Received response: $responseJson")
                    // Parse JSON into PaymentResult
                    Gson().fromJson(responseJson, PaymentResult::class.java)
                } else {
                    Log.e(TAG, "No response received from server.")
                    null
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error communicating with relay server", e)
            null
        }
    }
}
core/src/main/java/com/pcnaid/relay/network/SocketRelayServer.kt
kotlin
Copy
package com.pcnaid.relay.network

import android.util.Log
import com.google.gson.Gson
import com.pcnaid.relay.domain.ProcessRegisterSaleUseCase
import com.pcnaid.relay.model.PaymentRequest
import com.pcnaid.relay.model.PaymentResult
import kotlinx.coroutines.runBlocking
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.PrintWriter
import java.net.ServerSocket
import java.net.Socket

/**
 * A simple socket server that listens on the Clover Mini for incoming payment requests (from a Station app) and processes them.
 * It forwards the request to the Clover Flex device and returns the result back to the Station.
 */
object SocketRelayServer {
    private const val TAG = "SocketRelayServer"
    private const val PORT = 5000
    @Volatile private var running: Boolean = false

    /**
     * Starts listening for incoming connections on a background thread.
     * This will block the thread it runs on; call it from a separate thread or service.
     */
    fun startServer() {
        if (running) {
            Log.w(TAG, "SocketRelayServer is already running.")
            return
        }
        running = true
        Thread {
            try {
                Log.i(TAG, "Starting SocketRelayServer on port $PORT")
                ServerSocket(PORT).use { serverSocket ->
                    while (running) {
                        val clientSocket = serverSocket.accept()
                        Log.d(TAG, "Client connected: ${clientSocket.inetAddress.hostAddress}")
                        handleClient(clientSocket)
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "SocketRelayServer encountered an error", e)
            } finally {
                running = false
            }
        }.start()
    }

    /**
     * Stops the server from listening for further connections.
     */
    fun stopServer() {
        running = false
        // Note: To fully stop immediately, the ServerSocket should be closed (not shown here for simplicity).
        Log.i(TAG, "SocketRelayServer stopped.")
    }

    /**
     * Handles an individual client connection: reads a PaymentRequest, processes it, and sends back a PaymentResult.
     */
    private fun handleClient(socket: Socket) {
        socket.use { client ->
            try {
                client.soTimeout = 30000  // timeout for client communication
                val input = BufferedReader(InputStreamReader(client.getInputStream()))
                val output = PrintWriter(client.getOutputStream(), true)

                val requestJson = input.readLine()
                if (requestJson == null) {
                    Log.w(TAG, "Received empty request from client.")
                    return
                }
                Log.d(TAG, "Received payment request JSON: $requestJson")
                val request = Gson().fromJson(requestJson, PaymentRequest::class.java)

                // Process the payment request by forwarding to Clover Flex (synchronously via runBlocking)
                val result: PaymentResult = runBlocking {
                    ProcessRegisterSaleUseCase.execute(request)
                }

                // Send the result back as JSON
                val responseJson = Gson().toJson(result)
                output.println(responseJson)
                Log.i(TAG, "Processed request (ExternalID=${request.externalPaymentId}), sent result success=${result.success}")
            } catch (e: Exception) {
                Log.e(TAG, "Error handling client connection", e)
            }
        }
    }
}
core/src/main/java/com/pcnaid/relay/cloud/RestPayClient.kt
kotlin
Copy
package com.pcnaid.relay.cloud

import com.pcnaid.relay.model.PaymentRequest
import com.pcnaid.relay.model.PaymentResult
import com.pcnaid.relay.network.NetworkModule
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST
import java.util.UUID

/**
 * Client responsible for making REST calls to the Clover REST Pay Display API on the Clover Flex device.
 * Uses Retrofit to send payment requests to the Flex and retrieve results.
 */
object RestPayClient {
    // Define the Retrofit API interface for the Clover REST Pay API
    private interface CloverRestApiService {
        @POST("v1/payments")
        suspend fun makePayment(
            @Header("Authorization") token: String,
            @Header("X-Clover-Device-Id") deviceId: String,
            @Header("Idempotency-Key") idempotencyKey: String,
            @Body request: SaleRequest
        ): Response<SaleResponse>
    }

    // Data classes to represent the JSON payload and response from the REST API
    private data class SaleRequest(
        val amount: Long,
        val externalPaymentId: String,
        val capture: Boolean = true
    )
    private data class SaleResponse(
        val id: String?,
        val amount: Long?,
        val result: String?
    )

    /**
     * Executes a sale transaction on the Clover Flex device using the REST Pay API.
     * @param flexIp IP address of the Clover Flex device (for local network calls).
     * @param authToken OAuth access token for authentication (without "Bearer " prefix).
     * @param flexSerial The serial number of the target Clover Flex device.
     * @param paymentRequest The payment details to send (amount, externalPaymentId, etc.).
     * @return PaymentResult indicating success or failure of the transaction.
     */
    suspend fun sendSaleRequest(flexIp: String, authToken: String, flexSerial: String, paymentRequest: PaymentRequest): PaymentResult {
        // Construct base URL for local device (REST Pay Display runs on port 12345)
        val baseUrl = if (flexIp.startsWith("http")) flexIp else "https://$flexIp:12345/"
        val retrofit = NetworkModule.getRetrofitService(baseUrl)
        val api = retrofit.create(CloverRestApiService::class.java)
        val idempotencyKey = UUID.randomUUID().toString()
        return try {
            val saleRequest = SaleRequest(amount = paymentRequest.amount, externalPaymentId = paymentRequest.externalPaymentId, capture = true)
            val response = api.makePayment(
                token = "Bearer $authToken",
                deviceId = flexSerial,
                idempotencyKey = idempotencyKey,
                request = saleRequest
            )
            if (response.isSuccessful) {
                val body = response.body()
                PaymentResult(
                    success = true,
                    externalPaymentId = paymentRequest.externalPaymentId,
                    paymentId = body?.id ?: "",
                    message = body?.result ?: "SUCCESS",
                    amount = paymentRequest.amount
                )
            } else {
                val errorMsg = response.errorBody()?.string() ?: "Unknown error"
                PaymentResult(
                    success = false,
                    externalPaymentId = paymentRequest.externalPaymentId,
                    message = "Failed to relay payment: HTTP ${response.code()} - $errorMsg"
                )
            }
        } catch (e: Exception) {
            // Handle network or JSON exceptions
            return PaymentResult(
                success = false,
                externalPaymentId = paymentRequest.externalPaymentId,
                message = "Exception during payment relay: ${e.message}"
            )
        }
    }
}
core/src/main/java/com/pcnaid/relay/domain/ProcessRegisterSaleUseCase.kt
kotlin
Copy
package com.pcnaid.relay.domain

import com.pcnaid.relay.cloud.RestPayClient
import com.pcnaid.relay.di.NetworkModule
import com.pcnaid.relay.model.PaymentRequest
import com.pcnaid.relay.model.PaymentResult

/**
 * Use case that processes a payment request by forwarding it to the Clover Flex device and awaiting the result.
 * It utilizes the RestPayClient to perform the network call to the Flex.
 */
object ProcessRegisterSaleUseCase {
    /**
     * Forwards the payment request to the Clover Flex (via REST API) and returns the payment result.
     * Assumes that the device configuration (Flex IP, token, serial) has been set via the app.
     */
    suspend fun execute(request: PaymentRequest): PaymentResult {
        // Retrieve configuration values for the Flex device
        val config = NetworkModule.getConfig()
        val flexIp = config.flexIp
        val authToken = config.authToken
        val flexSerial = config.flexSerial

        if (flexIp.isNullOrEmpty() || authToken.isNullOrEmpty() || flexSerial.isNullOrEmpty()) {
            // Configuration incomplete; cannot process payment
            return PaymentResult(
                success = false,
                externalPaymentId = request.externalPaymentId,
                message = "Missing configuration for Clover Flex device."
            )
        }
        // Use the RestPayClient to send the request and get the result
        return RestPayClient.sendSaleRequest(flexIp, authToken, flexSerial, request)
    }
}
core/src/main/java/com/pcnaid/relay/domain/SendResultBackUseCase.kt
kotlin
Copy
package com.pcnaid.relay.domain

import android.content.Context
import android.content.Intent
import android.util.Log
import com.pcnaid.relay.model.PaymentResult

/**
 * Use case that handles returning the payment result back to the initiating system (the Clover Station).
 * In a real integration, this might involve Clover SDK's payment APIs; here we broadcast a local Intent with the result.
 */
object SendResultBackUseCase {
    private const val TAG = "SendResultBack"

    /**
     * Sends the payment result back to the Clover Station (or any listening component) via a broadcast Intent.
     * The Intent includes the externalPaymentId, success status, and optional details like paymentId and message.
     */
    fun execute(context: Context, result: PaymentResult) {
        Log.i(TAG, "Sending result back for ExternalPaymentId=${result.externalPaymentId}, success=${result.success}")
        val resultIntent = Intent("com.pcnaid.relay.PAYMENT_RESULT").apply {
            putExtra("externalPaymentId", result.externalPaymentId)
            putExtra("success", result.success)
            result.paymentId?.let { putExtra("paymentId", it) }
            result.message?.let { putExtra("message", it) }
            result.amount?.let { putExtra("amount", it) }
        }
        // Broadcast the result locally on the Clover Station's device
        context.sendBroadcast(resultIntent)
    }
}
core/src/main/java/com/pcnaid/relay/di/NetworkModule.kt
kotlin
Copy
package com.pcnaid.relay.di

import android.content.Context
import android.util.Log
import com.google.gson.Gson
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

/**
 * A simple DI module (singleton object) providing network-related components and storing device configuration.
 * It holds the Clover Flex device IP, OAuth token, and serial, and provides Retrofit instances for API calls.
 */
object NetworkModule {
    private const val TAG = "NetworkModule"

    // Configuration data for the target Clover Flex device
    data class FlexConfig(var flexIp: String? = null, var authToken: String? = null, var flexSerial: String? = null)
    private val flexConfig = FlexConfig()
    private var initialized = false

    /**
     * Ensure the configuration is loaded from SharedPreferences if not already done.
     */
    fun ensureConfig(context: Context) {
        if (!initialized) {
            try {
                val prefs = context.getSharedPreferences("AppPrefs", Context.MODE_PRIVATE)
                flexConfig.flexIp = prefs.getString("FLEX_IP", null)
                flexConfig.authToken = prefs.getString("AUTH_TOKEN", null)
                flexConfig.flexSerial = prefs.getString("FLEX_SERIAL", null)
                initialized = true
                Log.d(TAG, "Loaded Flex config from SharedPreferences: $flexConfig")
            } catch (e: Exception) {
                Log.e(TAG, "Error loading config from SharedPreferences", e)
            }
        }
    }

    /**
     * Update the stored Flex device configuration (called when user saves settings in the app).
     */
    fun updateConfig(flexIp: String, authToken: String, flexSerial: String) {
        flexConfig.flexIp = flexIp
        flexConfig.authToken = authToken
        flexConfig.flexSerial = flexSerial
        initialized = true
        Log.d(TAG, "Flex configuration updated: IP=$flexIp, Serial=$flexSerial")
    }

    /**
     * Get the current Flex device configuration.
     */
    fun getConfig(): FlexConfig {
        return flexConfig
    }

    /**
     * Provides a Retrofit instance configured with the given base URL and common settings (JSON converter, logging, etc.).
     */
    fun getRetrofitService(baseUrl: String): Retrofit {
        // Create an OkHttp client with logging for debugging
        val logging = HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BASIC }
        val clientBuilder = OkHttpClient.Builder().addInterceptor(logging)

        // (Optional) Configure SSL or hostname verification for local IP as needed

        // Ensure base URL ends with a slash
        val normalizedUrl = if (baseUrl.endsWith("/")) baseUrl else "$baseUrl/"

        return Retrofit.Builder()
            .baseUrl(normalizedUrl)
            .client(clientBuilder.build())
            .addConverterFactory(GsonConverterFactory.create(Gson()))
            .build()
    }
}
core/src/main/res/xml/network_security_config.xml
xml
Copy
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- Allow cleartext traffic for local network (development/testing) -->
    <base-config cleartextTrafficPermitted="true" />
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">localhost</domain>
        <domain includeSubdomains="true">127.0.0.1</domain>
    </domain-config>
</network-security-config>
app-mini/build.gradle
groovy
Copy
plugins {
    id 'com.android.application'
    id 'kotlin-android'
}

android {
    compileSdkVersion 29
    defaultConfig {
        applicationId "com.pcnaid.relay.mini"
        minSdkVersion 27
        targetSdkVersion 29
        versionCode 1
        versionName "1.0"
    }
    buildTypes {
        release {
            minifyEnabled false
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
    kotlinOptions {
        jvmTarget = "1.8"
    }
}

dependencies {
    implementation project(":core")
    implementation "com.clover.sdk:clover-android-sdk:latest.release"
}
app-mini/src/main/AndroidManifest.xml
xml
Copy
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.pcnaid.relay.mini">

    <!-- Permissions required for network access and Clover payment interception -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.GET_ACCOUNTS" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="clover.permission.READ_PAYMENTS" />

    <application
        android:allowBackup="true"
        android:label="Clover Relay"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.AppCompat.Light.NoActionBar"
        android:networkSecurityConfig="@xml/network_security_config">

        <!-- Configuration/Launcher Activity -->
        <activity android:name="com.pcnaid.relay.ui.SplashActivity"
                  android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Broadcast Receiver to intercept payment intents on the Mini -->
        <receiver android:name="com.pcnaid.relay.mini.MiniPaymentListener"
                  android:exported="true">
            <intent-filter>
                <!-- Clover payment request broadcast action (to be confirmed via testing) -->
                <action android:name="com.clover.intent.action.PAY" />
            </intent-filter>
        </receiver>

        <!-- Background Service to handle forwarding payments to the Flex -->
        <service android:name="com.pcnaid.relay.mini.MiniRelayService"
                 android:exported="false" />
    </application>
</manifest>
app-mini/src/main/java/com/pcnaid/relay/mini/MiniRelayService.kt
kotlin
Copy
package com.pcnaid.relay.mini

import android.app.Service
import android.content.Intent
import android.os.IBinder
import android.util.Log
import com.pcnaid.relay.di.NetworkModule
import com.pcnaid.relay.domain.ProcessRegisterSaleUseCase
import com.pcnaid.relay.domain.SendResultBackUseCase
import com.pcnaid.relay.model.PaymentRequest
import com.pcnaid.relay.network.SocketRelayServer
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * Service running on the Clover Mini that handles relaying payment requests.
 * When a payment Intent is intercepted, this service forwards the request to the Clover Flex and returns the result.
 */
class MiniRelayService : Service() {
    private val TAG = "MiniRelayService"
    private val job = SupervisorJob()
    private val serviceScope = CoroutineScope(Dispatchers.IO + job)

    companion object {
        const val EXTRA_AMOUNT = "extra_amount"
        const val EXTRA_EXTERNAL_PAYMENT_ID = "extra_external_payment_id"
        const val EXTRA_TAX_AMOUNT = "extra_tax_amount"
    }

    override fun onCreate() {
        super.onCreate()
        // Start socket server to handle Station-initiated requests (demo mode)
        SocketRelayServer.startServer()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Ensure configuration from SharedPreferences is loaded
        NetworkModule.ensureConfig(this)

        val amount = intent?.getLongExtra(EXTRA_AMOUNT, -1L) ?: -1L
        val externalPaymentId = intent?.getStringExtra(EXTRA_EXTERNAL_PAYMENT_ID)
        val taxAmount = intent?.getLongExtra(EXTRA_TAX_AMOUNT, 0L) ?: 0L

        if (amount > 0 && externalPaymentId != null) {
            Log.i(TAG, "Processing payment request: amount=$amount, externalPaymentId=$externalPaymentId")
            serviceScope.launch {
                // Create PaymentRequest and forward it to the Flex
                val request = PaymentRequest(amount = amount, externalPaymentId = externalPaymentId, taxAmount = taxAmount)
                val result = ProcessRegisterSaleUseCase.execute(request)
                // Send the result back to the Station (via broadcast)
                SendResultBackUseCase.execute(this@MiniRelayService, result)
                // Stop service when done
                stopSelf(startId)
            }
        } else {
            Log.e(TAG, "MiniRelayService started with invalid data. Stopping service.")
            stopSelf(startId)
        }
        return START_NOT_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? {
        // Not using binding for this service
        return null
    }

    override fun onDestroy() {
        super.onDestroy()
        job.cancel()  // cancel any running coroutines when the service is destroyed
    }
}
app-mini/src/main/java/com/pcnaid/relay/mini/MiniPaymentListener.kt
kotlin
Copy
package com.pcnaid.relay.mini

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import com.clover.sdk.v1.Intents

/**
 * BroadcastReceiver on the Clover Mini that listens for payment request Intents from the Station.
 * When a payment is initiated on the Station Solo, the Mini receives a broadcast (via Clover's framework),
 * and this receiver intercepts it to start the relay service.
 */
class MiniPaymentListener : BroadcastReceiver() {
    companion object {
        private const val TAG = "MiniPaymentListener"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        Log.d(TAG, "Received broadcast on Mini with action: $action")
        // Log all extras for debugging purposes
        intent.extras?.let { bundle ->
            for (key in bundle.keySet()) {
                Log.d(TAG, "Extra: $key = ${bundle.get(key)}")
            }
        }
        // Check if this is the expected payment Intent
        if ("com.clover.intent.action.PAY" == action) {
            val amount = intent.getLongExtra(Intents.EXTRA_AMOUNT, -1L)
            val externalPaymentId = intent.getStringExtra(Intents.EXTRA_EXTERNAL_PAYMENT_ID)
            val taxAmount = intent.getLongExtra(Intents.EXTRA_TAX_AMOUNT, 0L)
            if (amount > 0 && externalPaymentId != null) {
                Log.i(TAG, "Payment intent intercepted on Mini: amount=$amount, externalPaymentId=$externalPaymentId")
                // Start the MiniRelayService to handle the payment forwarding
                val serviceIntent = Intent(context, MiniRelayService::class.java).apply {
                    putExtra(MiniRelayService.EXTRA_AMOUNT, amount)
                    putExtra(MiniRelayService.EXTRA_EXTERNAL_PAYMENT_ID, externalPaymentId)
                    putExtra(MiniRelayService.EXTRA_TAX_AMOUNT, taxAmount)
                }
                context.startService(serviceIntent)
            } else {
                Log.e(TAG, "Intercepted payment Intent is missing amount or externalPaymentId.")
            }
        }
    }
}
app-mini/src/main/java/com/pcnaid/relay/ui/SplashActivity.kt
kotlin
Copy
package com.pcnaid.relay.ui

import android.content.Context
import android.os.Bundle
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.pcnaid.relay.R
import com.pcnaid.relay.di.NetworkModule

/**
 * Activity on the Clover Mini for configuring the connection to the Clover Flex device.
 * It allows input of the Flex's IP address, serial number, and OAuth token, and saves them for the relay service to use.
 */
class SplashActivity : AppCompatActivity() {
    private lateinit var etFlexIp: EditText
    private lateinit var etFlexSerial: EditText
    private lateinit var etAuthToken: EditText
    private lateinit var btnSave: Button
    // If a TextView for status exists in layout (e.g., tvStatus), it could be defined here.

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Assume activity_main layout with EditTexts (etFlexIp, etFlexSerial, etAuthToken) and a Button (btnSave)
        setContentView(R.layout.activity_main)

        etFlexIp = findViewById(R.id.etFlexIp)
        etFlexSerial = findViewById(R.id.etFlexSerial)
        etAuthToken = findViewById(R.id.etAuthToken)
        btnSave = findViewById(R.id.btnSave)
        // e.g., val tvStatus: TextView = findViewById(R.id.tvStatus)

        loadConfiguration()

        btnSave.setOnClickListener {
            saveConfiguration()
        }
    }

    private fun loadConfiguration() {
        val prefs = getSharedPreferences("AppPrefs", Context.MODE_PRIVATE)
        etFlexIp.setText(prefs.getString("FLEX_IP", ""))
        etFlexSerial.setText(prefs.getString("FLEX_SERIAL", ""))
        etAuthToken.setText(prefs.getString("AUTH_TOKEN", ""))
    }

    private fun saveConfiguration() {
        val prefs = getSharedPreferences("AppPrefs", Context.MODE_PRIVATE)
        prefs.edit().apply {
            putString("FLEX_IP", etFlexIp.text.toString().trim())
            putString("FLEX_SERIAL", etFlexSerial.text.toString().trim())
            putString("AUTH_TOKEN", etAuthToken.text.toString().trim())
            apply()
        }
        // Update in-memory config for immediate use
        NetworkModule.updateConfig(
            etFlexIp.text.toString().trim(),
            etAuthToken.text.toString().trim(),
            etFlexSerial.text.toString().trim()
        )
        Toast.makeText(this, "Configuration saved.", Toast.LENGTH_SHORT).show()
        // Optionally, update status or notify user that the relay service is ready.
        // e.g., tvStatus.text = "Status: Ready"
    }
}
app-station/build.gradle
groovy
Copy
plugins {
    id 'com.android.application'
    id 'kotlin-android'
}

android {
    compileSdkVersion 29
    defaultConfig {
        applicationId "com.pcnaid.relay.station"
        minSdkVersion 27
        targetSdkVersion 29
        versionCode 1
        versionName "1.0"
    }
    buildTypes {
        release {
            minifyEnabled false
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_1_8
        targetCompatibility = JavaVersion.VERSION_1_8
    }
    kotlinOptions {
        jvmTarget = "1.8"
    }
}

dependencies {
    implementation project(":core")
    implementation "com.clover.sdk:clover-android-sdk:latest.release"
}
app-station/src/main/AndroidManifest.xml
xml
Copy
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.pcnaid.relay.station">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <!-- Include Clover READ_PAYMENTS permission if this app were to intercept Clover broadcasts -->
    <uses-permission android:name="clover.permission.READ_PAYMENTS" />

    <application
        android:allowBackup="true"
        android:label="Clover Relay Station Demo"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher_round">

        <!-- BroadcastReceiver to handle start-payment triggers and receive results -->
        <receiver android:name="com.pcnaid.relay.station.StationBroadcastReceiver"
                  android:exported="true">
            <intent-filter>
                <action android:name="com.pcnaid.relay.START_PAYMENT" />
                <action android:name="com.pcnaid.relay.PAYMENT_RESULT" />
            </intent-filter>
        </receiver>
    </application>
</manifest>
app-station/src/main/java/com/pcnaid/relay/station/StationBroadcastReceiver.kt
kotlin
Copy
package com.pcnaid.relay.station

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import android.widget.Toast
import com.pcnaid.relay.model.PaymentRequest
import com.pcnaid.relay.network.SocketRelayClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * BroadcastReceiver on the Clover Station (demo client) that listens for a trigger to start a payment and for the payment result.
 * This allows the Station to initiate a payment through the Mini and handle the result when it returns.
 */
class StationBroadcastReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "StationReceiver"
        // Configure the Mini's IP address (on the same network) and port for socket communication
        private const val MINI_IP_ADDRESS = "192.168.1.100"  // placeholder IP for Clover Mini
        private const val MINI_PORT = 5000
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action
        Log.d(TAG, "StationBroadcastReceiver received action: $action")
        if ("com.pcnaid.relay.START_PAYMENT" == action) {
            // Trigger to start a payment (could be from an Activity or another app component)
            val amount = intent.getLongExtra("amount", -1L)
            val externalId = intent.getStringExtra("externalPaymentId") ?: "EXT-${System.currentTimeMillis()}"
            if (amount > 0) {
                Log.i(TAG, "Initiating payment from Station: amount=$amount, externalId=$externalId")
                // Launch network request in background
                CoroutineScope(Dispatchers.IO).launch {
                    val request = PaymentRequest(amount = amount, externalPaymentId = externalId)
                    val result = SocketRelayClient.sendPaymentRequest(request, MINI_IP_ADDRESS, MINI_PORT)
                    if (result != null) {
                        // Broadcast the result internally for this app to handle (mimics receiving from Mini)
                        val resultIntent = Intent("com.pcnaid.relay.PAYMENT_RESULT").apply {
                            putExtra("externalPaymentId", result.externalPaymentId)
                            putExtra("success", result.success)
                            result.paymentId?.let { putExtra("paymentId", it) }
                            result.message?.let { putExtra("message", it) }
                            result.amount?.let { putExtra("amount", it) }
                        }
                        context.sendBroadcast(resultIntent)
                    } else {
                        Log.e(TAG, "No response from Mini relay server.")
                        // Notify user on failure to communicate
                        Toast.makeText(context, "Failed to get response from Mini.", Toast.LENGTH_LONG).show()
                    }
                }
            } else {
                Log.e(TAG, "Invalid or missing amount in START_PAYMENT broadcast.")
            }
        } else if ("com.pcnaid.relay.PAYMENT_RESULT" == action) {
            // Result of a payment relayed back from the Mini
            val externalId = intent.getStringExtra("externalPaymentId")
            val success = intent.getBooleanExtra("success", false)
            val message = intent.getStringExtra("message") ?: if (success) "Payment Approved" else "Payment Declined"
            Log.i(TAG, "Payment result on Station: externalId=$externalId, success=$success, message=$message")
            // Show result to user (for demo, using a Toast)
            Toast.makeText(context, "Payment Result: $message", Toast.LENGTH_LONG).show()
        }
    }
}
app-station/src/main/java/com/pcnaid/relay/station/StationRelayClient.kt
kotlin
Copy
package com.pcnaid.relay.station

/**
 * (Optional) StationRelayClient would encapsulate Station-side networking if needed.
 * In this implementation, the SocketRelayClient (in core) is used directly in StationBroadcastReceiver.
 * This class remains for completeness and future expansion.
 */
class StationRelayClient {
    // No additional implementation needed; uses core SocketRelayClient.
}
.github/workflows/android.yml
yaml
Copy
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
        uses: actions/checkout@v3

      - name: Set up Java
        uses: actions/setup-java@v3
        with:
          distribution: 'temurin'
          java-version: '11'

      - name: Set up Android SDK
        uses: android-actions/setup-android@v2
        with:
          api-level: 29
          build-tools: "29.0.3"
          target: android-29

      - name: Build Debug and Release
        run: ./gradlew assembleDebug assembleRelease
