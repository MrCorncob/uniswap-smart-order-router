/// <reference types="../../cli/types/bunyan-debug-stream" />
import {CommonRoutesConfig} from '../common/common.routes.config';
import express from 'express';
import RequestDTOSchema from './qoute.dto.config';
// import JSBI from 'jsbi';
import {
  AlphaRouter,
  IRouter,
  ISwapToRatio, LegacyRouter,
  MetricLogger, RouteWithValidQuote,
  setGlobalMetric,
  SwapRoute, V3Route
} from "../../routers";
import {Protocol} from "@uniswap/router-sdk";
import _ from "lodash";
import {TO_PROTOCOL} from "../../util/protocols";
import {
  ID_TO_CHAIN_ID, ID_TO_PROVIDER,
  NativeCurrencyName,
  nativeOnChain,
  parseAmount, setGlobalLogger
} from "../../util";
import {
  Currency,
  CurrencyAmount,
  Percent,
  Token,
  TradeType
} from "@uniswap/sdk-core";
import {BigNumber, ethers} from "ethers";
import {default as bunyan, default as Logger} from "bunyan";
import {
  CachingGasStationProvider,
  CachingTokenListProvider,
  CachingTokenProviderWithFallback,
  EIP1559GasPriceProvider,
  GasPrice,
  ITokenProvider,
  IV3PoolProvider, LegacyGasPriceProvider,
  NodeJSCache,
  OnChainGasPriceProvider,
  TokenProvider,
  UniswapMulticallProvider,
  V3PoolProvider,
  V3QuoteProvider
} from "../../providers";
import bunyanDebugStream from "bunyan-debug-stream";
import NodeCache from "node-cache";
import DEFAULT_TOKEN_LIST from '@uniswap/default-token-list';
import {
  MethodParameters,
  // Pool
} from "@uniswap/v3-sdk";

// import { routeAmountsToString } from '../../util/routes';

ethers.utils.Logger.globalLogger();
ethers.utils.Logger.setLogLevel(ethers.utils.Logger.levels.DEBUG);

export class QuoteRoutes extends CommonRoutesConfig {
  private _log: Logger | null = null;
  private _router: IRouter<any> | null = null;
  private _swapToRatioRouter: ISwapToRatio<any, any> | null = null;
  private _tokenProvider: ITokenProvider | null = null;
  private _poolProvider: IV3PoolProvider | null = null;
  private _blockNumber: number | null = null;
  private _multicall2Provider: UniswapMulticallProvider | null = null;


