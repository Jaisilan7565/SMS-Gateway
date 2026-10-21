package com.smstransfer.sms_telephony

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Telephony
import android.telephony.SmsMessage
import android.util.Log

/**
 * High-priority BroadcastReceiver listening for android.provider.Telephony.SMS_RECEIVED
 * Captures incoming SMS messages natively at the instant of cell tower reception.
 */
class SmsReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "SMSGatewayReceiver"
    }

    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null || intent == null) return
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        try {
            val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
            if (messages.isNullOrEmpty()) return

            val subId = intent.extras?.getInt("subscription", -1)
                ?: intent.extras?.getInt("slot", -1)
                ?: -1

            val simSlot = when (subId) {
                0 -> "SIM 1"
                1 -> "SIM 2"
                else -> "SIM 1"
            }

            // Concatenate multipart message bodies
            val fullBody = StringBuilder()
            var sender = "Unknown"
            var timestamp = System.currentTimeMillis()

            for (msg: SmsMessage in messages) {
                val from = msg.displayOriginatingAddress ?: msg.originatingAddress
                if (!from.isNullOrEmpty()) {
                    sender = from
                }
                fullBody.append(msg.displayMessageBody ?: msg.messageBody ?: "")
                if (msg.timestampMillis > 0) {
                    timestamp = msg.timestampMillis
                }
            }

            val body = fullBody.toString()
            if (body.isEmpty()) return

            val smsId = "rec_${timestamp}_${sender.hashCode()}"
            val smsData = mapOf<String, Any>(
                "smsId" to smsId,
                "sender" to sender,
                "body" to body,
                "messageDate" to timestamp,
                "simSlot" to simSlot,
                "isRead" to false
            )

            Log.i(TAG, "Real-time incoming SMS intercepted from $sender on $simSlot")
            SmsTelephonyPlugin.onSmsReceived(context, smsData)
        } catch (e: Exception) {
            Log.e(TAG, "Error in SmsReceiver.onReceive: ${e.message}", e)
        }
    }
}
