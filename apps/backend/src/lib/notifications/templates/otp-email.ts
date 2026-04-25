export interface OtpEmailVars {
  otp: string;
  purpose: string;
  expiresInMinutes: number;
}

const purposeLabel: Record<string, string> = {
  register: 'verify your email',
  forgot_password: 'reset your password',
  change_email: 'verify your new email',
  change_phone: 'verify your phone number',
  change_password: 'confirm your password change',
  delete_account: 'confirm account deletion',
};

export const otpEmailTemplate = {
  subject: (vars: OtpEmailVars) => `Your Ohlify verification code: ${vars.otp}`,

  html: (vars: OtpEmailVars) => {
    const label = purposeLabel[vars.purpose] ?? 'complete your action';
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Verification Code</title></head>
<body style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #111;">Your verification code</h2>
  <p>Use the code below to ${label}:</p>
  <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 24px; background: #f4f4f4; border-radius: 8px; margin: 24px 0;">
    ${vars.otp}
  </div>
  <p style="color: #555;">This code expires in <strong>${vars.expiresInMinutes} minutes</strong>. Do not share it with anyone.</p>
  <p style="color: #999; font-size: 12px;">If you did not request this, you can safely ignore this email.</p>
</body>
</html>`;
  },
};
