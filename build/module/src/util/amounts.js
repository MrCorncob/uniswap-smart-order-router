import { CurrencyAmount as CurrencyAmountRaw, } from '@uniswap/sdk-core';
import { FeeAmount } from '@uniswap/v3-sdk';
import { parseUnits } from 'ethers/lib/utils';
import JSBI from 'jsbi';
export class CurrencyAmount extends CurrencyAmountRaw {
}
// Try to parse a user entered amount for a given token
export function parseAmount(value, currency) {
    const typedValueParsed = parseUnits(value, currency.decimals).toString();
    return CurrencyAmount.fromRawAmount(currency, JSBI.BigInt(typedValueParsed));
}
export function parseFeeAmount(feeAmountStr) {
    switch (feeAmountStr) {
        case '10000':
            return FeeAmount.HIGH;
        case '3000':
            return FeeAmount.MEDIUM;
        case '500':
            return FeeAmount.LOW;
        case '100':
            return FeeAmount.LOWEST;
        default:
            throw new Error(`Fee amount ${feeAmountStr} not supported.`);
    }
}
export function unparseFeeAmount(feeAmount) {
    switch (feeAmount) {
        case FeeAmount.HIGH:
            return '10000';
        case FeeAmount.MEDIUM:
            return '3000';
        case FeeAmount.LOW:
            return '500';
        case FeeAmount.LOWEST:
            return '100';
        default:
            throw new Error(`Fee amount ${feeAmount} not supported.`);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW1vdW50cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy91dGlsL2Ftb3VudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUVMLGNBQWMsSUFBSSxpQkFBaUIsR0FDcEMsTUFBTSxtQkFBbUIsQ0FBQztBQUMzQixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDNUMsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQzlDLE9BQU8sSUFBSSxNQUFNLE1BQU0sQ0FBQztBQUV4QixNQUFNLE9BQU8sY0FBZSxTQUFRLGlCQUEyQjtDQUFHO0FBRWxFLHVEQUF1RDtBQUN2RCxNQUFNLFVBQVUsV0FBVyxDQUFDLEtBQWEsRUFBRSxRQUFrQjtJQUMzRCxNQUFNLGdCQUFnQixHQUFHLFVBQVUsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBQ3pFLE9BQU8sY0FBYyxDQUFDLGFBQWEsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7QUFDL0UsQ0FBQztBQUVELE1BQU0sVUFBVSxjQUFjLENBQUMsWUFBb0I7SUFDakQsUUFBUSxZQUFZLEVBQUU7UUFDcEIsS0FBSyxPQUFPO1lBQ1YsT0FBTyxTQUFTLENBQUMsSUFBSSxDQUFDO1FBQ3hCLEtBQUssTUFBTTtZQUNULE9BQU8sU0FBUyxDQUFDLE1BQU0sQ0FBQztRQUMxQixLQUFLLEtBQUs7WUFDUixPQUFPLFNBQVMsQ0FBQyxHQUFHLENBQUM7UUFDdkIsS0FBSyxLQUFLO1lBQ1IsT0FBTyxTQUFTLENBQUMsTUFBTSxDQUFDO1FBQzFCO1lBQ0UsTUFBTSxJQUFJLEtBQUssQ0FBQyxjQUFjLFlBQVksaUJBQWlCLENBQUMsQ0FBQztLQUNoRTtBQUNILENBQUM7QUFFRCxNQUFNLFVBQVUsZ0JBQWdCLENBQUMsU0FBb0I7SUFDbkQsUUFBUSxTQUFTLEVBQUU7UUFDakIsS0FBSyxTQUFTLENBQUMsSUFBSTtZQUNqQixPQUFPLE9BQU8sQ0FBQztRQUNqQixLQUFLLFNBQVMsQ0FBQyxNQUFNO1lBQ25CLE9BQU8sTUFBTSxDQUFDO1FBQ2hCLEtBQUssU0FBUyxDQUFDLEdBQUc7WUFDaEIsT0FBTyxLQUFLLENBQUM7UUFDZixLQUFLLFNBQVMsQ0FBQyxNQUFNO1lBQ25CLE9BQU8sS0FBSyxDQUFDO1FBQ2Y7WUFDRSxNQUFNLElBQUksS0FBSyxDQUFDLGNBQWMsU0FBUyxpQkFBaUIsQ0FBQyxDQUFDO0tBQzdEO0FBQ0gsQ0FBQyJ9