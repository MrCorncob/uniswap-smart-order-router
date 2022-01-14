import { Provider } from "@ethersproject/providers";
import { Signer } from "ethers";
import type { IUniswapV2ERC20, IUniswapV2ERC20Interface } from "../IUniswapV2ERC20";
export declare class IUniswapV2ERC20__factory {
    static readonly abi: ({
        anonymous: boolean;
        inputs: {
            indexed: boolean;
            internalType: string;
            name: string;
            type: string;
        }[];
        name: string;
        type: string;
        constant?: undefined;
        outputs?: undefined;
        payable?: undefined;
        stateMutability?: undefined;
    } | {
        constant: boolean;
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
        payable: boolean;
        stateMutability: string;
        type: string;
        anonymous?: undefined;
    })[];
    static createInterface(): IUniswapV2ERC20Interface;
    static connect(address: string, signerOrProvider: Signer | Provider): IUniswapV2ERC20;
}
