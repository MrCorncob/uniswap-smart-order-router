import { providers } from 'ethers';
import { GasPrice, IGasPriceProvider } from './gas-price-provider';
export declare class LegacyGasPriceProvider extends IGasPriceProvider {
    protected provider: providers.JsonRpcProvider;
    constructor(provider: providers.JsonRpcProvider);
    getGasPrice(): Promise<GasPrice>;
}
