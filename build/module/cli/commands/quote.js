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
    async doProcess({ flags }) {
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
            return null;
        }
        return swapRoutes;
    }
    async run() {
        const { flags } = this.parse(Quote);
        const swapRoutes = await this.doProcess({ flags: flags });
        if (!swapRoutes) {
            console.log(JSON.stringify({
                error: 'no route found'
            }));
            return;
        }
        if (swapRoutes.route && swapRoutes.quote) {
            return this.logSwapResults(swapRoutes === null || swapRoutes === void 0 ? void 0 : swapRoutes.route, swapRoutes === null || swapRoutes === void 0 ? void 0 : swapRoutes.quote, swapRoutes === null || swapRoutes === void 0 ? void 0 : swapRoutes.quoteGasAdjusted, swapRoutes === null || swapRoutes === void 0 ? void 0 : swapRoutes.estimatedGasUsedQuoteToken, swapRoutes === null || swapRoutes === void 0 ? void 0 : swapRoutes.estimatedGasUsedUSD, swapRoutes === null || swapRoutes === void 0 ? void 0 : swapRoutes.methodParameters, swapRoutes === null || swapRoutes === void 0 ? void 0 : swapRoutes.blockNumber, swapRoutes === null || swapRoutes === void 0 ? void 0 : swapRoutes.estimatedGasUsed, swapRoutes === null || swapRoutes === void 0 ? void 0 : swapRoutes.gasPriceWei);
        }
    }
    async runRestful() {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVvdGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9jbGkvY29tbWFuZHMvcXVvdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFDLEtBQUssRUFBQyxNQUFNLGdCQUFnQixDQUFDO0FBQ3JDLE9BQU8sRUFBQyxRQUFRLEVBQUMsTUFBTSxxQkFBcUIsQ0FBQztBQUM3QyxPQUFPLEVBQVcsT0FBTyxFQUFFLFNBQVMsRUFBQyxNQUFNLG1CQUFtQixDQUFDO0FBQy9ELE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUMsTUFBTSxFQUFDLE1BQU0sUUFBUSxDQUFDO0FBQzlCLE9BQU8sQ0FBQyxNQUFNLFFBQVEsQ0FBQztBQUN2QixPQUFPLEVBQ0wsY0FBYyxFQUNkLGtCQUFrQixFQUNsQixhQUFhLEVBQ2IsV0FBVyxHQUVaLE1BQU0sV0FBVyxDQUFDO0FBQ25CLE9BQU8sRUFBQyxXQUFXLEVBQUMsTUFBTSwwQkFBMEIsQ0FBQztBQUNyRCxPQUFPLEVBQUMsV0FBVyxFQUFDLE1BQU0saUJBQWlCLENBQUM7QUFFNUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBRWhCLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFDO0FBQ25DLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7QUFFbEUsTUFBTSxPQUFPLEtBQU0sU0FBUSxXQUFXO0lBaUJwQyxLQUFLLENBQUMsU0FBUyxDQUFDLEVBQUMsS0FBSyxFQUFpQjtRQUNyQyxNQUFNLEVBQ0osT0FBTyxFQUFFLFVBQVUsRUFDbkIsUUFBUSxFQUFFLFdBQVcsRUFDckIsTUFBTSxFQUFFLFNBQVMsRUFDakIsT0FBTyxFQUNQLFFBQVEsRUFDUixTQUFTLEVBQ1QsS0FBSyxFQUNMLElBQUks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