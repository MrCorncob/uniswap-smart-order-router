import { Provider } from "@ethersproject/providers";
import { Signer } from "ethers";
import type { IUniswapV2Callee, IUniswapV2CalleeInterface } from "../IUniswapV2Callee";
export declare class IUniswapV2Callee__factory {
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
    static createInterface(): IUniswapV2CalleeInterface;
    static connect(address: string, signerOrProvider: Signer | Provider): IUniswapV2Callee;
}
