"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseCommand = void 0;
/// <reference types="./types/bunyan-debug-stream" />
const command_1 = require("@oclif/command");
const default_token_list_1 = __importDefault(require("@uniswap/default-token-list"));
const bunyan_1 = __importDefault(require("bunyan"));
const bunyan_debug_stream_1 = __importDefault(require("bunyan-debug-stream"));
const v3_sdk_1 = require("@uniswap/v3-sdk");
const lodash_1 = __importDefault(require("lodash"));
const ethers_1 = require("ethers");
// import { V2Route, V3Route } from '../routers/router';
const node_cache_1 = __importDefault(require("node-cache"));
const src_1 = require("../src");
const legacy_gas_price_provider_1 = require("../src/providers/legacy-gas-price-provider");
const on_chain_gas_price_provider_1 = require("../src/providers/on-chain-gas-price-provider");
class BaseCommand extends command_1.Command {
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
            : bunyan_1.default.createLogger({
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
        const logLevel = debug || debugJSON ? bunyan_1.default.DEBUG : bunyan_1.default.INFO;
        this._log = bunyan_1.default.createLogger({
            name: 'Uniswap Smart Order Router',
            serializers: bunyan_1.default.stdSerializers,
            level: logLevel,
            streams: debugJSON
                ? undefined
                : [
                    {
                        level: logLevel,
                        type: 'stream',
                        stream: (0, bunyan_debug_stream_1.default)({
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
            (0, src_1.setGlobalLogger)(this.logger);
        }
        const metricLogger = new src_1.MetricLogger();
        (0, src_1.setGlobalMetric)(metricLogger);
        const chainId = (0, src_1.ID_TO_CHAIN_ID)(chainIdNumb);
        const chainProvider = (0, src_1.ID_TO_PROVIDER)(chainId);
        const provider = new ethers_1.ethers.providers.JsonRpcProvider(chainProvider, chainId);
        this._blockNumber = await provider.getBlockNumber();
        const tokenCache = new src_1.NodeJSCache(new node_cache_1.default({ stdTTL: 3600, useClones: false }));
        let tokenListProvider;
        if (tokenListURI) {
            tokenListProvider = await src_1.CachingTokenListProvider.fromTokenListURI(chainId, tokenListURI, tokenCache);
        }
        else {
            tokenListProvider = await src_1.CachingTokenListProvider.fromTokenList(chainId, default_token_list_1.default, tokenCache);
        }
        const multicall2Provider = new src_1.UniswapMulticallProvider(chainId, provider);
        this._multicall2Provider = multicall2Provider;
        this._poolProvider = new src_1.V3PoolProvider(chainId, multicall2Provider);
        // initialize tokenProvider
        const tokenProviderOnChain = new src_1.TokenProvider(chainId, multicall2Provider);
        this._tokenProvider = new src_1.CachingTokenProviderWithFallback(chainId, tokenCache, tokenListProvider, tokenProviderOnChain);
        if (routerStr == 'legacy') {
            this._router = new src_1.LegacyRouter({
                chainId,
                multicall2Provider,
                poolProvider: new src_1.V3PoolProvider(chainId, multicall2Provider),
                quoteProvider: new src_1.V3QuoteProvider(chainId, provider, multicall2Provider),
                tokenProvider: this.tokenProvider,
            });
        }
        else {
            const gasPriceCache = new src_1.NodeJSCache(new node_cache_1.default({ stdTTL: 15, useClones: true }));
            // const useDefaultQuoteProvider =
            //   chainId != ChainId.ARBITRUM_ONE && chainId != ChainId.ARBITRUM_RINKEBY;
            const router = new src_1.AlphaRouter({
                provider,
                chainId,
                multicall2Provider: multicall2Provider,
                gasPriceProvider: new src_1.CachingGasStationProvider(chainId, new on_chain_gas_price_provider_1.OnChainGasPriceProvider(chainId, new src_1.EIP1559GasPriceProvider(provider), new legacy_gas_price_provider_1.LegacyGasPriceProvider(provider)), gasPriceCache),
            });
            this._swapToRatioRouter = router;
            this._router = router;
        }
    }
    logSwapResults(routeAmounts, quote, quoteGasAdjusted, estimatedGasUsedQuoteToken, estimatedGasUsedUSD, methodParameters, blockNumber, estimatedGasUsed, gasPriceWei) {
        if (methodParameters != undefined && estimatedGasUsed != undefined && gasPriceWei != undefined && blockNumber != undefined) {
        }
        const pools = routeAmounts[0].route;
        const tokenPath = lodash_1.default.map(routeAmounts[0].tokenPath, (token) => `${token.address}`);
        const routeStr = [];
        const poolFeePath = lodash_1.default.map(pools.pools, (pool) => `${pool instanceof v3_sdk_1.Pool ? `${pool.fee}` : '0'}`);
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
        this.logger.info('hello xxx');
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
exports.BaseCommand = BaseCommand;
BaseCommand.flags = {
    topN: command_1.flags.integer({
        required: false,
        default: 3,
    }),
    topNTokenInOut: command_1.flags.integer({
        required: false,
        default: 2,
    }),
    topNSecondHop: command_1.flags.integer({
        required: false,
        default: 0,
    }),
    topNWithEachBaseToken: command_1.flags.integer({
        required: false,
        default: 2,
    }),
    topNWithBaseToken: command_1.flags.integer({
        required: false,
        default: 6,
    }),
    topNWithBaseTokenInSet: command_1.flags.boolean({
        required: false,
        default: false,
    }),
    topNDirectSwaps: command_1.flags.integer({
        required: false,
        default: 2,
    }),
    maxSwapsPerPath: command_1.flags.integer({
        required: false,
        default: 3,
    }),
    minSplits: command_1.flags.integer({
        required: false,
        default: 1,
    }),
    maxSplits: command_1.flags.integer({
        required: false,
        default: 3,
    }),
    distributionPercent: command_1.flags.integer({
        required: false,
        default: 5,
    }),
    chainId: command_1.flags.integer({
        char: 'c',
        required: false,
        default: src_1.ChainId.MAINNET,
        options: src_1.CHAIN_IDS_LIST,
    }),
    tokenListURI: command_1.flags.string({
        required: false,
    }),
    router: command_1.flags.string({
        char: 's',
        required: false,
        default: 'alpha',
    }),
    debug: command_1.flags.boolean(),
    debugJSON: command_1.flags.boolean(),
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZS1jb21tYW5kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vY2xpL2Jhc2UtY29tbWFuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxxREFBcUQ7QUFDckQsNENBQWdEO0FBRWhELHFGQUE2RDtBQUc3RCxvREFBOEQ7QUFDOUQsOEVBQW9EO0FBQ3BELDRDQUF1QztBQUN2QyxvREFBdUI7QUFDdkIsbUNBQTJDO0FBRTNDLHdEQUF3RDtBQUN4RCw0REFBbUM7QUFDbkMsZ0NBMkJnQjtBQUNoQiwwRkFBb0Y7QUFDcEYsOEZBQXVGO0FBRXZGLE1BQXNCLFdBQVksU0FBUSxpQkFBTztJQUFqRDs7UUFnRVUsU0FBSSxHQUFrQixJQUFJLENBQUM7UUFDM0IsWUFBTyxHQUF3QixJQUFJLENBQUM7UUFDcEMsdUJBQWtCLEdBQWtDLElBQUksQ0FBQztRQUN6RCxtQkFBYyxHQUEwQixJQUFJLENBQUM7UUFDN0Msa0JBQWEsR0FBMkIsSUFBSSxDQUFDO1FBQzdDLGlCQUFZLEdBQWtCLElBQUksQ0FBQztRQUNuQyx3QkFBbUIsR0FBb0MsSUFBSSxDQUFDO0lBMlB0RSxDQUFDO0lBelBDLElBQUksTUFBTTtRQUNSLE9BQU8sSUFBSSxDQUFDLElBQUk7WUFDZCxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUk7WUFDWCxDQUFDLENBQUMsZ0JBQU0sQ0FBQyxZQUFZLENBQUM7Z0JBQ2xCLElBQUksRUFBRSxnQkFBZ0I7YUFDdkIsQ0FBQyxDQUFDO0lBQ1QsQ0FBQztJQUVELElBQUksTUFBTTtRQUNSLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTtZQUNoQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7U0FDckI7YUFBTTtZQUNMLE1BQU0sd0JBQXdCLENBQUM7U0FDaEM7SUFDSCxDQUFDO0lBRUQsSUFBSSxpQkFBaUI7UUFDbkIsSUFBSSxJQUFJLENBQUMsa0JBQWtCLEVBQUU7WUFDM0IsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENB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