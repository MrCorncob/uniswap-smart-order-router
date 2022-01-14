import { Provider } from "@ethersproject/providers";
import { Signer } from "ethers";
import type { IMulticall, IMulticallInterface } from "../IMulticall";
export declare class IMulticall__factory {
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
    static createInterface(): IMulticallInterface;
    static connect(address: string, signerOrProvider: Signer | Provider): IMulticall;
}
