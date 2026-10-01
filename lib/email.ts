import { optionalEnv } from "./env";

/**
 * Transactional email, sent through Resend's HTTPS API.
 *
 * Email is used only where it is genuinely transactional — confirming a
 * consequential account action. When `RESEND_API_KEY` is absent the feature
 * reports that it is not configured instead of pretending a message was sent:
 * nothing in Edvance ever claims an email was delivered when it was not.
 *
 * The API key is read here, never logged, and never sent to the browser.
 */

export function isEmailConfigured(): boolean {
  return Boolean(optionalEnv("RESEND_API_KEY"));
}

export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
};

export type EmailResult = { sent: true } | { sent: false; reason: string };

/** The verified sender address, overridable for a real domain. */
function emailFrom(): string {
  return optionalEnv("EMAIL_FROM") ?? "Edvance <onboarding@resend.dev>";
}

/**
 * Sends one email. Never throws: a mail failure must never fail the learner's
 * action, so the outcome is returned and the caller decides how to report it.
 */
export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  const apiKey = optionalEnv("RESEND_API_KEY");
  if (!apiKey) return { sent: false, reason: "not-configured" };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: emailFrom(),
        to: [message.to],
        subject: message.subject,
        text: message.text,
      }),
    });
    if (!response.ok) {
      // Only the status is reported — never the response body or the key.
      return { sent: false, reason: `provider-${response.status}` };
    }
    return { sent: true };
  } catch {
    return { sent: false, reason: "network" };
  }
}
