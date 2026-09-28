import { Navigate, useSearchParams } from "react-router-dom";
import { rememberResetEmail } from "../../lib/passwordReset";

/**
 * Legacy route. Code entry now lives on /reset-password together with the new password
 * (one submit, since the API has no separate code check). Old links such as
 * /verify-otp?mode=reset&email=… land here and are forwarded, keeping the email.
 */
const OtpVerification = () => {
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") ?? "";
  if (email) rememberResetEmail(email);
  return <Navigate to="/reset-password" replace state={email ? { email } : undefined} />;
};

export default OtpVerification;
