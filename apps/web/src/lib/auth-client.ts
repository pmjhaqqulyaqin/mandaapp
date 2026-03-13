/// <reference types="vite/client" />
import { createAuthClient } from "better-auth/react"
import { adminClient } from "better-auth/client/plugins"

const apiBase = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
const authBase = apiBase.replace(/\/api$/, "");

export const authClient = createAuthClient({
    baseURL: authBase,
    plugins: [
        adminClient(),
    ],
})

export const { signIn, signUp, signOut, useSession } = authClient;
