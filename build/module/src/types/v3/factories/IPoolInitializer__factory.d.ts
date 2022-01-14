import { Provider } from "@ethersproject/providers";
import { Signer } from "ethers";
import type { IPoolInitializer, IPoolInitializerInterface } from "../IPoolInitializer";
export declare class IPoolInitializer__factory {
    static readonly abi: {
        inputs: {
            internalType: string;
            name: string;
            type: string;
        }[];
        name: string;
        outputs: {
            internalType: string;
            name: string;
            type: string;
        }[];
        stateMutability: string;
        type: string;
    }[];
    static createInterface(): IPoolInitializerInterface;
    static connect(address: string, signerOrProvider: Signer | Provider): IPoolInitializer;
}
