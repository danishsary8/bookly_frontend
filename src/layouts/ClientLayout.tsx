import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Loading from "../components/ui/loading";
import { RouteErrorBoundary } from "../components/ErrorBoundary";
import { PageTransition } from "../components/motion/PageTransition";
import { Toaster } from "../components/ui/toaster";
import { StorefrontSettingsProvider } from "../contexts/StorefrontSettingsContext";

const ClientLayout = () => (
    <StorefrontSettingsProvider>
        <div className="min-h-screen bg-background">
            <Header />
            <main id="content" tabIndex={-1} className="relative outline-none">
                <PageTransition>
                    <RouteErrorBoundary>
                        {/* Keeps the header and footer on screen while a lazy page loads. */}
                        <Suspense fallback={<div className="section-wrap py-10"><Loading /></div>}>
                            <Outlet />
                        </Suspense>
                    </RouteErrorBoundary>
                </PageTransition>
            </main>
            <Footer />
            <Toaster />
        </div>
    </StorefrontSettingsProvider>
);

export default ClientLayout;
