"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2HeuristicGasModelFactory = void 0;
const bignumber_1 = require("@ethersproject/bignumber");
const lodash_1 = __importDefault(require("lodash"));
const util_1 = require("../../../../util");
const amounts_1 = require("../../../../util/amounts");
const gas_model_1 = require("../gas-model");
// Constant cost for doing any swap regardless of pools.
const BASE_SWAP_COST = bignumber_1.BigNumber.from(115000);
// Constant per extra hop in the route.
const COST_PER_EXTRA_HOP = bignumber_1.BigNumber.from(20000);
/**
 * Computes a gas estimate for a V2 swap using heuristics.
 * Considers number of hops in the route and the typical base cost for a swap.
 *
 * We compute gas estimates off-chain because
 *  1/ Calling eth_estimateGas for a swaps requires the caller to have
 *     the full balance token being swapped, and approvals.
 *  2/ Tracking gas used using a wrapper contract is not accurate with Multicall
 *     due to EIP-2929. We would have to make a request for every swap we wanted to estimate.
 *  3/ For V2 we simulate all our swaps off-chain so have no way to track gas used.
 *
 * Note, certain tokens e.g. rebasing/fee-on-transfer, may incur higher gas costs than
 * what we estimate here. This is because they run extra logic on token transfer.
 *
 * @export
 * @class V2HeuristicGasModelFactory
 */
