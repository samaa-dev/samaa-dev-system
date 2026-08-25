// Lovable helpers that do not depend on Supabase auth.

export const lovable = {
  auth: {
    /** @deprecated Use Firebase Google sign-in instead. */
    signInWithOAuth: async () => ({
      error: new Error("Lovable auth has been replaced by Firebase Authentication."),
    }),
  },
};
