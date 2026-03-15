/// <reference types="vite/client" />
import { createAuthClient } from "better-auth/react"
import { adminClient } from "better-auth/client/plugins"

let apiBase = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

// Ensure the URL has a protocol
if (apiBase && !apiBase.startsWith('http')) {
    apiBase = `https://${apiBase}`;
}

const authBase = apiBase.replace(/\/api$/, "");

export const authClient = createAuthClient({
    baseURL: authBase,
    fetchOptions: {
        credentials: "include", // Required for cross-origin cookies (e.g. localhost:5173 -> localhost:3001)
    },
    plugins: [
        adminClient(),
    ],
})

export const { signIn, signUp, signOut, useSession } = authClient;
