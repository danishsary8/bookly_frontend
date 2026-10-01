import { Link, useLocation } from "react-router-dom";
import BlurText from "../../components/BlurText";
import { AuthShell } from "../../components/AuthShell";
import CustomerLoginForm from "../../components/Authentication/CustomerLoginForm";
import CustomerRegisterForm from "../../components/Authentication/CustomerRegisterForm";

const Authentication = () => {
  const location = useLocation();
  const isLogin = location.pathname === "/login";

  const title = isLogin ? "Sign in" : "Create your account";

  return (
    <AuthShell>
      <p className="eyebrow">{isLogin ? "Welcome back" : "New to Bookly"}</p>
      <h1 className="mt-3 text-[clamp(2.25rem,4vw,3.05rem)] leading-[1.08] text-foreground" aria-label={title}>
        <BlurText
          key={title}
          as="span"
          text={title}
          delay={60}
          animateBy="words"
          animationFrom={{ filter: "blur(8px)", opacity: 0, y: 24 }}
          animationTo={[{ filter: "blur(0px)", opacity: 1, y: 0 }]}
          stepDuration={0.3}
          easing={[0.16, 1, 0.3, 1]}
        />
      </h1>
      <p className="mt-3 text-base text-muted-foreground">
        {isLogin
          ? "Pick up where you left off: your cart, saved books and orders."
          : "Save books, check out faster and track every order."}
      </p>

      <div className="mt-8">{isLogin ? <CustomerLoginForm /> : <CustomerRegisterForm />}</div>

      <div className="mt-8 grid gap-2 border-t border-border pt-6 text-center text-sm text-muted-foreground">
        <p>
          {isLogin ? "New to Bookly? " : "Already have an account? "}
          <Link to={isLogin ? "/register" : "/login"} className="inline-flex min-h-11 items-center font-semibold text-primary underline-offset-4 hover:underline">
            {isLogin ? "Create an account" : "Sign in"}
          </Link>
        </p>
        {isLogin ? (
          <Link to="/browse" className="mx-auto inline-flex min-h-11 items-center font-semibold text-foreground underline-offset-4 hover:underline">
            Continue browsing as a guest
          </Link>
        ) : null}
      </div>
    </AuthShell>
  );
};

export default Authentication;
