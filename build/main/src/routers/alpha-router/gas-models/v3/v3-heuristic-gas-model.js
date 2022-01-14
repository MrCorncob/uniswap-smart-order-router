"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.V3HeuristicGasModelFactory = void 0;
const bignumber_1 = require("@ethersproject/bignumber");
const v3_sdk_1 = require("@uniswap/v3-sdk");
const lodash_1 = __importDefault(require("lodash"));
const __1 = require("../../../..");
const amounts_1 = require("../../../../util/amounts");
const log_1 = require("../../../../util/log");
const gas_model_1 = require("../gas-model");
// Constant cost for doing any swap regardless of pools.
const BASE_SWAP_COST = bignumber_1.BigNumber.from(2000);
// Cost for crossing an initialized tick.
const COST_PER_INIT_TICK = bignumber_1.BigNumber.from(31000);
// Cost for crossing an uninitialized tick.
const COST_PER_UNINIT_TICK = bignumber_1.BigNumber.from(0);
// Constant per pool swap in the route.
const COST_PER_HOP = bignumber_1.BigNumber.from(80000);
/**
 * Computes a gas estimate for a V3 swap using heuristics.
 * Considers number of hops in the route, number of ticks crossed
 * and the typical base cost for a swap.
 *
 * We get the number of ticks crossed in a swap from the QuoterV2
 * contract.
 *
 * We compute gas estimates off-chain because
 *  1/ Calling eth_estimateGas for a swaps requires the caller to have
 *     the full balance token being swapped, and approvals.
 *  2/ Tracking gas used using a wrapper contract is not accurate with Multicall
 *     due to EIP-2929. We would have to make a request for every swap we wanted to estimate.
 *  3/ For V2 we simulate all our swaps off-chain so have no way to track gas used.
 *
 * @export
 * @class V3HeuristicGasModelFactory
 */
