import { Provider } from "@ethersproject/providers";
import { Signer } from "ethers";
import type { IUniswapV2Factory, IUniswapV2FactoryInterface } from "../IUniswapV2Factory";
export declare class IUniswapV2Factory__factory {
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
        outputs?: undefined;
        stateMutability?: undefined;
    } | {
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
        anonymous?: undefined;
    })[];
    static createInterface(): IUniswapV2FactoryInterface;
    static connect(address: string, signerOrProvider: Signer | Provider): IUniswapV2Factory;
}
