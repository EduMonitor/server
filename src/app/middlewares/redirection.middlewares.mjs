
// import { logger } from "../../config/logger/logger.config.mjs";

import { logger } from "../config/logger.config.mjs";



const redirectBrowserRequests = (req, res, next) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const isHtmlRequest = req.headers.accept && req.headers.accept.includes("text/html");

  // Define paths to exclude from redirection
  const excludedPaths = [
    "/auth/failed",
    "/auth/google/callback",
    "/auth/google"
  ];

  try {
    // Check if the path matches any excluded path
    const isExcludedPath = excludedPaths.some((path) => req.path.startsWith(path));

    if (isHtmlRequest && !isExcludedPath) {
      // Define trusted domains for validation
      const trustedDomains = [frontendUrl];
      const redirectUrl = `${frontendUrl}${req.originalUrl}`;

      // Validate the redirect URL to ensure it starts with a trusted domain
      const isTrustedUrl = trustedDomains.some((trustedDomain) => redirectUrl.startsWith(trustedDomain));

      if (isTrustedUrl) {
        logger.info(`Redirecting browser request to: ${redirectUrl}`);
        return res.redirect(frontendUrl);
      } else {
        logger.error(`Invalid redirect URL: ${redirectUrl}`);
        return res.status(400).send({ message: "Invalid redirect URL." });
      }
    }

    logger.info("Proceeding to next middleware");
  } catch (error) {
    logger.error(`Error processing request: ${error.message}`);
    return res.status(500).send({ message: "An error occurred while processing the request." });
  }

  next(); // Continue processing for non-browser or excluded requests
};

export { redirectBrowserRequests };


