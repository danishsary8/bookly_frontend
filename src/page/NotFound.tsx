import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
    const location = useLocation();

    useEffect(() => {
        console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    }, [location.pathname]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-orange-100 px-4">
            <div className="text-center glass-surface rounded-3xl p-10 max-w-md w-full">
                <h1 className="mb-3 text-6xl font-bold text-slate-900">404</h1>
                <p className="mb-5 text-base text-muted-foreground">The page you requested could not be found.</p>
                <a href="/" className="inline-flex px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold hover:opacity-90">
                    Return to Home
                </a>
            </div>
        </div>
    );
};

export default NotFound;
