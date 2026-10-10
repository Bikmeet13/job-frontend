const { URLSearchParams } = require("url");

class DisabledTelephonyAdapter {
  constructor(message = "Business calling is not configured") { this.message = message; }
  async startCall() { const error = new Error(this.message); error.code = "TELEPHONY_DISABLED"; throw error; }
  async endCall() { const error = new Error("Ending calls is unavailable while business calling is disabled."); error.code = "TELEPHONY_DISABLED"; throw error; }
  async getCall() { return null; }
  handleWebhook(payload) { return payload; }
  async getRecording() { return null; }
  verifyWebhook() { return false; }
  async testConnection() { return { ok: false, message: this.message }; }
}

class ExotelTelephonyAdapter {
  constructor({ axios, accountSid, apiKey, apiToken, subdomain = "api.in.exotel.com", businessNumber, callbackUrl, recordingEnabled = false }) {
    this.axios = axios; this.accountSid = accountSid; this.apiKey = apiKey; this.apiToken = apiToken; this.subdomain = subdomain; this.businessNumber = businessNumber; this.callbackUrl = callbackUrl; this.recordingEnabled = recordingEnabled;
  }
  assertConfigured() { if (![this.accountSid, this.apiKey, this.apiToken, this.businessNumber, this.callbackUrl].every(Boolean)) throw new Error("Exotel is selected but its server credentials are incomplete."); }
  async startCall({ employeeNumber, clientNumber, callId, recordingEnabled = this.recordingEnabled }) {
    this.assertConfigured();
    const body = new URLSearchParams({ From: employeeNumber, To: clientNumber, CallerId: this.businessNumber, StatusCallback: this.callbackUrl, "StatusCallbackEvents[0]": "terminal", "StatusCallbackEvents[1]": "answered", "StatusCallbackEvents[2]": "ringing", Record: recordingEnabled ? "true" : "false", CustomField: String(callId) });
    const url = `https://${this.subdomain}/v1/Accounts/${encodeURIComponent(this.accountSid)}/Calls/connect.json`;
    const response = await this.axios.post(url, body.toString(), { auth: { username: this.apiKey, password: this.apiToken }, headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 15000 });
    const call = response.data?.Call || response.data; return { providerCallId: call?.Sid || call?.CallSid, status: String(call?.Status || "queued").toLowerCase(), raw: call };
  }
  async getCall(providerCallId, recordingUrlValidity = 5) { this.assertConfigured(); const url = `https://${this.subdomain}/v1/Accounts/${encodeURIComponent(this.accountSid)}/Calls/${encodeURIComponent(providerCallId)}.json`; return (await this.axios.get(url, { auth: { username: this.apiKey, password: this.apiToken }, params: { RecordingUrlValidity: Math.min(60, Math.max(5, recordingUrlValidity)) }, timeout: 15000 })).data; }
  async getRecording(providerCallId) { const result = await this.getCall(providerCallId, 5); const call = result.Call || result; return { url: call.PreSignedRecordingUrl || null, reference: call.RecordingUrl || null, expiresInSeconds: 300 }; }
  async endCall() { const error = new Error("This Exotel account does not expose call termination through the configured adapter."); error.code = "NOT_SUPPORTED"; throw error; }
  handleWebhook(payload) { return payload; }
  async testConnection() { this.assertConfigured(); return { ok: true, message: "Exotel configuration is complete. A live call was not placed." }; }
}

function createAdapter({ provider, enabled, ...options }) {
  if (!enabled) return new DisabledTelephonyAdapter();
  if (provider === "exotel") return new ExotelTelephonyAdapter(options);
  return new DisabledTelephonyAdapter(`Telephony provider “${provider || "none"}” is not supported.`);
}

module.exports = { DisabledTelephonyAdapter, ExotelTelephonyAdapter, createAdapter };
