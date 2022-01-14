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
                        stream: bunyan_debug_stream_1.default({
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
            src_1.setGlobalLogger(this.logger);
        }
        const metricLogger = new src_1.MetricLogger();
        src_1.setGlobalMetric(metricLogger);
        const chainId = src_1.ID_TO_CHAIN_ID(chainIdNumb);
        const chainProvider = src_1.ID_TO_PROVIDER(chainId);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZS1jb21tYW5kLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vY2xpL2Jhc2UtY29tbWFuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxxREFBcUQ7QUFDckQsNENBQWdEO0FBRWhELHFGQUE2RDtBQUc3RCxvREFBOEQ7QUFDOUQsOEVBQW9EO0FBQ3BELDRDQUF1QztBQUN2QyxvREFBdUI7QUFDdkIsbUNBQTJDO0FBRTNDLHdEQUF3RDtBQUN4RCw0REFBbUM7QUFDbkMsZ0NBMkJnQjtBQUNoQiwwRkFBb0Y7QUFDcEYsOEZBQXVGO0FBRXZGLE1BQXNCLFdBQVksU0FBUSxpQkFBTztJQUFqRDs7UUFnRVUsU0FBSSxHQUFrQixJQUFJLENBQUM7UUFDM0IsWUFBTyxHQUF3QixJQUFJLENBQUM7UUFDcEMsdUJBQWtCLEdBQWtDLElBQUksQ0FBQztRQUN6RCxtQkFBYyxHQUEwQixJQUFJLENBQUM7UUFDN0Msa0JBQWEsR0FBMkIsSUFBSSxDQUFDO1FBQzdDLGlCQUFZLEdBQWtCLElBQUksQ0FBQztRQUNuQyx3QkFBbUIsR0FBb0MsSUFBSSxDQUFDO0lBMFB0RSxDQUFDO0lBeFBDLElBQUksTUFBTTtRQUNSLE9BQU8sSUFBSSxDQUFDLElBQUk7WUFDZCxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUk7WUFDWCxDQUFDLENBQUMsZ0JBQU0sQ0FBQyxZQUFZLENBQUM7Z0JBQ2xCLElBQUksRUFBRSxnQkFBZ0I7YUFDdkIsQ0FBQyxDQUFDO0lBQ1QsQ0FBQztJQUVELElBQUksTUFBTTtRQUNSLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTtZQUNoQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7U0FDckI7YUFBTTtZQUNMLE1BQU0sd0JBQXdCLENBQUM7U0FDaEM7SUFDSCxDQUFDO0lBRUQsSUFBSSxpQkFBaUI7UUFDbkIsSUFBSSxJQUFJLENBQUMsa0JBQWtCLEVBQUU7WUFDM0IsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENB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