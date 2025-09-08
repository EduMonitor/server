import { validateEmailInputs } from "../../../app/validators/sendEmails.validators.mjs";
import { emailTheme } from "../theme/email.themes.mjs";

const escapeHtml = (unsafe) =>
  unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const verificationEmail = (url, companyName) => {
  // Validation et nettoyage des entrées
  const { url: sanitizedurl, companyName: sanitizedCompanyName } =
    validateEmailInputs({ url, companyName });

  // Échapper les caractères potentiellement dangereux
  const escapedCompanyName = escapeHtml(sanitizedCompanyName);

  return `
    <html>
      <head>
        ${emailTheme} <!-- Inclusion du thème de l'email -->
      </head>
      <body>
        <div class="email-container">
          <div class="logo">
            <img src="cid:logo" alt="Logo ${escapedCompanyName}" />
          </div>
          <div class="content">
            <h1>Confirmez votre adresse e-mail</h1>
            <p>Bienvenue chez <span>${escapedCompanyName}</span> ! Veuillez confirmer votre adresse e-mail en cliquant sur le bouton ci-dessous.</p>
            <div class="button-container">
              <a href="${sanitizedurl}" class="button">Vérifier l'e-mail</a>
            </div>
            <p>Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité.</p>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} ${escapedCompanyName}. Tous droits réservés.
          </div>
        </div>
      </body>
    </html>
  `;
};

export { verificationEmail };
