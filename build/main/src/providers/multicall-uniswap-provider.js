"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UniswapMulticallProvider = void 0;
const lodash_1 = __importDefault(require("lodash"));
const stats_lite_1 = __importDefault(require("stats-lite"));
const UniswapInterfaceMulticall__factory_1 = require("../types/v3/factories/UniswapInterfaceMulticall__factory");
const util_1 = require("../util");
const addresses_1 = require("../util/addresses");
const log_1 = require("../util/log");
const multicall_provider_1 = require("./multicall-provider");
const contractAddressByChain = {
    [util_1.ChainId.MAINNET]: addresses_1.UNISWAP_MULTICALL_ADDRESS,
    [util_1.ChainId.RINKEBY]: addresses_1.UNISWAP_MULTICALL_ADDRESS,
    [util_1.ChainId.KOVAN]: addresses_1.UNISWAP_MULTICALL_ADDRESS,
    [util_1.ChainId.ROPSTEN]: addresses_1.UNISWAP_MULTICALL_ADDRESS,
    [util_1.ChainId.GÖRLI]: addresses_1.UNISWAP_MULTICALL_ADDRESS,
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
class UniswapMulticallProvider extends multicall_provider_1.IMulticallProvider {
    constructor(chainId, provider, gasLimitPerCall = 1000000, multicallAddressOverride = addresses_1.UNISWAP_MULTICALL_ADDRESS) {
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
        this.multicallContract = UniswapInterfaceMulticall__factory_1.UniswapInterfaceMulticall__factory.connect(multicallAddress, this.provider);
    }
    async callSameFunctionOnMultipleContracts(params) {
        var _a;
        const { addresses, contractInterface, functionName, functionParams, providerConfig, } = params;
        const blockNumberOverride = (_a = providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.blockNumber) !== null && _a !== void 0 ? _a : undefined;
        const fragment = contractInterface.getFunction(functionName);
        const callData = contractInterface.encodeFunctionData(fragment, functionParams);
        const calls = lodash_1.default.map(addresses, (address) => {
            return {
                target: address,
                callData,
                gasLimit: this.gasLimitPerCall,
            };
        });
        log_1.log.debug({ calls }, `About to multicall for ${functionName} across ${addresses.length} addresses`);
        const { blockNumber, returnData: aggregateResults } = await this.multicallContract.callStatic.multicall(calls, {
            blockTag: blockNumberOverride,
        });
        const results = [];
        for (let i = 0; i < aggregateResults.length; i++) {
            const { success, returnData } = aggregateResults[i];
            // Return data "0x" is sometimes returned for invalid calls.
            if (!success || returnData.length <= 2) {
                log_1.log.debug({ result: aggregateResults[i] }, `Invalid result calling ${functionName} on address ${addresses[i]}`);
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
        log_1.log.debug({ results }, `Results for multicall on ${functionName} across ${addresses.length} addresses as of block ${blockNumber}`);
        return { blockNumber, results };
    }
    async callSameFunctionOnContractWithMultipleParams(params) {
        var _a, _b;
        const { address, contractInterface, functionName, functionParams, additionalConfig, providerConfig, } = params;
        const fragment = contractInterface.getFunction(functionName);
        const gasLimitPerCall = (_a = additionalConfig === null || additionalConfig === void 0 ? void 0 : additionalConfig.gasLimitPerCallOverride) !== null && _a !== void 0 ? _a : this.gasLimitPerCall;
        const blockNumberOverride = (_b = providerConfig === null || providerConfig === void 0 ? void 0 : providerConfig.blockNumber) !== null && _b !== void 0 ? _b : undefined;
        const calls = lodash_1.default.map(functionParams, (functionParam) => {
            const callData = contractInterface.encodeFunctionData(fragment, functionParam);
            return {
                target: address,
                callData,
                gasLimit: gasLimitPerCall,
            };
        });
        log_1.log.debug({ calls }, `About to multicall for ${functionName} at address ${address} with ${functionParams.length} different sets of params`);
        const { blockNumber, returnData: aggregateResults } = await this.multicallContract.callStatic.multicall(calls, {
            blockTag: blockNumberOverride,
        });
        const results = [];
        const gasUsedForSuccess = [];
        for (let i = 0; i < aggregateResults.length; i++) {
            const { success, returnData, gasUsed } = aggregateResults[i];
            // Return data "0x" is sometimes returned for invalid pools.
            if (!success || returnData.length <= 2) {
                log_1.log.debug({ result: aggregateResults[i] }, `Invalid result calling ${functionName} with params ${functionParams[i]}`);
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
        log_1.log.debug({ results, functionName, address }, `Results for multicall for ${functionName} at address ${address} with ${functionParams.length} different sets of params. Results as of block ${blockNumber}`);
        return {
            blockNumber,
            results,
            approxGasUsedPerSuccessCall: stats_lite_1.default.percentile(gasUsedForSuccess, 99),
        };
    }
}
exports.UniswapMulticallProvider = UniswapMulticallProvider;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXVsdGljYWxsLXVuaXN3YXAtcHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvcHJvdmlkZXJzL211bHRpY2FsbC11bmlzd2FwLXByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUNBLG9EQUF1QjtBQUN2Qiw0REFBK0I7QUFDL0IsaUhBQThHO0FBRTlHLGtDQUFrQztBQUNsQyxpREFBOEQ7QUFDOUQscUNBQWtDO0FBQ2xDLDZEQUs4QjtBQU05QixNQUFNLHNCQUFzQixHQUFzQztJQUNoRSxDQUFDLGNBQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxxQ0FBeUI7SUFDNUMsQ0FBQyxjQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUscUNBQXlCO0lBQzVDLENBQUMsY0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLHFDQUF5QjtJQUMxQyxDQUFDLGNBQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxxQ0FBeUI7SUFDNUMsQ0FBQyxjQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUscUNBQXlCO0NBQzNDLENBQUM7QUFFRjs7Ozs7Ozs7R0FRRztBQUNILE1BQWEsd0JBQXlCLFNBQVEsdUNBQTBDO0lBR3RGLFlBQ1ksT0FBZ0IsRUFDaEIsUUFBZ0MsRUFDaEMsa0JBQWtCLE9BQVMsRUFDM0IsMkJBQTJCLHFDQUF5QjtRQUU5RCxLQUFLLEVBQUUsQ0FBQztRQUxFLFlBQU8sR0FBUCxPQUFPLENBQVM7UUFDaEIsYUFBUSxHQUFSLFFBQVEsQ0FBd0I7UUFDaEMsb0JBQWUsR0FBZixlQUFlLENBQVk7UUFDM0IsNkJBQXdCLEdBQXhCLHdCQUF3QixDQUE0QjtRQUc5RCxNQUFNLGdCQUFnQixHQUFHLHdCQUF3QjtZQUMvQyxDQUFDLENBQUMsd0JBQXdCO1lBQzFCLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFekMsSUFBSSxDQUFDLGdCQUFnQixFQUFFO1lBQ3JCLE1BQU0sSUFB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