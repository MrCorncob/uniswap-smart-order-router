import { SwapRouter, Trade } from '@uniswap/router-sdk';
import { TradeType } from '@uniswap/sdk-core';
import { FeeAmount, Route } from '@uniswap/v3-sdk';
import { BigNumber, logger } from 'ethers';
import _ from 'lodash';
import { DAI_MAINNET, USDC_MAINNET, } from '../../providers/token-provider';
import { CurrencyAmount } from '../../util/amounts';
import { log } from '../../util/log';
import { routeToString } from '../../util/routes';
import { V3RouteWithValidQuote } from '../alpha-router';
import { V3Route } from '../router';
import { ADDITIONAL_BASES, BASES_TO_CHECK_TRADES_AGAINST, CUSTOM_BASES, } from './bases';
// Interface defaults to 2.
const MAX_HOPS = 2;
/**
 * Replicates the router implemented in the V3 interface.
 * Code is mostly a copy from https://github.com/Uniswap/uniswap-interface/blob/0190b5a408c13016c87e1030ffc59326c085f389/src/hooks/useBestV3Trade.ts#L22-L23
 * with React/Redux hooks removed, and refactoring to allow re-use in other routers.
 */
export class LegacyRouter {
    constructor({ chainId, multicall2Provider, poolProvider, quoteProvider, tokenProvider, }) {
        this.chainId = chainId;
        this.multicall2Provider = multicall2Provider;
        this.poolProvider = poolProvider;
        this.quoteProvider = quoteProvider;
        this.tokenProvider = tokenProvider;
    }
    async route(amount, quoteCurrency, swapType, swapConfig, partialRoutingConfig) {
        if (swapType == TradeType.EXACT_INPUT) {
            return this.routeExactIn(amount.currency, quoteCurrency, amount, swapConfig, partialRoutingConfig);
        }
        return this.routeExactOut(quoteCurrency, amount.currency, amount, swapConfig, partialRoutingConfig);
    }
    async routeExactIn(currencyIn, currencyOut, amountIn, swapConfig, routingConfig) {
        const tokenIn = currencyIn.wrapped;
        const tokenOut = currencyOut.wrapped;
        const routes = await this.getAllRoutes(tokenIn, tokenOut, routingConfig);
        const routeQuote = await this.findBestRouteExactIn(amountIn, tokenOut, routes, routingConfig);
        if (!routeQuote) {
            return null;
        }
        const trade = this.buildTrade(currencyIn, currencyOut, TradeType.EXACT_INPUT, routeQuote);
        return {
            quote: routeQuote.quote,
            quoteGasAdjusted: routeQuote.quote,
            route: [routeQuote],
            estimatedGasUsed: BigNumber.from(0),
            estimatedGasUsedQuoteToken: CurrencyAmount.fromFractionalAmount(tokenOut, 0, 1),
            estimatedGasUsedUSD: CurrencyAmount.fromFractionalAmount(DAI_MAINNET, 0, 1),
            gasPriceWei: BigNumber.from(0),
            trade,
            methodParameters: swapConfig
                ? this.buildMethodParameters(trade, swapConfig)
                : undefined,
            blockNumber: BigNumber.from(0),
        };
    }
    async routeExactOut(currencyIn, currencyOut, amountOut, swapConfig, routingConfig) {
        const tokenIn = currencyIn.wrapped;
        const tokenOut = currencyOut.wrapped;
        const routes = await this.getAllRoutes(tokenIn, tokenOut, routingConfig);
        const routeQuote = await this.findBestRouteExactOut(amountOut, tokenIn, routes, routingConfig);
        if (!routeQuote) {
            return null;
        }
        const trade = this.buildTrade(currencyIn, currencyOut, TradeType.EXACT_OUTPUT, routeQuote);
        return {
            quote: routeQuote.quote,
            quoteGasAdjusted: routeQuote.quote,
            route: [routeQuote],
            estimatedGasUsed: BigNumber.from(0),
            estimatedGasUsedQuoteToken: CurrencyAmount.fromFractionalAmount(tokenIn, 0, 1),
            estimatedGasUsedUSD: CurrencyAmount.fromFractionalAmount(DAI_MAINNET, 0, 1),
            gasPriceWei: BigNumber.from(0),
            trade,
            methodParameters: swapConfig
                ? this.buildMethodParameters(trade, swapConfig)
                : undefined,
            blockNumber: BigNumber.from(0),
        };
    }
    async findBestRouteExactIn(amountIn, tokenOut, routes, routingConfig) {
        const { routesWithQuotes: quotesRaw } = await this.quoteProvider.getQuotesManyExactIn([amountIn], routes, {
            blockNumber: routingConfig === null || routingConfig === void 0 ? void 0 : routingConfig.blockNumber,
        });
        const quotes100Percent = _.map(quotesRaw, ([route, quotes]) => { var _a, _b; return `${routeToString(route)} : ${(_b = (_a = quotes[0]) === null || _a === void 0 ? void 0 : _a.quote) === null || _b === void 0 ? void 0 : _b.toString()}`; });
        log.info({ quotes100Percent }, '100% Quotes');
        const bestQuote = await this.getBestQuote(routes, quotesRaw, tokenOut, TradeType.EXACT_INPUT);
        return bestQuote;
    }
    async findBestRouteExactOut(amountOut, tokenIn, routes, routingConfig) {
        const { routesWithQuotes: quotesRaw } = await this.quoteProvider.getQuotesManyExactOut([amountOut], routes, {
            blockNumber: routingConfig === null || routingConfig === void 0 ? void 0 : routingConfig.blockNumber,
        });
        const bestQuote = await this.getBestQuote(routes, quotesRaw, tokenIn, TradeType.EXACT_OUTPUT);
        return bestQuote;
    }
    async getBestQuote(routes, quotesRaw, quoteToken, routeType) {
        log.debug(`Got ${_.filter(quotesRaw, ([_, quotes]) => !!quotes[0]).length} valid quotes from ${routes.length} possible routes.`);
        const routeQuotesRaw = [];
        for (let i = 0; i < quotesRaw.length; i++) {
            const [route, quotes] = quotesRaw[i];
            const { quote, amount } = quotes[0];
            if (!quote) {
                logger.debug(`No quote for ${routeToString(route)}`);
                continue;
            }
            routeQuotesRaw.push({ route, quote, amount });
        }
        if (routeQuotesRaw.length == 0) {
            return null;
        }
        routeQuotesRaw.sort((routeQuoteA, routeQuoteB) => {
            if (routeType == TradeType.EXACT_INPUT) {
                return routeQuoteA.quote.gt(routeQuoteB.quote) ? -1 : 1;
            }
            else {
                return routeQuoteA.quote.lt(routeQuoteB.quote) ? -1 : 1;
            }
        });
        const routeQuotes = _.map(routeQuotesRaw, ({ route, quote, amount }) => {
            return new V3RouteWithValidQuote({
                route,
                rawQuote: quote,
                amount,
                percent: 100,
                gasModel: {
                    estimateGasCost: () => ({
                        gasCostInToken: CurrencyAmount.fromRawAmount(quoteToken, 0),
                        gasCostInUSD: CurrencyAmount.fromRawAmount(USDC_MAINNET, 0),
                        gasEstimate: BigNumber.from(0),
                    }),
                },
                sqrtPriceX96AfterList: [],
                initializedTicksCrossedList: [],
                quoterGasEstimate: BigNumber.from(0),
                tradeType: routeType,
                quoteToken,
                v3PoolProvider: this.poolProvider,
            });
        });
        for (let rq of routeQuotes) {
            log.debug(`Quote: ${rq.amount.toFixed(2)} Route: ${routeToString(rq.route)}`);
        }
        return routeQuotes[0];
    }
    async getAllRoutes(tokenIn, tokenOut, routingConfig) {
        const tokenPairs = await this.getAllPossiblePairings(tokenIn, tokenOut);
        const poolAccessor = await this.poolProvider.getPools(tokenPairs, {
            blockNumber: routingConfig === null || routingConfig === void 0 ? void 0 : routingConfig.blockNumber,
        });
        const pools = poolAccessor.getAllPools();
        const routes = this.computeAllRoutes(tokenIn, tokenOut, pools, this.chainId, [], [], tokenIn, MAX_HOPS);
        log.info({ routes: _.map(routes, routeToString) }, `Computed ${routes.length} possible routes.`);
        return routes;
    }
    async getAllPossiblePairings(tokenIn, tokenOut) {
        var _a, _b, _c, _d, _e;
        const common = (_a = BASES_TO_CHECK_TRADES_AGAINST(this.tokenProvider)[this.chainId]) !== null && _a !== void 0 ? _a : [];
        const additionalA = (_c = (_b = (await ADDITIONAL_BASES(this.tokenProvider))[this.chainId]) === null || _b === void 0 ? void 0 : _b[tokenIn.address]) !== null && _c !== void 0 ? _c : [];
        const additionalB = (_e = (_d = (await ADDITIONAL_BASES(this.tokenProvider))[this.chainId]) === null || _d === void 0 ? void 0 : _d[tokenOut.address]) !== null && _e !== void 0 ? _e : [];
        const bases = [...common, ...additionalA, ...additionalB];
        const basePairs = _.flatMap(bases, (base) => bases.map((otherBase) => [base, otherBase]));
        const customBases = (await CUSTOM_BASES(this.tokenProvider))[this.chainId];
        const allPairs = _([
            // the direct pair
            [tokenIn, tokenOut],
            // token A against all bases
            ...bases.map((base) => [tokenIn, base]),
            // token B against all bases
            ...bases.map((base) => [tokenOut, base]),
            // each base against all bases
            ...basePairs,
        ])
            .filter((tokens) => Boolean(tokens[0] && tokens[1]))
            .filter(([tokenA, tokenB]) => tokenA.address !== tokenB.address && !tokenA.equals(tokenB))
            .filter(([tokenA, tokenB]) => {
            const customBasesA = customBases === null || customBases === void 0 ? void 0 : customBases[tokenA.address];
            const customBasesB = customBases === null || customBases === void 0 ? void 0 : customBases[tokenB.address];
            if (!customBasesA && !customBasesB)
                return true;
            if (customBasesA && !customBasesA.find((base) => tokenB.equals(base)))
                return false;
            if (customBasesB && !customBasesB.find((base) => tokenA.equals(base)))
                return false;
            return true;
        })
            .flatMap(([tokenA, tokenB]) => {
            return [
                [tokenA, tokenB, FeeAmount.LOW],
                [tokenA, tokenB, FeeAmount.MEDIUM],
                [tokenA, tokenB, FeeAmount.HIGH],
            ];
        })
            .value();
        return allPairs;
    }
    computeAllRoutes(tokenIn, tokenOut, pools, chainId, currentPath = [], allPaths = [], startTokenIn = tokenIn, maxHops = 2) {
        for (const pool of pools) {
            if (currentPath.indexOf(pool) !== -1 || !pool.involvesToken(tokenIn))
                continue;
            const outputToken = pool.token0.equals(tokenIn)
                ? pool.token1
                : pool.token0;
            if (outputToken.equals(tokenOut)) {
                allPaths.push(new V3Route([...currentPath, pool], startTokenIn, tokenOut));
            }
            else if (maxHops > 1) {
                this.computeAllRoutes(outputToken, tokenOut, pools, chainId, [...currentPath, pool], allPaths, startTokenIn, maxHops - 1);
            }
        }
        return allPaths;
    }
    buildTrade(tokenInCurrency, tokenOutCurrency, tradeType, routeAmount) {
        const { route, amount, quote } = routeAmount;
        // The route, amount and quote are all in terms of wrapped tokens.
        // When constructing the Trade object the inputAmount/outputAmount must
        // use native currencies if necessary. This is so that the Trade knows to wrap/unwrap.
        if (tradeType == TradeType.EXACT_INPUT) {
            const amountCurrency = CurrencyAmount.fromFractionalAmount(tokenInCurrency, amount.numerator, amount.denominator);
            const quoteCurrency = CurrencyAmount.fromFractionalAmount(tokenOutCurrency, quote.numerator, quote.denominator);
            const routeCurrency = new Route(route.pools, amountCurrency.currency, quoteCurrency.currency);
            return new Trade({
                v3Routes: [
                    {
                        routev3: routeCurrency,
                        inputAmount: amountCurrency,
                        outputAmount: quoteCurrency,
                    },
                ],
                v2Routes: [],
                tradeType: tradeType,
            });
        }
        else {
            const quoteCurrency = CurrencyAmount.fromFractionalAmount(tokenInCurrency, quote.numerator, quote.denominator);
            const amountCurrency = CurrencyAmount.fromFractionalAmount(tokenOutCurrency, amount.numerator, amount.denominator);
            const routeCurrency = new Route(route.pools, quoteCurrency.currency, amountCurrency.currency);
            return new Trade({
                v3Routes: [
                    {
                        routev3: routeCurrency,
                        inputAmount: quoteCurrency,
                        outputAmount: amountCurrency,
                    },
                ],
                v2Routes: [],
                tradeType: tradeType,
            });
        }
    }
    buildMethodParameters(trade, swapConfig) {
        const { recipient, slippageTolerance, deadline } = swapConfig;
        const methodParameters = SwapRouter.swapCallParameters(trade, {
            recipient,
            slippageTolerance,
            deadlineOrPreviousBlockhash: deadline,
            // ...(signatureData
            //   ? {
            //       inputTokenPermit:
            //         'allowed' in signatureData
            //           ? {
            //               expiry: signatureData.deadline,
            //               nonce: signatureData.nonce,
            //               s: signatureData.s,
            //               r: signatureData.r,
            //               v: signatureData.v as any,
            //             }
            //           : {
            //               deadline: signatureData.deadline,
            //               amount: signatureData.amount,
            //               s: signatureData.s,
            //               r: signatureData.r,
            //               v: signatureData.v as any,
            //             },
            //     }
            //   : {}),
        });
        return methodParameters;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGVnYWN5LXJvdXRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9yb3V0ZXJzL2xlZ2FjeS1yb3V0ZXIvbGVnYWN5LXJvdXRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQ3hELE9BQU8sRUFBbUIsU0FBUyxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDL0QsT0FBTyxFQUFFLFNBQVMsRUFBMEIsS0FBSyxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDM0UsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDM0MsT0FBTyxDQUFDLE1BQU0sUUFBUSxDQUFDO0FBRXZCLE9BQU8sRUFDTCxXQUFXLEVBRVgsWUFBWSxHQUNiLE1BQU0sZ0NBQWdDLENBQUM7QUFNeEMsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRXBELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUNyQyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDbEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDeEQsT0FBTyxFQUFtQyxPQUFPLEVBQUUsTUFBTSxXQUFXLENBQUM7QUFDckUsT0FBTyxFQUNMLGdCQUFnQixFQUNoQiw2QkFBNkIsRUFDN0IsWUFBWSxHQUNiLE1BQU0sU0FBUyxDQUFDO0FBVWpCLDJCQUEyQjtBQUMzQixNQUFNLFFBQVEsR0FBRyxDQUFDLENBQUM7QUFNbkI7Ozs7R0FJRztBQUNILE1BQU0sT0FBTyxZQUFZO0lBT3ZCLFlBQVksRUFDVixPQUFPLEVBQ1Asa0JBQWtCLEVBQ2xCLFlBQVksRUFDWixhQUFhLEVBQ2IsYUFBYSxHQUNNO1FBQ25CLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFD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