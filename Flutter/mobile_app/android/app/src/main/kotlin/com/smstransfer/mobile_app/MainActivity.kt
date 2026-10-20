package com.smstransfer.mobile_app

import android.content.Context
import android.database.Cursor
import android.os.Build
import android.provider.Telephony
import android.telephony.SubscriptionInfo
import android.telephony.SubscriptionManager
import androidx.annotation.NonNull
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity: FlutterActivity() {
    private val CHANNEL = "com.smstransfer.sms/telephony"

    override fun configureFlutterEngine(@NonNull flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "getMessages" -> {
                    val limit = call.argument<Int>("limit") ?: 100
                    val dateFrom = call.argument<Long>("dateFrom")
                    val dateTo = call.argument<Long>("dateTo")

                    try {
                        val messages = readSmsInbox(limit, dateFrom, dateTo)
                        result.success(messages)
                    } catch (e: Exception) {
                        result.error("SMS_QUERY_ERROR", e.localizedMessage, null)
                    }
                }
                "getSimSlots" -> {
                    try {
                        val simSlots = getActiveSimSlots()
                        result.success(simSlots)
                    } catch (e: Exception) {
                        result.error("SIM_QUERY_ERROR", e.localizedMessage, null)
                    }
                }
                else -> {
                    result.notImplemented()
                }
            }
        }
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

    private fun readSmsInbox(limit: Int, dateFrom: Long?, dateTo: Long?): List<Map<String, Any>> {
        val messages = mutableListOf<Map<String, Any>>()
        val uri = Telephony.Sms.Inbox.CONTENT_URI

        val projection = arrayOf(
            Telephony.Sms._ID,
            Telephony.Sms.ADDRESS,
            Telephony.Sms.BODY,
            Telephony.Sms.DATE,
            Telephony.Sms.READ,
            Telephony.Sms.SUBSCRIPTION_ID
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
        val sortOrder = "${Telephony.Sms.DATE} DESC LIMIT $limit"

        var cursor: Cursor? = null
        try {
            cursor = contentResolver.query(uri, projection, selection, args, sortOrder)
            if (cursor != null && cursor.moveToFirst()) {
                val idIdx = cursor.getColumnIndex(Telephony.Sms._ID)
                val addressIdx = cursor.getColumnIndex(Telephony.Sms.ADDRESS)
                val bodyIdx = cursor.getColumnIndex(Telephony.Sms.BODY)
                val dateIdx = cursor.getColumnIndex(Telephony.Sms.DATE)
                val readIdx = cursor.getColumnIndex(Telephony.Sms.READ)
                val subIdIdx = cursor.getColumnIndex(Telephony.Sms.SUBSCRIPTION_ID)

                do {
                    val address = if (addressIdx != -1) cursor.getString(addressIdx) ?: "UNKNOWN" else "UNKNOWN"
                    val body = if (bodyIdx != -1) cursor.getString(bodyIdx) ?: "" else ""
                    val date = if (dateIdx != -1) cursor.getLong(dateIdx) else System.currentTimeMillis()
                    val read = if (readIdx != -1) cursor.getInt(readIdx) == 1 else false
                    val subId = if (subIdIdx != -1) cursor.getInt(subIdIdx) else -1

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
                } while (cursor.moveToNext())
            }
        } finally {
            cursor?.close()
        }

        return messages
    }
}
