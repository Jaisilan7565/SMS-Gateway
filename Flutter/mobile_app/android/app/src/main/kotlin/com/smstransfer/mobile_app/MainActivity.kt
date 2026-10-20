package com.smstransfer.mobile_app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.database.Cursor
import android.net.Uri
import android.os.Build
import android.provider.Telephony
import android.telephony.SubscriptionInfo
import android.telephony.SubscriptionManager
import android.util.Log
import androidx.annotation.NonNull
import androidx.core.app.NotificationCompat
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity: FlutterActivity() {
    private val CHANNEL = "com.smstransfer.sms/telephony"
    private val TAG = "SMSGateway"
    private val NOTIF_CHANNEL_ID = "sms_gateway_sync"

    override fun configureFlutterEngine(@NonNull flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        // Ensure notification channel is registered on engine setup
        createNotificationChannel()

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "getMessages" -> {
                    val limit = call.argument<Int>("limit") ?: 100
                    val dateFrom = call.argument<Long>("dateFrom")
                    val dateTo = call.argument<Long>("dateTo")

                    try {
                        val messages = readSms(limit, dateFrom, dateTo)
                        Log.i(TAG, "getMessages returning ${messages.size} messages (limit=$limit, dateFrom=$dateFrom, dateTo=$dateTo)")
                        result.success(messages)
                    } catch (e: Exception) {
                        Log.e(TAG, "Error in getMessages: ${e.message}", e)
                        result.error("SMS_QUERY_ERROR", e.localizedMessage, null)
                    }
                }
                "getSimSlots" -> {
                    try {
                        val simSlots = getActiveSimSlots()
                        result.success(simSlots)
                    } catch (e: Exception) {
                        Log.e(TAG, "Error in getSimSlots: ${e.message}", e)
                        result.error("SIM_QUERY_ERROR", e.localizedMessage, null)
                    }
                }
                "showNotification" -> {
                    val title = call.argument<String>("title") ?: "⚡ SMS Gateway Sync"
                    val body = call.argument<String>("body") ?: "Syncing SMS messages..."
                    try {
                        showLocalNotification(title, body)
                        result.success(true)
                    } catch (e: Exception) {
                        Log.e(TAG, "Error in showNotification: ${e.message}", e)
                        result.error("NOTIF_ERROR", e.localizedMessage, null)
                    }
                }
                else -> {
                    result.notImplemented()
                }
            }
        }
    }

    private fun createNotificationChannel() {
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
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            manager?.createNotificationChannel(channel)
        }
    }

    private fun showLocalNotification(title: String, body: String) {
        createNotificationChannel()
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
        val builder = NotificationCompat.Builder(this, NOTIF_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setDefaults(NotificationCompat.DEFAULT_ALL)

        notificationManager.notify(1001, builder.build())
    }

    private fun getActiveSimSlots(): Map<String, Any> {
        val result = mutableMapOf<String, Any>()
        val sim1 = mutableMapOf<String, Any>("carrier" to "Not detected", "slotIndex" to 0)
        val sim2 = mutableMapOf<String, Any>("carrier" to "Not detected", "slotIndex" to 1)

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
                val subscriptionManager = getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as? SubscriptionManager
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
        } catch (ignored: Exception) {}

        result["sim1"] = sim1
        result["sim2"] = sim2
        return result
    }

    /**
     * Reads SMS from Android ContentProvider.
     * Tries Telephony.Sms.Inbox first; if empty, falls back to Telephony.Sms.CONTENT_URI (all SMS).
     */
    private fun readSms(limit: Int, dateFrom: Long?, dateTo: Long?): List<Map<String, Any>> {
        // Try Inbox first
        var messages = querySmsFromUri(Telephony.Sms.Inbox.CONTENT_URI, limit, dateFrom, dateTo)
        if (messages.isEmpty()) {
            Log.d(TAG, "Telephony.Sms.Inbox returned 0 messages, attempting fallback to Telephony.Sms.CONTENT_URI...")
            messages = querySmsFromUri(Telephony.Sms.CONTENT_URI, limit, dateFrom, dateTo)
        }
        return messages
    }

    private fun querySmsFromUri(uri: Uri, limit: Int, dateFrom: Long?, dateTo: Long?): List<Map<String, Any>> {
        val messages = mutableListOf<Map<String, Any>>()

        // Only query universal, standard columns to prevent SQLiteException on OEM ROMs (Xiaomi MIUI, etc.)
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

        // Standard ORDER BY without LIMIT clause to prevent SQLiteQueryBuilder exception in Android 10+
        val sortOrder = "${Telephony.Sms.DATE} DESC"

        var cursor: Cursor? = null
        try {
            cursor = contentResolver.query(uri, projection, selection, args, sortOrder)
            Log.d(TAG, "Querying $uri - cursor count: ${cursor?.count ?: 0}")

            if (cursor != null && cursor.moveToFirst()) {
                val addressIdx = cursor.getColumnIndex(Telephony.Sms.ADDRESS)
                val bodyIdx = cursor.getColumnIndex(Telephony.Sms.BODY)
                val dateIdx = cursor.getColumnIndex(Telephony.Sms.DATE)
                val readIdx = cursor.getColumnIndex(Telephony.Sms.READ)

                // Safely inspect optional sub_id / subscription_id / sim_id columns if available
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
                    val subId = if (subIdIdx != -1) {
                        try { cursor.getInt(subIdIdx) } catch (_: Exception) { -1 }
                    } else -1

                    val simSlot = when (subId) {
                        0 -> "SIM 1"
                        1 -> "SIM 2"
                        else -> if (subId > 1) "SIM 2" else "SIM 1"
                    }

                    val msgMap = mapOf(
                        "sender" to address,
                        "body" to body,
                        "messageDate" to date,
                        "isRead" to read,
                        "simSlot" to simSlot
                    )
                    messages.add(msgMap)

                    // Bound to requested limit safely inside iterator
                    if (messages.size >= limit) {
                        break
                    }
                } while (cursor.moveToNext())
            }
        } catch (e: Exception) {
            Log.e(TAG, "Cursor query error on $uri: ${e.message}", e)
            throw e
        } finally {
            cursor?.close()
        }

        return messages
    }
}
