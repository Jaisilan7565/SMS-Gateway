package com.smstransfer.sms_telephony

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.database.Cursor
import android.net.Uri
import android.os.Build
import android.provider.Telephony
import android.telephony.SubscriptionInfo
import android.telephony.SubscriptionManager
import android.util.Log
import androidx.annotation.NonNull
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import io.flutter.embedding.engine.plugins.FlutterPlugin
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel

class SmsTelephonyPlugin: FlutterPlugin, MethodChannel.MethodCallHandler {
    private var channel: MethodChannel? = null
    private var appContext: Context? = null
    private val CHANNEL_NAME = "com.smstransfer.sms/telephony"
    private val NOTIF_CHANNEL_ID = "sms_gateway_sync"
    private var smsObserver: android.database.ContentObserver? = null
    private var lastSeenSmsId: Long = 0L

    companion object {
        private const val TAG = "SMSGatewayPlugin"
        private const val PREFS_NAME = "sms_gateway_prefs"
        private const val KEY_PENDING_SMS = "pending_sms_json"
        private var instance: SmsTelephonyPlugin? = null

        fun onSmsReceived(context: Context, smsData: Map<String, Any>) {
            Log.i(TAG, "Dispatching incoming SMS to Flutter: sender=${smsData["sender"]}")
            val plugin = instance
            if (plugin != null && plugin.channel != null) {
                android.os.Handler(android.os.Looper.getMainLooper()).post {
                    plugin.channel?.invokeMethod("onIncomingSms", smsData)
                }
            } else {
                savePendingSms(context, smsData)
            }
        }

        fun savePendingSms(context: Context, smsData: Map<String, Any>) {
            try {
                val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                val existing = prefs.getString(KEY_PENDING_SMS, "[]") ?: "[]"
                val jsonArray = org.json.JSONArray(existing)
                val obj = org.json.JSONObject()
                for ((k, v) in smsData) {
                    obj.put(k, v)
                }
                jsonArray.put(obj)
                prefs.edit().putString(KEY_PENDING_SMS, jsonArray.toString()).apply()
                Log.i(TAG, "Saved incoming SMS to pending queue (size=${jsonArray.length()})")
            } catch (e: Exception) {
                Log.e(TAG, "Error saving pending SMS: ${e.message}")
            }
        }

        fun getAndClearPendingSms(context: Context): List<Map<String, Any>> {
            val list = mutableListOf<Map<String, Any>>()
            try {
                val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                val raw = prefs.getString(KEY_PENDING_SMS, null) ?: return list
                val jsonArray = org.json.JSONArray(raw)
                for (i in 0 until jsonArray.length()) {
                    val obj = jsonArray.getJSONObject(i)
                    val map = mutableMapOf<String, Any>()
                    val keys = obj.keys()
                    while (keys.hasNext()) {
                        val key = keys.next()
                        map[key] = obj.get(key)
                    }
                    list.add(map)
                }
                prefs.edit().remove(KEY_PENDING_SMS).apply()
                Log.i(TAG, "Retrieved and cleared ${list.size} pending SMS")
            } catch (e: Exception) {
                Log.e(TAG, "Error reading pending SMS: ${e.message}")
            }
            return list
        }
    }

    override fun onAttachedToEngine(@NonNull flutterPluginBinding: FlutterPlugin.FlutterPluginBinding) {
        appContext = flutterPluginBinding.applicationContext
        channel = MethodChannel(flutterPluginBinding.binaryMessenger, CHANNEL_NAME)
        channel?.setMethodCallHandler(this)
        createNotificationChannel(appContext!!)
        instance = this
        registerContentObserver(appContext!)
        Log.i(TAG, "SmsTelephonyPlugin attached to engine (background or foreground)")
    }

    override fun onDetachedFromEngine(@NonNull binding: FlutterPlugin.FlutterPluginBinding) {
        channel?.setMethodCallHandler(null)
        channel = null
        unregisterContentObserver()
        if (instance == this) {
            instance = null
        }
        appContext = null
    }

    private fun registerContentObserver(context: Context) {
        if (smsObserver != null) return
        val handler = android.os.Handler(android.os.Looper.getMainLooper())
        smsObserver = object : android.database.ContentObserver(handler) {
            override fun onChange(selfChange: Boolean) {
                super.onChange(selfChange)
                checkLatestSms(context)
            }
        }
        try {
            context.contentResolver.registerContentObserver(
                Telephony.Sms.CONTENT_URI,
                true,
                smsObserver!!
            )
            Log.i(TAG, "Telephony ContentObserver registered for real-time incoming SMS")
        } catch (e: Exception) {
            Log.w(TAG, "ContentObserver registration note: ${e.message}")
        }
    }

    private fun unregisterContentObserver() {
        smsObserver?.let {
            try {
                appContext?.contentResolver?.unregisterContentObserver(it)
            } catch (_: Exception) {}
            smsObserver = null
        }
    }

