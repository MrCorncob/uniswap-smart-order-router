import { TradeType } from '@uniswap/sdk-core';
import { InsufficientInputAmountError, InsufficientReservesError, } from '@uniswap/v2-sdk';
import { BigNumber } from 'ethers';
/**
 * Computes quotes for V2 off-chain. Quotes are computed using the balances
 * of the pools within each route provided.
 *
 * @export
 * @class V2QuoteProvider
 */
export class V2QuoteProvider {
    constructor() { }
    async getQuotesManyExactIn(amountIns, routes) {
        return this.getQuotes(amountIns, routes, TradeType.EXACT_INPUT);
    }
    async getQuotesManyExactOut(amountOuts, routes) {
        return this.getQuotes(amountOuts, routes, TradeType.EXACT_OUTPUT);
    }
    async getQuotes(amounts, routes, tradeType) {
        const routesWithQuotes = [];
        for (const route of routes) {
            const amountQuotes = [];
            for (const amount of amounts) {
                try {
                    if (tradeType == TradeType.EXACT_INPUT) {
                        let outputAmount = amount.wrapped;
                        for (const pair of route.pairs) {
                            const [outputAmountNew] = pair.getOutputAmount(outputAmount);
                            outputAmount = outputAmountNew;
                        }
                        amountQuotes.push({
                            amount,
                            quote: BigNumber.from(outputAmount.quotient.toString()),
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
                            quote: BigNumber.from(inputAmount.quotient.toString()),
                        });
                    }
                }
                catch (err) {
                    // Can fail to get quotes, e.g. throws InsufficientReservesError or InsufficientInputAmountError.
                    if (err instanceof InsufficientInputAmountError ||
                        err instanceof InsufficientReservesError) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVvdGUtcHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvcHJvdmlkZXJzL3YyL3F1b3RlLXByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUM5QyxPQUFPLEVBQ0wsNEJBQTRCLEVBQzVCLHlCQUF5QixHQUMxQixNQUFNLGlCQUFpQixDQUFDO0FBQ3pCLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxRQUFRLENBQUM7QUF3Qm5DOzs7Ozs7R0FNRztBQUNILE1BQU0sT0FBTyxlQUFlO0lBQzFCLGdCQUFlLENBQUM7SUFFVCxLQUFLLENBQUMsb0JBQW9CLENBQy9CLFNBQTJCLEVBQzNCLE1BQWlCO1FBRWpCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsTUFBTSxFQUFFLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNsRSxDQUFDO0lBRU0sS0FBSyxDQUFDLHFCQUFxQixDQUNoQyxVQUE0QixFQUM1QixNQUFpQjtRQUVqQixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUFFLE1BQU0sRUFBRSxTQUFTLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDcEUsQ0FBQztJQUVPLEtBQUssQ0FBQyxTQUFTLENBQ3JCLE9BQXlCLEVBQ3pCLE1BQWlCLEVBQ2pCLFNBQW9CO1FBRXBCLE1BQU0sZ0JBQWdCLEdBQXdCLEVBQUUsQ0FBQztRQUVqRCxLQUFLLE1BQU0sS0FBSyxJQUFJLE1BQU0sRUFBRTtZQUMxQixNQUFNLFlBQVksR0FBb0IsRUFBRSxDQUFDO1lBRXpDLEtBQUssTUFBTSxNQUFNLElBQUksT0FBTyxFQUFFO2dCQUM1QixJQUFJO29CQUNGLElBQUksU0FBUyxJQUFJLFNBQVMsQ0FBQyxXQUFXLEVBQUU7d0JBQ3RDLElBQUksWUFBWSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUM7d0JBRWxDLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxDQUFDLEtBQUssRUFBRTs0QkFDOUIsTUFBTSxDQUFDLGVBQWUsQ0FBQyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLENBQUM7NEJBQzdELFlBQVksR0FBRyxlQUFlLENBQUM7eUJBQ2hDO3dCQUVELFlBQVksQ0FBQyxJQUFJLENBQUM7NEJBQ2hCLE1BQU07NEJBQ04sS0FBSyxFQUFFLFNBQVMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQzt5QkFDeEQsQ0FBQyxDQUFDO3FCQUNKO3lCQUFNO3dCQUNMLElBQUksV0FBVyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUM7d0JBRWpDLEtBQUssSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUU7NEJBQ2hELE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFFLENBQUM7NEJBQzdCLENBQUMsV0FBVyxDQUFDLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsQ0FBQzt5QkFDbEQ7d0JBRUQsWUFBWSxDQUFDLElBQUksQ0FBQzs0QkFDaEIsTUFBTTs0QkFDTixLQUFLLEVBQUUsU0FBUyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUFDO3lCQUN2RCxDQUFDLENBQUM7cUJBQ0o7aUJBQ0Y7Z0JBQUMsT0FBTyxHQUFHLEVBQUU7b0JBQ1osaUdBQWlHO29CQUNqRyxJQUNFLEdBQUcsWUFBWSw0QkFBNEI7d0JBQzNDLEdBQUcsWUFBWSx5QkFBeUIsRUFDeEM7d0JBQ0EsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztxQkFDNUM7eUJBQU07d0JBQ0wsTUFBTSxHQUFHLENBQUM7cUJBQ1g7aUJBQ0Y7YUFDRjtZQUVELGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFDO1NBQzlDO1FBRUQsT0FBTztZQUNMLGdCQUFnQjtTQUNqQixDQUFDO0lBQ0osQ0FBQztDQUNGIn0=