package com.clover.airbridge.relay

import android.content.Context
import com.clover.connector.sdk.v3.CloverConnector
import com.clover.connector.sdk.v3.DefaultCloverConnectorListener
import com.clover.connector.sdk.v3.ICloverConnector
import com.clover.remote.client.CloverDeviceConfiguration
import com.clover.remote.client.transport.CloverTransport
import com.clover.remote.client.transport.websocket.WebSocketCloverTransport
import com.clover.remote.client.messages.SaleRequest
import com.clover.remote.client.messages.SaleResponse
import com.clover.remote.client.MerchantInfo
import com.clover.remote.client.messages.CloverDeviceErrorEvent
import kotlinx.coroutines.CompletableDeferred
import java.net.URI

class CloverFlexManager(context: Context) {

    private var cloverConnector: ICloverConnector? = null
    private var saleResponseDeferred: CompletableDeferred<SaleResponse>? = null

    init {
        val config = object : CloverDeviceConfiguration {
            override fun getCloverDeviceType(): CloverDeviceConfiguration.CloverDeviceType? = null
            override fun getMessagePackageName(): String = "com.pcnaid.cloverairbridge"
            override fun getName(): String = "Clover AirBridge"
            override fun getSerial(): String = "AirBridge-POS-01"
            override fun getCloverTransport(): CloverTransport {
                val endpoint = "wss://${AppConstants.FLEX_IP_ADDRESS}:${AppConstants.FLEX_PORT}/remote_pay"
                return WebSocketCloverTransport(URI.create(endpoint))
            }

            override fun getApplicationId(): String = AppConstants.REMOTE_APP_ID
            override fun getPosName(): String? = null
            override fun getHeartbeatInterval(): Long? = null
            override fun getHeartbeatDisconnectTimeout(): Long? = null
            override fun getReconnectDelay(): Long? = null
            override fun getEnableLogging(): Boolean = true
            override fun getMaxCharinMessage(): Int = 0
        }
        cloverConnector = CloverConnector(config)
        cloverConnector?.addCloverConnectorListener(CloverListener())
    }

    suspend fun processPayment(amount: Long, externalId: String): SaleResponse {
        saleResponseDeferred = CompletableDeferred()
        cloverConnector?.initializeConnection()

        val saleRequest = SaleRequest(amount, externalId)
        saleRequest.disablePrinting = true
        saleRequest.disableReceiptSelection = true

        cloverConnector?.sale(saleRequest)
        return saleResponseDeferred!!.await()
    }

    fun dispose() {
        cloverConnector?.dispose()
    }

    private inner class CloverListener : DefaultCloverConnectorListener(cloverConnector) {
        override fun onSaleResponse(response: SaleResponse) {
            super.onSaleResponse(response)
            saleResponseDeferred?.complete(response)
        }

        override fun onDeviceReady(merchantInfo: MerchantInfo) {
            super.onDeviceReady(merchantInfo)
        }

        override fun onDeviceError(deviceErrorEvent: CloverDeviceErrorEvent) {
            super.onDeviceError(deviceErrorEvent)
            val dummyResponse = SaleResponse(false, com.clover.remote.Result.FAIL)
            dummyResponse.reason = "Device Error: ${deviceErrorEvent.message}"
            saleResponseDeferred?.complete(dummyResponse)
        }
    }
}