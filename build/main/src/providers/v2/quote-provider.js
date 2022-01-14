"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V2QuoteProvider = void 0;
const sdk_core_1 = require("@uniswap/sdk-core");
const v2_sdk_1 = require("@uniswap/v2-sdk");
const ethers_1 = require("ethers");
/**
 * Computes quotes for V2 off-chain. Quotes are computed using the balances
 * of the pools within each route provided.
 *
 * @export
 * @class V2QuoteProvider
 */
class V2QuoteProvider {
    constructor() { }
    async getQuotesManyExactIn(amountIns, routes) {
        return this.getQuotes(amountIns, routes, sdk_core_1.TradeType.EXACT_INPUT);
    }
    async getQuotesManyExactOut(amountOuts, routes) {
        return this.getQuotes(amountOuts, routes, sdk_core_1.TradeType.EXACT_OUTPUT);
    }
    async getQuotes(amounts, routes, tradeType) {
        const routesWithQuotes = [];
        for (const route of routes) {
            const amountQuotes = [];
            for (const amount of amounts) {
                try {
                    if (tradeType == sdk_core_1.TradeType.EXACT_INPUT) {
                        let outputAmount = amount.wrapped;
                        for (const pair of route.pairs) {
                            const [outputAmountNew] = pair.getOutputAmount(outputAmount);
                            outputAmount = outputAmountNew;
                        }
                        amountQuotes.push({
                            amount,
                            quote: ethers_1.BigNumber.from(outputAmount.quotient.toString()),
                        });
                    }
                    else {
                        let inputAmount = amount.wrapped;
                        for (let i = route.pairs.length - 1; i >= 0; i--) {
                            const pair = route.pairs[i];
                            [inputAmount] = pair.getInputAmount(inputAmount);
                        }
                        amountQuotes.push({
                            amount,
                            quote: ethers_1.BigNumber.from(inputAmount.quotient.toString()),
                        });
                    }
                }
                catch (err) {
                    // Can fail to get quotes, e.g. throws InsufficientReservesError or InsufficientInputAmountError.
                    if (err instanceof v2_sdk_1.InsufficientInputAmountError ||
                        err instanceof v2_sdk_1.InsufficientReservesError) {
                        amountQuotes.push({ amount, quote: null });
                    }
                    else {
                        throw err;
                    }
                }
            }
            routesWithQuotes.push([route, amountQuotes]);
        }
        return {
            routesWithQuotes,
        };
    }
}
exports.V2QuoteProvider = V2QuoteProvider;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVvdGUtcHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvcHJvdmlkZXJzL3YyL3F1b3RlLXByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLGdEQUE4QztBQUM5Qyw0Q0FHeUI7QUFDekIsbUNBQW1DO0FBd0JuQzs7Ozs7O0dBTUc7QUFDSCxNQUFhLGVBQWU7SUFDMUIsZ0JBQWUsQ0FBQztJQUVULEtBQUssQ0FBQyxvQkFBb0IsQ0FDL0IsU0FBMkIsRUFDM0IsTUFBaUI7UUFFakIsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxNQUFNLEVBQUUsb0JBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNsRSxDQUFDO0lBRU0sS0FBSyxDQUFDLHFCQUFxQixDQUNoQyxVQUE0QixFQUM1QixNQUFpQjtRQUVqQixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUFFLE1BQU0sRUFBRSxvQkFBUyxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQ3BFLENBQUM7SUFFTyxLQUFLLENBQUMsU0FBUyxDQUNyQixPQUF5QixFQUN6QixNQUFpQixFQUNqQixTQUFvQjtRQUVwQixNQUFNLGdCQUFnQixHQUF3QixFQUFFLENBQUM7UUFFakQsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUU7WUFDMUIsTUFBTSxZQUFZLEdBQW9CLEVBQUUsQ0FBQztZQUV6QyxLQUFLLE1BQU0sTUFBTSxJQUFJLE9BQU8sRUFBRTtnQkFDNUIsSUFBSTtvQkFDRixJQUFJLFNBQVMsSUFBSSxvQkFBUyxDQUFDLFdBQVcsRUFBRTt3QkFDdEMsSUFBSSxZQUFZLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQzt3QkFFbEMsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLENBQUMsS0FBSyxFQUFFOzRCQUM5QixNQUFNLENBQUMsZUFBZSxDQUFDLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxZQUFZLENBQUMsQ0FBQzs0QkFDN0QsWUFBWSxHQUFHLGVBQWUsQ0FBQzt5QkFDaEM7d0JBRUQsWUFBWSxDQUFDLElBQUksQ0FBQzs0QkFDaEIsTUFBTTs0QkFDTixLQUFLLEVBQUUsa0JBQVMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQzt5QkFDeEQsQ0FBQyxDQUFDO3FCQUNKO3lCQUFNO3dCQUNMLElBQUksV0FBVyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUM7d0JBRWpDLEtBQUssSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7NEJBQ2hELE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFFLENBQUM7NEJBQzdCLENBQUMsV0FBVyxDQUFDLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsQ0FBQzt5QkFDbEQ7d0JBRUQsWUFBWSxDQUFDLElBQUksQ0FBQzs0QkFDaEIsTUFBTTs0QkFDTixLQUFLLEVBQUUsa0JBQVMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQzt5QkFDdkQsQ0FBQyxDQUFDO3FCQUNKO2lCQUNGO2dCQUFDLE9BQU8sR0FBRyxFQUFFO29CQUNaLGlHQUFpRztvQkFDakcsSUFDRSxHQUFHLFlBQVkscUNBQTRCO3dCQUMzQyxHQUFHLFlBQVksa0NBQXlCLEVBQ3hDO3dCQUNBLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7cUJBQzVDO3lCQUFNO3dCQUNMLE1BQU0sR0FBRyxDQUFDO3FCQUNYO2lCQUNGO2FBQ0Y7WUFFRCxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQztTQUM5QztRQUVELE9BQU87WUFDTCxnQkFBZ0I7U0FDakIsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQTFFRCwwQ0EwRUMifQ==