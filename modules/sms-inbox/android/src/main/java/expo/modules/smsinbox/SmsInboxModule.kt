package expo.modules.smsinbox

import android.os.Bundle
import android.provider.Telephony
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Reads the device SMS inbox. Nothing more: no listener, no send, no delete.
 * Parsing and filtering live in JS (utils/smsParser.ts) where they can be
 * changed without a native rebuild.
 */
class SmsInboxModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("SmsInbox")

    // `since` is epoch millis, exclusive. Doubles because JS numbers are the
    // only integer type that survives the bridge intact at this magnitude.
    AsyncFunction("readInbox") { since: Double, limit: Int ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      val projection = arrayOf(
        Telephony.Sms._ID,
        Telephony.Sms.ADDRESS,
        Telephony.Sms.BODY,
        Telephony.Sms.DATE
      )
      val messages = ArrayList<Bundle>()
      // LIMIT is not appended to the sort order on purpose: the SMS provider
      // passes it through to SQLite today, but that is undocumented. Stopping
      // the cursor walk early costs the same and cannot break.
      context.contentResolver.query(
        Telephony.Sms.Inbox.CONTENT_URI,
        projection,
        "${Telephony.Sms.DATE} > ?",
        arrayOf(since.toLong().toString()),
        "${Telephony.Sms.DATE} DESC"
      )?.use { cursor ->
        while (cursor.moveToNext() && messages.size < limit) {
          messages.add(
            Bundle().apply {
              putString("id", cursor.getString(0) ?: "")
              putString("address", cursor.getString(1) ?: "")
              putString("body", cursor.getString(2) ?: "")
              putDouble("date", cursor.getLong(3).toDouble())
            }
          )
        }
      }
      messages
    }
  }
}
