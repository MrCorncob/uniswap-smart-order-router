import {flags} from '@oclif/command';
import {Protocol} from '@uniswap/router-sdk';
import {Currency, Percent, TradeType} from '@uniswap/sdk-core';
import dotenv from 'dotenv';
import {ethers} from 'ethers';
import _ from 'lodash';
import {
  ID_TO_CHAIN_ID,
  NativeCurrencyName,
  nativeOnChain,
  parseAmount,
  SwapRoute,
} from '../../src';
import {TO_PROTOCOL} from '../../src/util/protocols';
import {BaseCommand} from '../base-command';

dotenv.config();

ethers.utils.Logger.globalLogger();
ethers.utils.Logger.setLogLevel(ethers.utils.Logger.levels.DEBUG);

export class Quote extends BaseCommand {
  static description = 'Uniswap Smart Order Router CLI';

  static flags = {
    ...BaseCommand.flags,
    version: flags.version({ char: 'v' }),
    help: flags.help({ char: 'h' }),
    tokenIn: flags.string({ char: 'i', required: true }),
    tokenOut: flags.string({ char: 'o', required: true }),
    recipient: flags.string({ required: false }),
    amount: flags.string({ char: 'a', required: true }),
    exactIn: flags.boolean({ required: false }),
    exactOut: flags.boolean({ required: false }),
    protocols: flags.string({ required: false }),
    forceCrossProtocol: flags.boolean({ required: false, default: false }),
  };

  async doProcess({flags}: { flags: any }): Promise<SwapRoute | null> {
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

  async run() {
    const { flags } = this.parse(Quote);
    const swapRoutes = await this.doProcess({flags: flags});

    if (!swapRoutes) {
      console.log(JSON.stringify({
        error: 'no route found'
      }))
      return;
    }

    if (swapRoutes.route && swapRoutes.quote) {
      return this.logSwapResults(
        swapRoutes?.route,
        swapRoutes?.quote,
        swapRoutes?.quoteGasAdjusted,
        swapRoutes?.estimatedGasUsedQuoteToken,
        swapRoutes?.estimatedGasUsedUSD,
        swapRoutes?.methodParameters,
        swapRoutes?.blockNumber,
        swapRoutes?.estimatedGasUsed,
        swapRoutes?.gasPriceWei
      );
    }

  }

  async runRestful() {

  }
}
