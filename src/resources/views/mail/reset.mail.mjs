import { validateEmailInputs } from "../../../app/validators/sendEmails.validators.mjs";
import { emailTheme } from "../theme/email.themes.mjs";

const escapeHtml = (unsafe) =>
  unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const resetEmail = (url, companyName) => {
  // Validation et nettoyage des entrées
  const { url: sanitizedurl, companyName: sanitizedCompanyName } =
    validateEmailInputs({ url, companyName });

  // Échapper les caractères potentiellement dangereux
  const escapedCompanyName = escapeHtml(sanitizedCompanyName);

  return `
    <html>
      <head>
        ${emailTheme} <!-- Thème de l'email -->
      </head>
      <body>
        <div class="email-container">
          <div class="logo">
            <img src="cid:logo" alt="Logo ${escapedCompanyName}" />
          </div>
          <div class="content">
            <h1>Réinitialisation de mot de passe</h1>
            <p>Vous avez demandé à réinitialiser votre mot de passe pour <span>${escapedCompanyName}</span>. Veuillez cliquer sur le bouton ci-dessous pour continuer.</p>
            <div class="button-container">
              <a href="${sanitizedurl}" class="button">Réinitialiser le mot de passe</a>
            </div>
            <p>Si vous n'avez pas effectué cette demande, vous pouvez ignorer cet e-mail.</p>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} ${escapedCompanyName}. Tous droits réservés.
          </div>
        </div>
      </body>
    </html>
  `;
};

export { resetEmail };
