const { Resend } = require('resend');

const getResendConfig = () => {
    return {
        apiKey: process.env.RESEND_API_KEY,
        from: process.env.RESEND_FROM || process.env.EMAIL_FROM || 'BankPro <onboarding@resend.dev>'
    };
};

class ResendEmailSender {
    constructor() {
        this.resend = null;
        this.init();
    }

    init() {
        const cfg = getResendConfig();
        if (cfg.apiKey) {
            this.resend = new Resend(cfg.apiKey);
        } else {
            this.resend = null;
        }
    }

    isConfigured() {
        return Boolean(process.env.RESEND_API_KEY && this.resend);
    }

    async verifyConnection() {
        return this.isConfigured();
    }

    async send(mailOptions) {
        if (!this.isConfigured()) {
            console.warn('[Resend] RESEND_API_KEY is not configured. Email suppressed.');
            return { success: false, error: 'RESEND_API_KEY not configured' };
        }
        const cfg = getResendConfig();
        const from = mailOptions.from || cfg.from;
        const to = Array.isArray(mailOptions.to) ? mailOptions.to : [mailOptions.to];

        try {
            // Resend SDK returns { data, error } — it does NOT throw on API errors
            console.log(`[Resend] Sending "${mailOptions.subject}" from="${from}" to=${JSON.stringify(to)}`);
            const { data, error } = await this.resend.emails.send({
                from,
                to,
                subject: mailOptions.subject,
                html: mailOptions.html,
                text: mailOptions.text
            });
            if (error) {
                console.error(`[Resend] API error sending to ${to}: ${error.message || JSON.stringify(error)}`);
                throw new Error(error.message || 'Resend API returned an error');
            }
            return { success: true, data };
        } catch (error) {
            console.error('[Resend] Error sending email:', error.message || error);
            throw error;
        }
    }

    getStatus() {
        const configured = this.isConfigured();
        return {
            configured,
            provider: configured ? 'resend' : 'none',
            verified: configured,
            message: configured ? 'Resend API service active' : 'RESEND_API_KEY not configured in environment',
            checkedAt: new Date().toISOString()
        };
    }
}

const sender = new ResendEmailSender();

const wrapHtml = (title, bodyContent) => `<!DOCTYPE html><html><head><style>
body{font-family:Arial,sans-serif;color:#333;margin:0;padding:0}.container{max-width:600px;margin:20px auto;padding:20px}
.header{background:#1a237e;color:#fff;padding:20px;text-align:center;border-radius:5px 5px 0 0}
.content{padding:20px;background:#f5f5f5;border-radius:0 0 5px 5px}.button{display:inline-block;background:#1a237e;color:#fff;padding:12px 30px;text-decoration:none;border-radius:5px;margin:20px 0}
.footer{text-align:center;font-size:12px;color:#999;margin-top:20px}.warning{background:#fff3cd;padding:10px;border-left:4px solid #ffc107;margin:15px 0}
.details{background:#fff;padding:15px;border-radius:5px;margin:15px 0}.detail-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee}
.detail-row:last-child{border-bottom:none}.feature{padding:10px;margin:5px 0;background:#fff;border-left:4px solid #1a237e}
</style></head><body><div class="container"><div class="header"><h2>${title}</h2></div><div class="content">${bodyContent}</div><div class="footer"><p>This is an automated message, please do not reply to this email.</p></div></div></body></html>`;

const templates = {
    getPasswordResetTemplate: resetUrl => wrapHtml('Password Reset Request', `
        <p>Hello,</p><p>We received a request to reset your BankPro account password. Click the button below to proceed:</p>
        <a href="${resetUrl}" class="button">Reset Password</a><p>Or copy this link: <br><small>${resetUrl}</small></p>
        <div class="warning"><strong>Note:</strong> This link will expire in 10 minutes.</div>
        <p>If you did not request a password reset, please ignore this email. Your account remains secure.</p><p>Best regards,<br>BankPro Security Team</p>
    `),
    getWelcomeTemplate: name => wrapHtml('Welcome to BankPro', `
        <p>Hello ${name},</p><p>Thank you for joining BankPro! We're excited to have you on board.</p>
        <p><strong>Key Features You Can Now Access:</strong></p>
        <div class="feature">✓ Manage multiple bank accounts</div><div class="feature">✓ Track transactions and budgets</div>
        <div class="feature">✓ Pay bills easily and securely</div><div class="feature">✓ Set and monitor financial goals</div>
        <div class="feature">✓ Monitor investments</div><div class="feature">✓ Exchange currencies</div>
        <p>Start exploring your dashboard to make the most of BankPro.</p><p>Best regards,<br>BankPro Team</p>
    `),
    getAccountCreatedTemplate: (name, accountNumber) => wrapHtml('Account Created Successfully', `
        <p>Hello ${name},</p><p>Congratulations! Your BankPro account has been successfully created.</p>
        <div class="details">
            <div class="detail-row"><span><strong>Account Number:</strong></span><span>${accountNumber}</span></div>
            <div class="detail-row"><span><strong>Status:</strong></span><span>Active</span></div>
        </div>
        <p>You can now log in to your account and start managing your finances.</p><p>Best regards,<br>BankPro Team</p>
    `),
    getTransactionTemplate: details => wrapHtml('Transaction Notification', `
        <p>Hello,</p><p>${details.type === 'credit' ? 'Received' : 'Sent'} ${details.currency} <span style="font-size:24px;font-weight:bold;color:${details.type === 'credit' ? '#4caf50' : '#f44336'}">${details.amount}</span></p>
        <div class="details">
            <div class="detail-row"><span><strong>Description:</strong></span><span>${details.description || 'N/A'}</span></div>
            <div class="detail-row"><span><strong>Date:</strong></span><span>${new Date(details.date).toLocaleString()}</span></div>
            <div class="detail-row"><span><strong>Reference:</strong></span><span>${details.reference || 'N/A'}</span></div>
        </div>
        <p>Best regards,<br>BankPro Team</p>
    `),
    getBillPaidTemplate: d => wrapHtml('Bill Payment Confirmation', `
        <p>Hello ${d.userName},</p><p>Your payment of ${d.currency} ${d.amount} for ${d.billName} (${d.billType}) was successful.</p>
        <div class="details">
            <div class="detail-row"><span><strong>Bill Number:</strong></span><span>${d.billNumber || 'N/A'}</span></div>
            <div class="detail-row"><span><strong>Date:</strong></span><span>${new Date(d.date).toLocaleString()}</span></div>
        </div>
        <p>Best regards,<br>BankPro Team</p>
    `),
    getSecurityAlertTemplate: d => wrapHtml('Security Alert', `
        <p>Hello ${d.userName},</p><div class="warning"><strong>Notice:</strong> ${d.message}</div>
        <p>Date: ${new Date(d.date || Date.now()).toLocaleString()}</p>
        <p>If this was not you, please secure your account immediately.</p><p>Best regards,<br>BankPro Security Team</p>
    `),
    getTwoFactorCodeTemplate: code => wrapHtml('Your Verification Code', `
        <p>Hello,</p><p>Your 2FA verification code for BankPro is:</p>
        <div style="font-size:32px;font-weight:bold;letter-spacing:5px;text-align:center;padding:15px;background:#e8eaf6;margin:15px 0">${code}</div>
        <div class="warning"><strong>Note:</strong> This code expires in 5 minutes.</div>
        <p>Best regards,<br>BankPro Security Team</p>
    `)
};

