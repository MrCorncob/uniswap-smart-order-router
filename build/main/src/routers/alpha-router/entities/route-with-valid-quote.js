"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.V3RouteWithValidQuote = exports.V2RouteWithValidQuote = void 0;
const router_sdk_1 = require("@uniswap/router-sdk");
const sdk_core_1 = require("@uniswap/sdk-core");
const lodash_1 = __importDefault(require("lodash"));
const amounts_1 = require("../../../util/amounts");
const routes_1 = require("../../../util/routes");
/**
 * Represents a quote for swapping on a V2 only route. Contains all information
 * such as the route used, the amount specified by the user, the type of quote
 * (exact in or exact out), the quote itself, and gas estimates.
 *
 * @export
 * @class V2RouteWithValidQuote
 */
class V2RouteWithValidQuote {
    constructor({ amount, rawQuote, percent, route, gasModel, quoteToken, tradeType, v2PoolProvider, }) {
        this.protocol = router_sdk_1.Protocol.V2;
        this.amount = amount;
        this.rawQuote = rawQuote;
        this.quote = amounts_1.CurrencyAmount.fromRawAmount(quoteToken, rawQuote.toString());
        this.percent = percent;
        this.route = route;
        this.gasModel = gasModel;
        this.quoteToken = quoteToken;
        this.tradeType = tradeType;
        const { gasEstimate, gasCostInToken, gasCostInUSD } = this.gasModel.estimateGasCost(this);
        this.gasCostInToken = gasCostInToken;
        this.gasCostInUSD = gasCostInUSD;
        this.gasEstimate = gasEstimate;
        // If its exact out, we need to request *more* of the input token to account for the gas.
        if (this.tradeType == sdk_core_1.TradeType.EXACT_INPUT) {
            const quoteGasAdjusted = this.quote.subtract(gasCostInToken);
            this.quoteAdjustedForGas = quoteGasAdjusted;
        }
        else {
            const quoteGasAdjusted = this.quote.add(gasCostInToken);
            this.quoteAdjustedForGas = quoteGasAdjusted;
        }
        this.poolAddresses = lodash_1.default.map(route.pairs, (p) => v2PoolProvider.getPoolAddress(p.token0, p.token1).poolAddress);
        this.tokenPath = this.route.path;
    }
    toString() {
        return `${this.percent.toFixed(2)}% QuoteGasAdj[${this.quoteAdjustedForGas.toExact()}] Quote[${this.quote.toExact()}] Gas[${this.gasEstimate.toString()}] = ${(0, routes_1.routeToString)(this.route)}`;
    }
}
exports.V2RouteWithValidQuote = V2RouteWithValidQuote;
/**
 * Represents a quote for swapping on a V3 only route. Contains all information
 * such as the route used, the amount specified by the user, the type of quote
 * (exact in or exact out), the quote itself, and gas estimates.
 *
 * @export
 * @class V3RouteWithValidQuote
 */
class V3RouteWithValidQuote {
    constructor({ amount, rawQuote, sqrtPriceX96AfterList, initializedTicksCrossedList, quoterGasEstimate, percent, route, gasModel, quoteToken, tradeType, v3PoolProvider, }) {
        this.protocol = router_sdk_1.Protocol.V3;
        this.amount = amount;
        this.rawQuote = rawQuote;
        this.sqrtPriceX96AfterList = sqrtPriceX96AfterList;
        this.initializedTicksCrossedList = initializedTicksCrossedList;
        this.quoterGasEstimate = quoterGasEstimate;
        this.quote = amounts_1.CurrencyAmount.fromRawAmount(quoteToken, rawQuote.toString());
        this.percent = percent;
        this.route = route;
        this.gasModel = gasModel;
        this.quoteToken = quoteToken;
        this.tradeType = tradeType;
        const { gasEstimate, gasCostInToken, gasCostInUSD } = this.gasModel.estimateGasCost(this);
        this.gasCostInToken = gasCostInToken;
        this.gasCostInUSD = gasCostInUSD;
        this.gasEstimate = gasEstimate;
        // If its exact out, we need to request *more* of the input token to account for the gas.
        if (this.tradeType == sdk_core_1.TradeType.EXACT_INPUT) {
            const quoteGasAdjusted = this.quote.subtract(gasCostInToken);
            this.quoteAdjustedForGas = quoteGasAdjusted;
        }
        else {
            const quoteGasAdjusted = this.quote.add(gasCostInToken);
            this.quoteAdjustedForGas = quoteGasAdjusted;
        }
        this.poolAddresses = lodash_1.default.map(route.pools, (p) => v3PoolProvider.getPoolAddress(p.token0, p.token1, p.fee).poolAddress);
        this.tokenPath = this.route.tokenPath;
    }
    toString() {
        return `${this.percent.toFixed(2)}% QuoteGasAdj[${this.quoteAdjustedForGas.toExact()}] Quote[${this.quote.toExact()}] Gas[${this.gasEstimate.toString()}] = ${(0, routes_1.routeToString)(this.route)}`;
    }
}
exports.V3RouteWithValidQuote = V3RouteWithValidQuote;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGUtd2l0aC12YWxpZC1xdW90ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9yb3V0ZXJzL2FscGhhLXJvdXRlci9lbnRpdGllcy9yb3V0ZS13aXRoLXZhbGlkLXF1b3RlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLG9EQUErQztBQUMvQyxnREFBcUQ7QUFFckQsb0RBQXVCO0FBR3ZCLG1EQUF1RDtBQUN2RCxpREFBcUQ7QUFpRHJEOzs7Ozs7O0dBT0c7QUFDSCxNQUFhLHFCQUFxQjtJQTBCaEMsWUFBWSxFQUNWLE1BQU0sRUFDTixRQUFRLEVBQ1IsT0FBTyxFQUNQLEtBQUssRUFDTCxRQUFRLEVBQ1IsVUFBVSxFQUNWLFNBQVMsRUFDVCxjQUFjLEdBQ2M7UUFsQ2QsYUFBUSxHQUFHLHFCQUFRLENBQUMsRUFBRSxDQUFDO1FBbUNyQyxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQixJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztRQUN6QixJQUFJLENBQUMsS0FBSyxHQUFHLHdCQUFjLENBQUMsYUFBYSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUMzRSxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUN2QixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztRQUNuQixJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztRQUN6QixJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQztRQUM3QixJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztRQUUzQixNQUFNLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxZQUFZLEVBQUUsR0FDakQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFdEMsSUFBSSxDQUFDLGNBQWMsR0FBRyxjQUFjLENBQUM7UUFDckMsSUFB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