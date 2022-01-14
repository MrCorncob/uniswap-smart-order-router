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
    async doProcess({ flags }) {
        const { tokenIn: tokenInStr, tokenOut: tokenOutStr, amount: amountStr, exactIn, exactOut, recipient, debug, topN, topNTokenInOut, topNSecondHop, topNWithEachBaseToken, topNWithBaseToken, topNWithBaseTokenInSet, topNDirectSwaps, maxSwapsPerPath, minSplits, maxSplits, distributionPercent, chainId: chainIdNumb, protocols: protocolsStr, forceCrossProtocol, } = flags;
        if ((exactIn && exactOut) || (!exactIn && !exactOut)) {
            throw new Error('Must set either --exactIn or --exactOut.');
        }
        let protocols = [];
        if (protocolsStr) {
            try {
                protocols = lodash_1.default.map(protocolsStr.split(','), (protocolStr) => (0, protocols_1.TO_PROTOCOL)(protocolStr));
            }
            catch (err) {
                throw new Error(`Protocols invalid. Valid options: ${Object.values(router_sdk_1.Protocol)}`);
            }
        }
        const chainId = (0, src_1.ID_TO_CHAIN_ID)(chainIdNumb);
        const log = this.logger;
        const tokenProvider = this.tokenProvider;
        const router = this.router;
        const tokenAccessor = await tokenProvider.getTokens([
            tokenInStr,
            tokenOutStr,
        ]);
        // if the tokenIn str is 'ETH' or 'MATIC' or NATIVE_CURRENCY_STRING
        const tokenIn = tokenInStr in src_1.NativeCurrencyName
            ? (0, src_1.nativeOnChain)(chainId)
            : tokenAccessor.getTokenByAddress(tokenInStr);
        const tokenOut = tokenOutStr in src_1.NativeCurrencyName
            ? (0, src_1.nativeOnChain)(chainId)
            : tokenAccessor.getTokenByAddress(tokenOutStr);
        let swapRoutes;
        if (exactIn) {
            const amountIn = (0, src_1.parseAmount)(amountStr, tokenIn);
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
            const amountOut = (0, src_1.parseAmount)(amountStr, tokenOut);
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
exports.Quote = Quote;
Quote.description = 'Uniswap Smart Order Router CLI';
Quote.flags = Object.assign(Object.assign({}, base_command_1.BaseCommand.flags), { version: command_1.flags.version({ char: 'v' }), help: command_1.flags.help({ char: 'h' }), tokenIn: command_1.flags.string({ char: 'i', required: true }), tokenOut: command_1.flags.string({ char: 'o', required: true }), recipient: command_1.flags.string({ required: false }), amount: command_1.flags.string({ char: 'a', required: true }), exactIn: command_1.flags.boolean({ required: false }), exactOut: command_1.flags.boolean({ required: false }), protocols: command_1.flags.string({ required: false }), forceCrossProtocol: command_1.flags.boolean({ required: false, default: false }) });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVvdGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9jbGkvY29tbWFuZHMvcXVvdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsNENBQXFDO0FBQ3JDLG9EQUE2QztBQUM3QyxnREFBK0Q7QUFDL0Qsb0RBQTRCO0FBQzVCLG1DQUE4QjtBQUM5QixvREFBdUI7QUFDdkIsbUNBTW1CO0FBQ25CLHdEQUFxRDtBQUNyRCxrREFBNEM7QUFFNUMsZ0JBQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUVoQixlQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQztBQUNuQyxlQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsZUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBRWxFLE1BQWEsS0FBTSxTQUFRLDBCQUFXO0lBaUJwQyxLQUFLLENBQUMsU0FBUyxDQUFDLEVBQUMsS0FBSyxFQUFpQjtRQUNyQyxNQUFNLEVBQ0osT0FBTyxFQUFFLFVBQVUsRUFDbkIsUUFBUSxFQUFFLFdBQVcsRUFDckIsTUFBTSxFQUFFLFNBQVMsRUFDakIsT0FBTyxFQUNQLFFBQVEsRUFDUixTQUFTLEVBQ1QsS0FBSyxFQUNMLElBQUksRUFDSixjQUFjLEVBQ2QsYUFBYSxFQUNiLHFCQUFxQixFQUNyQixpQkFBaUIsRUFDakIsc0JBQXNCLEVBQ3RCLGVBQWUsRUFDZixlQUFlLEVBQ2YsU0FBUyxFQUNULFNBQVMsRUFDVCxtQkFBbUIsRUFDbkIsT0FBTyxFQUFFLFdBQVcsRUFDcEIsU0FBUyxFQUFFLFlBQVksRUFDdkIsa0JBQWtCLEdBQ25CLEdBQUcsS0FBSyxDQUFDO1FBRVYsSUFBSSxDQUFDLE9BQU8sSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUU7WUFDcEQsTUFBTSxJQUFJ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