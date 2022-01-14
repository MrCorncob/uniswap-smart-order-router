import { flags } from '@oclif/command';
import { Protocol } from '@uniswap/router-sdk';
import { Percent, TradeType } from '@uniswap/sdk-core';
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import _ from 'lodash';
import { ID_TO_CHAIN_ID, NativeCurrencyName, nativeOnChain, parseAmount, } from '../../src';
import { TO_PROTOCOL } from '../../src/util/protocols';
import { BaseCommand } from '../base-command';
dotenv.config();
ethers.utils.Logger.globalLogger();
ethers.utils.Logger.setLogLevel(ethers.utils.Logger.levels.DEBUG);
export class Quote extends BaseCommand {
    async run() {
        const { flags } = this.parse(Quote);
        const { tokenIn: tokenInStr, tokenOut: tokenOutStr, amount: amountStr, exactIn, exactOut, recipient, debug, topN, topNTokenInOut, topNSecondHop, topNWithEachBaseToken, topNWithBaseToken, topNWithBaseTokenInSet, topNDirectSwaps, maxSwapsPerPath, minSplits, maxSplits, distributionPercent, chainId: chainIdNumb, protocols: protocolsStr, forceCrossProtocol, } = flags;
        if ((exactIn && exactOut) || (!exactIn && !exactOut)) {
            throw new Error('Must set either --exactIn or --exactOut.');
        }
        let protocols = [];
        if (protocolsStr) {
            try {
                protocols = _.map(protocolsStr.split(','), (protocolStr) => TO_PROTOCOL(protocolStr));
            }
            catch (err) {
                throw new Error(`Protocols invalid. Valid options: ${Object.values(Protocol)}`);
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
        const tokenIn = tokenInStr in NativeCurrencyName
            ? nativeOnChain(chainId)
            : tokenAccessor.getTokenByAddress(tokenInStr);
        const tokenOut = tokenOutStr in NativeCurrencyName
            ? nativeOnChain(chainId)
            : tokenAccessor.getTokenByAddress(tokenOutStr);
        let swapRoutes;
        if (exactIn) {
            const amountIn = parseAmount(amountStr, tokenIn);
            swapRoutes = await router.route(amountIn, tokenOut, TradeType.EXACT_INPUT, recipient
                ? {
                    deadline: 100,
                    recipient,
                    slippageTolerance: new Percent(5, 10000),
                }
                : undefined, {
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
            });
        }
        else {
            const amountOut = parseAmount(amountStr, tokenOut);
            swapRoutes = await router.route(amountOut, tokenIn, TradeType.EXACT_OUTPUT, recipient
                ? {
                    deadline: 100,
                    recipient,
                    slippageTolerance: new Percent(5, 10000),
                }
                : undefined, {
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
            });
        }
        if (!swapRoutes) {
            log.error(`Could not find route. ${debug ? '' : 'Run in debug mode for more info'}.`);
            return;
        }
        const { blockNumber, estimatedGasUsed, estimatedGasUsedQuoteToken, estimatedGasUsedUSD, gasPriceWei, methodParameters, quote, quoteGasAdjusted, route: routeAmounts, } = swapRoutes;
        this.logSwapResults(routeAmounts, quote, quoteGasAdjusted, estimatedGasUsedQuoteToken, estimatedGasUsedUSD, methodParameters, blockNumber, estimatedGasUsed, gasPriceWei);
    }
}
Quote.description = 'Uniswap Smart Order Router CLI';
Quote.flags = {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVvdGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9jbGkvY29tbWFuZHMvcXVvdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQ3ZDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUMvQyxPQUFPLEVBQVksT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ2pFLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQ2hDLE9BQU8sQ0FBQyxNQUFNLFFBQVEsQ0FBQztBQUN2QixPQUFPLEVBQ0wsY0FBYyxFQUNkLGtCQUFrQixFQUNsQixhQUFhLEVBQ2IsV0FBVyxHQUVaLE1BQU0sV0FBVyxDQUFDO0FBQ25CLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUN2RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFFOUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBRWhCLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFDO0FBQ25DLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7QUFFbEUsTUFBTSxPQUFPLEtBQU0sU0FBUSxXQUFXO0lBaUJwQyxLQUFLLENBQUMsR0FBRztRQUNQLE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sRUFDSixPQUFPLEVBQUUsVUFBVSxFQUNuQixRQUFRLEVBQUUsV0FBVyxFQUNyQixNQUFNLEVBQUUsU0FBUyxFQUNqQixP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