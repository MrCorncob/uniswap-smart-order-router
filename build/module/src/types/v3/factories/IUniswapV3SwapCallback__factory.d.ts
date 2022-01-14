import { Provider } from "@ethersproject/providers";
import { Signer } from "ethers";
import type { IUniswapV3SwapCallback, IUniswapV3SwapCallbackInterface } from "../IUniswapV3SwapCallback";
export declare class IUniswapV3SwapCallback__factory {
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
    static createInterface(): IUniswapV3SwapCallbackInterface;
    static connect(address: string, signerOrProvider: Signer | Provider): IUniswapV3SwapCallback;
}
