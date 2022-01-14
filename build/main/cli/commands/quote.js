"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Quote = void 0;
const command_1 = require("@oclif/command");
const router_sdk_1 = require("@uniswap/router-sdk");
const sdk_core_1 = require("@uniswap/sdk-core");
const dotenv_1 = __importDefault(require("dotenv"));
const ethers_1 = require("ethers");
const lodash_1 = __importDefault(require("lodash"));
const src_1 = require("../../src");
const protocols_1 = require("../../src/util/protocols");
const base_command_1 = require("../base-command");
dotenv_1.default.config();
ethers_1.ethers.utils.Logger.globalLogger();
ethers_1.ethers.utils.Logger.setLogLevel(ethers_1.ethers.utils.Logger.levels.DEBUG);
class Quote extends base_command_1.BaseCommand {
    async run() {
        const { flags } = this.parse(Quote);
        const { tokenIn: tokenInStr, tokenOut: tokenOutStr, amount: amountStr, exactIn, exactOut, recipient, debug, topN, topNTokenInOut, topNSecondHop, topNWithEachBaseToken, topNWithBaseToken, topNWithBaseTokenInSet, topNDirectSwaps, maxSwapsPerPath, minSplits, maxSplits, distributionPercent, chainId: chainIdNumb, protocols: protocolsStr, forceCrossProtocol, } = flags;
        if ((exactIn && exactOut) || (!exactIn && !exactOut)) {
            throw new Error('Must set either --exactIn or --exactOut.');
        }
        let protocols = [];
        if (protocolsStr) {
            try {
                protocols = lodash_1.default.map(protocolsStr.split(','), (protocolStr) => protocols_1.TO_PROTOCOL(protocolStr));
            }
            catch (err) {
                throw new Error(`Protocols invalid. Valid options: ${Object.values(router_sdk_1.Protocol)}`);
            }
        }
        const chainId = src_1.ID_TO_CHAIN_ID(chainIdNumb);
        const log = this.logger;
        const tokenProvider = this.tokenProvider;
        const router = this.router;
        const tokenAccessor = await tokenProvider.getTokens([
            tokenInStr,
            tokenOutStr,
        ]);
        // if the tokenIn str is 'ETH' or 'MATIC' or NATIVE_CURRENCY_STRING
        const tokenIn = tokenInStr in src_1.NativeCurrencyName
            ? src_1.nativeOnChain(chainId)
            : tokenAccessor.getTokenByAddress(tokenInStr);
        const tokenOut = tokenOutStr in src_1.NativeCurrencyName
            ? src_1.nativeOnChain(chainId)
            : tokenAccessor.getTokenByAddress(tokenOutStr);
        let swapRoutes;
        if (exactIn) {
            const amountIn = src_1.parseAmount(amountStr, tokenIn);
            swapRoutes = await router.route(amountIn, tokenOut, sdk_core_1.TradeType.EXACT_INPUT, recipient
                ? {
                    deadline: 100,
                    recipient,
                    slippageTolerance: new sdk_core_1.Percent(5, 10000),
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
            const amountOut = src_1.parseAmount(amountStr, tokenOut);
            swapRoutes = await router.route(amountOut, tokenIn, sdk_core_1.TradeType.EXACT_OUTPUT, recipient
                ? {
                    deadline: 100,
                    recipient,
                    slippageTolerance: new sdk_core_1.Percent(5, 10000),
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
exports.Quote = Quote;
Quote.description = 'Uniswap Smart Order Router CLI';
Quote.flags = Object.assign(Object.assign({}, base_command_1.BaseCommand.flags), { version: command_1.flags.version({ char: 'v' }), help: command_1.flags.help({ char: 'h' }), tokenIn: command_1.flags.string({ char: 'i', required: true }), tokenOut: command_1.flags.string({ char: 'o', required: true }), recipient: command_1.flags.string({ required: false }), amount: command_1.flags.string({ char: 'a', required: true }), exactIn: command_1.flags.boolean({ required: false }), exactOut: command_1.flags.boolean({ required: false }), protocols: command_1.flags.string({ required: false }), forceCrossProtocol: command_1.flags.boolean({ required: false, default: false }) });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVvdGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9jbGkvY29tbWFuZHMvcXVvdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsNENBQXVDO0FBQ3ZDLG9EQUErQztBQUMvQyxnREFBaUU7QUFDakUsb0RBQTRCO0FBQzVCLG1DQUFnQztBQUNoQyxvREFBdUI7QUFDdkIsbUNBTW1CO0FBQ25CLHdEQUF1RDtBQUN2RCxrREFBOEM7QUFFOUMsZ0JBQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUVoQixlQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQztBQUNuQyxlQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsZUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBRWxFLE1BQWEsS0FBTSxTQUFRLDBCQUFXO0lBaUJwQyxLQUFLLENBQUMsR0FBRztRQUNQLE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3BDLE1BQU0sRUFDSixPQUFPLEVBQUUsVUFBVSxFQUNuQixRQUFRLEVBQUUsV0FBVyxFQUNyQixNQUFNLEVBQUUsU0FBUyxFQUNqQixPQUFPLEVBQ1AsUUFBUSxFQUNSLFNBQVMsRUFDVCxLQUFLLEVBQ0wsSUFBSSxFQUNKLGNBQWMsRUFDZCxhQUFhLEVBQ2IscUJBQXFCLEVBQ3JCLGlCQUFpQixFQUNqQixzQkFBc0IsRUFDdEIsZUFBZSxFQUNmLGVBQWUsRUFDZixTQUFTLEVBQ1QsU0FBUyxFQUNULG1CQUFtQixFQUNuQixPQUFPLEVBQUUsV0FBVyxFQUNwQixTQUFTLEVBQUUsWUFBWSxFQUN2QixrQkFBa0IsR0FDbkIsR0FBRyxLQUFLLENBQUM7UUFFVixJQUFJLENBQUMsT0FBTyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRTtZQUNwRCxNQUFNLElBQUksS0FBSyxDQUFDLDBDQUEwQyxDQUFDLENBQUM7U0FDN0Q7UUFFRCxJQUFJLFNBQVMsR0FBZSxFQUFFLENBQUM7UUFDL0IsSUFBSSxZQUFZLEVBQUU7WUFDaEIsSUFBSTtnQkFDRixTQUFTLEdBQUcsZ0JBQUMsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQ3pELHVCQUFXLENBQUMsV0FBVyxDQUFDLENBQ3pCLENBQUM7YUFDSDtZQUFDLE9BQU8sR0FBRyxFQUFFO2dCQUNaLE1BQU0sSUFBSSxLQUFLLENBQ2IscUNBQXFDLE1BQU0sQ0FBQyxNQUFNLENBQUMscUJBQVEsQ0FBQyxFQUFFLENBQy9ELENBQUM7YUFDSDtTQUNGO1FBRUQsTUFBTSxPQUFPLEdBQUcsb0JBQWMsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUU1QyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO1FBQ3hCLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUM7UUFDekMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUUzQixNQUFNLGFBQWEsR0FBRyxNQUFNLGFBQWEsQ0FBQyxTQUFTLENBQUM7WUFDbEQsVUFBVTtZQUNWLFdBQVc7U0FDWixDQUFDLENBQUM7UUFFSCxtRUFBbUU7UUFDbkUsTUFBTSxPQUFPLEdBQ1gsVUFBVSxJQUFJLHdCQUFrQjtZQUM5QixDQUFDLENBQUMsbUJBQWEsQ0FBQyxPQUFPLENBQUM7WUFDeEIsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLENBQUUsQ0FBQztRQUNuRCxNQUFNLFFBQVEsR0FDWixXQUFXLElBQUksd0JBQWtCO1lBQy9CLENBQUMsQ0FBQyxtQkFBYSxDQUFDLE9BQU8sQ0FBQztZQUN4QixDQUFDLENBQUMsYUFBYSxDQUFDLGlCQUFpQixDQUFDLFdBQVcsQ0FBRSxDQUFDO1FBRXBELElBQUksVUFBNEIsQ0FBQztRQUNqQyxJQUFJLE9BQU8sRUFBRTtZQUNYLE1BQU0sUUFBUSxHQUFHLGlCQUFXLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ2pELFVBQVUsR0FBRyxNQUFNLE1BQU0sQ0FBQyxLQUFLLENBQzdCLFFBQVEsRUFDUixRQUFRLEVBQ1Isb0JBQVMsQ0FBQyxXQUFXLEVBQ3JCLFNBQVM7Z0JBQ1AsQ0FBQyxDQUFDO29CQUNFLFFBQVEsRUFBRSxHQUFHO29CQUNiLFNBQVM7b0JBQ1QsaUJBQWlCLEVBQUUsSUFBSSxrQkFBTyxDQUFDLENBQUMsRUFBRSxLQUFNLENBQUM7aUJBQzFDO2dCQUNILENBQUMsQ0FBQyxTQUFTLEVBQ2I7Z0JBQ0UsV0FBVyxFQUFFLElBQUksQ0FBQyxXQUFXO2dCQUM3QixlQUFlLEVBQUU7b0JBQ2YsSUFBSTtvQkFDSixjQUFjO29CQUNkLGFBQWE7b0JBQ2IscUJBQXFCO29CQUNyQixpQkFBaUI7b0JBQ2pCLHNCQUFzQjtvQkFDdEIsZUFBZTtpQkFDaEI7Z0JBQ0QsZUFBZTtnQkFDZixTQUFTO2dCQUNULFNBQVM7Z0JBQ1QsbUJBQW1CO2dCQUNuQixTQUFTO2dCQUNULGtCQUFrQjthQUNuQixDQUNGLENBQUM7U0FDSDthQUFNO1lBQ0wsTUFBTSxTQUFTLEdBQUcsaUJBQVcsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDbkQsVUFBVSxHQUFHLE1BQU0sTUFBTSxDQUFDLEtBQUssQ0FDN0IsU0FBUyxFQUNULE9BQU8sRUFDUCxvQkFBUyxDQUFDLFlBQVksRUFDdEIsU0FBUztnQkFDUCxDQUFDLENBQUM7b0JBQ0UsUUFBUSxFQUFFLEdBQUc7b0JBQ2IsU0FBUztvQkFDVCxpQkFBaUIsRUFBRSxJQUFJLGtCQUFPLENBQUMsQ0FBQyxFQUFFLEtBQU0sQ0FBQztpQkFDMUM7Z0JBQ0gsQ0FBQyxDQUFDLFNBQVMsRUFDYjtnQkFDRSxXQUFXLEVBQUUsSUFBSSxDQUFDLFdBQVcsR0FBRyxFQUFFO2dCQUNsQyxlQUFlLEVBQUU7b0JBQ2YsSUFBSTtvQkFDSixjQUFjO29CQUNkLGFBQWE7b0JBQ2IscUJBQXFCO29CQUNyQixpQkFBaUI7b0JBQ2pCLHNCQUFzQjtvQkFDdEIsZUFBZTtpQkFDaEI7Z0JBQ0QsZUFBZTtnQkFDZixTQUFTO2dCQUNULFNBQVM7Z0JBQ1QsbUJBQW1CO2dCQUNuQixTQUFTO2dCQUNULGtCQUFrQjthQUNuQixDQUNGLENBQUM7U0FDSDtRQUVELElBQUksQ0FBQyxVQUFVLEVBQUU7WUFDZixHQUFHLENBQUMsS0FBSyxDQUNQLHlCQUNFLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxpQ0FDZixHQUFHLENBQ0osQ0FBQztZQUNGLE9BQU87U0FDUjtRQUVELE1BQU0sRUFDSixXQUFXLEVBQ1gsZ0JBQWdCLEVBQ2hCLDBCQUEwQixFQUMxQixtQkFBbUIsRUFDbkIsV0FBVyxFQUNYLGdCQUFnQixFQUNoQixLQUFLLEVBQ0wsZ0JBQWdCLEVBQ2hCLEtBQUssRUFBRSxZQUFZLEdBQ3BCLEdBQUcsVUFBVSxDQUFDO1FBRWYsSUFBSSxDQUFDLGNBQWMsQ0FDakIsWUFBWSxFQUNaLEtBQUssRUFDTCxnQkFBZ0IsRUFDaEIsMEJBQTBCLEVBQzFCLG1CQUFtQixFQUNuQixnQkFBZ0IsRUFDaEIsV0FBVyxFQUNYLGdCQUFnQixFQUNoQixXQUFXLENBQ1osQ0FBQztJQUNKLENBQUM7O0FBcExILHNCQXFMQztBQXBMUSxpQkFBVyxHQUFHLGdDQUFnQyxDQUFDO0FBRS9DLFdBQUssbUNBQ1AsMEJBQVcsQ0FBQyxLQUFLLEtBQ3BCLE9BQU8sRUFBRSxlQUFLLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQ3JDLElBQUksRUFBRSxlQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQy9CLE9BQU8sRUFBRSxlQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFDcEQsUUFBUSxFQUFFLGVBQUssQ0FBQyxNQUFNLENBQUMsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUNyRCxTQUFTLEVBQUUsZUFBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUM1QyxNQUFNLEVBQUUsZUFBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLEVBQ25ELE9BQU8sRUFBRSxlQUFLLENBQUMsT0FBTyxDQUFDLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQzNDLFFBQVEsRUFBRSxlQUFLLENBQUMsT0FBTyxDQUFDLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQzVDLFNBQVMsRUFBRSxlQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQzVDLGtCQUFrQixFQUFFLGVBQUssQ0FBQyxPQUFPLENBQUMsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsQ0FBQyxJQUN0RSJ9