package com.clover.airbridge.relay;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class RelayService extends Service {
    private static final String TAG = "CloverRelay";
    private static final int RELAY_PORT = 12345;
    private ServerSocket serverSocket;
    private ExecutorService executor;
    private volatile boolean running = false;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        Notification notification = new NotificationCompat.Builder(this, "relay_channel")
                .setContentTitle("Clover Relay Running")
                .setContentText("Relaying payments on port 12345")
                .setSmallIcon(android.R.drawable.stat_sys_upload)
                .build();
        startForeground(1, notification);
        executor = Executors.newCachedThreadPool();
        startRelay();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    "relay_channel",
                    "Relay Service Channel",
                    NotificationManager.IMPORTANCE_LOW
            );
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private void startRelay() {
        executor.execute(() -> {
            try {
                serverSocket = new ServerSocket(RELAY_PORT);
                running = true;
                Log.i(TAG, "RelayService started on port " + RELAY_PORT);
                while (running) {
                    Socket client = serverSocket.accept();
                    executor.execute(new RelayHandler(client));
                }
            } catch (IOException e) {
                Log.e(TAG, "RelayService error: ", e);
            }
        });
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        running = false;
        try {
            if (serverSocket != null) serverSocket.close();
        } catch (IOException ignored) {}
        executor.shutdownNow();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
