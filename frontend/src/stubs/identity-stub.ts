// Stub for @dfinity/identity/lib/cjs/identity/partial
// This is a workaround for @slide-computer/signer-transport-stoic's dependency on old @dfinity/identity paths
// We don't use Stoic wallet functionality directly

import { SignIdentity } from '@dfinity/agent';
import type { HttpAgentRequest, PublicKey, Signature } from '@dfinity/agent';

export class PartialIdentity extends SignIdentity {
    getPublicKey(): PublicKey {
        throw new Error('PartialIdentity stub - not implemented');
    }

    async sign(_blob: ArrayBuffer): Promise<Signature> {
        throw new Error('PartialIdentity stub - not implemented');
    }

    async transformRequest(_request: HttpAgentRequest): Promise<HttpAgentRequest> {
        throw new Error('PartialIdentity stub - not implemented');
    }
}

export const PartialDelegationIdentity = PartialIdentity;
