"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.poolToString = exports.routeAmountToString = exports.routeAmountsToString = exports.routeToString = void 0;
const sdk_core_1 = require("@uniswap/sdk-core");
const v3_sdk_1 = require("@uniswap/v3-sdk");
const lodash_1 = __importDefault(require("lodash"));
const _1 = require(".");
const routeToString = (route) => {
    const isV3Route = (route) => route.pools != undefined;
    const routeStr = [];
    const tokens = isV3Route(route) ? route.tokenPath : route.path;
    const tokenPath = lodash_1.default.map(tokens, (token) => `${token.address}`);
    const pools = isV3Route(route) ? route.pools : route.pairs;
    const poolFeePath = lodash_1.default.map(pools, 
    // (pool) => `${pool instanceof Pool ? ` -- ${pool.fee / 10000}%` : ''} --> `
    (pool) => `${pool instanceof v3_sdk_1.Pool ? `${pool.fee}` : '0'}`);
    for (let i = 0; i < tokenPath.length - 1; i++) {
        let object = {
            "token_address_0": tokenPath[i],
            "token_address_1": tokenPath[i + 1],
            "fee": poolFeePath[i]
        };
        routeStr.push(object);
        // routeStr.push(tokenPath[i]);
        // if (i < poolFeePath.length) {
        //   routeStr.push(poolFeePath[i]);
        // }
    }
    // return routeStr.join('');
    return JSON.stringify(routeStr);
};
exports.routeToString = routeToString;
const routeAmountsToString = (routeAmounts) => {
    const total = lodash_1.default.reduce(routeAmounts, (total, cur) => {
        return total.add(cur.amount);
    }, _1.CurrencyAmount.fromRawAmount(routeAmounts[0].amount.currency, 0));
    const routeStrings = lodash_1.default.map(routeAmounts, ({ protocol, route, amount }) => {
        const portion = amount.divide(total);
        const percent = new sdk_core_1.Percent(portion.numerator, portion.denominator);
        // return `[${protocol}] ${percent.toFixed(2)}% = ${routeToString(route)}`;
        if (protocol !== undefined) {
        }
        if (percent !== undefined) {
        }
        return `${(0, exports.routeToString)(route)}`;
    });
    return lodash_1.default.join(routeStrings, ', ');
};
exports.routeAmountsToString = routeAmountsToString;
const routeAmountToString = (routeAmount) => {
    const { route, amount } = routeAmount;
    return `${amount.toExact()} = ${(0, exports.routeToString)(route)}`;
};
exports.routeAmountToString = routeAmountToString;
const poolToString = (p) => {
    return `${p.token0.symbol}/${p.token1.symbol}/${p.fee / 10000}%`;
};
exports.poolToString = poolToString;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm91dGVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL3V0aWwvcm91dGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUFBLGdEQUE0QztBQUM1Qyw0Q0FBdUM7QUFDdkMsb0RBQXVCO0FBQ3ZCLHdCQUFtQztBQUk1QixNQUFNLGFBQWEsR0FBRyxDQUFDLEtBQXdCLEVBQVUsRUFBRTtJQUNoRSxNQUFNLFNBQVMsR0FBRyxDQUFDLEtBQXdCLEVBQW9CLEVBQUUsQ0FDOUQsS0FBaUIsQ0FBQyxLQUFLLElBQUksU0FBUyxDQUFDO0lBQ3hDLE1BQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQztJQUNwQixNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUM7SUFDL0QsTUFBTSxTQUFTLEdBQUcsZ0JBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO0lBQy9ELE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQztJQUMzRCxNQUFNLFdBQVcsR0FBRyxnQkFBQyxDQUFDLEdBQUcsQ0FDdkIsS0FBSztJQUNMLDZFQUE2RTtJQUM3RSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsR0FBRyxJQUFJLFlBQVksYUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQzFELENBQUM7SUFJRixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsU0FBUyxDQUFDLE1BQU0sR0FB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