class V3HeuristicGasModelFactory extends gas_model_1.IV3GasModelFactory {
    constructor() {
        super();
    }
    async buildGasModel(chainId, gasPriceWei, poolProvider, token
    // this is the quoteToken
    ) {
        // If our quote token is WETH, we don't need to convert our gas use to be in terms
        // of the quote token in order to produce a gas adjusted amount.
        // We do return a gas use in USD however, so we still convert to usd.
        const nativeCurrency = __1.WRAPPED_NATIVE_CURRENCY[chainId];
        if (token.equals(nativeCurrency)) {
            const usdPool = await this.getHighestLiquidityUSDPool(chainId, poolProvider);
            const estimateGasCost = (routeWithValidQuote) => {
                const { gasCostNativeCurrency, gasUse } = this.estimateGas(routeWithValidQuote, gasPriceWei, chainId);
                const token0 = usdPool.token0.address == nativeCurrency.address;
                const nativeTokenPrice = token0
                    ? usdPool.token0Price
                    : usdPool.token1Price;
                const gasCostInTermsOfUSD = nativeTokenPrice.quote(gasCostNativeCurrency);
                return {
                    gasEstimate: gasUse,
                    gasCostInToken: gasCostNativeCurrency,
                    gasCostInUSD: gasCostInTermsOfUSD,
                };
            };
            return {
                estimateGasCost,
            };
        }
        // If the quote token is not in the native currency, we convert the gas cost to be in terms of the quote token.
        // We do this by getting the highest liquidity <quoteToken>/<nativeCurrency> pool. eg. <quoteToken>/ETH pool.
        const nativePool = await this.getHighestLiquidityNativePool(chainId, token, poolProvider);
        const usdPool = await this.getHighestLiquidityUSDPool(chainId, poolProvider);
        const usdToken = usdPool.token0.address == nativeCurrency.address
            ? usdPool.token1
            : usdPool.token0;
        const estimateGasCost = (routeWithValidQuote) => {
            const { gasCostNativeCurrency, gasUse } = this.estimateGas(routeWithValidQuote, gasPriceWei, chainId);
            if (!nativePool) {
                log_1.log.info(`Unable to find ${nativeCurrency.symbol} pool with the quote token, ${token.symbol} to produce gas adjusted costs. Route will not account for gas.`);
                return {
                    gasEstimate: gasUse,
                    gasCostInToken: amounts_1.CurrencyAmount.fromRawAmount(token, 0),
                    gasCostInUSD: amounts_1.CurrencyAmount.fromRawAmount(usdToken, 0),
                };
            }
            const token0 = nativePool.token0.address == nativeCurrency.address;
            // returns mid price in terms of the native currency (the ratio of quoteToken/nativeToken)
            const nativeTokenPrice = token0
                ? nativePool.token0Price
                : nativePool.token1Price;
            let gasCostInTermsOfQuoteToken;
            try {
                // native token is base currency
                gasCostInTermsOfQuoteToken = nativeTokenPrice.quote(gasCostNativeCurrency);
            }
            catch (err) {
                log_1.log.info({
                    nativeTokenPriceBase: nativeTokenPrice.baseCurrency,
                    nativeTokenPriceQuote: nativeTokenPrice.quoteCurrency,
                    gasCostInEth: gasCostNativeCurrency.currency,
                }, 'Debug eth price token issue');
                throw err;
            }
            // true if token0 is the native currency
            const token0USDPool = usdPool.token0.address == nativeCurrency.address;
            // gets the mid price of the pool in terms of the native token
            const nativeTokenPriceUSDPool = token0USDPool
                ? usdPool.token0Price
                : usdPool.token1Price;
            let gasCostInTermsOfUSD;
            try {
                gasCostInTermsOfUSD = nativeTokenPriceUSDPool.quote(gasCostNativeCurrency);
            }
            catch (err) {
                log_1.log.info({
                    usdT1: usdPool.token0.symbol,
                    usdT2: usdPool.token1.symbol,
                    gasCostInNativeToken: gasCostNativeCurrency.currency.symbol,
                }, 'Failed to compute USD gas price');
                throw err;
            }
            return {
                gasEstimate: gasUse,
                gasCostInToken: gasCostInTermsOfQuoteToken,
                gasCostInUSD: gasCostInTermsOfUSD,
            };
        };
        return {
            estimateGasCost: estimateGasCost.bind(this),
        };
    }
    estimateGas(routeWithValidQuote, gasPriceWei, chainId) {
        const totalInitializedTicksCrossed = Math.max(1, lodash_1.default.sum(routeWithValidQuote.initializedTicksCrossedList));
        const totalHops = bignumber_1.BigNumber.from(routeWithValidQuote.route.pools.length);
        const hopsGasUse = COST_PER_HOP.mul(totalHops);
        const tickGasUse = COST_PER_INIT_TICK.mul(totalInitializedTicksCrossed);
        const uninitializedTickGasUse = COST_PER_UNINIT_TICK.mul(0);
        const gasUse = BASE_SWAP_COST.add(hopsGasUse)
            .add(tickGasUse)
            .add(uninitializedTickGasUse);
        const totalGasCostWei = gasPriceWei.mul(gasUse);
        const wrappedCurrency = __1.WRAPPED_NATIVE_CURRENCY[chainId];
        const gasCostNativeCurrency = amounts_1.CurrencyAmount.fromRawAmount(wrappedCurrency, totalGasCostWei.toString());
        return { gasCostNativeCurrency, gasUse };
    }
    async getHighestLiquidityNativePool(chainId, token, poolProvider) {
        const nativeCurrency = __1.WRAPPED_NATIVE_CURRENCY[chainId];
        const nativePools = (0, lodash_1.default)([v3_sdk_1.FeeAmount.HIGH, v3_sdk_1.FeeAmount.MEDIUM, v3_sdk_1.FeeAmount.LOW])
            .map((feeAmount) => {
            return [nativeCurrency, token, feeAmount];
        })
            .value();
        const poolAccessor = await poolProvider.getPools(nativePools);
        const pools = (0, lodash_1.default)([v3_sdk_1.FeeAmount.HIGH, v3_sdk_1.FeeAmount.MEDIUM, v3_sdk_1.FeeAmount.LOW])
            .map((feeAmount) => {
            return poolAccessor.getPool(nativeCurrency, token, feeAmount);
        })
            .compact()
            .value();
        if (pools.length == 0) {
            log_1.log.error({ pools }, `Could not find a ${nativeCurrency.symbol} pool with ${token.symbol} for computing gas costs.`);
            return null;
        }
        const maxPool = lodash_1.default.maxBy(pools, (pool) => pool.liquidity);
        return maxPool;
    }
    async getHighestLiquidityUSDPool(chainId, poolProvider) {
        const usdTokens = gas_model_1.usdGasTokensByChain[chainId];
        const wrappedCurrency = __1.WRAPPED_NATIVE_CURRENCY[chainId];
        if (!usdTokens) {
            throw new Error(`Could not find a USD token for computing gas costs on ${chainId}`);
        }
        const usdPools = (0, lodash_1.default)([
            v3_sdk_1.FeeAmount.HIGH,
            v3_sdk_1.FeeAmount.MEDIUM,
            v3_sdk_1.FeeAmount.LOW,
            v3_sdk_1.FeeAmount.LOWEST,
        ])
            .flatMap((feeAmount) => {
            return lodash_1.default.map(usdTokens, (usdToken) => [wrappedCurrency, usdToken, feeAmount]);
        })
            .value();
        const poolAccessor = await poolProvider.getPools(usdPools);
        const pools = (0, lodash_1.default)([
            v3_sdk_1.FeeAmount.HIGH,
            v3_sdk_1.FeeAmount.MEDIUM,
            v3_sdk_1.FeeAmount.LOW,
            v3_sdk_1.FeeAmount.LOWEST,
        ])
            .flatMap((feeAmount) => {
            const pools = [];
            for (const usdToken of usdTokens) {
                const pool = poolAccessor.getPool(wrappedCurrency, usdToken, feeAmount);
                if (pool) {
                    pools.push(pool);
                }
            }
            return pools;
        })
            .compact()
            .value();
        if (pools.length == 0) {
            log_1.log.error({ pools }, `Could not find a USD/${wrappedCurrency.symbol} pool for computing gas costs.`);
            throw new Error(`Can't find USD/${wrappedCurrency.symbol} pool for computing gas costs.`);
        }
        const maxPool = lodash_1.default.maxBy(pools, (pool) => pool.liquidity);
        return maxPool;
    }
}
exports.V3HeuristicGasModelFactory = V3HeuristicGasModelFactory;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidjMtaGV1cmlzdGljLWdhcy1tb2RlbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3NyYy9yb3V0ZXJzL2FscGhhLXJvdXRlci9nYXMtbW9kZWxzL3YzL3YzLWhldXJpc3RpYy1nYXMtbW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsd0RBQXFEO0FBRXJELDRDQUFrRDtBQUNsRCxvREFBdUI7QUFDdkIsbUNBQXNEO0FBR3RELHNEQUEwRDtBQUMxRCw4Q0FBMkM7QUFFM0MsNENBSXNCO0FBRXRCLHdEQUF3RDtBQUN4RCxNQUFNLGNBQWMsR0FBRyxxQkFBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUU1Qyx5Q0FBeUM7QUFDekMsTUFBTSxrQkFBa0IsR0FBRyxxQkFBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUVqRCwyQ0FBMkM7QUFDM0MsTUFBTSxvQkFBb0IsR0FBRyxxQkFBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUUvQyx1Q0FBdUM7QUFDdkMsTUFBTSxZQUFZLEdBQUcscUJBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7QUFFM0M7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBaUJHO0FBQ0gsTUFBYSwwQkFBMkIsU0FBUSw4QkFBa0I7SUFDaEU7UUFDRSxLQUFLLEVBQUUsQ0FBQztJQUNWLENBQUM7SUFFTSxLQUFLLENBQUMsYUFBYSxDQUN4QixPQUFnQixFQUNoQixXQUFzQixFQUN0QixZQUE2QixFQUM3QixLQUFZO0lBQ1oseUJBQXlCOztRQUV6QixrRkFBa0Y7UUFDbEYsZ0VBQWdFO1FBQ2hFLHFFQUFxRTtRQUVyRSxNQUFNLGNBQWMsR0FBRywyQkFBdUIsQ0FBQyxPQUFPLENBQUUsQ0FBQztRQUN6RCxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLEVBQUU7WUFDaEMsTUFBTSxPQUFPLEdBQVMsTUFBTSxJ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