const { v4: uuidv4 } = require('uuid');

// ═══════════════════════════════════════════════════════════════
// Notification Service
// Handles SMS, Email, and Push notification dispatch (mock)
// ═══════════════════════════════════════════════════════════════

function sendNotifications(db, options) {
  const {
    recipientID,
    recipientName,
    recipientPhone,
    recipientEmail,
    type,
    userName,
    accessTier,
  } = options;

  const notifications = [];

  // SMS Notification (Mock)
  if (recipientPhone) {
    const smsResult = sendSMS(recipientPhone, buildSMSMessage(type, userName, recipientName));
    notifications.push({
      channel: 'sms',
      recipient: recipientPhone,
      status: smsResult.success ? 'sent' : 'failed',
      messageId: smsResult.messageId,
    });
  }

  // Email Notification (Mock)
  if (recipientEmail) {
    const emailResult = sendEmail(
      recipientEmail,
      buildEmailSubject(type, userName),
      buildEmailBody(type, userName, recipientName, accessTier)
    );
    notifications.push({
      channel: 'email',
      recipient: recipientEmail,
      status: emailResult.success ? 'sent' : 'failed',
      messageId: emailResult.messageId,
    });
  }

  // Push Notification (Mock)
  const pushResult = sendPush(recipientID, buildPushMessage(type, userName));
  notifications.push({
    channel: 'push',
    recipient: recipientID,
    status: pushResult.success ? 'sent' : 'failed',
  });

  console.log(`[NOTIFY] Sent ${notifications.length} notification(s) to ${recipientName}`);
  return { recipientID, recipientName, notifications };
}

function sendSMS(phone, message) {
  // Mock SMS API (Twilio/local provider integration point)
  console.log(`[SMS] To: ${phone} | Message: ${message.substring(0, 60)}...`);
  return {
    success: true,
    messageId: `sms_${uuidv4().substring(0, 12)}`,
    provider: 'MOCK_SMS_GATEWAY',
    timestamp: new Date().toISOString(),
  };
}

function sendEmail(to, subject, body) {
  // Mock Email API (SendGrid/SES integration point)
  console.log(`[EMAIL] To: ${to} | Subject: ${subject}`);
  return {
    success: true,
    messageId: `eml_${uuidv4().substring(0, 12)}`,
    provider: 'MOCK_EMAIL_GATEWAY',
    timestamp: new Date().toISOString(),
  };
}

function sendPush(userID, message) {
  // Mock Push Notification (FCM/APNs integration point)
  console.log(`[PUSH] To: ${userID} | Message: ${message.substring(0, 60)}...`);
  return {
    success: true,
    provider: 'MOCK_PUSH_GATEWAY',
    timestamp: new Date().toISOString(),
  };
}

function buildSMSMessage(type, userName, recipientName) {
  const messages = {
    death_notification:
      `السلام عليكم ${recipientName}، نود إبلاغكم بأن المرحوم/المرحومة ${userName} قد انتقل إلى رحمة الله. ` +
      `تم تفعيل بروتوكول الإرث الرقمي الخاص بهم عبر منصة راحل. ` +
      `ستصلكم تعليمات الوصول قريباً. إنا لله وإنا إليه راجعون.`,
    heartbeat_warning:
      `تنبيه من منصة راحل: لم يتم رصد نشاط من حساب ${userName} خلال الفترة المحددة. يرجى التواصل معه/معها.`,
    shard_delivery:
      `${recipientName}، تم تسليمكم جزء من مفتاح التشفير الخاص بملفات ${userName} عبر منصة راحل. يرجى الاحتفاظ به بأمان.`,
  };
  return messages[type] || `إشعار من منصة راحل بخصوص حساب ${userName}`;
}

function buildEmailSubject(type, userName) {
  const subjects = {
    death_notification: `راحل | إشعار مهم بخصوص ${userName} - إنا لله وإنا إليه راجعون`,
    heartbeat_warning: `راحل | تنبيه عدم نشاط - ${userName}`,
    shard_delivery: `راحل | تسليم مفتاح تشفير - ${userName}`,
  };
  return subjects[type] || `راحل | إشعار بخصوص ${userName}`;
}

function buildEmailBody(type, userName, recipientName, accessTier) {
  if (type === 'death_notification') {
    return `
      <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1A1A1A; color: #FFFFFF; padding: 32px; border-radius: 12px;">
        <div style="text-align: center; padding-bottom: 24px; border-bottom: 1px solid #333;">
          <h1 style="color: #007BFF; margin: 0; font-size: 28px;">راحل</h1>
          <p style="color: #B0B0B0; margin-top: 8px;">منصة الإرث الرقمي</p>
        </div>
        <div style="padding: 24px 0;">
          <p>السلام عليكم ورحمة الله وبركاته ${recipientName}،</p>
          <p>نود إبلاغكم بأن المرحوم/المرحومة <strong>${userName}</strong> قد انتقل إلى رحمة الله تعالى.</p>
          <p>تم تفعيل بروتوكول الإرث الرقمي الخاص بهم تلقائياً عبر منصة راحل.</p>
          <div style="background: #2A2A2A; border-right: 4px solid #007BFF; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0;"><strong>مستوى الوصول الخاص بكم:</strong> ${accessTier}</p>
            <p style="margin: 8px 0 0 0;">ستصلكم رسالة منفصلة تحتوي على مفتاح التشفير الخاص بملفاتكم.</p>
          </div>
          <p style="color: #B0B0B0; font-style: italic;">إنا لله وإنا إليه راجعون</p>
        </div>
        <div style="border-top: 1px solid #333; padding-top: 16px; text-align: center;">
          <p style="color: #777; font-size: 12px;">هذه رسالة آلية من منصة راحل - لا تقم بالرد عليها</p>
        </div>
      </div>
    `;
  }
  return `<p>إشعار من منصة راحل بخصوص حساب ${userName}</p>`;
}

function buildPushMessage(type, userName) {
  const messages = {
    death_notification: `إنا لله وإنا إليه راجعون - تم تفعيل بروتوكول الإرث الرقمي للمرحوم ${userName}`,
    heartbeat_warning: `تنبيه: لم يتم رصد نشاط من ${userName}`,
    shard_delivery: `تم تسليمكم مفتاح تشفير من حساب ${userName}`,
  };
  return messages[type] || `إشعار من راحل بخصوص ${userName}`;
}

module.exports = { sendNotifications, sendSMS, sendEmail, sendPush };
