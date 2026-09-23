import { Outlet } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { StorefrontSettingsProvider } from "../contexts/StorefrontSettingsContext";

const ClientLayout = () => {
    const location = useLocation();

    return (
        <StorefrontSettingsProvider>
            <div className="min-h-screen bg-background relative">
                <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_0%,rgba(251,146,60,0.12),transparent_30%),radial-gradient(circle_at_95%_10%,rgba(20,184,166,0.12),transparent_28%)] dark:bg-[radial-gradient(circle_at_12%_0%,rgba(245,158,11,0.12),transparent_24%),radial-gradient(circle_at_92%_8%,rgba(34,211,238,0.16),transparent_26%),linear-gradient(180deg,rgba(15,23,42,0),rgba(15,23,42,0.18))]" />
                <Header />
                <main>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            transition={{ duration: 0.28, ease: "easeOut" }}
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </main>
                <Footer />
            </div>
        </StorefrontSettingsProvider>
    );
};

export default ClientLayout;
