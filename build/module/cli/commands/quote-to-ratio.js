import { flags } from '@oclif/command';
import { Ether, Fraction, Percent } from '@uniswap/sdk-core';
import { Position } from '@uniswap/v3-sdk';
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import { ID_TO_CHAIN_ID, parseAmount, SwapToRatioStatus, } from '../../src';
import { BaseCommand } from '../base-command';
dotenv.config();
ethers.utils.Logger.globalLogger();
ethers.utils.Logger.setLogLevel(ethers.utils.Logger.levels.DEBUG);
export class QuoteToRatio extends BaseCommand {
    async run() {
        const { flags } = this.parse(QuoteToRatio);
        const { chainId: chainIdNumb, token0: token0Str, token1: token1Str, token0Balance: token0BalanceStr, token1Balance: token1BalanceStr, feeAmount, tickLower, tickUpper, recipient, debug, topN, topNTokenInOut, topNSecondHop, topNWithEachBaseToken, topNWithBaseToken, topNWithBaseTokenInSet, maxSwapsPerPath, minSplits, maxSplits, distributionPercent, } = flags;
        const log = this.logger;
        const router = this.swapToRatioRouter;
        const tokenProvider = this.tokenProvider;
        const tokenAccessor = await tokenProvider.getTokens([token0Str, token1Str]);
        const chainId = ID_TO_CHAIN_ID(chainIdNumb);
        // TODO add support for polygon
        const token0 = token0Str == 'ETH'
            ? Ether.onChain(chainId)
            : tokenAccessor.getTokenByAddress(token0Str);
        const token1 = token1Str == 'ETH'
            ? Ether.onChain(chainId)
            : tokenAccessor.getTokenByAddress(token1Str);
        const token0Balance = parseAmount(token0BalanceStr, token0);
        const token1Balance = parseAmount(token1BalanceStr, token1);
        const poolAccessor = await this.poolProvider.getPools([[token0.wrapped, token1.wrapped, feeAmount]], { blockNumber: this.blockNumber });
        const pool = poolAccessor.getPool(token0.wrapped, token1.wrapped, feeAmount);
        if (!pool) {
            log.error(`Could not find pool. ${debug ? '' : 'Run in debug mode for more info'}.`);
            return;
        }
        const position = new Position({
            pool,
            tickUpper,
            tickLower,
            liquidity: 1,
        });
        let swapRoutes;
        swapRoutes = await router.routeToRatio(token0Balance, token1Balance, position, {
            ratioErrorTolerance: new Fraction(1, 100),
            maxIterations: 6,
        }, {
            addLiquidityOptions: {
                recipient: '0x0000000000000000000000000000000000000001',
            },
            swapOptions: {
                deadline: 100,
                recipient,
                slippageTolerance: new Percent(5, 10000),
            },
        }, {
            blockNumber: this.blockNumber,
            topN,
            topNTokenInOut,
            topNSecondHop,
            topNWithEachBaseToken,
            topNWithBaseToken,
            topNWithBaseTokenInSet,
            maxSwapsPerPath,
            minSplits,
            maxSplits,
            distributionPercent,
        });
        if (swapRoutes.status === SwapToRatioStatus.SUCCESS) {
            const { blockNumber, estimatedGasUsed, estimatedGasUsedQuoteToken, estimatedGasUsedUSD, gasPriceWei, methodParameters, quote, quoteGasAdjusted, route: routeAmounts, } = swapRoutes.result;
            this.logSwapResults(routeAmounts, quote, quoteGasAdjusted, estimatedGasUsedQuoteToken, estimatedGasUsedUSD, methodParameters, blockNumber, estimatedGasUsed, gasPriceWei);
            return;
        }
        else if (swapRoutes.status === SwapToRatioStatus.NO_ROUTE_FOUND) {
            log.error(`${swapRoutes.error}. ${debug ? '' : 'Run in debug mode for more info'}.`);
            return;
        }
        else if (swapRoutes.status === SwapToRatioStatus.NO_SWAP_NEEDED) {
            log.error(`no swap needed. ${debug ? '' : 'Run in debug mode for more info'}.`);
            return;
        }
    }
}
QuoteToRatio.description = 'Uniswap Smart Order Router CLI';
QuoteToRatio.flags = {
    ...BaseCommand.flags,
    version: flags.version({ char: 'v' }),
    help: flags.help({ char: 'h' }),
    token0: flags.string({ char: 'i', required: true }),
    token1: flags.string({ char: 'o', required: true }),
    feeAmount: flags.integer({ char: 'f', required: true }),
    token0Balance: flags.string({ required: true }),
    token1Balance: flags.string({ required: true }),
    recipient: flags.string({ required: true }),
    tickLower: flags.integer({ required: true }),
    tickUpper: flags.integer({ required: true }),
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVvdGUtdG8tcmF0aW8uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9jbGkvY29tbWFuZHMvcXVvdGUtdG8tcmF0aW8udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGdCQUFnQixDQUFDO0FBQ3ZDLE9BQU8sRUFBWSxLQUFLLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMzQyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUNoQyxPQUFPLEVBQ0wsY0FBYyxFQUNkLFdBQVcsRUFFWCxpQkFBaUIsR0FDbEIsTUFBTSxXQUFXLENBQUM7QUFDbkIsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBRTlDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUVoQixNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQztBQUNuQyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBRWxFLE1BQU0sT0FBTyxZQUFhLFNBQVEsV0FBVztJQWlCM0MsS0FBSyxDQUFDLEdBQUc7UUFDUCxNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUMzQyxNQUFNLEVBQ0osT0FBTyxFQUFFLFdBQVcsRUFDcEIsTUFBTSxFQUFFLFNBQVMsRUFDakIsTUFBTSxFQUFFLFNBQVMsRUFDakIsYUFBYSxFQUFFLGdCQUFnQixFQUMvQixhQUFhLEVBQUUsZ0JBQWdCLEVBQy9CLFNBQVMsRUFDVCxT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