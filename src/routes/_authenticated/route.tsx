import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getTokenPayload } from "@/integrations/cloudflare/auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: () => {
    const payload = getTokenPayload();
    if (!payload) throw redirect({ to: "/auth" });
    return {
      user: {
        id: payload.sub,
        email: payload.email,
        user_metadata: { full_name: payload.name, avatar_url: payload.avatar_url },
      },
    };
  },
  component: () => <Outlet />,
});
