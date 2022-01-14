"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuoteToRatio = void 0;
const command_1 = require("@oclif/command");
const sdk_core_1 = require("@uniswap/sdk-core");
const v3_sdk_1 = require("@uniswap/v3-sdk");
const dotenv_1 = __importDefault(require("dotenv"));
const ethers_1 = require("ethers");
const src_1 = require("../../src");
const base_command_1 = require("../base-command");
dotenv_1.default.config();
ethers_1.ethers.utils.Logger.globalLogger();
ethers_1.ethers.utils.Logger.setLogLevel(ethers_1.ethers.utils.Logger.levels.DEBUG);
class QuoteToRatio extends base_command_1.BaseCommand {
    async run() {
        const { flags } = this.parse(QuoteToRatio);
        const { chainId: chainIdNumb, token0: token0Str, token1: token1Str, token0Balance: token0BalanceStr, token1Balance: token1BalanceStr, feeAmount, tickLower, tickUpper, recipient, debug, topN, topNTokenInOut, topNSecondHop, topNWithEachBaseToken, topNWithBaseToken, topNWithBaseTokenInSet, maxSwapsPerPath, minSplits, maxSplits, distributionPercent, } = flags;
        const log = this.logger;
        const router = this.swapToRatioRouter;
        const tokenProvider = this.tokenProvider;
        const tokenAccessor = await tokenProvider.getTokens([token0Str, token1Str]);
        const chainId = src_1.ID_TO_CHAIN_ID(chainIdNumb);
        // TODO add support for polygon
        const token0 = token0Str == 'ETH'
            ? sdk_core_1.Ether.onChain(chainId)
            : tokenAccessor.getTokenByAddress(token0Str);
        const token1 = token1Str == 'ETH'
            ? sdk_core_1.Ether.onChain(chainId)
            : tokenAccessor.getTokenByAddress(token1Str);
        const token0Balance = src_1.parseAmount(token0BalanceStr, token0);
        const token1Balance = src_1.parseAmount(token1BalanceStr, token1);
        const poolAccessor = await this.poolProvider.getPools([[token0.wrapped, token1.wrapped, feeAmount]], { blockNumber: this.blockNumber });
        const pool = poolAccessor.getPool(token0.wrapped, token1.wrapped, feeAmount);
        if (!pool) {
            log.error(`Could not find pool. ${debug ? '' : 'Run in debug mode for more info'}.`);
            return;
        }
        const position = new v3_sdk_1.Position({
            pool,
            tickUpper,
            tickLower,
            liquidity: 1,
        });
        let swapRoutes;
        swapRoutes = await router.routeToRatio(token0Balance, token1Balance, position, {
            ratioErrorTolerance: new sdk_core_1.Fraction(1, 100),
            maxIterations: 6,
        }, {
            addLiquidityOptions: {
                recipient: '0x0000000000000000000000000000000000000001',
            },
            swapOptions: {
                deadline: 100,
                recipient,
                slippageTolerance: new sdk_core_1.Percent(5, 10000),
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
        if (swapRoutes.status === src_1.SwapToRatioStatus.SUCCESS) {
            const { blockNumber, estimatedGasUsed, estimatedGasUsedQuoteToken, estimatedGasUsedUSD, gasPriceWei, methodParameters, quote, quoteGasAdjusted, route: routeAmounts, } = swapRoutes.result;
            this.logSwapResults(routeAmounts, quote, quoteGasAdjusted, estimatedGasUsedQuoteToken, estimatedGasUsedUSD, methodParameters, blockNumber, estimatedGasUsed, gasPriceWei);
            return;
        }
        else if (swapRoutes.status === src_1.SwapToRatioStatus.NO_ROUTE_FOUND) {
            log.error(`${swapRoutes.error}. ${debug ? '' : 'Run in debug mode for more info'}.`);
            return;
        }
        else if (swapRoutes.status === src_1.SwapToRatioStatus.NO_SWAP_NEEDED) {
            log.error(`no swap needed. ${debug ? '' : 'Run in debug mode for more info'}.`);
            return;
        }
    }
}
exports.QuoteToRatio = QuoteToRatio;
QuoteToRatio.description = 'Uniswap Smart Order Router CLI';
QuoteToRatio.flags = Object.assign(Object.assign({}, base_command_1.BaseCommand.flags), { version: command_1.flags.version({ char: 'v' }), help: command_1.flags.help({ char: 'h' }), token0: command_1.flags.string({ char: 'i', required: true }), token1: command_1.flags.string({ char: 'o', required: true }), feeAmount: command_1.flags.integer({ char: 'f', required: true }), token0Balance: command_1.flags.string({ required: true }), token1Balance: command_1.flags.string({ required: true }), recipient: command_1.flags.string({ required: true }), tickLower: command_1.flags.integer({ required: true }), tickUpper: command_1.flags.integer({ required: true }) });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVvdGUtdG8tcmF0aW8uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9jbGkvY29tbWFuZHMvcXVvdGUtdG8tcmF0aW8udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsNENBQXVDO0FBQ3ZDLGdEQUF1RTtBQUN2RSw0Q0FBMkM7QUFDM0Msb0RBQTRCO0FBQzVCLG1DQUFnQztBQUNoQyxtQ0FLbUI7QUFDbkIsa0RBQThDO0FBRTlDLGdCQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7QUFFaEIsZUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLENBQUM7QUFDbkMsZUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLGVBQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUVsRSxNQUFhLFlBQWEsU0FBUSwwQkFBVztJQWlCM0MsS0FBSyxDQUFDLEdBQUc7UUFDUCxNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUMzQyxNQUFNLEVBQ0osT0FBTyxFQUFFLFdBQVcsRUFDcEIsTUFBTSxFQUFFLFNBQVMsRUFDakIsTUFBTSxFQUFFLFNBQVMsRUFDakIsYUFBYSxFQUFFLGdCQUFnQixFQUMvQixhQUFhLEVBQUUsZ0JBQWdCLEVBQy9CLFNBQVMsRUFDVCxTQUFTLEVBQ1QsU0FBUyxFQUNULFNBQVMsRUFDVCxLQUFLLEVBQ0wsSUFBSSxFQUNKLGNBQWMsRUFDZCxhQUFhLEVBQ2IscUJBQXFCLEVBQ3JCLGlCQUFpQixFQUNqQixzQkFBc0IsRUFDdEIsZUFBZSxFQUNmLFNBQVMsRUFDVCxTQUFTLEVBQ1QsbUJBQW1CLEdBQ3BCLEdBQUcsS0FBSyxDQUFDO1FBRVYsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUN4QixNQUFNLE1BQU0sR0FBRyxJQUFJLENB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