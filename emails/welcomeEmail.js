const welcomeEmail = (username) => {
  return `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, Helvetica, sans-serif; background:#f9fafb; padding:20px;">
        <table width="100%" style="max-width:600px; margin:auto; background:#fff; border-radius:10px; overflow:hidden;" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td style="background:#1e3a8a; color:#fff; text-align:center; padding:20px;">
              <h1>Welcome to CLINK 🎉</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:30px; color:#333; font-size:15px;">
              <p>Hi <b>${username}</b>,</p>
              <p>Thank you for registering with CLINK! We're excited to have you on board.</p>
              <a href="https://clink.com/login" 
                 style="display:inline-block; padding:10px 20px; background:#1e3a8a; color:#fff; text-decoration:none; border-radius:5px; font-size:14px; margin-top:15px;">
                 Get Started
              </a>
              <p style="margin-top:20px;">Cheers,<br/>The CLINK Team</p>
            </td>
          </tr>
          <tr>
            <td style="background:#f3f4f6; text-align:center; padding:15px; font-size:12px; color:#666;">
              © ${new Date().getFullYear()} CLINK. All rights reserved.
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};

module.exports = welcomeEmail;
