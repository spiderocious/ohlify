export interface WelcomeEmailVars {
  name: string;
}

export const welcomeEmailTemplate = {
  subject: () => 'Welcome to Ohlify!',

  html: (vars: WelcomeEmailVars) => `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Welcome to Ohlify</title></head>
<body style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #111;">Welcome${vars.name ? `, ${vars.name}` : ''}!</h2>
  <p>Your account is ready. Connect with professionals and get expert advice on demand.</p>
  <p style="color: #555;">Get started by completing your profile.</p>
</body>
</html>`,
};
