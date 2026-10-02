import { FrozenOutlet } from "../components/motion/FrozenOutlet";
import { SiteShell } from "../components/shell/SiteShell";

const ClientLayout = () => (
    <SiteShell>
        <FrozenOutlet />
    </SiteShell>
);

export default ClientLayout;
