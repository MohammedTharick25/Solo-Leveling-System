# Email setup

The authentication flows now send real emails through SMTP using Node.js built-in networking, so no additional mail dependency is required.

Set these variables in the server `.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-google-app-password
EMAIL_FROM=Solo Leveling <your-email@gmail.com>
PASSWORD_RESET_EXPIRY_MINUTES=30
```

For Gmail, use a Google App Password rather than the normal account password.

The server sends:

- Password reset email with a secure, expiring reset link.
- New-login security email containing device, browser, operating system, IP and login time.

The HTML email templates are located at:

- `src/modules/auth/templates/password-reset.html`
- `src/modules/auth/templates/login-alert.html`
