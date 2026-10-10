async function sendEmailOrThrow(resend, message) {
  const response = await resend.emails.send(message);
  if (response?.error || !response?.data?.id) {
    const error = new Error(response?.error?.message || "Email provider did not accept the message.");
    error.code = response?.error?.name || "EMAIL_NOT_ACCEPTED";
    throw error;
  }
  return response.data;
}

module.exports = { sendEmailOrThrow };
