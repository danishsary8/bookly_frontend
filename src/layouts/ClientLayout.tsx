import { Outlet } from "react-router-dom";
import { SiteShell } from "../components/shell/SiteShell";

const ClientLayout = () => (
    <SiteShell>
        <Outlet />
    </SiteShell>
);

export default ClientLayout;
