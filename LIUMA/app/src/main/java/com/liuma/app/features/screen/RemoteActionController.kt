package com.liuma.app.features.screen

import android.content.Context
import android.media.AudioManager
import android.graphics.PointF
import android.util.Log
import android.view.WindowManager
import android.provider.Settings
import com.liuma.app.core.LiumaApp
import com.liuma.app.core.Protocol
import org.json.JSONObject

class RemoteActionController {

    fun handleAction(message: String) {
        try {
            val json = JSONObject(message)
            when (json.optString(Protocol.KEY_ACTION)) {
                Protocol.ACTION_TAP -> {
                    val point = readPoint(json, "x", "y") ?: return
                    RemoteControlService.instance?.performTap(point.x, point.y)
                }
                Protocol.ACTION_SWIPE -> {
                    val start = readPoint(json, "startX", "startY") ?: return
                    val end = readPoint(json, "endX", "endY") ?: return
                    val duration = json.optLong("duration", 300)
                    RemoteControlService.instance?.performSwipe(start.x, start.y, end.x, end.y, duration)
                }
                Protocol.ACTION_KEY -> {
                    RemoteControlService.instance?.performKey(json.optString("keyCode"))
                }
                Protocol.ACTION_TEXT -> {
                    RemoteControlService.instance?.performText(json.optString("text"))
                }
                Protocol.ACTION_GESTURE -> {
                    val rawPoints = json.optJSONArray("points") ?: return
                    val points = ArrayList<PointF>(minOf(rawPoints.length(), 256))
                    for (index in 0 until minOf(rawPoints.length(), 256)) {
                        val point = rawPoints.optJSONObject(index) ?: continue
                        readPoint(point, "x", "y")?.let(points::add)
                    }
                    if (points.isNotEmpty()) {
                        RemoteControlService.instance?.performGesture(
                            points,
                            json.optLong("duration", 300).coerceIn(1, 60_000),
                        )
                    }
                }
                Protocol.ACTION_TOUCH_START -> readPoint(json, "x", "y")?.let {
                    RemoteControlService.instance?.beginContinuousTouch(it.x, it.y)
                }
                Protocol.ACTION_TOUCH_MOVE -> readPoint(json, "x", "y")?.let {
                    RemoteControlService.instance?.moveContinuousTouch(it.x, it.y)
                }
                Protocol.ACTION_TOUCH_END -> readPoint(json, "x", "y")?.let {
                    RemoteControlService.instance?.endContinuousTouch(it.x, it.y)
                }
                Protocol.ACTION_VOLUME -> adjustVolume(json.optString("direction"))
                Protocol.ACTION_BRIGHTNESS -> setBrightness(json.optInt(Protocol.KEY_BRIGHTNESS, -1))
                Protocol.ACTION_RESOLUTION -> setResolution(
                    json.optInt(Protocol.KEY_WIDTH, -1),
                    json.optInt(Protocol.KEY_HEIGHT, -1),
                    json.optInt(Protocol.KEY_DENSITY, -1)
                )
                Protocol.ACTION_BLACKSCREEN -> toggleBlackScreen(json.optBoolean(Protocol.KEY_ENABLE, true))
                else -> {
                    Log.w("RemoteActionController", "Unknown action type: ${json.optString("action")}")
                }
            }
        } catch (e: Exception) {
            Log.e("RemoteActionController", "Error parsing remote action", e)
        }
    }

    private fun readPoint(json: JSONObject, xKey: String, yKey: String): PointF? {
        val rawX = json.optDouble(xKey, Double.NaN)
        val rawY = json.optDouble(yKey, Double.NaN)
        if (!rawX.isFinite() || !rawY.isFinite()) return null
        val width = ScreenCaptureService.screenWidth
        val height = ScreenCaptureService.screenHeight
        if (width < 2 || height < 2) return null
        return PointF(
            rawX.toFloat().coerceIn(0f, (width - 1).toFloat()),
            rawY.toFloat().coerceIn(0f, (height - 1).toFloat()),
        )
    }

    private fun adjustVolume(direction: String) {
        val audio = LiumaApp.getContext().getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return
        val adjustment = when (direction.lowercase()) {
            "up" -> AudioManager.ADJUST_RAISE
            "down" -> AudioManager.ADJUST_LOWER
            "mute" -> AudioManager.ADJUST_TOGGLE_MUTE
            else -> return
        }
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            audio.adjustStreamVolume(AudioManager.STREAM_MUSIC, adjustment, 0)
        } else {
            @Suppress("DEPRECATION")
            audio.adjustSuggestedStreamVolume(adjustment, AudioManager.STREAM_MUSIC, 0)
        }
    }

    private fun setBrightness(brightness: Int) {
        if (brightness < 0 || brightness > 255) return
        val context = LiumaApp.getContext()
        try {
            // Set system brightness mode to manual
            Settings.System.putInt(context.contentResolver, Settings.System.SCREEN_BRIGHTNESS_MODE, Settings.System.SCREEN_BRIGHTNESS_MODE_MANUAL)
            // Set brightness level
            Settings.System.putInt(context.contentResolver, Settings.System.SCREEN_BRIGHTNESS, brightness)
            // Apply immediately to current window
            val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as? WindowManager
            windowManager?.defaultDisplay // Trigger display update
        } catch (e: Exception) {
            Log.e("RemoteActionController", "Error setting brightness", e)
        }
    }

    private fun setResolution(width: Int, height: Int, density: Int) {
        val context = LiumaApp.getContext()
        try {
            // Use wm command via shell to change resolution
            val commands = mutableListOf<String>()
            if (width > 0 && height > 0) {
                commands.add("wm size ${width}x${height}")
            }
            if (density > 0) {
                commands.add("wm density $density")
            }
            if (commands.isNotEmpty()) {
                val runtime = Runtime.getRuntime()
                for (cmd in commands) {
                    runtime.exec(cmd).waitFor()
                }
            }
        } catch (e: Exception) {
            Log.e("RemoteActionController", "Error setting resolution", e)
        }
    }

    private fun toggleBlackScreen(enable: Boolean) {
        try {
            // Use input command to simulate power button press or screen overlay
            if (enable) {
                // Turn off screen using power service
                val runtime = Runtime.getRuntime()
                runtime.exec("input keyevent KEYCODE_POWER").waitFor()
            } else {
                // Turn on screen - wake device
                val context = LiumaApp.getContext()
                val powerManager = context.getSystemService(Context.POWER_SERVICE) as? android.os.PowerManager
                val wakeLock = powerManager?.newWakeLock(
                    android.os.PowerManager.SCREEN_BRIGHT_WAKE_LOCK or 
                    android.os.PowerManager.ACQUIRE_CAUSES_WAKEUP,
                    "RemoteActionController::WakeLock"
                )
                wakeLock?.acquire(1000L)
            }
        } catch (e: Exception) {
            Log.e("RemoteActionController", "Error toggling black screen", e)
        }
    }
}
