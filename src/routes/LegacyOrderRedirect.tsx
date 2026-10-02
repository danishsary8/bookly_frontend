import { Navigate, useParams } from "react-router-dom";

/** V1's /orders/:id → /account/orders/:id (keeps old links and e-mails working). */
export default function LegacyOrderRedirect() {
  const { id } = useParams();
  return <Navigate to={id ? `/account/orders/${id}` : "/account/orders"} replace />;
}
