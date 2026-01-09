/// <reference types="vite/client" />

type CanisterIdEnvKey = `CANISTER_ID_${string}`;

declare global {
    interface ImportMetaEnv {
        readonly DFX_NETWORK?: string;
        readonly CANISTER_ID_BACKEND?: string;
        readonly [key: CanisterIdEnvKey]: string | undefined;
    }

    interface ImportMeta {
        readonly env: ImportMetaEnv;
    }
}

export { };
