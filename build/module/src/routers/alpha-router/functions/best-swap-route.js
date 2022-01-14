import { TradeType } from '@uniswap/sdk-core';
import { BigNumber } from 'ethers';
import JSBI from 'jsbi';
import _ from 'lodash';
import { FixedReverseHeap, Queue } from 'mnemonist';
import { CurrencyAmount } from '../../../util/amounts';
import { log } from '../../../util/log';
import { metric, MetricLoggerUnit } from '../../../util/metric';
import { routeAmountsToString, routeToString } from '../../../util/routes';
import { usdGasTokensByChain } from '../gas-models';
export function getBestSwapRoute(amount, percents, routesWithValidQuotes, routeType, chainId, routingConfig) {
    const now = Date.now();
    // Build a map of percentage of the input to list of valid quotes.
    // Quotes can be null for a variety of reasons (not enough liquidity etc), so we drop them here too.
    const percentToQuotes = {};
    for (const routeWithValidQuote of routesWithValidQuotes) {
        if (!percentToQuotes[routeWithValidQuote.percent]) {
            percentToQuotes[routeWithValidQuote.percent] = [];
        }
        percentToQuotes[routeWithValidQuote.percent].push(routeWithValidQuote);
    }
    metric.putMetric('BuildRouteWithValidQuoteObjects', Date.now() - now, MetricLoggerUnit.Milliseconds);
    // Given all the valid quotes for each percentage find the optimal route.
    const swapRoute = getBestSwapRouteBy(routeType, percentToQuotes, percents, chainId, (rq) => rq.quoteAdjustedForGas, routingConfig);
    // It is possible we were unable to find any valid route given the quotes.
    if (!swapRoute) {
        return null;
    }
    // Due to potential loss of precision when taking percentages of the input it is possible that the sum of the amounts of each
    // route of our optimal quote may not add up exactly to exactIn or exactOut.
    //
    // We check this here, and if there is a mismatch
    // add the missing amount to a random route. The missing amount size should be neglible so the quote should still be highly accurate.
    const { routes: routeAmounts } = swapRoute;
    const totalAmount = _.reduce(routeAmounts, (total, routeAmount) => total.add(routeAmount.amount), CurrencyAmount.fromRawAmount(routeAmounts[0].amount.currency, 0));
    const missingAmount = amount.subtract(totalAmount);
    if (missingAmount.greaterThan(0)) {
        log.info({
            missingAmount: missingAmount.quotient.toString(),
        }, `Optimal route's amounts did not equal exactIn/exactOut total. Adding missing amount to last route in array.`);
        routeAmounts[routeAmounts.length - 1].amount =
            routeAmounts[routeAmounts.length - 1].amount.add(missingAmount);
    }
    log.info({
        routes: routeAmountsToString(routeAmounts),
        numSplits: routeAmounts.length,
        amount: amount.toExact(),
        quote: swapRoute.quote.toExact(),
        quoteGasAdjusted: swapRoute.quoteGasAdjusted.toFixed(2),
        estimatedGasUSD: swapRoute.estimatedGasUsedUSD.toFixed(2),
        estimatedGasToken: swapRoute.estimatedGasUsedQuoteToken.toFixed(2),
    }, `Found best swap route. ${routeAmounts.length} split.`);
    return swapRoute;
}
export function getBestSwapRouteBy(routeType, percentToQuotes, percents, chainId, by, routingConfig) {
    // Build a map of percentage to sorted list of quotes, with the biggest quote being first in the list.
    const percentToSortedQuotes = _.mapValues(percentToQuotes, (routeQuotes) => {
        return routeQuotes.sort((routeQuoteA, routeQuoteB) => {
            if (routeType == TradeType.EXACT_INPUT) {
                return by(routeQuoteA).greaterThan(by(routeQuoteB)) ? -1 : 1;
            }
            else {
                return by(routeQuoteA).lessThan(by(routeQuoteB)) ? -1 : 1;
            }
        });
    });
    log.info({
        percentToTop5SortedQuotes: _.mapValues(percentToSortedQuotes, (ps) => _.map(ps.slice(0, 5), (p) => ({
            protocol: p.protocol,
            route: routeToString(p.route),
            percent: p.percent,
            quote: p.quoteAdjustedForGas.toFixed(2),
        }))),
    }, 'Top 5 Quotes for each percentage');
    const quoteCompFn = routeType == TradeType.EXACT_INPUT
        ? (a, b) => a.greaterThan(b)
        : (a, b) => a.lessThan(b);
    const sumFn = (currencyAmounts) => {
        let sum = currencyAmounts[0];
        for (let i = 1; i < currencyAmounts.length; i++) {
            sum = sum.add(currencyAmounts[i]);
        }
        return sum;
    };
    let bestQuote;
    let bestSwap;
    // Min-heap for tracking the 5 best swaps given some number of splits.
    const bestSwapsPerSplit = new FixedReverseHeap(Array, (a, b) => {
        return quoteCompFn(a.quote, b.quote) ? -1 : 1;
    }, 5);
    const { minSplits, maxSplits, forceCrossProtocol } = routingConfig;
    if (!percentToSortedQuotes[100] || minSplits > 1 || forceCrossProtocol) {
        log.info({
            percentToSortedQuotes: _.mapValues(percentToSortedQuotes, (p) => p.length),
        }, 'Did not find a valid route without any splits. Continuing search anyway.');
    }
    else {
        bestQuote = by(percentToSortedQuotes[100][0]);
        bestSwap = [percentToSortedQuotes[100][0]];
        for (const routeWithQuote of percentToSortedQuotes[100].slice(0, 5)) {
            bestSwapsPerSplit.push({
                quote: by(routeWithQuote),
                routes: [routeWithQuote],
            });
        }
    }
    // We do a BFS. Each additional node in a path represents us adding an additional split to the route.
    const queue = new Queue();
    // First we seed BFS queue with the best quotes for each percentage.
    // i.e. [best quote when sending 10% of amount, best quote when sending 20% of amount, ...]
    // We will explore the various combinations from each node.
    for (let i = percents.length; i >= 0; i--) {
        const percent = percents[i];
        if (!percentToSortedQuotes[percent]) {
            continue;
        }
        queue.enqueue({
            curRoutes: [percentToSortedQuotes[percent][0]],
            percentIndex: i,
            remainingPercent: 100 - percent,
            special: false,
        });
        if (!percentToSortedQuotes[percent] ||
            !percentToSortedQuotes[percent][1]) {
            continue;
        }
        queue.enqueue({
            curRoutes: [percentToSortedQuotes[percent][1]],
            percentIndex: i,
            remainingPercent: 100 - percent,
            special: true,
        });
    }
    let splits = 1;
    let startedSplit = Date.now();
    while (queue.size > 0) {
        metric.putMetric(`Split${splits}Done`, Date.now() - startedSplit, MetricLoggerUnit.Milliseconds);
        startedSplit = Date.now();
        log.info({
            top5: _.map(Array.from(bestSwapsPerSplit.consume()), (q) => `${q.quote.toExact()} (${_(q.routes)
                .map((r) => r.toString())
                .join(', ')})`),
            onQueue: queue.size,
        }, `Top 5 with ${splits} splits`);
        bestSwapsPerSplit.clear();
        // Size of the queue at this point is the number of potential routes we are investigating for the given number of splits.
        let layer = queue.size;
        splits++;
        // If we didn't improve our quote by adding another split, very unlikely to improve it by splitting more after that.
        if (splits >= 3 && bestSwap && bestSwap.length < splits - 1) {
            break;
        }
        if (splits > maxSplits) {
            log.info('Max splits reached. Stopping search.');
            metric.putMetric(`MaxSplitsHitReached`, 1, MetricLoggerUnit.Count);
            break;
        }
        while (layer > 0) {
            layer--;
            const { remainingPercent, curRoutes, percentIndex, special } = queue.dequeue();
            // For all other percentages, add a new potential route.
            // E.g. if our current aggregated route if missing 50%, we will create new nodes and add to the queue for:
            // 50% + new 10% route, 50% + new 20% route, etc.
            for (let i = percentIndex; i >= 0; i--) {
                const percentA = percents[i];
                if (percentA > remainingPercent) {
                    continue;
                }
                // At some point the amount * percentage is so small that the quoter is unable to get
                // a quote. In this case there could be no quotes for that percentage.
                if (!percentToSortedQuotes[percentA]) {
                    continue;
                }
                const candidateRoutesA = percentToSortedQuotes[percentA];
                // Find the best route in the complimentary percentage that doesn't re-use a pool already
                // used in the current route. Re-using pools is not allowed as each swap through a pool changes its liquidity,
                // so it would make the quotes inaccurate.
                const routeWithQuoteA = findFirstRouteNotUsingUsedPools(curRoutes, candidateRoutesA, forceCrossProtocol);
                if (!routeWithQuoteA) {
                    continue;
                }
                const remainingPercentNew = remainingPercent - percentA;
                const curRoutesNew = [...curRoutes, routeWithQuoteA];
                // If we've found a route combination that uses all 100%, and it has at least minSplits, update our best route.
                if (remainingPercentNew == 0 && splits >= minSplits) {
                    const quotesNew = _.map(curRoutesNew, (r) => by(r));
                    const quoteNew = sumFn(quotesNew);
                    bestSwapsPerSplit.push({
                        quote: quoteNew,
                        routes: curRoutesNew,
                    });
                    if (!bestQuote || quoteCompFn(quoteNew, bestQuote)) {
                        bestQuote = quoteNew;
                        bestSwap = curRoutesNew;
                        // Temporary experiment.
                        if (special) {
                            metric.putMetric(`BestSwapNotPickingBestForPercent`, 1, MetricLoggerUnit.Count);
                        }
                    }
                }
                else {
                    queue.enqueue({
                        curRoutes: curRoutesNew,
                        remainingPercent: remainingPercentNew,
                        percentIndex: i,
                        special,
                    });
                }
            }
        }
    }
    if (!bestSwap) {
        log.info(`Could not find a valid swap`);
        return undefined;
    }
    const postSplitNow = Date.now();
    const quoteGasAdjusted = sumFn(_.map(bestSwap, (routeWithValidQuote) => routeWithValidQuote.quoteAdjustedForGas));
    const estimatedGasUsed = _(bestSwap)
        .map((routeWithValidQuote) => routeWithValidQuote.gasEstimate)
        .reduce((sum, routeWithValidQuote) => sum.add(routeWithValidQuote), BigNumber.from(0));
    // Each route can use a different stablecoin to account its gas costs.
    // They should all be pegged, and this is just an estimate, so we do a merge
    // to an arbitrary stable.
    if (!usdGasTokensByChain[chainId] || !usdGasTokensByChain[chainId][0]) {
        throw new Error(`Could not find a USD token for computing gas costs on ${chainId}`);
    }
    const usdToken = usdGasTokensByChain[chainId][0];
    const usdTokenDecimals = usdToken.decimals;
    // For each gas estimate, normalize decimals to that of the chosen usd token.
    const estimatedGasUsedUSDs = _(bestSwap)
        .map((routeWithValidQuote) => {
        const decimalsDiff = usdTokenDecimals - routeWithValidQuote.gasCostInUSD.currency.decimals;
        if (decimalsDiff == 0) {
            return CurrencyAmount.fromRawAmount(usdToken, routeWithValidQuote.gasCostInUSD.quotient);
        }
        return CurrencyAmount.fromRawAmount(usdToken, JSBI.multiply(routeWithValidQuote.gasCostInUSD.quotient, JSBI.exponentiate(JSBI.BigInt(10), JSBI.BigInt(decimalsDiff))));
    })
        .value();
    const estimatedGasUsedUSD = sumFn(estimatedGasUsedUSDs);
    log.info({
        estimatedGasUsedUSD: estimatedGasUsedUSD.toExact(),
        normalizedUsdToken: usdToken,
        routeUSDGasEstimates: _.map(bestSwap, (b) => `${b.percent}% ${routeToString(b.route)} ${b.gasCostInUSD.toExact()}`),
    }, 'USD gas estimates of best route');
    const estimatedGasUsedQuoteToken = sumFn(_.map(bestSwap, (routeWithValidQuote) => routeWithValidQuote.gasCostInToken));
    const quote = sumFn(_.map(bestSwap, (routeWithValidQuote) => routeWithValidQuote.quote));
    const routeWithQuotes = bestSwap.sort((routeAmountA, routeAmountB) => routeAmountB.amount.greaterThan(routeAmountA.amount) ? 1 : -1);
    metric.putMetric('PostSplitDone', Date.now() - postSplitNow, MetricLoggerUnit.Milliseconds);
    return {
        quote,
        quoteGasAdjusted,
        estimatedGasUsed,
        estimatedGasUsedUSD,
        estimatedGasUsedQuoteToken,
        routes: routeWithQuotes,
    };
}
// We do not allow pools to be re-used across split routes, as swapping through a pool changes the pools state.
// Given a list of used routes, this function finds the first route in the list of candidate routes that does not re-use an already used pool.
const findFirstRouteNotUsingUsedPools = (usedRoutes, candidateRouteQuotes, forceCrossProtocol) => {
    const poolAddressSet = new Set();
    const usedPoolAddresses = _(usedRoutes)
        .flatMap((r) => r.poolAddresses)
        .value();
    for (let poolAddress of usedPoolAddresses) {
        poolAddressSet.add(poolAddress);
    }
    const protocolsSet = new Set();
    const usedProtocols = _(usedRoutes)
        .flatMap((r) => r.protocol)
        .uniq()
        .value();
    for (let protocol of usedProtocols) {
        protocolsSet.add(protocol);
    }
    for (const routeQuote of candidateRouteQuotes) {
        const { poolAddresses, protocol } = routeQuote;
        if (poolAddresses.some((poolAddress) => poolAddressSet.has(poolAddress))) {
            continue;
        }
        // This code is just for debugging. Allows us to force a cross-protocol split route by skipping
        // consideration of routes that come from the same protocol as a used route.
        const needToForce = forceCrossProtocol && protocolsSet.size == 1;
        if (needToForce && protocolsSet.has(protocol)) {
            continue;
        }
        return routeQuote;
    }
    return null;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmVzdC1zd2FwLXJvdXRlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL3JvdXRlcnMvYWxwaGEtcm91dGVyL2Z1bmN0aW9ucy9iZXN0LXN3YXAtcm91dGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDbkMsT0FBTyxJQUFJLE1BQU0sTUFBTSxDQUFDO0FBQ3hCLE9BQU8sQ0FBQyxNQUFNLFFBQVEsQ0FBQztBQUN2QixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFLE1BQU0sV0FBVyxDQUFDO0FBRXBELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUN2RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDeEMsT0FBTyxFQUFFLE1BQU0sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQ2hFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxhQUFhLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUUzRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFHcEQsTUFBTSxVQUFVLGdCQUFnQixDQUM5QixNQUFzQixFQUN0QixRQUFrQixFQUNsQixxQkFBNEMsRUFDNUMsU0FBb0IsRUFDcEIsT0FBZ0IsRUFDaEIsYUFBZ0M7SUFTaEMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO0lBRXZCLGtFQUFrRTtJQUNsRSxvR0FBb0c7SUFDcEcsTUFBTSxlQUFlLEdBQWlELEVBQUUsQ0FBQztJQUN6RSxLQUFLLE1BQU0sbUJBQW1CLElBQUkscUJBQXFCLEVBQUU7UUFDdkQsSUFBSSxDQUFDLGVBQWUsQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsRUFBRTtZQUNq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