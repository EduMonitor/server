import CryptoJS from "crypto-js";

export const maskEmailCustom=(email) => {
  if (!email || !email.includes('@')) return email;

  const [localPart, domain] = email.split('@');

  // Get domain extension (like .com, .org, .net)
  const extMatch = domain.match(/(\.[a-zA-Z]{2,})$/);
  const domainExt = extMatch ? extMatch[1] : '';

  // Mask local part: first letter + stars
  const maskedLocal = localPart[0] + '*'.repeat(Math.max(localPart.length - 1, 1));

  // Mask domain except extension with dots
  const domainMaskLength = Math.max(domain.length - domainExt.length, 1);
  const maskedDomain = '.'.repeat(domainMaskLength) + domainExt;

  return `${maskedLocal}@${maskedDomain}`;
}

export const checkTokenCooldown = (decoded, cooldownSeconds = 60) => {
  const tokenIssuedAtMs = decoded.iat * 1000;
  const sessionAgeMs = Date.now() - tokenIssuedAtMs;
  return Math.max(cooldownSeconds - sessionAgeMs / 1000, 0);
};

export const setAuthCookie = (res, token, maxAgeMinutes = 30) => {
  res.cookie("authToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: maxAgeMinutes * 60 * 1000,
    sameSite: "strict",
  });
};

export const setRefreshCookie = (res, token, maxAgeDays = 7) => {
  res.cookie("jwt", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: maxAgeDays * 24 * 60 * 60 * 1000,
    sameSite: "strict",
  });
};

export const generateOTP = (length = 6) => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charsLength = chars.length;

  // Generate secure random bytes
  const randomBytes = CryptoJS.lib.WordArray.random(length);

  let otp = "";
  for (let i = 0; i < length; i++) {
    // Take the highest byte from the word
    const byteValue = randomBytes.words[i % randomBytes.words.length] >>> 24;
    otp += chars[byteValue % charsLength];
  }

  // Expire in 5 minutes
  const expiresAt = Date.now() + 5 * 60 * 1000;

  return { otp, expiresAt };
};
