const express = require("express");
const sgMail = require("@sendgrid/mail");

const router = express.Router();

if (!process.env.SENDGRID_API_KEY) {
  console.error("❌ SENDGRID_API_KEY missing in .env");
} else {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

/**
 * POST /api/contact/send
 * Returns:
 *  - sendgrid_accept_status: should be 202
 *  - sendgrid_message_id: use it to search in SendGrid Email Activity
 */
router.post("/send", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const from = process.env.SENDGRID_FROM; 
    const to = process.env.SENDGRID_TO;     

    if (!from || !to) {
      return res.status(500).json({
        message: "Missing SENDGRID_FROM or SENDGRID_TO in .env",
      });
    }

    const safeSubject = subject.trim() || "New message";
    const finalSubject = `Hetusafe Contact: ${safeSubject}`;

    const textBody =
      `Name: ${name}\n` +
      `Email: ${email}\n` +
      `Subject: ${safeSubject}\n\n` +
      `Message:\n${message}\n`;

    function escapeHtml(str) {
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }

    const safeHtmlName    = escapeHtml(name);
    const safeHtmlSubject = escapeHtml(safeSubject);
    const safeHtmlMessage = escapeHtml(message).replace(/\n/g, "<br/>");

    const payload = {
      to,
      from,
      subject: finalSubject,
      replyTo: email,
      text: textBody,
      html: `
        <div style="font-family: Arial, sans-serif; line-height:1.5">
          <h2 style="margin:0 0 10px">Hetusafe Contact Message</h2>
          <p><b>Name:</b> ${safeHtmlName}</p>
          <p><b>Email:</b> ${email}</p>
          <p><b>Subject:</b> ${safeHtmlSubject}</p>
          <hr style="margin:14px 0"/>
          <p><b>Message:</b></p>
          <div style="background:#f6f7fb; padding:12px; border-radius:10px">
            ${safeHtmlMessage}
          </div>
        </div>
      `,
    };

    const [response] = await sgMail.send(payload);

    const acceptStatus = response?.statusCode; // expected 202
    const messageId =
      response?.headers?.["x-message-id"] ||
      response?.headers?.["X-Message-Id"] ||
      null;

    // Only report success if SendGrid accepted (202)
    if (acceptStatus !== 202) {
      return res.status(500).json({
        message: "SendGrid did not accept the email",
        sendgrid_accept_status: acceptStatus,
        sendgrid_message_id: messageId,
      });
    }

    return res.json({
      message: "SendGrid accepted ✅",
      sendgrid_accept_status: acceptStatus, // 202
      sendgrid_message_id: messageId,       // use this in Email Activity search
      note:
        "Delivery happens after acceptance. Check SendGrid Email Activity for Delivered (250) or Deferred (421).",
    });
  } catch (err) {
    console.error("❌ SendGrid error:", err?.response?.body || err.message);
    return res.status(500).json({ message: "We couldn't send your message right now — please try again or email us directly." });
  }
});

module.exports = router;
