package com.clover.airbridge.relay;

import android.app.Activity;
import android.os.Bundle;
import android.os.RemoteException;
import android.view.View;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;
import com.clover.sdk.v1.Intents;
import com.clover.sdk.v3.order.Order;
import com.clover.sdk.v3.order.OrderConnector;
import com.pcnaid.cloverairbridge.databinding.ActivityPaymentRelayBinding;
import java.util.UUID;
import kotlinx.coroutines.CoroutineScope;
import kotlinx.coroutines.Dispatchers;
import kotlinx.coroutines.launch;

public class PaymentRelayActivity extends AppCompatActivity {

    private ActivityPaymentRelayBinding binding;
    private OrderConnector orderConnector;
    private String orderId;
    private CloverFlexManager cloverFlexManager;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        binding = ActivityPaymentRelayBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());

        orderId = getIntent().getStringExtra(Intents.EXTRA_ORDER_ID);

        if (orderId == null) {
            showError("Error: No Order ID provided.");
            finishWithResult(Activity.RESULT_CANCELED);
            return;
        }

        orderConnector = new OrderConnector(this, CloverAccount.getAccount(this), null);
        orderConnector.connect();

        cloverFlexManager = new CloverFlexManager(this);

        new CoroutineScope(Dispatchers.getIO()).launch(() -> {
            processOrderPayment();
            return null;
        });
    }

    private void processOrderPayment() {
        try {
            Order order = orderConnector.getOrder(orderId);

            if (order == null || !order.hasTotal()) {
                runOnUiThread(() -> {
                    showError("Error: Could not retrieve order details.");
                    finishWithResult(Activity.RESULT_CANCELED);
                });
                return;
            }

            long amount = order.getTotal();
            String externalPaymentId = UUID.randomUUID().toString();

            runOnUiThread(() -> {
                binding.statusText.setText("Contacting Flex device...");
                binding.progressBar.setVisibility(View.VISIBLE);
            });

            new CoroutineScope(Dispatchers.getIO()).launch(() -> {
                SaleResponse response = cloverFlexManager.processPayment(amount, externalPaymentId);

                runOnUiThread(() -> {
                    if (response.getSuccess()) {
                        recordExternalPayment(order, response.getPayment());
                        finishWithResult(Activity.RESULT_OK);
                    } else {
                        showError("Payment Failed: " + response.getReason());
                        finishWithResult(Activity.RESULT_CANCELED);
                    }
                });
                return null;
            });
        } catch (RemoteException e) {
            runOnUiThread(() -> {
                showError("Error connecting to Clover services.");
                finishWithResult(Activity.RESULT_CANCELED);
            });
        } catch (Exception e) {
            runOnUiThread(() -> {
                showError("An unexpected error occurred: " + e.getMessage());
                finishWithResult(Activity.RESULT_CANCELED);
            });
        }
    }

    private void recordExternalPayment(Order order, com.clover.remote.payment.Payment payment) {
        // In a production app, you would use the OrderConnector to add the payment
        // to the order, ensuring it's properly recorded in the Clover system.
    }

    private void showError(String message) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show();
    }

    private void finishWithResult(int resultCode) {
        setResult(resultCode);
        finish();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (orderConnector != null) {
            orderConnector.disconnect();
        }
        if (cloverFlexManager != null) {
            cloverFlexManager.dispose();
        }
    }
}