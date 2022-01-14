import { BigNumber } from '@ethersproject/bignumber';
import _ from 'lodash';
import { log, WRAPPED_NATIVE_CURRENCY } from '../../../../util';
import { CurrencyAmount } from '../../../../util/amounts';
import { IV2GasModelFactory, usdGasTokensByChain, } from '../gas-model';
// Constant cost for doing any swap regardless of pools.
const BASE_SWAP_COST = BigNumber.from(115000);
// Constant per extra hop in the route.
const COST_PER_EXTRA_HOP = BigNumber.from(20000);
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
export class V2HeuristicGasModelFactory extends IV2GasModelFactory {
    constructor() {
        super();
    }
    async buildGasModel(chainId, gasPriceWei, poolProvider, token) {
        if (token.equals(WRAPPED_NATIVE_CURRENCY[chainId])) {
            const usdPool = await this.getHighestLiquidityUSDPool(chainId, poolProvider);
            return {
                estimateGasCost: (routeWithValidQuote) => {
                    const { gasCostInEth, gasUse } = this.estimateGas(routeWithValidQuote, gasPriceWei, chainId);
                    const ethToken0 = usdPool.token0.address == WRAPPED_NATIVE_CURRENCY[chainId].address;
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
                const usdToken = usdPool.token0.address == WRAPPED_NATIVE_CURRENCY[chainId].address
                    ? usdPool.token1
                    : usdPool.token0;
                const { gasCostInEth, gasUse } = this.estimateGas(routeWithValidQuote, gasPriceWei, chainId);
                if (!ethPool) {
                    log.info('Unable to find ETH pool with the quote token to produce gas adjusted costs. Route will not account for gas.');
                    return {
                        gasEstimate: gasUse,
                        gasCostInToken: CurrencyAmount.fromRawAmount(token, 0),
                        gasCostInUSD: CurrencyAmount.fromRawAmount(usdToken, 0),
                    };
                }
                const ethToken0 = ethPool.token0.address == WRAPPED_NATIVE_CURRENCY[chainId].address;
                const ethTokenPrice = ethToken0
                    ? ethPool.token0Price
                    : ethPool.token1Price;
                let gasCostInTermsOfQuoteToken;
                try {
                    gasCostInTermsOfQuoteToken = ethTokenPrice.quote(gasCostInEth);
                }
                catch (err) {
                    log.error({
                        ethTokenPriceBase: ethTokenPrice.baseCurrency,
                        ethTokenPriceQuote: ethTokenPrice.quoteCurrency,
                        gasCostInEth: gasCostInEth.currency,
                    }, 'Debug eth price token issue');
                    throw err;
                }
                const ethToken0USDPool = usdPool.token0.address == WRAPPED_NATIVE_CURRENCY[chainId].address;
                const ethTokenPriceUSDPool = ethToken0USDPool
                    ? usdPool.token0Price
                    : usdPool.token1Price;
                let gasCostInTermsOfUSD;
                try {
                    gasCostInTermsOfUSD = ethTokenPriceUSDPool.quote(gasCostInEth);
                }
                catch (err) {
                    log.error({
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
        const weth = WRAPPED_NATIVE_CURRENCY[chainId];
        const gasCostInEth = CurrencyAmount.fromRawAmount(weth, totalGasCostWei.toString());
        return { gasCostInEth, gasUse };
    }
    async getEthPool(chainId, token, poolProvider) {
        const weth = WRAPPED_NATIVE_CURRENCY[chainId];
        const poolAccessor = await poolProvider.getPools([[weth, token]]);
        const pool = poolAccessor.getPool(weth, token);
        if (!pool) {
            log.error({ weth, token }, `Could not find a WETH pool with ${token.symbol} for computing gas costs.`);
            return null;
        }
        return pool;
    }
    async getHighestLiquidityUSDPool(chainId, poolProvider) {
        const usdTokens = usdGasTokensByChain[chainId];
        if (!usdTokens) {
            throw new Error(`Could not find a USD token for computing gas costs on ${chainId}`);
        }
        const usdPools = _.map(usdTokens, (usdToken) => [
            usdToken,
            WRAPPED_NATIVE_CURRENCY[chainId],
        ]);
        const poolAccessor = await poolProvider.getPools(usdPools);
        const pools = poolAccessor.getAllPools();
        if (pools.length == 0) {
            log.error({ pools }, `Could not find a USD/WETH pool for computing gas costs.`);
            throw new Error(`Can't find USD/WETH pool for computing gas costs.`);
        }
        const maxPool = _.maxBy(pools, (pool) => {
            if (pool.token0.equals(WRAPPED_NATIVE_CURRENCY[chainId])) {
                return parseFloat(pool.reserve0.toSignificant(2));
            }
            else {
                return parseFloat(pool.reserve1.toSignificant(2));
            }
        });
        return maxPool;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidjItaGV1cmlzdGljLWdhcy1tb2RlbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3NyYy9yb3V0ZXJzL2FscGhhLXJvdXRlci9nYXMtbW9kZWxzL3YyL3YyLWhldXJpc3RpYy1nYXMtbW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBR3JELE9BQU8sQ0FBQyxNQUFNLFFBQVEsQ0FBQztBQUV2QixPQUFPLEVBQVcsR0FBRyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDekUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRTFELE9BQU8sRUFFTCxrQkFBa0IsRUFDbEIsbUJBQW1CLEdBQ3BCLE1BQU0sY0FBYyxDQUFDO0FBRXRCLHdEQUF3RDtBQUN4RCxNQUFNLGNBQWMsR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBRTlDLHVDQUF1QztBQUN2QyxNQUFNLGtCQUFrQixHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7QUFFakQ7Ozs7Ozs7Ozs7Ozs7Ozs7R0FnQkc7QUFDSCxNQUFNLE9BQU8sMEJBQTJCLFNBQVEsa0JBQWtCO0lBQ2hFO1FBQ0UsS0FBSyxFQUFFLENBQUM7SUFDVixDQUFDO0lBRU0sS0FBSyxDQUFDLGFBQWEsQ0FDeEIsT0FBZ0IsRUFDaEIsV0FBc0IsRUFDdEIsWUFBNkIsRUFDN0IsS0FBWTtRQUVaLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyx1QkFBdUIsQ0FBQyxPQUFPLENBQUUsQ0FBQyxFQUFFO1lBQ25ELE1BQU0sT0FBTyxHQUFTLE1BQU0sSUFBSSxDQUFDLDBCQUEwQixDQUN6RCxPQUFPLEVBQ1AsWUFBWSxDQUNiLENBQUM7WUFFRixPQUFPO2dCQUNMLGVBQWUsRUFBRSxDQUFDLG1CQUEwQyxFQUFFLEVB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