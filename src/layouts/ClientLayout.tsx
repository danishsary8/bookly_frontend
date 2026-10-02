import { Outlet } from "react-router-dom";
import { SiteShell } from "../components/shell/SiteShell";
import { StorefrontSettingsProvider } from "../contexts/StorefrontSettingsContext";

// StorefrontSettingsProvider stays until the V1 pages that read it are rebuilt.
const ClientLayout = () => (
    <StorefrontSettingsProvider>
        <SiteShell>
            <Outlet />
        </SiteShell>
    </StorefrontSettingsProvider>
);

export default ClientLayout;