  private getSwapResults(
    amountDecimals: string,
    routeAmounts: RouteWithValidQuote[],
    quote: CurrencyAmount<Currency>,
    quoteGasAdjusted: CurrencyAmount<Currency>,
    estimatedGasUsedQuoteToken: CurrencyAmount<Currency>,
    estimatedGasUsedUSD: CurrencyAmount<Currency>,
    methodParameters: MethodParameters | undefined,
    blockNumber: BigNumber,
    estimatedGasUsed: BigNumber,
    gasPriceWei: BigNumber
  ) {

    if (methodParameters != undefined  && estimatedGasUsed != undefined && gasPriceWei != undefined &&  blockNumber != undefined) {

    }

    // console.log("routeAmounts=>", JSON.stringify(routeAmounts));
    // console.log("amountDecimals=>", amountDecimals);

    // console.log("routeAmounts[0]!.amount=>", routeAmounts[0]!.amount.toFixed(10));


    // console.log("percent=>", routeAmounts[0]!.percent);

    // console.log("poolAddresses=>", routeAmounts[0]!.poolAddresses);

    // console.log("routeAmounts.length=>", routeAmounts.length);

    let routeArray = [];

    let routerStringArray = [];

    for (let i = 0; i < routeAmounts.length; i++) {


      const route = routeAmounts[i]

      const routerPool = route!.route as V3Route

      let poolArray = [];

      let routerStr = `[${route!.protocol }] ${route!.percent.toFixed(2)}% = `;


      for (let k = 0; k < routerPool!.pools.length; k++) {

        const pool = routerPool.pools[k];

        let poolStr = `${pool!.token0.symbol} -- ${pool!.fee / 10000}% --> ${pool!.token1.symbol}`;

        // console.log("amountString=>", route!.amount!.numerator.toString());
        // console.log("amountString=>", route!.amount!.toFixed(10));

        // protocol:
        interface RouteObject {
          [key: string]: any
        }


        let routeObject:RouteObject = {
          "type" : route!.protocol + '-pool',
          "poolAddress" : route!.poolAddresses[i],
          "percent": route!.percent,

          "rawQuote": route!.rawQuote.toString(),

          "fee": pool!.fee,
          "liquidity": pool!.liquidity.toString(),
          "sqrtRatioX96": pool!.sqrtRatioX96.toString(),
          "tickCurrent": pool!.tickCurrent,
          "tokenIn": pool!.token0,
          "tokenOut": pool!.token1,
        };

        if (routerPool!.pools.length == 1 ){

          let keyInt = 'amountIn';
          routeObject[keyInt] = route!.amount!.toFixed(10);

          let keyOut = 'amountOut';
          routeObject[keyOut] = route!.quote.toFixed(10);

        } else {

          if (k==0) {
            let keyInt = 'amountIn';
            routeObject[keyInt] = route!.amount!.toFixed(10);
          }

          if (k == 1) {
            let keyOut = 'amountOut';
            routeObject[keyOut] = route!.quote.toFixed(10);
          }

        }

        routerStr = `${routerStr}${poolStr}`

        poolArray.push(routeObject);
      }

      routeArray.push(poolArray)

      routerStringArray.push(routerStr)

    }

    // console.log("quote=>", JSBI.toNumber(quote.numerator));
    // console.log("quoteString=>", quote!.numerator.toString());





    let response = {
      // amount: ethers.utils.parseEther(amountDecimals).toString(),
      amountIn: amountDecimals,
      amountOut: quote.toFixed(10),
      amountOutRaw:quote!.numerator.toString(),

      blockNumber: blockNumber.toString(),
      estimatedGasUsed: estimatedGasUsed.toString(),
      gasPriceWei: gasPriceWei.toString(),
      gasAdjustedQuoteIn: quoteGasAdjusted.toFixed(10),
      gasUsedQuoteToken: estimatedGasUsedQuoteToken.toFixed(6),
      gasUsedUSD: estimatedGasUsedUSD.toFixed(6),
      route: routeArray,
      routerString: routerStringArray.join(', '),
    };

   return response;

  //   console.log("routeArray", routeArray);


  //   const pools = routeAmounts[0]!.route as V3Route
  //   const tokenPath = _.map(routeAmounts[0]!.tokenPath, (token) => `${token.address}`);

  //   const routeStr = [];

  //   const poolFeePath = _.map(pools.pools, (pool) => `${pool instanceof Pool ? `${pool.fee}` : '0'}`);



  //   for (let i = 0; i < tokenPath.length-1; i++) {

  //     let object = {
  //       "token_address_0" : tokenPath[i],
  //       "token_address_1" : tokenPath[i+1],
  //       "fee": poolFeePath[i]
  //     };

  //     routeStr.push(object);
  //   }

  //   let response = {
  //     // 'routeToString': routeAmountsToString(routeAmounts),
  //     amount: ethers.utils.parseEther(amountDecimals).toString(),
  //     amountDecimals: amountDecimals,
  //     blockNumber: blockNumber.toString(),
  //     estimatedGasUsed: estimatedGasUsed.toString(),
  //     gasPriceWei: gasPriceWei.toString(),
  //     'gasAdjustedQuoteIn': quoteGasAdjusted.toFixed(10),
  //     'gasUsedQuoteToken:': estimatedGasUsedQuoteToken.toFixed(6),
  //     'gasUsedUSD:': estimatedGasUsedUSD.toFixed(6),
  //     // quote: "30425068562906504830"
  //     // quoteDecimals: "30.42506856290650483"
  //     // quoteGasAdjusted: "30424380351955054160"
  //     // quoteGasAdjustedDecimals: "30.42438035195505416"
  //     // quoteId: "16d68"
  //     feePath: routeStr,
  //     'path': tokenPath,
  //     'quoteDecimals': quote.toFixed(10),

  //   };

  //  return response;
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
    } else {
      throw 'router not initialized';
    }
  }

  get swapToRatioRouter() {
    if (this._swapToRatioRouter) {
      return this._swapToRatioRouter;
    } else {
      throw 'swapToRatioRouter not initialized';
    }
  }

  get tokenProvider() {
    if (this._tokenProvider) {
      return this._tokenProvider;
    } else {
      throw 'tokenProvider not initialized';
    }
  }

  get poolProvider() {
    if (this._poolProvider) {
      return this._poolProvider;
    } else {
      throw 'poolProvider not initialized';
    }
  }

  get blockNumber() {
    if (this._blockNumber) {
      return this._blockNumber;
    } else {
      throw 'blockNumber not initialized';
    }
  }

  get multicall2Provider() {
    if (this._multicall2Provider) {
      return this._multicall2Provider;
    } else {
      throw 'multicall2 not initialized';
    }
  }
  constructor(app: express.Application) {
    super(app, 'QuoteRoutes');
  }

  async init({data}: { data: any }) {
    const {
      chainId: chainIdNumb,
      router: routerStr,
      debug,
      debugJSON,
      tokenListURI,
    } = data;

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

    const metricLogger: MetricLogger = new MetricLogger();
    setGlobalMetric(metricLogger);

    const chainId = ID_TO_CHAIN_ID(chainIdNumb);
    const chainProvider = ID_TO_PROVIDER(chainId);

    const provider = new ethers.providers.JsonRpcProvider(
      chainProvider,
      chainId
    );
    this._blockNumber = await provider.getBlockNumber();

    const tokenCache = new NodeJSCache<Token>(
      new NodeCache({ stdTTL: 3600, useClones: false })
    );

    let tokenListProvider: CachingTokenListProvider;
    if (tokenListURI) {
      tokenListProvider = await CachingTokenListProvider.fromTokenListURI(
        chainId,
        tokenListURI,
        tokenCache
      );
    } else {
      tokenListProvider = await CachingTokenListProvider.fromTokenList(
        chainId,
        DEFAULT_TOKEN_LIST,
        tokenCache
      );
    }

    const multicall2Provider = new UniswapMulticallProvider(chainId, provider);
    this._multicall2Provider = multicall2Provider;
    this._poolProvider = new V3PoolProvider(chainId, multicall2Provider);

    // initialize tokenProvider
    const tokenProviderOnChain = new TokenProvider(chainId, multicall2Provider);
    this._tokenProvider = new CachingTokenProviderWithFallback(
      chainId,
      tokenCache,
      tokenListProvider,
      tokenProviderOnChain
    );

    if (routerStr == 'legacy') {
      this._router = new LegacyRouter({
        chainId,
        multicall2Provider,
        poolProvider: new V3PoolProvider(chainId, multicall2Provider),
        quoteProvider: new V3QuoteProvider(
          chainId,
          provider,
          multicall2Provider
        ),
        tokenProvider: this.tokenProvider,
      });
    } else {
      const gasPriceCache = new NodeJSCache<GasPrice>(
        new NodeCache({ stdTTL: 15, useClones: true })
      );

      // const useDefaultQuoteProvider =
      //   chainId != ChainId.ARBITRUM_ONE && chainId != ChainId.ARBITRUM_RINKEBY;

      const router = new AlphaRouter({
        provider,
        chainId,
        multicall2Provider: multicall2Provider,
        gasPriceProvider: new CachingGasStationProvider(
          chainId,
          new OnChainGasPriceProvider(
            chainId,
            new EIP1559GasPriceProvider(provider),
            new LegacyGasPriceProvider(provider)
          ),
          gasPriceCache
        ),
      });

      this._swapToRatioRouter = router;
      this._router = router;
    }
  }

  async doProcess({flags}: { flags: any }): Promise<SwapRoute | null> {
    console.log('doProcess', flags)
    const {
      tokenIn: tokenInStr,
      tokenOut: tokenOutStr,
      amount: amountStr,
      exactIn,
      exactOut,
      recipient,
      debug,
      topN,
      topNTokenInOut,
      topNSecondHop,
      topNWithEachBaseToken,
      topNWithBaseToken,
      topNWithBaseTokenInSet,
      topNDirectSwaps,
      maxSwapsPerPath,
      minSplits,
      maxSplits,
      distributionPercent,
      chainId: chainIdNumb,
      protocols: protocolsStr,
      forceCrossProtocol,
    } = flags;

    if ((exactIn && exactOut) || (!exactIn && !exactOut)) {
      throw new Error('Must set either --exactIn or --exactOut.');
    }

    let protocols: Protocol[] = [];
    if (protocolsStr) {
      try {
        protocols = _.map(protocolsStr.split(','), (protocolStr) =>
          TO_PROTOCOL(protocolStr)
        );
      } catch (err) {
        throw new Error(
          `Protocols invalid. Valid options: ${Object.values(Protocol)}`
        );
      }
    }

    const chainId = ID_TO_CHAIN_ID(chainIdNumb);

    const log = this.logger;
    const tokenProvider = this.tokenProvider;
    const router = this.router;

    const tokenAccessor = await tokenProvider.getTokens([
      tokenInStr,
      tokenOutStr,
    ]);

    // if the tokenIn str is 'ETH' or 'MATIC' or NATIVE_CURRENCY_STRING
    const tokenIn: Currency =
      tokenInStr in NativeCurrencyName
        ? nativeOnChain(chainId)
        : tokenAccessor.getTokenByAddress(tokenInStr)!;
    const tokenOut: Currency =
      tokenOutStr in NativeCurrencyName
        ? nativeOnChain(chainId)
        : tokenAccessor.getTokenByAddress(tokenOutStr)!;

    let swapRoutes: SwapRoute | null;
    if (exactIn) {
      const amountIn = parseAmount(amountStr, tokenIn);
      swapRoutes = await router.route(
        amountIn,
        tokenOut,
        TradeType.EXACT_INPUT,
        recipient
          ? {
            deadline: 100,
            recipient,
            slippageTolerance: new Percent(5, 10_000),
          }
          : undefined,
        {
          blockNumber: this.blockNumber,
          v3PoolSelection: {
            topN,
            topNTokenInOut,
            topNSecondHop,
            topNWithEachBaseToken,
            topNWithBaseToken,
            topNWithBaseTokenInSet,
            topNDirectSwaps,
          },
          maxSwapsPerPath,
          minSplits,
          maxSplits,
          distributionPercent,
          protocols,
          forceCrossProtocol,
        }
      );
    } else {
      const amountOut = parseAmount(amountStr, tokenOut);
      swapRoutes = await router.route(
        amountOut,
        tokenIn,
        TradeType.EXACT_OUTPUT,
        recipient
          ? {
            deadline: 100,
            recipient,
            slippageTolerance: new Percent(5, 10_000),
          }
          : undefined,
        {
          blockNumber: this.blockNumber - 10,
          v3PoolSelection: {
            topN,
            topNTokenInOut,
            topNSecondHop,
            topNWithEachBaseToken,
            topNWithBaseToken,
            topNWithBaseTokenInSet,
            topNDirectSwaps,
          },
          maxSwapsPerPath,
          minSplits,
          maxSplits,
          distributionPercent,
          protocols,
          forceCrossProtocol,
        }
      );
    }

    if (!swapRoutes) {
      log.error(
        `Could not find route. ${
          debug ? '' : 'Run in debug mode for more info'
        }.`
      );
      return null;
    }


    return swapRoutes;
  }

  async getQuote(_req: express.Request, res: express.Response) {
    let requestBody = null;
    const that = this;
    try {
      requestBody = await RequestDTOSchema.QuoteRequestDTO.validateAsync(_req.body);
    }
    catch (err: any) {
      res.status(400).json({
        error: err.message
      });
      return;
    }

    try {
      // console.log("requestBody", requestBody);
      await this.init({data: requestBody});

      const result = await that.doProcess({flags: requestBody});

      // console.log("result=>", JSON.stringify(result))
      //console.log("routeAmounts=>", JSON.stringify(routeAmounts));

      if (!result) {
        res.status(400).json({
          error: 'no route found'
        });
        return;
      }

      const responseJson = this.getSwapResults(
        requestBody.amount,
        result?.route,
        result?.quote,
        result?.quoteGasAdjusted,
        result?.estimatedGasUsedQuoteToken,
        result?.estimatedGasUsedUSD,
        result?.methodParameters,
        result?.blockNumber,
        result?.estimatedGasUsed,
        result?.gasPriceWei);

      res.status(200).json({
        message: 'ok',
        data: responseJson
      });
      return;

    } catch (err: any) {
      res.status(500).json({
        error: err.message
      });
      console.error(err);
    }

  }

  configureRoutes() {

    this.app.route(`/api/quote`)
      .post(this.getQuote.bind(this));

    return this.app;
  }
}