    private fun checkLatestSms(context: Context) {
        try {
            val permCheck = ContextCompat.checkSelfPermission(context, Manifest.permission.READ_SMS)
            if (permCheck != PackageManager.PERMISSION_GRANTED) return

            val cursor = context.contentResolver.query(
                Telephony.Sms.Inbox.CONTENT_URI,
                arrayOf(
                    Telephony.Sms._ID,
                    Telephony.Sms.ADDRESS,
                    Telephony.Sms.BODY,
                    Telephony.Sms.DATE,
                    Telephony.Sms.READ
                ),
                null,
                null,
                "${Telephony.Sms.DATE} DESC LIMIT 1"
            )

            cursor?.use {
                if (it.moveToFirst()) {
                    val idCol = it.getColumnIndex(Telephony.Sms._ID)
                    val addressCol = it.getColumnIndex(Telephony.Sms.ADDRESS)
                    val bodyCol = it.getColumnIndex(Telephony.Sms.BODY)
                    val dateCol = it.getColumnIndex(Telephony.Sms.DATE)
                    val readCol = it.getColumnIndex(Telephony.Sms.READ)

                    val id = if (idCol >= 0) it.getLong(idCol) else 0L
                    val date = if (dateCol >= 0) it.getLong(dateCol) else 0L

                    val now = System.currentTimeMillis()
                    if (id != lastSeenSmsId && (now - date) < 45000L) {
                        lastSeenSmsId = id
                        val sender = if (addressCol >= 0) it.getString(addressCol) ?: "Unknown" else "Unknown"
                        val body = if (bodyCol >= 0) it.getString(bodyCol) ?: "" else ""
                        val isRead = if (readCol >= 0) it.getInt(readCol) == 1 else false

                        val smsMap = mapOf<String, Any>(
                            "smsId" to id.toString(),
                            "sender" to sender,
                            "body" to body,
                            "messageDate" to date,
                            "simSlot" to "SIM 1",
                            "isRead" to isRead
                        )
                        onSmsReceived(context, smsMap)
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error in checkLatestSms: ${e.message}")
        }
    }

    override fun onMethodCall(call: MethodCall, result: MethodChannel.Result) {
        val context = appContext ?: run {
            result.error("NO_CONTEXT", "Application context is null", null)
            return
        }

        when (call.method) {
            "getMessages" -> {
                val limit = call.argument<Int>("limit") ?: 100
                val dateFrom = call.argument<Long>("dateFrom")
                val dateTo = call.argument<Long>("dateTo")

                // Check READ_SMS permission natively without needing an Activity!
                val permCheck = ContextCompat.checkSelfPermission(context, Manifest.permission.READ_SMS)
                if (permCheck != PackageManager.PERMISSION_GRANTED) {
                    Log.w(TAG, "READ_SMS permission not granted on device")
                    result.error("PERMISSION_DENIED", "READ_SMS permission is not granted on this device", null)
                    return
                }

                try {
                    val messages = readSms(context, limit, dateFrom, dateTo)
                    Log.i(TAG, "readSms returning ${messages.size} records")
                    result.success(messages)
                } catch (e: Exception) {
                    Log.e(TAG, "Error in getMessages: ${e.message}", e)
                    result.error("SMS_QUERY_ERROR", e.localizedMessage, null)
                }
            }
            "getSimSlots" -> {
                try {
                    val simSlots = getActiveSimSlots(context)
                    result.success(simSlots)
                } catch (e: Exception) {
                    result.error("SIM_QUERY_ERROR", e.localizedMessage, null)
                }
            }
            "showNotification" -> {
                val title = call.argument<String>("title") ?: "⚡ SMS Gateway Sync"
                val body = call.argument<String>("body") ?: "Syncing SMS messages..."
                try {
                    showLocalNotification(context, title, body)
                    result.success(true)
                } catch (e: Exception) {
                    result.error("NOTIF_ERROR", e.localizedMessage, null)
                }
            }
            "getPendingIncomingSms" -> {
                try {
                    val pending = getAndClearPendingSms(context)
                    result.success(pending)
                } catch (e: Exception) {
                    result.error("PENDING_SMS_ERROR", e.localizedMessage, null)
                }
            }
            else -> {
                result.notImplemented()
            }
        }
    }

    private fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIF_CHANNEL_ID,
                "SMS Gateway Sync",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notifications for SMS Gateway synchronization events"
                enableVibration(true)
                setShowBadge(true)
            }
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            manager?.createNotificationChannel(channel)
        }
    }

    private fun showLocalNotification(context: Context, title: String, body: String) {
        createNotificationChannel(context)
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
        val iconRes = context.resources.getIdentifier("ic_notification", "drawable", context.packageName).takeIf { it != 0 }
            ?: android.R.drawable.stat_notify_sync

        val builder = NotificationCompat.Builder(context, NOTIF_CHANNEL_ID)
            .setSmallIcon(iconRes)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setDefaults(NotificationCompat.DEFAULT_ALL)

        notificationManager.notify(1001, builder.build())
    }

