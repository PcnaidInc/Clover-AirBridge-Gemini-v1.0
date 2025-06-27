package com.clover.airbridge.relay;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;

public class MainActivity extends Activity {
    private TextView statusText;
    private Button startBtn, stopBtn;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        statusText = new TextView(this);
        statusText.setText("Relay Service status: unknown");
        startBtn = new Button(this);
        startBtn.setText("Start Relay");
        stopBtn = new Button(this);
        stopBtn.setText("Stop Relay");

        startBtn.setOnClickListener(v -> {
            startService(new Intent(this, RelayService.class));
            statusText.setText("Relay Service status: started");
        });
        stopBtn.setOnClickListener(v -> {
            stopService(new Intent(this, RelayService.class));
            statusText.setText("Relay Service status: stopped");
        });

        // Simple vertical layout
        android.widget.LinearLayout layout = new android.widget.LinearLayout(this);
        layout.setOrientation(android.widget.LinearLayout.VERTICAL);
        layout.addView(statusText);
        layout.addView(startBtn);
        layout.addView(stopBtn);
        setContentView(layout);
    }
}

