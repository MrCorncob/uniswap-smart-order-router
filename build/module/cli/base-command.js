/// <reference types="./types/bunyan-debug-stream" />
import { Command, flags } from '@oclif/command';
import DEFAULT_TOKEN_LIST from '@uniswap/default-token-list';
import { default as bunyan } from 'bunyan';
import bunyanDebugStream from 'bunyan-debug-stream';
import { Pool } from '@uniswap/v3-sdk';
import _ from 'lodash';
import { ethers } from 'ethers';
// import { V2Route, V3Route } from '../routers/router';
import NodeCache from 'node-cache';
import { AlphaRouter, CachingGasStationProvider, CachingTokenListProvider, CachingTokenProviderWithFallback, ChainId, CHAIN_IDS_LIST, EIP1559GasPriceProvider, ID_TO_CHAIN_ID, ID_TO_PROVIDER, LegacyRouter, MetricLogger, NodeJSCache, setGlobalLogger, setGlobalMetric, TokenProvider, UniswapMulticallProvider, V3PoolProvider, V3QuoteProvider, } from '../src';
import { LegacyGasPriceProvider } from '../src/providers/legacy-gas-price-provider';
import { OnChainGasPriceProvider } from '../src/providers/on-chain-gas-price-provider';
export class BaseCommand extends Command {
    constructor() {
        super(...arguments);
        this._log = null;
        this._router = null;
        this._swapToRatioRouter = null;
        this._tokenProvider = null;
        this._poolProvider = null;
        this._blockNumber = null;
        this._multicall2Provider = null;
    }
    get logger() {
        return this._log
            ? this._log
            : bunyan.createLogger({
                name: 'Default Logger',
            });
    }
    get router() {
        if (this._router) {
            return this._router;
        }
        else {
            throw 'router not initialized';
        }
    }
    get swapToRatioRouter() {
        if (this._swapToRatioRouter) {
            return this._swapToRatioRouter;
        }
        else {
            throw 'swapToRatioRouter not initialized';
        }
    }
    get tokenProvider() {
        if (this._tokenProvider) {
            return this._tokenProvider;
        }
        else {
            throw 'tokenProvider not initialized';
        }
    }
    get poolProvider() {
        if (this._poolProvider) {
            return this._poolProvider;
        }
        else {
            throw 'poolProvider not initialized';
        }
    }
    get blockNumber() {
        if (this._blockNumber) {
            return this._blockNumber;
        }
        else {
            throw 'blockNumber not initialized';
        }
    }
    get multicall2Provider() {
        if (this._multicall2Provider) {
            return this._multicall2Provider;
        }
        else {
            throw 'multicall2 not initialized';
        }
    }
    async init() {
        const query = this.parse();
        const { chainId: chainIdNumb, router: routerStr, debug, debugJSON, tokenListURI, } = query.flags;
        // initialize logger
        const logLevel = debug || debugJSON ? bunyan.DEBUG : bunyan.INFO;
        this._log = bunyan.createLogger({
            name: 'Uniswap Smart Order Router',
            serializers: bunyan.stdSerializers,
            level: logLevel,
            streams: debugJSON
                ? undefined
                : [
                    {
                        level: logLevel,
                        type: 'stream',
                        stream: bunyanDebugStream({
                            basepath: __dirname,
                            forceColor: false,
                            showDate: false,
                            showPid: false,
                            showLoggerName: false,
                            showLevel: !!debug,
                        }),
                    },
                ],
        });
        if (debug || debugJSON) {
            setGlobalLogger(this.logger);
        }
        const metricLogger = new MetricLogger();
        setGlobalMetric(metricLogger);
        const chainId = ID_TO_CHAIN_ID(chainIdNumb);
        const chainProvider = ID_TO_PROVIDER(chainId);
        const provider = new ethers.providers.JsonRpcProvider(chainProvider, chainId);
        this._blockNumber = await provider.getBlockNumber();
        const tokenCache = new NodeJSCache(new NodeCache({ stdTTL: 3600, useClones: false }));
        let tokenListProvider;
        if (tokenListURI) {
            tokenListProvider = await CachingTokenListProvider.fromTokenListURI(chainId, tokenListURI, tokenCache);
        }
        else {
            tokenListProvider = await CachingTokenListProvider.fromTokenList(chainId, DEFAULT_TOKEN_LIST, tokenCache);
        }
        const multicall2Provider = new UniswapMulticallProvider(chainId, provider);
        this._multicall2Provider = multicall2Provider;
        this._poolProvider = new V3PoolProvider(chainId, multicall2Provider);
        // initialize tokenProvider
        const tokenProviderOnChain = new TokenProvider(chainId, multicall2Provider);
        this._tokenProvider = new CachingTokenProviderWithFallback(chainId, tokenCache, tokenListProvider, tokenProviderOnChain);
        if (routerStr == 'legacy') {
            this._router = new LegacyRouter({
                chainId,
                multicall2Provider,
                poolProvider: new V3PoolProvider(chainId, multicall2Provider),
                quoteProvider: new V3QuoteProvider(chainId, provider, multicall2Provider),
                tokenProvider: this.tokenProvider,
            });
        }
        else {
            const gasPriceCache = new NodeJSCache(new NodeCache({ stdTTL: 15, useClones: true }));
            // const useDefaultQuoteProvider =
            //   chainId != ChainId.ARBITRUM_ONE && chainId != ChainId.ARBITRUM_RINKEBY;
            const router = new AlphaRouter({
                provider,
                chainId,
                multicall2Provider: multicall2Provider,
                gasPriceProvider: new CachingGasStationProvider(chainId, new OnChainGasPriceProvider(chainId, new EIP1559GasPriceProvider(provider), new LegacyGasPriceProvider(provider)), gasPriceCache),
            });
            this._swapToRatioRouter = router;
            this._router = router;
        }
    }
    logSwapResults(routeAmounts, quote, quoteGasAdjusted, estimatedGasUsedQuoteToken, estimatedGasUsedUSD, methodParameters, blockNumber, estimatedGasUsed, gasPriceWei) {
        if (methodParameters != undefined && estimatedGasUsed != undefined && gasPriceWei != undefined && blockNumber != undefined) {
        }
        const pools = routeAmounts[0].route;
        const tokenPath = _.map(routeAmounts[0].tokenPath, (token) => `${token.address}`);
        const routeStr = [];
        const poolFeePath = _.map(pools.pools, (pool) => `${pool instanceof Pool ? `${pool.fee}` : '0'}`);
        for (let i = 0; i < tokenPath.length - 1; i++) {
            let object = {
                "token_address_0": tokenPath[i],
                "token_address_1": tokenPath[i + 1],
                "fee": poolFeePath[i]
            };
            routeStr.push(object);
        }
        let response = {
            // 'feePath': routeAmountsToString(routeAmounts),
            feePath: routeStr,
            'path': tokenPath,
            'exactIn': quote.toFixed(10),
            'gasAdjustedQuoteIn': quoteGasAdjusted.toFixed(10),
            'gasUsedQuoteToken:': estimatedGasUsedQuoteToken.toFixed(6),
            'gasUsedUSD:': estimatedGasUsedUSD.toFixed(6),
        };
        this.logger.info(JSON.stringify(response));
        // this.logger.info(`Best Route:`);
        // this.logger.info(JSON.stringify(routeAmounts));
        // this.logger.info(`${routeAmountsToString(routeAmounts)}`);
        // this.logger.info(`\tRaw Quote Exact In:`);
        // this.logger.info(`\t\t${quote.toFixed(10)}`);
        // this.logger.info(`\tGas Adjusted Quote In:`);
        // this.logger.info(`\t\t${quoteGasAdjusted.toFixed(2)}`);
        // this.logger.info(``);
        // this.logger.info(
        //   `Gas Used Quote Token: ${estimatedGasUsedQuoteToken.toFixed(6)}`
        // );
        // this.logger.info(`Gas Used USD: ${estimatedGasUsedUSD.toFixed(6)}`);
        // this.logger.info(`Calldata: ${methodParameters?.calldata}`);
        // this.logger.info(`Value: ${methodParameters?.value}`);
        // this.logger.info({
        //   blockNumber: blockNumber.toString(),
        //   estimatedGasUsed: estimatedGasUsed.toString(),
        //   gasPriceWei: gasPriceWei.toString(),
        // });
    }
}
BaseCommand.flags = {
    topN: flags.integer({
        required: false,
        default: 3,
    }),
    topNTokenInOut: flags.integer({
        required: false,
        default: 2,
    }),
    topNSecondHop: flags.integer({
        required: false,
        default: 0,
    }),
    topNWithEachBaseToken: flags.integer({
        required: false,
        default: 2,
    }),
    topNWithBaseToken: flags.integer({
        required: false,
        default: 6,
    }),
    topNWithBaseTokenInSet: flags.boolean({
        required: false,
        default: false,
    }),
    topNDirectSwaps: flags.integer({
        required: false,
        default: 2,
    }),
    maxSwapsPerPath: flags.integer({
        required: false,
        default: 3,
    }),
    minSplits: flags.integer({
        required: false,
        default: 1,
    }),
    maxSplits: flags.integer({
        required: false,
        default: 3,
    }),
    distributionPercent: flags.integer({
        required: false,
        default: 5,
    }),
    chainId: flags.integer({
        char: 'c',
        required: false,
        default: ChainId.MAINNET,
        options: CHAIN_IDS_LIST,
    }),
    tokenListURI: flags.string({
        required: false,
    }),
    router: flags.string({
        char: 's',
        required: false,
        default: 'alpha',
    }),
    debug: flags.boolean(),
    debugJSON: flags.boolean(),
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZS1jb21tYW5kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vY2xpL2Jhc2UtY29tbWFuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxxREFBcUQ7QUFDckQsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQztBQUVoRCxPQUFPLGtCQUFrQixNQUFNLDZCQUE2QixDQUFDO0FBRzdELE9BQU8sRUFBRSxPQUFPLElBQUksTUFBTSxFQUFxQixNQUFNLFFBQVEsQ0FBQztBQUM5RCxPQUFPLGlCQUFpQixNQUFNLHFCQUFxQixDQUFDO0FBQ3BELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUN2QyxPQUFPLENBQUMsTUFBTSxRQUFRLENBQUM7QUFDdkIsT0FBTyxFQUFhLE1BQU0sRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUUzQyx3REFBd0Q7QUFDeEQsT0FBTyxTQUFTLE1BQU0sWUFBWSxDQUFDO0FBQ25DLE9BQU8sRUFDTCxXQUFXLEVBQ1gseUJBQXlCLEVBQ3pCLHdCQUF3QixFQUN4QixnQ0FBZ0MsRUFDaEMsT0FBTyxFQUNQLGNBQWMsRUFDZCx1QkFBdUIsRUFFdkIsY0FBYyxFQUNkLGNBQWMsRUFLZCxZQUFZLEVBQ1osWUFBWSxFQUNaLFdBQVcsRUFHWCxlQUFlLEVBQ2YsZUFBZSxFQUNmLGFBQWEsRUFDYix3QkFBd0IsRUFDeEIsY0FBYyxFQUNkLGVBQWUsR0FFaEIsTUFBTSxRQUFRLENBQUM7QUFDaEIsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDcEYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFFdkYsTUFBTSxPQUFnQixXQUFZLFNBQVEsT0FBTztJQUFqRDs7UUFnRVUsU0FBSSxHQUFrQixJQUFJLENBQUM7UUFDM0IsWUFBTyxHQUF3QixJQUFJLENBQUM7UUFDcEMsdUJBQWtCLEdBQWtDLElBQUks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