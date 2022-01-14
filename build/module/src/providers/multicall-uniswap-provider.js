import _ from 'lodash';
import stats from 'stats-lite';
import { UniswapInterfaceMulticall__factory } from '../types/v3/factories/UniswapInterfaceMulticall__factory';
import { ChainId } from '../util';
import { UNISWAP_MULTICALL_ADDRESS } from '../util/addresses';
import { log } from '../util/log';
import { IMulticallProvider, } from './multicall-provider';
const contractAddressByChain = {
    [ChainId.MAINNET]: UNISWAP_MULTICALL_ADDRESS,
    [ChainId.RINKEBY]: UNISWAP_MULTICALL_ADDRESS,
    [ChainId.KOVAN]: UNISWAP_MULTICALL_ADDRESS,
    [ChainId.ROPSTEN]: UNISWAP_MULTICALL_ADDRESS,
    [ChainId.GÖRLI]: UNISWAP_MULTICALL_ADDRESS,
};
/**
 * The UniswapMulticall contract has added functionality for limiting the amount of gas
 * that each call within the multicall can consume. This is useful for operations where
 * a call could consume such a large amount of gas that it causes the node to error out
 * with an out of gas error.
 *
 * @export
 * @class UniswapMulticallProvider
 */
export class UniswapMulticallProvider extends IMulticallProvider {
    constructor(chainId, provider, gasLimitPerCall = 1000000, multicallAddressOverride = UNISWAP_MULTICALL_ADDRESS) {
        super();
        this.chainId = chainId;
        this.provider = provider;
        this.gasLimitPerCall = gasLimitPerCall;
        this.multicallAddressOverride = multicallAddressOverride;
        const multicallAddress = multicallAddressOverride
            ? multicallAddressOverride
            : contractAddressByChain[this.chainId];
        if (!multicallAddress) {
            throw new Error(`No address for Uniswap Multicall Contract on chain id: ${chainId}`);
        }
        this.multicallContract = UniswapInterfaceMulticall__factory.connect(multicallAddress, this.provider);
    }
    async callSameFunctionOnMultipleContracts(params) {
        var _a;
        const { addresses, contractInterface, functionName, functionParams, providerConfig, } = params;
        const blockNumberOverride = (_a = providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.blockNumber) !== null && _a !== void 0 ? _a : undefined;
        const fragment = contractInterface.getFunction(functionName);
        const callData = contractInterface.encodeFunctionData(fragment, functionParams);
        const calls = _.map(addresses, (address) => {
            return {
                target: address,
                callData,
                gasLimit: this.gasLimitPerCall,
            };
        });
        log.debug({ calls }, `About to multicall for ${functionName} across ${addresses.length} addresses`);
        const { blockNumber, returnData: aggregateResults } = await this.multicallContract.callStatic.multicall(calls, {
            blockTag: blockNumberOverride,
        });
        const results = [];
        for (let i = 0; i < aggregateResults.length; i++) {
            const { success, returnData } = aggregateResults[i];
            // Return data "0x" is sometimes returned for invalid calls.
            if (!success || returnData.length <= 2) {
                log.debug({ result: aggregateResults[i] }, `Invalid result calling ${functionName} on address ${addresses[i]}`);
                results.push({
                    success: false,
                    returnData,
                });
                continue;
            }
            results.push({
                success: true,
                result: contractInterface.decodeFunctionResult(fragment, returnData),
            });
        }
        log.debug({ results }, `Results for multicall on ${functionName} across ${addresses.length} addresses as of block ${blockNumber}`);
        return { blockNumber, results };
    }
    async callSameFunctionOnContractWithMultipleParams(params) {
        var _a, _b;
        const { address, contractInterface, functionName, functionParams, additionalConfig, providerConfig, } = params;
        const fragment = contractInterface.getFunction(functionName);
        const gasLimitPerCall = (_a = additionalConfig === null || additionalConfig === void 0 ? void 0 : additionalConfig.gasLimitPerCallOverride) !== null && _a !== void 0 ? _a : this.gasLimitPerCall;
        const blockNumberOverride = (_b = providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.blockNumber) !== null && _b !== void 0 ? _b : undefined;
        const calls = _.map(functionParams, (functionParam) => {
            const callData = contractInterface.encodeFunctionData(fragment, functionParam);
            return {
                target: address,
                callData,
                gasLimit: gasLimitPerCall,
            };
        });
        log.debug({ calls }, `About to multicall for ${functionName} at address ${address} with ${functionParams.length} different sets of params`);
        const { blockNumber, returnData: aggregateResults } = await this.multicallContract.callStatic.multicall(calls, {
            blockTag: blockNumberOverride,
        });
        const results = [];
        const gasUsedForSuccess = [];
        for (let i = 0; i < aggregateResults.length; i++) {
            const { success, returnData, gasUsed } = aggregateResults[i];
            // Return data "0x" is sometimes returned for invalid pools.
            if (!success || returnData.length <= 2) {
                log.debug({ result: aggregateResults[i] }, `Invalid result calling ${functionName} with params ${functionParams[i]}`);
                results.push({
                    success: false,
                    returnData,
                });
                continue;
            }
            gasUsedForSuccess.push(gasUsed.toNumber());
            results.push({
                success: true,
                result: contractInterface.decodeFunctionResult(fragment, returnData),
            });
        }
        log.debug({ results, functionName, address }, `Results for multicall for ${functionName} at address ${address} with ${functionParams.length} different sets of params. Results as of block ${blockNumber}`);
        return {
            blockNumber,
            results,
            approxGasUsedPerSuccessCall: stats.percentile(gasUsedForSuccess, 99),
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXVsdGljYWxsLXVuaXN3YXAtcHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvcHJvdmlkZXJzL211bHRpY2FsbC11bmlzd2FwLXByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBLE9BQU8sQ0FBQyxNQUFNLFFBQVEsQ0FBQztBQUN2QixPQUFPLEtBQUssTUFBTSxZQUFZLENBQUM7QUFDL0IsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFFOUcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLFNBQVMsQ0FBQztBQUNsQyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUM5RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQ2xDLE9BQU8sRUFHTCxrQkFBa0IsR0FFbkIsTUFBTSxzQkFBc0IsQ0FBQztBQU05QixNQUFNLHNCQUFzQixHQUFzQztJQUNoRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSx5QkFBeUI7SUFDNUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUseUJBQXlCO0lBQzVDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLHlCQUF5QjtJQUMxQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSx5QkFBeUI7SUFDNUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUseUJBQXlCO0NBQzNDLENBQUM7QUFFRjs7Ozs7Ozs7R0FRRztBQUNILE1BQU0sT0FBTyx3QkFBeUIsU0FBUSxrQkFBMEM7SUFHdEYsWUFDWSxPQUFnQixFQUNoQixRQUFnQyxFQUNoQyxrQkFBa0IsT0FBUyxFQUMzQiwyQkFBMkIseUJBQXlCO1FBRTlELEtBQUssRUFBRSxDQUFDO1FBTEUsWUFBTyxHQUFQLE9BQU8sQ0FBUztRQUNoQixhQUFRLEdBQVIsUUFBUSxDQUF3QjtRQUNoQyxvQkFBZSxHQUFmLGVBQWUsQ0FBWTtRQUMzQiw2QkFBd0IsR0FBeEIsd0JBQXdCLENBQTRCO1FBRzlELE1BQU0sZ0JBQWdCLEdBQUcsd0JBQXdCO1lBQy9DLENBQUMsQ0FBQyx3QkFBd0I7WUFDMUIsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUV6QyxJQUFJLENBQUMsZ0JBQWdCLEVBQUU7WUFDckIsTUFBTSxJQUFJLEtBQUssQ0FDYiwwREFBMEQsT0FBTyxFQUFFLENBQ3BFLENBQUM7U0FDSDtRQUVELElBQUksQ0FBQyxpQkFBaUIsR0FBRyxrQ0FBa0MsQ0FBQyxPQUFPLENBQ2pFLGdCQUFnQixFQUNoQixJQUFJLENBQUMsUUFBUSxDQUNkLENBQUM7SUFDSixDQUFDO0lBRU0sS0FBSyxDQUFDLG1DQUFtQyxDQUk5QyxNQUFrRTs7UUFLbEUsTUFBTSxFQUNKLFNBQVMsRUFDVCxpQkFBaUIsRUFDakIsWUFBWSxFQUNaLGNBQWMsRUFDZCxjQUFjLEdBQ2YsR0FBRyxNQUFNLENBQUM7UUFFWCxNQUFNLG1CQUFtQixHQUFHLE1BQUEsY0FBYyxhQUFkLGNBQWMsdUJBQWQsY0FBYyxDQUFFLFdBQVcsbUNBQUksU0FBUyxDQUFDO1FBRXJFLE1BQU0sUUFBUSxHQUFHLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUM3RCxNQUFNLFFBQVEsR0FBRyxpQkFBaUIsQ0FBQyxrQkFBa0IsQ0FDbkQsUUFBUSxFQUNSLGNBQWMsQ0FDZixDQUFDO1FBRUYsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxPQUFPLEVBQUUsRUFBRTtZQUN6QyxPQUFPO2dCQUNMLE1BQU0sRUFBRSxPQUFPO2dCQUNmLFFBQVE7Z0JBQ1IsUUFBUSxFQUFFLElBQUksQ0FBQyxlQUFlO2FBQy9CLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztRQUVILEdBQUcsQ0FBQyxLQUFLLENBQ1AsRUFBRSxLQUFLLEVBQUUsRUFDVCwwQkFBMEIsWUFBWSxXQUFXLFNBQVMsQ0FBQyxNQUFNLFlBQVksQ0FDOUUsQ0FBQztRQUVGLE1BQU0sRUFBRSxXQUFXLEVBQUUsVUFBVSxFQUFFLGdCQUFnQixFQUFFLEdBQ2pELE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFO1lBQ3ZELFFBQVEsRUFBRSxtQkFBbUI7U0FDOUIsQ0FBQyxDQUFDO1FBRUwsTUFBTSxPQUFPLEdBQXNCLEVBQUUsQ0FBQztRQUV0QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ2hELE1BQU0sRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQyxDQUFFLENBQUM7WUFFckQsNERBQTREO1lBQzVELElBQUksQ0FBQyxPQUFPLElBQUksVUFBVSxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUU7Z0JBQ3RDLEdBQUcsQ0FBQyxLQUFLLENBQ1AsRUFBRSxNQUFNLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFDL0IsMEJBQTBCLFlBQVksZUFBZSxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FDcEUsQ0FBQztnQkFDRixPQUFPLENBQUMsSUFBSSxDQUFDO29CQUNYLE9BQU8sRUFBRSxLQUFLO29CQUNkLFVBQVU7aUJBQ1gsQ0FBQyxDQUFDO2dCQUNILFNBQVM7YUFDVjtZQUVELE9BQU8sQ0FBQyxJQUFJLENBQUM7Z0JBQ1gsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsTUFBTSxFQUFFLGlCQUFpQixDQUFDLG9CQUFvQixDQUM1QyxRQUFRLEVBQ1IsVUFBVSxDQUNXO2FBQ3hCLENBQUMsQ0FBQztTQUNKO1FBRUQsR0FBRyxDQUFDLEtBQUssQ0FDUCxFQUFFLE9BQU8sRUFBRSxFQUNYLDRCQUE0QixZQUFZLFdBQVcsU0FBUyxDQUFDLE1BQU0sMEJBQTBCLFdBQVcsRUFBRSxDQUMzRyxDQUFDO1FBRUYsT0FBTyxFQUFFLFdBQVcsRUFBRSxPQUFPLEVBQUUsQ0FBQztJQUNsQyxDQUFDO0lBRU0sS0FBSyxDQUFDLDRDQUE0QyxDQUl2RCxNQUdDOztRQU1ELE1BQU0sRUFDSixPQUFPLEVBQ1AsaUJBQWlCLEVBQ2pCLFlBQVksRUFDWixjQUFjLEVBQ2QsZ0JBQWdCLEVBQ2hCLGNBQWMsR0FDZixHQUFHLE1BQU0sQ0FBQztRQUNYLE1BQU0sUUFBUSxHQUFHLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUU3RCxNQUFNLGVBQWUsR0FDbkIsTUFBQSxnQkFBZ0IsYUFBaEIsZ0JBQWdCLHVCQUFoQixnQkFBZ0IsQ0FBRSx1QkFBdUIsbUNBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQztRQUNwRSxNQUFNLG1CQUFtQixHQUFHLE1BQUEsY0FBYyxhQUFkLGNBQWMsdUJBQWQsY0FBYyxDQUFFLFdBQVcsbUNBQUksU0FBUyxDQUFDO1FBRXJFLE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFLENBQUMsYUFBYSxFQUFFLEVBQUU7WUFDcEQsTUFBTSxRQUFRLEdBQUcsaUJBQWlCLENBQUMsa0JBQWtCLENBQ25ELFFBQVEsRUFDUixhQUFhLENBQ2QsQ0FBQztZQUVGLE9BQU87Z0JBQ0wsTUFBTSxFQUFFLE9BQU87Z0JBQ2YsUUFBUTtnQkFDUixRQUFRLEVBQUUsZUFBZTthQUMxQixDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFFSCxHQUFHLENBQUMsS0FBSyxDQUNQLEVBQUUsS0FBSyxFQUFFLEVBQ1QsMEJBQTBCLFlBQVksZUFBZSxPQUFPLFNBQVMsY0FBYyxDQUFDLE1BQU0sMkJBQTJCLENBQ3RILENBQUM7UUFFRixNQUFNLEVBQUUsV0FBVyxFQUFFLFVBQVUsRUFBRSxnQkFBZ0IsRUFBRSxHQUNqRCxNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRTtZQUN2RCxRQUFRLEVBQUUsbUJBQW1CO1NBQzlCLENBQUMsQ0FBQztRQUVMLE1BQU0sT0FBTyxHQUFzQixFQUFFLENBQUM7UUFFdEMsTUFBTSxpQkFBaUIsR0FBYSxFQUFFLENBQUM7UUFDdkMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUNoRCxNQUFNLEVBQUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsR0FBRyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUUsQ0FBQztZQUU5RCw0REFBNEQ7WUFDNUQsSUFBSSxDQUFDLE9BQU8sSUFBSSxVQUFVLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRTtnQkFDdEMsR0FBRyxDQUFDLEtBQUssQ0FDUCxFQUFFLE1BQU0sRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUMvQiwwQkFBMEIsWUFBWSxnQkFBZ0IsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQzFFLENBQUM7Z0JBQ0YsT0FBTyxDQUFDLElBQUksQ0FBQztvQkFDWCxPQUFPLEVBQUUsS0FBSztvQkFDZCxVQUFVO2lCQUNYLENBQUMsQ0FBQztnQkFDSCxTQUFTO2FBQ1Y7WUFFRCxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7WUFFM0MsT0FBTyxDQUFDLElBQUksQ0FBQztnQkFDWCxPQUFPLEVBQUUsSUFBSTtnQkFDYixNQUFNLEVBQUUsaUJBQWlCLENBQUMsb0JBQW9CLENBQzVDLFFBQVEsRUFDUixVQUFVLENBQ1c7YUFDeEIsQ0FBQyxDQUFDO1NBQ0o7UUFFRCxHQUFHLENBQUMsS0FBSyxDQUNQLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxPQUFPLEVBQUUsRUFDbEMsNkJBQTZCLFlBQVksZUFBZSxPQUFPLFNBQVMsY0FBYyxDQUFDLE1BQU0sa0RBQWtELFdBQVcsRUFBRSxDQUM3SixDQUFDO1FBQ0YsT0FBTztZQUNMLFdBQVc7WUFDWCxPQUFPO1lBQ1AsMkJBQTJCLEVBQUUsS0FBSyxDQUFDLFVBQVUsQ0FBQyxpQkFBaUIsRUFBRSxFQUFFLENBQUM7U0FDckUsQ0FBQztJQUNKLENBQUM7Q0FDRiJ9