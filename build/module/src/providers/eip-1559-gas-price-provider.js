import { BigNumber } from 'ethers';
import _ from 'lodash';
import { log } from '../util/log';
import { IGasPriceProvider } from './gas-price-provider';
// We get the Xth percentile of priority fees for transactions successfully included in previous blocks.
const DEFAULT_PRIORITY_FEE_PERCENTILE = 50;
// Infura docs say only past 4 blocks guaranteed to be available: https://infura.io/docs/ethereum#operation/eth_feeHistory
const DEFAULT_BLOCKS_TO_LOOK_BACK = 4;
/**
 * Computes a gas estimate using on-chain data from the eth_feeHistory RPC endpoint.
 *
 * Takes the average priority fee from the past `blocksToConsider` blocks, and adds it
 * to the current base fee.
 *
 * @export
 * @class EIP1559GasPriceProvider
 */
export class EIP1559GasPriceProvider extends IGasPriceProvider {
    constructor(provider, priorityFeePercentile = DEFAULT_PRIORITY_FEE_PERCENTILE, blocksToConsider = DEFAULT_BLOCKS_TO_LOOK_BACK) {
        super();
        this.provider = provider;
        this.priorityFeePercentile = priorityFeePercentile;
        this.blocksToConsider = blocksToConsider;
    }
    async getGasPrice() {
        const feeHistoryRaw = (await this.provider.send('eth_feeHistory', [
            this.blocksToConsider,
            'latest',
            [this.priorityFeePercentile],
        ]));
        const feeHistory = {
            baseFeePerGas: _.map(feeHistoryRaw.baseFeePerGas, (b) => BigNumber.from(b)),
            gasUsedRatio: feeHistoryRaw.gasUsedRatio,
            oldestBlock: BigNumber.from(feeHistoryRaw.oldestBlock),
            reward: _.map(feeHistoryRaw.reward, (b) => BigNumber.from(b[0])),
        };
        const nextBlockBaseFeePerGas = feeHistory.baseFeePerGas[feeHistory.baseFeePerGas.length - 1];
        const averagePriorityFeePerGas = _.reduce(feeHistory.reward, (sum, cur) => sum.add(cur), BigNumber.from(0)).div(feeHistory.reward.length);
        log.info({
            feeHistory,
            feeHistoryReadable: {
                baseFeePerGas: _.map(feeHistory.baseFeePerGas, (f) => f.toString()),
                oldestBlock: feeHistory.oldestBlock.toString(),
                reward: _.map(feeHistory.reward, (r) => r.toString()),
            },
            nextBlockBaseFeePerGas: nextBlockBaseFeePerGas.toString(),
            averagePriorityFeePerGas: averagePriorityFeePerGas.toString(),
        }, 'Got fee history from provider and computed gas estimate');
        const gasPriceWei = nextBlockBaseFeePerGas.add(averagePriorityFeePerGas);
        const blockNumber = feeHistory.oldestBlock.add(this.blocksToConsider);
        log.info(`Estimated gas price in wei: ${gasPriceWei} as of block ${blockNumber.toString()}`);
        return { gasPriceWei: gasPriceWei };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWlwLTE1NTktZ2FzLXByaWNlLXByb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL3Byb3ZpZGVycy9laXAtMTU1OS1nYXMtcHJpY2UtcHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFNBQVMsRUFBYSxNQUFNLFFBQVEsQ0FBQztBQUM5QyxPQUFPLENBQUMsTUFBTSxRQUFRLENBQUM7QUFDdkIsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUNsQyxPQUFPLEVBQVksaUJBQWlCLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQWdCbkUsd0dBQXdHO0FBQ3hHLE1BQU0sK0JBQStCLEdBQUcsRUFBRSxDQUFDO0FBQzNDLDBIQUEwSDtBQUMxSCxNQUFNLDJCQUEyQixHQUFHLENBQUMsQ0FBQztBQUV0Qzs7Ozs7Ozs7R0FRRztBQUNILE1BQU0sT0FBTyx1QkFBd0IsU0FBUSxpQkFBaUI7SUFDNUQsWUFDWSxRQUFtQyxFQUNyQyx3QkFBZ0MsK0JBQStCLEVBQy9ELG1CQUEyQiwyQkFBMkI7UUFFOUQsS0FBSyxFQUFFLENBQUM7UUFKRSxhQUFRLEdBQVIsUUFBUSxDQUEyQjtRQUNyQywwQkFBcUIsR0FBckIscUJBQXFCLENBQTBDO1FBQy9ELHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBc0M7SUFHaEUsQ0FBQztJQUVNLEtBQUssQ0FBQyxXQUFXO1FBQ3RCLE1BQU0sYUFBYSxHQUFHLENBQUMsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRTtZQUNoRSxJQUFJLENBQUMsZ0JBQWdCO1lBQ3JCLFFBQVE7WUFDUixDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQztTQUM3QixDQUFDLENBQTBCLENBQUM7UUFFN0IsTUFBTSxVQUFVLEdBQXVCO1lBQ3JDLGFBQWEsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUN0RCxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUNsQjtZQUNELFlBQVksRUFBRSxhQUFhLENBQUMsWUFBWTtZQUN4QyxXQUFXLEVBQUUsU0FBUyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDO1lBQ3RELE1BQU0sRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDakUsQ0FBQztRQUVGLE1BQU0sc0JBQXNCLEdBQzFCLFVBQVUsQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFFLENBQUM7UUFFakUsTUFBTSx3QkFBd0IsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUN2QyxVQUFVLENBQUMsTUFBTSxFQUNqQixDQUFDLEdBQWMsRUFBRSxHQUFjLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQ2hELFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQ2xCLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFaEMsR0FBRyxDQUFDLElBQUksQ0FDTjtZQUNFLFVBQVU7WUFDVixrQkFBa0IsRUFBRTtnQkFDbEIsYUFBYSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNuRSxXQUFXLEVBQUUsVUFBVSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUU7Z0JBQzlDLE1BQU0sRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQzthQUN0RDtZQUNELHNCQUFzQixFQUFFLHNCQUFzQixDQUFDLFFBQVEsRUFBRTtZQUN6RCx3QkFBd0IsRUFBRSx3QkFBd0IsQ0FBQyxRQUFRLEVBQUU7U0FDOUQsRUFDRCx5REFBeUQsQ0FDMUQsQ0FBQztRQUVGLE1BQU0sV0FBVyxHQUFHLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FBRXpFLE1BQU0sV0FBVyxHQUFHLFVBQVUsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBRXRFLEdBQUcsQ0FBQyxJQUFJLENBQ04sK0JBQStCLFdBQVcsZ0JBQWdCLFdBQVcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUNuRixDQUFDO1FBRUYsT0FBTyxFQUFFLFdBQVcsRUFBRSxXQUFXLEVBQUUsQ0FBQztJQUN0QyxDQUFDO0NBQ0YifQ==