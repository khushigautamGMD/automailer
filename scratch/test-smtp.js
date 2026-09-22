const nodemailer = require('nodemailer');

async function testGmailDispatch() {
  const senderEmail = process.env.SMTP_USER || 'sender@example.com';
  const appPassword = process.env.SMTP_PASS || '';
  const recipients = process.env.TEST_RECIPIENT ? [process.env.TEST_RECIPIENT] : ['recipient@example.com'];

  console.log('Connecting to Gmail SMTP server (smtp.gmail.com:587)...');

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // TLS
    auth: {
      user: senderEmail,
      pass: appPassword,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  for (const recipient of recipients) {
    console.log(`Sending email to ${recipient}...`);
    try {
      const info = await transporter.sendMail({
        from: `"GrowMore Digitally" <${senderEmail}>`,
        to: recipient,
        subject: `Exclusive Digital Product Access for ${recipient}`,
        html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; color: #1e293b; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="background-color: #dbeafe; color: #1d4ed8; font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 9999px; text-transform: uppercase;">Exclusive Release</span>
            <h2 style="color: #0f172a; font-size: 24px; font-weight: 800; margin-top: 16px;">Hello Valued Client,</h2>
            <p style="font-size: 15px; color: #64748b;">Thank you for connecting with <strong>GrowMore Digitally</strong>.</p>
          </div>

          <div style="font-size: 15px; line-height: 1.7; color: #334155; margin-bottom: 24px;">
            <p>We are thrilled to present our flagship <strong>Digital Product Suite</strong>!</p>
            
            <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 20px; margin: 20px 0; border-radius: 0 12px 12px 0;">
              <h3 style="margin-top: 0; color: #2563eb; font-size: 18px;">🚀 Premium Digital Product</h3>
              <p style="margin-bottom: 12px; color: #475569;">Gain instant lifetime access to your complete collection of digital templates, automated workflows, and growth tools.</p>
              <ul style="margin: 0; padding-left: 20px;">
                <li>✅ Instant Download & Digital Access</li>
                <li>✅ Pre-configured Automated Workflows</li>
                <li>✅ Lifetime Access & Free Future Updates</li>
              </ul>
            </div>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="https://yourproductlink.com" style="background-color: #2563eb; color: #ffffff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-size: 16px; font-weight: 700; display: inline-block;">
              👉 Get Instant Access to Digital Product
            </a>
          </div>

          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0 16px 0;" />
          <p style="font-size: 13px; color: #94a3b8; text-align: center;">GrowMore Digitally • Digital Products & Campaign Automation</p>
        </div>`,
      });
      console.log(`✅ SUCCESS! Email sent to ${recipient} (Message ID: ${info.messageId})`);
    } catch (err) {
      console.error(`❌ ERROR sending to ${recipient}:`, err.message);
    }
  }
}

testGmailDispatch();
