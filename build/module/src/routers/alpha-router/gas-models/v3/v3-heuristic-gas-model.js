import { BigNumber } from '@ethersproject/bignumber';
import { FeeAmount } from '@uniswap/v3-sdk';
import _ from 'lodash';
import { WRAPPED_NATIVE_CURRENCY } from '../../../..';
import { CurrencyAmount } from '../../../../util/amounts';
import { log } from '../../../../util/log';
import { IV3GasModelFactory, usdGasTokensByChain, } from '../gas-model';
// Constant cost for doing any swap regardless of pools.
const BASE_SWAP_COST = BigNumber.from(2000);
// Cost for crossing an initialized tick.
const COST_PER_INIT_TICK = BigNumber.from(31000);
// Cost for crossing an uninitialized tick.
const COST_PER_UNINIT_TICK = BigNumber.from(0);
// Constant per pool swap in the route.
const COST_PER_HOP = BigNumber.from(80000);
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
export class V3HeuristicGasModelFactory extends IV3GasModelFactory {
    constructor() {
        super();
    }
    async buildGasModel(chainId, gasPriceWei, poolProvider, token
    // this is the quoteToken
    ) {
        // If our quote token is WETH, we don't need to convert our gas use to be in terms
        // of the quote token in order to produce a gas adjusted amount.
        // We do return a gas use in USD however, so we still convert to usd.
        const nativeCurrency = WRAPPED_NATIVE_CURRENCY[chainId];
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
                log.info(`Unable to find ${nativeCurrency.symbol} pool with the quote token, ${token.symbol} to produce gas adjusted costs. Route will not account for gas.`);
                return {
                    gasEstimate: gasUse,
                    gasCostInToken: CurrencyAmount.fromRawAmount(token, 0),
                    gasCostInUSD: CurrencyAmount.fromRawAmount(usdToken, 0),
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
                log.info({
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
                log.info({
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
        const totalInitializedTicksCrossed = Math.max(1, _.sum(routeWithValidQuote.initializedTicksCrossedList));
        const totalHops = BigNumber.from(routeWithValidQuote.route.pools.length);
        const hopsGasUse = COST_PER_HOP.mul(totalHops);
        const tickGasUse = COST_PER_INIT_TICK.mul(totalInitializedTicksCrossed);
        const uninitializedTickGasUse = COST_PER_UNINIT_TICK.mul(0);
        const gasUse = BASE_SWAP_COST.add(hopsGasUse)
            .add(tickGasUse)
            .add(uninitializedTickGasUse);
        const totalGasCostWei = gasPriceWei.mul(gasUse);
        const wrappedCurrency = WRAPPED_NATIVE_CURRENCY[chainId];
        const gasCostNativeCurrency = CurrencyAmount.fromRawAmount(wrappedCurrency, totalGasCostWei.toString());
        return { gasCostNativeCurrency, gasUse };
    }
    async getHighestLiquidityNativePool(chainId, token, poolProvider) {
        const nativeCurrency = WRAPPED_NATIVE_CURRENCY[chainId];
        const nativePools = _([FeeAmount.HIGH, FeeAmount.MEDIUM, FeeAmount.LOW])
            .map((feeAmount) => {
            return [nativeCurrency, token, feeAmount];
        })
            .value();
        const poolAccessor = await poolProvider.getPools(nativePools);
        const pools = _([FeeAmount.HIGH, FeeAmount.MEDIUM, FeeAmount.LOW])
            .map((feeAmount) => {
            return poolAccessor.getPool(nativeCurrency, token, feeAmount);
        })
            .compact()
            .value();
        if (pools.length == 0) {
            log.error({ pools }, `Could not find a ${nativeCurrency.symbol} pool with ${token.symbol} for computing gas costs.`);
            return null;
        }
        const maxPool = _.maxBy(pools, (pool) => pool.liquidity);
        return maxPool;
    }
    async getHighestLiquidityUSDPool(chainId, poolProvider) {
        const usdTokens = usdGasTokensByChain[chainId];
        const wrappedCurrency = WRAPPED_NATIVE_CURRENCY[chainId];
        if (!usdTokens) {
            throw new Error(`Could not find a USD token for computing gas costs on ${chainId}`);
        }
        const usdPools = _([
            FeeAmount.HIGH,
            FeeAmount.MEDIUM,
            FeeAmount.LOW,
            FeeAmount.LOWEST,
        ])
            .flatMap((feeAmount) => {
            return _.map(usdTokens, (usdToken) => [wrappedCurrency, usdToken, feeAmount]);
        })
            .value();
        const poolAccessor = await poolProvider.getPools(usdPools);
        const pools = _([
            FeeAmount.HIGH,
            FeeAmount.MEDIUM,
            FeeAmount.LOW,
            FeeAmount.LOWEST,
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
            log.error({ pools }, `Could not find a USD/${wrappedCurrency.symbol} pool for computing gas costs.`);
            throw new Error(`Can't find USD/${wrappedCurrency.symbol} pool for computing gas costs.`);
        }
        const maxPool = _.maxBy(pools, (pool) => pool.liquidity);
        return maxPool;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidjMtaGV1cmlzdGljLWdhcy1tb2RlbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3NyYy9yb3V0ZXJzL2FscGhhLXJvdXRlci9nYXMtbW9kZWxzL3YzL3YzLWhldXJpc3RpYy1nYXMtbW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRXJELE9BQU8sRUFBRSxTQUFTLEVBQVEsTUFBTSxpQkFBaUIsQ0FBQztBQUNsRCxPQUFPLENBQUMsTUFBTSxRQUFRLENBQUM7QUFDdkIsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sYUFBYSxDQUFDO0FBR3RELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUMxRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFFM0MsT0FBTyxFQUVMLGtCQUFrQixFQUNsQixtQkFBbUIsR0FDcEIsTUFBTSxjQUFjLENBQUM7QUFFdEIsd0RBQXdEO0FBQ3hELE1BQU0sY0FBYyxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7QUFFNUMseUNBQXlDO0FBQ3pDLE1BQU0sa0JBQWtCLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUVqRCwyQ0FBMkM7QUFDM0MsTUFBTSxvQkFBb0IsR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBRS9DLHVDQUF1QztBQUN2QyxNQUFNLFlBQVksR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBRTNDOzs7Ozs7Ozs7Ozs7Ozs7OztHQWlCRztBQUNILE1BQU0sT0FBTywwQkFBMkIsU0FBUSxrQkFBa0I7SUFDaEU7UUFDRSxLQUFLLEVBQUUsQ0FBQztJQUNWLENBQUM7SUFFTSxLQUFLLENBQUMsYUFBYSxDQUN4QixPQUFnQixF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