class EmailService {
    constructor() {
        this.isConfigured = this.isConfigured.bind(this);
        this.verifyConnection = this.verifyConnection.bind(this);
        this.getStatus = this.getStatus.bind(this);
        this.sendMail = this.sendMail.bind(this);
        this.sendTemplateEmail = this.sendTemplateEmail.bind(this);
        this.sendPasswordResetEmail = this.sendPasswordResetEmail.bind(this);
        this.sendWelcomeEmail = this.sendWelcomeEmail.bind(this);
        this.sendAccountCreatedEmail = this.sendAccountCreatedEmail.bind(this);
        this.sendTransactionNotification = this.sendTransactionNotification.bind(this);
        this.sendBillPaymentNotification = this.sendBillPaymentNotification.bind(this);
        this.sendGoalUpdateNotification = this.sendGoalUpdateNotification.bind(this);
        this.sendInvestmentNotification = this.sendInvestmentNotification.bind(this);
        this.sendSecurityAlert = this.sendSecurityAlert.bind(this);
        this.sendLoginOtpEmail = this.sendLoginOtpEmail.bind(this);
    }

    isConfigured() { return sender.isConfigured(); }
    verifyConnection() { return sender.verifyConnection(); }
    getStatus() { return sender.getStatus(); }
    async sendMail(opts) { return sender.send(opts); }

    async sendTemplateEmail({ to, subject, html }) {
        if (!this.isConfigured()) {
            console.warn('[EmailService] Resend not configured — email suppressed. Set RESEND_API_KEY in .env');
            return false;
        }
        try {
            await this.sendMail({ from: getResendConfig().from, to, subject, html });
            return true;
        } catch (err) {
            console.error(`[EmailService] Failed to send "${subject}" to ${to}: ${err.message}`);
            return false;
        }
    }

    sendPasswordResetEmail(to, resetUrl) { return this.sendTemplateEmail({ to, subject: 'Password Reset Request - BankPro', html: templates.getPasswordResetTemplate(resetUrl) }); }
    sendWelcomeEmail(to, name) { return this.sendTemplateEmail({ to, subject: 'Welcome to BankPro - Your Account is Ready', html: templates.getWelcomeTemplate(name) }); }
    sendAccountCreatedEmail(to, name, accountNumber) { return this.sendTemplateEmail({ to, subject: 'Account Successfully Created - BankPro', html: templates.getAccountCreatedTemplate(name, accountNumber) }); }
    sendTransactionNotification(to, details) { return this.sendTemplateEmail({ to, subject: `Transaction Notification - ${details.type} of ${details.currency} ${details.amount}`, html: templates.getTransactionTemplate(details) }); }
    sendBillPaymentNotification(to, details) { return this.sendTemplateEmail({ to, subject: `Bill Payment Confirmation - ${details.billName}`, html: templates.getBillPaidTemplate(details) }); }
    sendGoalUpdateNotification(to, details) { return this.sendTemplateEmail({ to, subject: `Goal Progress Update - ${details.goalName}`, html: templates.getSecurityAlertTemplate({ userName: details.goalName, message: 'Goal progress updated' }) }); }
    sendInvestmentNotification(to, details) { return this.sendTemplateEmail({ to, subject: `Investment Notification - ${details.instrumentName}`, html: templates.getSecurityAlertTemplate({ userName: details.instrumentName, message: 'Investment updated' }) }); }
    sendSecurityAlert(to, details) { return this.sendTemplateEmail({ to, subject: 'Security Alert - BankPro Account', html: templates.getSecurityAlertTemplate(details) }); }
    sendLoginOtpEmail(to, name, otpCode) { return this.sendTemplateEmail({ to, subject: 'Your BankPro Login OTP Code', html: templates.getTwoFactorCodeTemplate(otpCode) }); }
}

module.exports = new EmailService();
