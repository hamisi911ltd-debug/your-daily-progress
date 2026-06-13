// Lovable platform integration — auth handled via Cloudflare D1 + JWT
export const lovable = {
  auth: {
    signInWithOAuth: async (_provider: string) => {
      return { error: new Error("OAuth not configured. Use email/password sign-in.") };
    },
  },
};
