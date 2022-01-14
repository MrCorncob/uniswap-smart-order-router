import { Provider } from "@ethersproject/providers";
import { Signer } from "ethers";
import type { ISelfPermit, ISelfPermitInterface } from "../ISelfPermit";
export declare class ISelfPermit__factory {
    static readonly abi: {
        inputs: {
            internalType: string;
            name: string;
            type: string;
        }[];
        name: string;
        outputs: never[];
        stateMutability: string;
        type: string;
    }[];
    static createInterface(): ISelfPermitInterface;
    static connect(address: string, signerOrProvider: Signer | Provider): ISelfPermit;
}