class V2HeuristicGasModelFactory extends gas_model_1.IV2GasModelFactory {
    constructor() {
        super();
    }
    async buildGasModel(chainId, gasPriceWei, poolProvider, token) {
        if (token.equals(util_1.WRAPPED_NATIVE_CURRENCY[chainId])) {
            const usdPool = await this.getHighestLiquidityUSDPool(chainId, poolProvider);
            return {
                estimateGasCost: (routeWithValidQuote) => {
                    const { gasCostInEth, gasUse } = this.estimateGas(routeWithValidQuote, gasPriceWei, chainId);
                    const ethToken0 = usdPool.token0.address == util_1.WRAPPED_NATIVE_CURRENCY[chainId].address;
                    const ethTokenPrice = ethToken0
                        ? usdPool.token0Price
                        : usdPool.token1Price;
                    const gasCostInTermsOfUSD = ethTokenPrice.quote(gasCostInEth);
                    return {
                        gasEstimate: gasUse,
                        gasCostInToken: gasCostInEth,
                        gasCostInUSD: gasCostInTermsOfUSD,
                    };
                },
            };
        }
        // If the quote token is not WETH, we convert the gas cost to be in terms of the quote token.
        // We do this by getting the highest liquidity <token>/ETH pool.
        const ethPool = await this.getEthPool(chainId, token, poolProvider);
        const usdPool = await this.getHighestLiquidityUSDPool(chainId, poolProvider);
        return {
            estimateGasCost: (routeWithValidQuote) => {
                const usdToken = usdPool.token0.address == util_1.WRAPPED_NATIVE_CURRENCY[chainId].address
                    ? usdPool.token1
                    : usdPool.token0;
                const { gasCostInEth, gasUse } = this.estimateGas(routeWithValidQuote, gasPriceWei, chainId);
                if (!ethPool) {
                    util_1.log.info('Unable to find ETH pool with the quote token to produce gas adjusted costs. Route will not account for gas.');
                    return {
                        gasEstimate: gasUse,
                        gasCostInToken: amounts_1.CurrencyAmount.fromRawAmount(token, 0),
                        gasCostInUSD: amounts_1.CurrencyAmount.fromRawAmount(usdToken, 0),
                    };
                }
                const ethToken0 = ethPool.token0.address == util_1.WRAPPED_NATIVE_CURRENCY[chainId].address;
                const ethTokenPrice = ethToken0
                    ? ethPool.token0Price
                    : ethPool.token1Price;
                let gasCostInTermsOfQuoteToken;
                try {
                    gasCostInTermsOfQuoteToken = ethTokenPrice.quote(gasCostInEth);
                }
                catch (err) {
                    util_1.log.error({
                        ethTokenPriceBase: ethTokenPrice.baseCurrency,
                        ethTokenPriceQuote: ethTokenPrice.quoteCurrency,
                        gasCostInEth: gasCostInEth.currency,
                    }, 'Debug eth price token issue');
                    throw err;
                }
                const ethToken0USDPool = usdPool.token0.address == util_1.WRAPPED_NATIVE_CURRENCY[chainId].address;
                const ethTokenPriceUSDPool = ethToken0USDPool
                    ? usdPool.token0Price
                    : usdPool.token1Price;
                let gasCostInTermsOfUSD;
                try {
                    gasCostInTermsOfUSD = ethTokenPriceUSDPool.quote(gasCostInEth);
                }
                catch (err) {
                    util_1.log.error({
                        usdT1: usdPool.token0.symbol,
                        usdT2: usdPool.token1.symbol,
                        gasCostInEthToken: gasCostInEth.currency.symbol,
                    }, 'Failed to compute USD gas price');
                    throw err;
                }
                return {
                    gasEstimate: gasUse,
                    gasCostInToken: gasCostInTermsOfQuoteToken,
                    gasCostInUSD: gasCostInTermsOfUSD,
                };
            },
        };
    }
    estimateGas(routeWithValidQuote, gasPriceWei, chainId) {
        const hops = routeWithValidQuote.route.pairs.length;
        const gasUse = BASE_SWAP_COST.add(COST_PER_EXTRA_HOP.mul(hops - 1));
        const totalGasCostWei = gasPriceWei.mul(gasUse);
        const weth = util_1.WRAPPED_NATIVE_CURRENCY[chainId];
        const gasCostInEth = amounts_1.CurrencyAmount.fromRawAmount(weth, totalGasCostWei.toString());
        return { gasCostInEth, gasUse };
    }
    async getEthPool(chainId, token, poolProvider) {
        const weth = util_1.WRAPPED_NATIVE_CURRENCY[chainId];
        const poolAccessor = await poolProvider.getPools([[weth, token]]);
        const pool = poolAccessor.getPool(weth, token);
        if (!pool) {
            util_1.log.error({ weth, token }, `Could not find a WETH pool with ${token.symbol} for computing gas costs.`);
            return null;
        }
        return pool;
    }
    async getHighestLiquidityUSDPool(chainId, poolProvider) {
        const usdTokens = gas_model_1.usdGasTokensByChain[chainId];
        if (!usdTokens) {
            throw new Error(`Could not find a USD token for computing gas costs on ${chainId}`);
        }
        const usdPools = lodash_1.default.map(usdTokens, (usdToken) => [
            usdToken,
            util_1.WRAPPED_NATIVE_CURRENCY[chainId],
        ]);
        const poolAccessor = await poolProvider.getPools(usdPools);
        const pools = poolAccessor.getAllPools();
        if (pools.length == 0) {
            util_1.log.error({ pools }, `Could not find a USD/WETH pool for computing gas costs.`);
            throw new Error(`Can't find USD/WETH pool for computing gas costs.`);
        }
        const maxPool = lodash_1.default.maxBy(pools, (pool) => {
            if (pool.token0.equals(util_1.WRAPPED_NATIVE_CURRENCY[chainId])) {
                return parseFloat(pool.reserve0.toSignificant(2));
            }
            else {
                return parseFloat(pool.reserve1.toSignificant(2));
            }
        });
        return maxPool;
    }
}
exports.V2HeuristicGasModelFactory = V2HeuristicGasModelFactory;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidjItaGV1cmlzdGljLWdhcy1tb2RlbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3NyYy9yb3V0ZXJzL2FscGhhLXJvdXRlci9nYXMtbW9kZWxzL3YyL3YyLWhldXJpc3RpYy1nYXMtbW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsd0RBQXFEO0FBR3JELG9EQUF1QjtBQUV2QiwyQ0FBeUU7QUFDekUsc0RBQTBEO0FBRTFELDRDQUlzQjtBQUV0Qix3REFBd0Q7QUFDeEQsTUFBTSxjQUFjLEdBQUcscUJBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7QUFFOUMsdUNBQXVDO0FBQ3ZDLE1BQU0sa0JBQWtCLEdBQUcscUJBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7QUFFakQ7Ozs7Ozs7Ozs7Ozs7Ozs7R0FnQkc7QUFDSCxNQUFhLDBCQUEyQixTQUFRLDhCQUFrQjtJQUNoRTtRQUNFLEtBQUssRUFBRSxDQUFDO0lBQ1YsQ0FBQztJQUVNLEtBQUssQ0FBQyxhQUFhLENBQ3hCLE9BQWdCLEVBQ2hCLFdBQXNCLEVBQ3RCLFlBQTZCLEVBQzdCLEtBQVk7UUFFWixJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsOEJBQXVCLENBQUMsT0FBTyxDQUFFLENBQUMsRUFBRTtZQUNuRCxNQUFNLE9BQU8sR0FBUyxNQUFNLElBQUksQ0FBQywwQkFBMEIsQ0FDekQsT0FBTyxFQUNQLFlBQVksQ0FDYixDQUFDO1lBRUYsT0FBTztnQkFDTCxlQUFlLEVBQUUsQ0FBQyxtQkFBMEMsRUFBRSxFQUFFO29CQUM5RCxNQUFNLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQy9DLG1CQUFtQixFQUNuQixXQUFXLEVBQ1gsT0FBTyxDQUNSLENBQUM7b0JBRUYsTUFBTSxTQUFTLEdBQ2IsT0FBTyxDQUFDLE1BQU0sQ0FBQyxPQUFPLElBQUksOEJBQXVC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