/** @babel */
import {ByteBuffer} from 'hjs-io/lib/buffer';
import {ByteArrayInputStream,InputStream} from 'hjs-io/lib/input';
import {Reader} from 'hjs-io/lib/reader';
import {UNKNOWN_TYPE,EventListener,EventObject} from 'eventslib/lib/event';
import {EventListenerAggregate} from 'eventslib/lib/aggregate';
import {ARRAY_BUFFER,DOCUMENT,GET,LOAD_END_STATE,ERROR_STATE,HTTPConnection} from 'libhttp/lib/http';

export const Base64 = {

    base64ToByteArray: (s) => {
        let binary_string =  window.atob(s);
        let len = binary_string.length;
        let bytes = ByteBuffer.createBuffer({ capacity: len });
        for (let i = 0; i < len; i++)        {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes.buffer;
    },

    byteArrayToBase64: (a) => {
        let binary = '';
        let bytes = ByteBuffer.createBuffer({ buffer: a });
        let len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    },

    decodeString: (buffer) => {
        let s = '';
        buffer = ByteBuffer.createBuffer({ buffer: buffer });
        for (let i=0; i<buffer.length; i++) {
            s += String.fromCharCode(buffer[i]);
        }
        return i;
    },

    encodeString: (value) => {
        let view = new Uint8Array([].map.call(value, (x) => {
            return x.charCodeAt(0)
        }));
        return view.buffer;
    }

};

export class PreferenceChangeEvent extends EventObject {

    constructor({source, id = 802, priority = 0, data = null, when = Date.now()} = {}) {
        super({source,id,priority,data,when});
    }

    consume() {
        switch (this.id) {
            case PreferenceChangeEvent.PREFERENCE_CHANGE_EVENT_CHANGE:
            case PreferenceChangeEvent.PREFERENCE_CHANGE_EVENT_IMPORTED:
            case PreferenceChangeEvent.PREFERENCE_CHANGE_EVENT_ERROR:
            case PreferenceChangeEvent.PREFERENCE_CHANGE_EVENT_EXCEEDED_QUOTA:
                this.consumed = true;
                break;
            default:
                this.consumed = false;
                break;
        }
    }

    getException() {
        let data = this.getData();
        if (data !== null &&
            data.hasOwnProperty('exception') &&
            data.exception) {
            return data.exception;
        }
        return null;
    }

    getKey() {
        let data = this.getData();
        if (data !== null &&
            data.hasOwnProperty('key') &&
            data.key) {
            return data.key;
        }
        return null;
    }

    getNewValue() {
        let data = this.getData();
        if (data !== null &&
            data.hasOwnProperty('newValue') &&
            data.newValue) {
            return data.newValue;
        }
        return null;
    }

    getOldValue() {
        let data = this.getData();
        if (data !== null &&
            data.hasOwnProperty('oldValue') &&
            data.oldValue) {
            return data.oldValue;
        }
        return null;
    }

    getStorageArea() {
        let data = this.getData();
        if (data !== null &&
            data.hasOwnProperty('storageArea') &&
            data.storageArea) {
            return data.storageArea;
        }
        return null;
    }

    getUrl() {
        let data = this.getData();
        if (data !== null &&
            data.hasOwnProperty('url') &&
            data.url) {
            return data.url;
        }
        return null;
    }

    paramString() {
        let typeStr;
        switch (this.id) {
            case PreferenceChangeEvent.PREFERENCE_CHANGE_EVENT_CHANGE:
                typeStr = 'PREFERENCE_CHANGE_EVENT_CHANGE';
                break;
            case PreferenceChangeEvent.PREFERENCE_CHANGE_EVENT_IMPORTED:
                typeStr = 'PREFERENCE_CHANGE_EVENT_IMPORTED';
                break;
            case PreferenceChangeEvent.PREFERENCE_CHANGE_EVENT_ERROR:
                typeStr = 'PREFERENCE_CHANGE_EVENT_ERROR';
                break;
            case PreferenceChangeEvent.PREFERENCE_CHANGE_EVENT_EXCEEDED_QUOTA:
                typeStr = 'PREFERENCE_CHANGE_EVENT_EXCEEDED_QUOTA';
                break;
            default:
                typeStr = UNKNOWN_TYPE;
        }
        return `${typeStr},
                when=${this.when},
                priority=${this.priority},
                posted=${this.posted},
                consumed=${this.consumed}
                `;
    }

}

PreferenceChangeEvent.PREFERENCE_CHANGE_EVENT_FIRST = 800;
PreferenceChangeEvent.PREFERENCE_CHANGE_EVENT_CHANGE = PreferenceChangeEvent.PREFERENCE_CHANGE_EVENT_FIRST + 1;
PreferenceChangeEvent.PREFERENCE_CHANGE_EVENT_IMPORTED = PreferenceChangeEvent.PREFERENCE_CHANGE_EVENT_FIRST + 2;
PreferenceChangeEvent.PREFERENCE_CHANGE_EVENT_ERROR = PreferenceChangeEvent.PREFERENCE_CHANGE_EVENT_FIRST + 3;
PreferenceChangeEvent.PREFERENCE_CHANGE_EVENT_EXCEEDED_QUOTA = PreferenceChangeEvent.PREFERENCE_CHANGE_EVENT_FIRST + 4;
PreferenceChangeEvent.PREFERENCE_CHANGE_EVENT_LAST = PreferenceChangeEvent.PREFERENCE_CHANGE_EVENT_EXCEEDED_QUOTA;

export class PreferenceChangeListener extends EventListener {

    constructor({
        onPreferenceChange=null,
        onPreferenceError=null,
        onPreferenceExceededQuota=null,
        onPreferencesImported=null}={}) {
        super();
        if (onPreferenceChange !== null) {
            this.onPreferenceChange = onPreferenceChange;
        }
        if (onPreferenceError !== null) {
            this.onPreferenceError = onPreferenceError;
        }
        if (onPreferenceExceededQuota !== null) {
            this.onPreferenceExceededQuota = onPreferenceExceededQuota;
        }
        if (onPreferencesImported !== null) {
            this.onPreferencesImported = onPreferencesImported;
        }
    }

    onPreferenceChange(evt) {
    }

    onPreferenceError(evt) {
    }

    onPreferenceExceededQuota(evt) {
        let source = evt.getSource();
        let storage = evt.getStorageArea();
        let length = storage.length;
        let k;
        for (let i = 0; i < length; i++) {
            k = storage.key(i);
            if (k.indexOf("http://") == 0 ||
                k.indexOf("https://") == 0) {
                storage.removeItem(k);
            }
        }
    }

    onPreferencesImported(evt) {
    }
}

export const LOCAL_STORAGE = 0;
export const SESSION_STORAGE = 1;
export const MAX_KEY_LENGTH = 80;
export const MAX_VALUE_LENGTH = 65536;
export const MAX_NAME_LENGTH = 80;

let DEFAULT_PREFERENCES = null;

export class Preferences {

    constructor({name=null,path=null,type=LOCAL_STORAGE,strict=false}={}) {
        this.mPrefListeners = new EventListenerAggregate(PreferenceChangeListener);
        this.mUrl = location.href;
        this.mType = type;
        this.mSync = this.mStrict = strict;
        this.mName = name;
        this.mPath = path;
        try {
            if (this.mType == Preferences.LOCAL_STORAGE) {
                this.mStorage = window.LocalStorage || window.localStorage;
            } else {
                this.mStorage = window.sessionStorage;
            }
        } catch(e) {
            console.error(e);
        }
    }

    absolutePath() {
        return this.mPath + "/" + this.mName;
    }

    addPreferenceChangeListener(pcl) {
        if (pcl === null) {
            throw new ReferenceError("NullPointerException Change listener is null.");
        }
        this.mPrefListeners.add(pcl);
    }

    clear() {
        this.clearSpi();
    }

    clearSpi() {
        this.mStorage.clear();
    }

    decode(key, def) {
        let buffer = this.getByteArray(key, def);
        return Base64.decodeString(buffer);
    }

    encode(key, value) {
        let buffer = Base64.encodeString(value);
        this.putByteArray(key, buffer);
    }

    flush() {
        this.flushSpi();
    }

    flushSpi() {
        if (this.mSync) {
            window.removeEventListener('storage', this.onSyncFunction);
            this.mSync = false;
            let length = this.mStorage.length;
            let obj = {};
            for (let i = 0; i < length; i++) {
                let key = this.mStorage.key(i);
                let value = this.mStorage.getItem(key);
                obj[key] = value;
            }
            return JSON.stringify(obj);
        }
        return null;
    }

    get(key, def) {
        if (key === null) {
            throw new ReferenceError("NullPointerException Null key");
        }
        let result = null;
        try {
            result = this.getSpi(key);
        } catch (e) {
        }
        return result === null ? def : result;
    }

    getArray(key, def) {
        let result = def;
        let value = this.get(key, null);
        if (value === null) {
            try {
                result = JSON.parse(value);
            } catch(e) {

            }
        }
        return result;
    }

    getBoolean(key, def) {
        let result = def;
        let value = this.get(key, null);
        if (value !== null) {
            result = value.toLowerCase() === "true";
        }
        return result;
    }

    getByteArray(key, def) {
        let result = def;
        let value = this.get(key, null);
        try {
            if (value !== null) {
                result = Base64.base64ToByteArray(value);
            }
        } catch (e) {
        }
        return result;
    }

    getFloat(key, def) {
        let result = def;
        try {
            let value = this.get(key, null);
            if (value !== null) {
                result = parseFloat(value);
            }
        } catch (e) {
        }
        return result;
    }

    getInt(key, def) {
        let result = def;
        try {
            let value = this.get(key, null);
            if (value !== null) {
                result = parseInt(value);
            }
        } catch (e) {
        }
        return result;
    }

    getObject(key, def) {
        let result = def;
        try {
            let value = this.get(key, null);
            if (value !== null) {
                result = JSON.parse(value);
            }
        } catch (e) {
        }
        return result;
    }

    getSpi(key) {
        return this.mStorage.getItem(key);
    }

    hasKey(key) {
        return this.get(key) !== null;
    }

    importPreferences(reload=null) {
        if (!this.isImported()) {
            if (reload !== null && reload) {
                this.clear();
            }
            new HTTPConnection({
                url: this.absolutePath(),
                method: GET,
                responseType: 'JSON',
                handlers: (event) => {
                    let type = event.type;
                    let response = event.response;
                    if (type === ERROR_STATE) {
                        let ex = response.getException();
                        if (ex !== null) {
                            this.put("preferences_error", ex.message);
                        } else {
                            this.put("preferences_error", "unknown error");
                        }
                    } else if (type === LOAD_END_STATE) {
                        let json = response.getMessageBody();
                        for (let p in json) {
                            this.putObject(p, json[p]);
                        }
                        this.putBoolean("preferences_imported", true);
                        this.notifyImported();
                    }
                }
            });
        } else {
            this.notifyImported();
        }
    }

    isImported() {
        let imported = false;
        if (this.hasKey("preferences_imported")) {
            imported = this.getBoolean("preferences_imported");
        }
        return imported;
    }

    isStrict() {
        return this.mStrict;
    }

    isSync() {
        return this.mSync;
    }

    keys() {
        return this.keysSpi();
    }

    keysSpi() {
        let length = this.mStorage.length;
        let keys = [];
        for (let i = 0; i < length; i++) {
            keys[i] = this.mStorage.key(i);
        }
        return keys;
    }

    name() {
        return this.mName;
    }

    notifyChange(key, oldValue, newValue, url, storageArea) {
        let listeners = this.mPrefListeners.getListenersInternal();
        let evt = new PreferenceChangeEvent({
            source : this,
            id : PreferenceChangeEvent.PREFERENCE_CHANGE_EVENT_CHANGE,
            data : {
                url : url || this.mUrl,
                key : key,
                oldValue : oldValue,
                newValue : newValue,
                storageArea : storageArea
                || this.mStorage
            }
        });
        for (const listener of listeners) {
            listener.onPreferenceChange(evt);
        }
    }

    notifyError(error) {
        let listeners = this.mPrefListeners.getListenersInternal();
        let evt = new PreferenceChangeEvent({
            source : this,
            id : PreferenceChangeEvent.PREFERENCE_CHANGE_EVENT_ERROR,
            data : {
                url : this.mUrl,
                exception: error,
                storageArea : this.mStorage
            }
        });
        for (const listener of listeners) {
            listener.onPreferenceError(evt);
        }
    }

    notifyExceededQuota(error) {
        let listeners = this.mPrefListeners.getListenersInternal();
        let evt = new PreferenceChangeEvent({
            source : this,
            id : PreferenceChangeEvent.PREFERENCE_CHANGE_EVENT_EXCEEDED_QUOTA,
            data : {
                url : this.mUrl,
                exception: error,
                storageArea : this.mStorage
            }
        });
        for (const listener of listeners) {
            listener.onPreferenceError(evt);
        }
    }

    notifyImported() {
        let listeners = this.mPrefListeners.getListenersInternal();
        let evt = new PreferenceChangeEvent({
            source : this,
            id : PreferenceChangeEvent.PREFERENCE_CHANGE_EVENT_IMPORTED,
            data : {
                url : this.mUrl,
                storageArea : this.mStorage
            }
        });
        for (const listener of listeners) {
            listener.onPreferencesImported(evt);
        }
    }

    onSync(evt) {
        this.notifyChange(evt.key, evt.oldValue,
            evt.newValue, evt.url, evt.storageArea);
    }

    put(key, value) {
        try {
            if (key === null) {
                throw new ReferenceError("NullPointerException undefined key");
            }
            if (value === null) {
                throw new ReferenceError("NullPointerException undefined value for " + key + " key");
            }
            if (this.mStrict && (key.length > MAX_KEY_LENGTH)) {
                throw new RangeError("IllegalArgumentException Key too long: " + key);
            }
            if (this.mStrict && (value.length > MAX_VALUE_LENGTH)) {
                throw new RangeError("IllegalArgumentException Value too long: " + value);
            }
            let oldValue = this.get(key);
            this.putSpi(key, value);
            this.notifyChange(key, oldValue, value);
        } catch(e) {
            this.notifyError(e);
        }
    }

    putArray(key, value) {
        try {
            this.put(key, JSON.stringify(value));
        } catch(e) {
            this.notifyError(e);
        }
    }

    putBoolean(key, value) {
        this.put(key, value ? "true" : "false");
    }

    putByteArray(key, value) {
        try {
            this.put(key, Base64.byteArrayToBase64(value));
        } catch (e) {
            tnis.notifyError(e);
        }
    }

    putFloat(key, value) {
        this.put(key, !isNaN(value) ? "" + value : value);
    }

    putInt(key, value) {
        this.put(key, !isNaN(value) ? "" + value : value);
    }

    putObject(key, value) {
        try {
            if (key === null) {
                throw new ReferenceError("NullPointerException undefined key");
            }
            if (value === null) {
                throw new ReferenceError("NullPointerException undefined value for " + key + " key");
            }
            if (typeof value == "string") {
                this.put(key, value);
            } else if (typeof value == "number") {
                this.putFloat(key, value);
            } else if (typeof value == "boolean") {
                this.putBoolean(key, value);
            } else if (value instanceof ArrayBuffer) {
                this.putByteArray(key, value);
            } else if (Array.isArray(value)) {
                this.putArray(key, value);
            }  else if (value.constructor === Object) {
                this.put(key, JSON.stringify(value));
            } else {
                throw new TypeError("ClassCastException " + value.constructor + " not supported");
            }
        } catch(e) {
            this.notifyError(e);
        }
    }

    putSpi(key, value) {
        try {
            this.mStorage.setItem(key, value);
        } catch(e) {
            this.notifyExceededQuota(e);
        }
    }

    remove(key) {
        this.removeSpi(key);
        let oldValue = this.get(key);
        this.notifyChange(key, oldValue, null);
    }

    removePreferenceChangeListener(pcl) {
        if (pcl === null) {
            throw new ReferenceError("NullPointerException Change listener is null.");
        }
        this.mPrefListeners.remove(pcl);
    }

    removeSpi(key) {
        this.mStorage.removeItem(key);
    }

    setStrict(strict) {
        this.mStrict = strict;
    }

    size() {
        return this.sizeSpi();
    }

    sizeSpi() {
        return this.mStorage.length;
    }

    sync() {
        this.syncSpi();
    }

    syncSpi() {
        if (!this.mSync) {
            this.onSyncFunction = this.onSync.bind(this);
            window.addEventListener('storage', this.onSyncFunction, false);
            this.mSync = true;
        }
    }

    toString() {
        let length = this.mStorage.length;
        let obj = {};
        for (let i = 0; i < length; i++) {
            let key = this.mStorage.key(i);
            let value = this.mStorage.getItem(key);
            if (value !== null) {
                obj[key] = value;
            }
        }
        return JSON.stringify(obj);
    }

    type() {
        return this.mType;
    }

    url() {
        return this.mUrl;
    }
}

let DEFAULT_PREFERENCES_CLASS = Preferences;

export const DEFAULT_PREFERENCES_FILE_NAME = "preferences.json";

export const PreferencesFactory = {

    getPreferences: ({
        onPreferenceChange=null,
        onPreferenceError=null,
        onPreferenceExceededQuota=null,
        onPreferencesImported=null}={}) => {
        if (DEFAULT_PREFERENCES === null) {
            DEFAULT_PREFERENCES = new DEFAULT_PREFERENCES_CLASS(
                {onPreferenceChange,onPreferenceError,onPreferenceExceededQuotaonPreferencesImported,});
        }
        return DEFAULT_PREFERENCES;
    },

    getPreferencesClass: () => {
        return DEFAULT_PREFERENCES_CLASS;
    },

    setPreferencesClass: (cls) => {
        DEFAULT_PREFERENCES_CLASS = cls;
    }
};