package com.liuma.app.core;

import android.app.Application;
import android.content.Context;
import android.content.Intent;

import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;

import com.liuma.app.service.MainService;
import com.liuma.app.worker.KeepAliveWorker;

import java.util.concurrent.TimeUnit;

public class LiumaApp extends Application {

    private static LiumaApp instance;

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        startServices();
    }

    private void startServices() {
        try {
            startForegroundService(new Intent(this, MainService.class));
        } catch (Exception e) {
            android.util.Log.e("LiumaApp", "Failed to start MainService", e);
        }

        try {
            PeriodicWorkRequest work = new PeriodicWorkRequest.Builder(
                KeepAliveWorker.class, 15, TimeUnit.MINUTES
            ).build();

            WorkManager.getInstance(this).enqueueUniquePeriodicWork(
                Protocol.WORK_KEEP_ALIVE,
                ExistingPeriodicWorkPolicy.KEEP,
                work
            );
        } catch (Exception e) {
            android.util.Log.e("LiumaApp", "Failed to enqueue KeepAliveWorker", e);
        }
    }

    public static Context getContext() {
        if (instance == null) {
            throw new IllegalStateException("LiumaApp not initialized");
        }
        return instance.getApplicationContext();
    }
}
