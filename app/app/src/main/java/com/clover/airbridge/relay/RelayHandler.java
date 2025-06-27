package com.clover.airbridge.relay;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.Socket;
import android.util.Log;

public class RelayHandler implements Runnable {
    private static final String TAG = "CloverRelay";
    private final Socket clientSocket;

    public RelayHandler(Socket clientSocket) {
        this.clientSocket = clientSocket;
    }

    @Override
    public void run() {
        try (InputStream in = clientSocket.getInputStream();
             OutputStream out = clientSocket.getOutputStream()) {
            // Example: Echo relay (replace with actual Flex/Station logic)
            byte[] buffer = new byte[4096];
            int read;
            while ((read = in.read(buffer)) != -1) {
                out.write(buffer, 0, read);
                out.flush();
                Log.i(TAG, "Relayed " + read + " bytes");
            }
        } catch (IOException e) {
            Log.e(TAG, "RelayHandler error: ", e);
        } finally {
            try { clientSocket.close(); } catch (IOException ignored) {}
        }
    }
}

