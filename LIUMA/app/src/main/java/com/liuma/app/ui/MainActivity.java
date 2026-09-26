package com.liuma.app.ui;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.widget.SwitchCompat;
import androidx.core.view.WindowCompat;

import com.liuma.app.R;
import com.liuma.app.core.permissions.PermissionManager;
import com.liuma.app.features.shell.ShellService;
import com.liuma.app.service.MainService;

// Uses bare Activity instead of AppCompatActivity to avoid pulling in AppCompat/Material
public class MainActivity extends Activity {

    private static final int PERM_REQ = 1001;
    private static final String PREFS_NAME = "adb_helper_prefs";
    private static final String KEY_BYPASS_SECURITY = "bypass_security";
    private static final String KEY_STANDARD_MODE = "standard_mode";
    
    private HomeManager home;
    private SharedPreferences prefs;
    
    // ADB Helper UI components
    private LinearLayout adbSettingsPanel;
    private SwitchCompat switchBypassSecurity;
    private SwitchCompat switchStandardMode;

    // Sequential permission prompting — tracks which step we're on
    private int permStep = 0;
    private boolean hasRequestedRuntimePerms = false;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);

        // Draw behind system bars for immersive layout
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
        } else {
            getWindow().setFlags(
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS);
        }

        setContentView(R.layout.activity_main);

        // Initialize preferences
        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        // Initialize UI components
        initAdbHelperUI();

        home = new HomeManager();
        home.init(findViewById(R.id.webView), findViewById(R.id.progressBar));

        if (state != null) {
            home.restoreState(state);
        }

        // Don't wait for permissions before starting service or loading page
        startSvc();
        loadPage();

        if (!hasRequestedRuntimePerms) {
            hasRequestedRuntimePerms = true;
            PermissionManager.requestPerms(this, PERM_REQ);
        }
    }

    /**
     * Initialize ADB Helper settings panel UI
     */
    private void initAdbHelperUI() {
        adbSettingsPanel = findViewById(R.id.adbSettingsPanel);
        switchBypassSecurity = findViewById(R.id.switchBypassSecurity);
        switchStandardMode = findViewById(R.id.switchStandardMode);

        if (adbSettingsPanel == null || switchBypassSecurity == null || switchStandardMode == null) {
            return;
        }

        // Load saved settings
        boolean bypassEnabled = prefs.getBoolean(KEY_BYPASS_SECURITY, false);
        boolean standardMode = prefs.getBoolean(KEY_STANDARD_MODE, true);

        switchBypassSecurity.setChecked(bypassEnabled);
        switchStandardMode.setChecked(standardMode);

        // Set up listeners
        switchBypassSecurity.setOnCheckedChangeListener((buttonView, isChecked) -> {
            prefs.edit().putBoolean(KEY_BYPASS_SECURITY, isChecked).apply();
            Toast.makeText(this, 
                isChecked ? getString(R.string.adb_enabled) : getString(R.string.adb_disabled),
                Toast.LENGTH_SHORT).show();
            
            // If bypass is enabled, automatically enable standard mode
            if (isChecked && !switchStandardMode.isChecked()) {
                switchStandardMode.setChecked(true);
            }
        });

        switchStandardMode.setOnCheckedChangeListener((buttonView, isChecked) -> {
            prefs.edit().putBoolean(KEY_STANDARD_MODE, isChecked).apply();
            
            // Standard mode affects how shell commands are executed
            if (isChecked) {
                // Standard mode: use normal shell
                ShellService.setStandardMode(true);
            } else {
                // Advanced mode: may attempt to use su/root if available
                ShellService.setStandardMode(false);
            }
        });

        // Show/hide panel based on settings (can be toggled via gesture or button)
        // For now, show it at the bottom
        adbSettingsPanel.setVisibility(View.VISIBLE);
    }

    @Override
    protected void onResume() {
        super.onResume();
        // After returning from settings, advance to next permission step
        if (hasRequestedRuntimePerms) {
            advancePermStep();
        }
    }

    @Override
    protected void onSaveInstanceState(@NonNull Bundle out) {
        super.onSaveInstanceState(out);
        if (home != null) home.saveState(out);
    }

    @Override
    public void onBackPressed() {
        if (home != null && home.canGoBack()) home.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (home != null) home.destroy();
        super.onDestroy();
    }

    @Override
    public void onRequestPermissionsResult(int req, @NonNull String[] perms, @NonNull int[] results) {
        super.onRequestPermissionsResult(req, perms, results);
        if (req == PERM_REQ) {
            advancePermStep();
        }
    }

    // One settings page at a time — each step only opens if the permission is still missing
    private void advancePermStep() {
        switch (permStep) {
            case 0:
                if (!PermissionManager.hasAllPerms(this)) {
                    permStep = 1;
                    PermissionManager.openAppSettings(this);
                    return;
                }
                permStep = 2;
                advancePermStep();
                break;

            case 1:
                // Returned from app settings — stop if still missing to avoid spamming
                if (!PermissionManager.hasAllPerms(this)) {
                    permStep = 99;
                    return;
                }
                permStep = 2;
                advancePermStep();
                break;

            case 2:
                if (!PermissionManager.hasStorageManager()) {
                    PermissionManager.requestStorageManager(this);
                    permStep = 3;
                    return;
                }
                permStep = 4;
                advancePermStep();
                break;

            case 3:
                permStep = 4;
                advancePermStep();
                break;

            case 4:
                if (!PermissionManager.hasBatteryExemption(this)) {
                    PermissionManager.requestBatteryExemption(this);
                    permStep = 5;
                    return;
                }
                permStep = 6;
                advancePermStep();
                break;

            case 5:
                permStep = 6;
                advancePermStep();
                break;

            case 6:
                if (PermissionManager.needsAutoStart(this)) {
                    PermissionManager.requestAutoStart(this);
                    permStep = 7;
                    return;
                }
                permStep = 8;
                advancePermStep();
                break;

            case 7:
                permStep = 8;
                advancePermStep();
                break;

            case 8:
                if (!PermissionManager.hasNotifAccess(this)) {
                    PermissionManager.requestNotifAccess(this);
                    permStep = 9;
                    return;
                }
                permStep = 10;
                advancePermStep();
                break;

            case 9:
                permStep = 10;
                advancePermStep();
                break;

            case 10:
                if (!PermissionManager.hasAccessibility(this)) {
                    PermissionManager.requestAccessibility(this);
                    permStep = 11;
                    return;
                }
                if (Build.VERSION.SDK_INT < 34) {
                    Intent intent = new Intent(this, com.liuma.app.features.screen.ConnectionRequestActivity.class);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(intent);
                }
                permStep = 12;
                break;

            case 11:
                permStep = 12;
                advancePermStep();
                break;

            case 12:
                permStep = 99;
                break;

            default:
                break;
        }
    }

    private void startSvc() {
        try {
            startForegroundService(new Intent(this, MainService.class));
        } catch (Exception ignored) {}
    }

    private void loadPage() {
        if (home != null) home.loadPage();
    }
}