    private fun getActiveSimSlots(context: Context): Map<String, Any> {
        val result = mutableMapOf<String, Any>()
        val sim1 = mutableMapOf<String, Any>("carrier" to "Not detected", "slotIndex" to 0)
        val sim2 = mutableMapOf<String, Any>("carrier" to "Not detected", "slotIndex" to 1)

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
                val subscriptionManager = context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as? SubscriptionManager
                val activeList: List<SubscriptionInfo>? = subscriptionManager?.activeSubscriptionInfoList

                if (activeList != null) {
                    for (info in activeList) {
                        val carrierName = info.displayName?.toString() ?: info.carrierName?.toString() ?: "Carrier"
                        if (info.simSlotIndex == 0) {
                            sim1["carrier"] = carrierName
                            sim1["subId"] = info.subscriptionId
                        } else if (info.simSlotIndex == 1) {
                            sim2["carrier"] = carrierName
                            sim2["subId"] = info.subscriptionId
                        }
                    }
                }
            }
        } catch (_: Exception) {}

        result["sim1"] = sim1
        result["sim2"] = sim2
        return result
    }

    private fun readSms(context: Context, limit: Int, dateFrom: Long?, dateTo: Long?): List<Map<String, Any>> {
        var messages = querySmsFromUri(context, Telephony.Sms.Inbox.CONTENT_URI, limit, dateFrom, dateTo)
        if (messages.isEmpty()) {
            Log.d(TAG, "Telephony.Sms.Inbox returned 0 messages, trying Telephony.Sms.CONTENT_URI...")
            messages = querySmsFromUri(context, Telephony.Sms.CONTENT_URI, limit, dateFrom, dateTo)
        }
        return messages
    }

    private fun querySmsFromUri(context: Context, uri: Uri, limit: Int, dateFrom: Long?, dateTo: Long?): List<Map<String, Any>> {
        val messages = mutableListOf<Map<String, Any>>()
        val projection = arrayOf(
            Telephony.Sms._ID,
            Telephony.Sms.ADDRESS,
            Telephony.Sms.BODY,
            Telephony.Sms.DATE,
            Telephony.Sms.READ
        )

        val selectionParts = mutableListOf<String>()
        val selectionArgs = mutableListOf<String>()

        if (dateFrom != null && dateFrom > 0) {
            selectionParts.add("${Telephony.Sms.DATE} > ?")
            selectionArgs.add(dateFrom.toString())
        }

        if (dateTo != null && dateTo > 0) {
            selectionParts.add("${Telephony.Sms.DATE} <= ?")
            selectionArgs.add(dateTo.toString())
        }

        val selection = if (selectionParts.isNotEmpty()) selectionParts.joinToString(" AND ") else null
        val args = if (selectionArgs.isNotEmpty()) selectionArgs.toTypedArray() else null
        val sortOrder = "${Telephony.Sms.DATE} DESC"

        var cursor: Cursor? = null
        try {
            cursor = context.contentResolver.query(uri, projection, selection, args, sortOrder)
            Log.d(TAG, "Querying $uri cursor count: ${cursor?.count ?: 0}")

            if (cursor != null && cursor.moveToFirst()) {
                val addressIdx = cursor.getColumnIndex(Telephony.Sms.ADDRESS)
                val bodyIdx = cursor.getColumnIndex(Telephony.Sms.BODY)
                val dateIdx = cursor.getColumnIndex(Telephony.Sms.DATE)
                val readIdx = cursor.getColumnIndex(Telephony.Sms.READ)
                val idIdx = cursor.getColumnIndex(Telephony.Sms._ID)

                val subIdIdx = try {
                    cursor.getColumnIndex("sub_id").takeIf { it != -1 }
                        ?: cursor.getColumnIndex("subscription_id").takeIf { it != -1 }
                        ?: cursor.getColumnIndex("sim_id")
                } catch (_: Exception) { -1 }

                do {
                    val address = if (addressIdx != -1) cursor.getString(addressIdx) ?: "UNKNOWN" else "UNKNOWN"
                    val body = if (bodyIdx != -1) cursor.getString(bodyIdx) ?: "" else ""
                    val date = if (dateIdx != -1) cursor.getLong(dateIdx) else System.currentTimeMillis()
                    val read = if (readIdx != -1) cursor.getInt(readIdx) == 1 else false
                    val smsId = if (idIdx != -1) cursor.getLong(idIdx) else -1L
                    val subId = if (subIdIdx != -1) {
                        try { cursor.getInt(subIdIdx) } catch (_: Exception) { -1 }
                    } else -1

                    val simSlot = when (subId) {
                        0 -> "SIM 1"
                        1 -> "SIM 2"
                        else -> if (subId > 1) "SIM 2" else "SIM 1"
                    }

                    val msgMap = mapOf(
                        "smsId" to smsId,
                        "sender" to address,
                        "body" to body,
                        "messageDate" to date,
                        "isRead" to read,
                        "simSlot" to simSlot
                    )
                    messages.add(msgMap)

                    if (messages.size >= limit) {
                        break
                    }
                } while (cursor.moveToNext())
            }
        } finally {
            cursor?.close()
        }

        return messages
    }
}
