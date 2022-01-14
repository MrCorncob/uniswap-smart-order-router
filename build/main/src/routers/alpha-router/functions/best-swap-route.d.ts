import { TradeType } from '@uniswap/sdk-core';
import { BigNumber } from 'ethers';
import { ChainId } from '../../../util';
import { CurrencyAmount } from '../../../util/amounts';
import { AlphaRouterConfig } from '../alpha-router';
import { RouteWithValidQuote } from './../entities/route-with-valid-quote';
export declare function getBestSwapRoute(amount: CurrencyAmount, percents: number[], routesWithValidQuotes: RouteWithValidQuote[], routeType: TradeType, chainId: ChainId, routingConfig: AlphaRouterConfig): {
    quote: CurrencyAmount;
    quoteGasAdjusted: CurrencyAmount;
    estimatedGasUsed: BigNumber;
    estimatedGasUsedUSD: CurrencyAmount;
    estimatedGasUsedQuoteToken: CurrencyAmount;
    routes: RouteWithValidQuote[];
} | null;
export declare function getBestSwapRouteBy(routeType: TradeType, percentToQuotes: {
    [percent: number]: RouteWithValidQuote[];
}, percents: number[], chainId: ChainId, by: (routeQuote: RouteWithValidQuote) => CurrencyAmount, routingConfig: AlphaRouterConfig): {
    quote: CurrencyAmount;
    quoteGasAdjusted: CurrencyAmount;
    estimatedGasUsed: BigNumber;
    estimatedGasUsedUSD: CurrencyAmount;
    estimatedGasUsedQuoteToken: CurrencyAmount;
    routes: RouteWithValidQuote[];
} | undefined;
