export const getAuthErrorMessage = (error, mode = "login") => {
  const status = error?.response?.status;
  const response = error?.response?.data;
  const rawMessage = response?.message || response?.errors?.[0]?.msg || response?.errors?.[0]?.message || response?.errors?.[0];

  if (status === 429) return "Too many attempts. Wait a moment, then try again.";
  if (!error?.response) return "Could not reach The System. Check your connection and try again.";
  if (mode === "login" && status === 401) {
    return "Email or password is incorrect. Check your details and try again.";
  }
  if (status === 409 && /email/i.test(rawMessage || "")) {
    return "An account already uses this email. Sign in or use a different email.";
  }
  if (status === 409 && /hunter name|username/i.test(rawMessage || "")) {
    return "That Hunter name is already taken. Choose another one.";
  }
  if (status >= 500) return "The System hit a server error. Try again in a moment.";
  return rawMessage || (mode === "register" ? "Account creation failed. Review your details and try again." : "Sign-in failed. Review your details and try again.");
};