import { BigNumber } from 'ethers';
export declare type GasPrice = {
    gasPriceWei: BigNumber;
};
/**
 * Provider for getting gas prices.
 */
export declare abstract class IGasPriceProvider {
    abstract getGasPrice(): Promise<GasPrice>;
}
