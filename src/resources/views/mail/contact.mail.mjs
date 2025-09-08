import { emailTheme } from "../theme/email.themes.mjs";

export const contactEmail = (info, companyName) => `
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
          <h1>New message</h1>
          <p>
            <ul>
              <li><strong>Name :</strong> ${info?.name}</li>
              <li><strong>Email :</strong> ${info?.email}</li>
            </ul>
          </p>
          <p>${info?.message}</p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} ${companyName}. All rights reserved.
        </div>
      </div>
    </body>
  </html>
`;
