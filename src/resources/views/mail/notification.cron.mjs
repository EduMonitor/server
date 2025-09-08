import { emailTheme } from "../theme/email.themes.mjs";

export const notifcationCronEmail = (message, companyName) => `
  <html>
          <head>
          ${emailTheme} <!-- Include the email theme -->
        </head>
          <body>
            <div class="email-container">
              <div class="logo">
                <img src="cid:logo" alt="${companyName} Logo" />
              </div>
              <div class="content">
          
            <p>
            ${message}
          </p>

              </div>
              <div class="footer">
                &copy; ${new Date().getFullYear()} ${companyName}. All rights reserved)}
              </div>
            </div>
          </body>
        </html>
`;
