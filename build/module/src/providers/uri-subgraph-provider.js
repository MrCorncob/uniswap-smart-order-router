import { default as retry } from 'async-retry';
import Timeout from 'await-timeout';
import axios from 'axios';
import { log } from '../util/log';
/**
 * Gets subgraph pools from a URI. The URI shoudl contain a JSON
 * stringified array of V2SubgraphPool objects or V3SubgraphPool
 * objects.
 *
 * @export
 * @class URISubgraphProvider
 * @template TSubgraphPool
 */
export class URISubgraphProvider {
    constructor(chainId, uri, timeout = 6000, retries = 2) {
        this.chainId = chainId;
        this.uri = uri;
        this.timeout = timeout;
        this.retries = retries;
    }
    async getPools() {
        log.info({ uri: this.uri }, `About to get subgraph pools from URI ${this.uri}`);
        let allPools = [];
        await retry(async () => {
            const timeout = new Timeout();
            const timerPromise = timeout.set(this.timeout).then(() => {
                throw new Error(`Timed out getting pools from subgraph: ${this.timeout}`);
            });
            let response;
            try {
                response = await Promise.race([axios.get(this.uri), timerPromise]);
            }
            catch (err) {
                throw err;
            }
            finally {
                timeout.clear();
            }
            const { data: poolsBuffer, status } = response;
            if (status != 200) {
                log.error({ response }, `Unabled to get pools from ${this.uri}.`);
                throw new Error(`Unable to get pools from ${this.uri}`);
            }
            const pools = poolsBuffer;
            log.info({ uri: this.uri, chain: this.chainId }, `Got subgraph pools from uri. Num: ${pools.length}`);
            allPools = pools;
        }, {
            retries: this.retries,
            onRetry: (err, retry) => {
                log.info({ err }, `Failed to get pools from uri ${this.uri}. Retry attempt: ${retry}`);
            },
        });
        return allPools;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJpLXN1YmdyYXBoLXByb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL3Byb3ZpZGVycy91cmktc3ViZ3JhcGgtcHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLE9BQU8sSUFBSSxLQUFLLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFDL0MsT0FBTyxPQUFPLE1BQU0sZUFBZSxDQUFDO0FBQ3BDLE9BQU8sS0FBSyxNQUFNLE9BQU8sQ0FBQztBQUUxQixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBSWxDOzs7Ozs7OztHQVFHO0FBQ0gsTUFBTSxPQUFPLG1CQUFtQjtJQUc5QixZQUNVLE9BQWdCLEVBQ2hCLEdBQVcsRUFDWCxVQUFVLElBQUksRUFDZCxVQUFVLENBQUM7UUFIWCxZQUFPLEdBQVAsT0FBTyxDQUFTO1FBQ2hCLFFBQUcsR0FBSCxHQUFHLENBQVE7UUFDWCxZQUFPLEdBQVAsT0FBTyxDQUFPO1FBQ2QsWUFBTyxHQUFQLE9BQU8sQ0FBSTtJQUNsQixDQUFDO0lBRUcsS0FBSyxDQUFDLFFBQVE7UUFDbkIsR0FBRyxDQUFDLElBQUksQ0FDTixFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLEVBQ2pCLHdDQUF3QyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQ25ELENBQUM7UUFFRixJQUFJLFFBQVEsR0FBb0IsRUFBRSxDQUFDO1FBRW5DLE1BQU0sS0FBSyxDQUNULEtBQUssSUFBSSxFQUFFO1lBQ1QsTUFBTSxPQUFPLEdBQUcsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUM5QixNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFO2dCQUN2RCxNQUFNLElBQUksS0FBSyxDQUNiLDBDQUEwQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQ3pELENBQUM7WUFDSixDQUFDLENBQUMsQ0FBQztZQUVILElBQUksUUFBUSxDQUFDO1lBRWIsSUFBSTtnQkFDRixRQUFRLEdBQUcsTUFBTSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQzthQUNwRTtZQUFDLE9BQU8sR0FBRyxFQUFFO2dCQUNaLE1BQU0sR0FBRyxDQUFDO2FBQ1g7b0JBQVM7Z0JBQ1IsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO2FBQ2pCO1lBRUQsTUFBTSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFFLEdBQUcsUUFBUSxDQUFDO1lBRS9DLElBQUksTUFBTSxJQUFJLEdBQUcsRUFBRTtnQkFDakIsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLFFBQVEsRUFBRSxFQUFFLDZCQUE2QixJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztnQkFFbEUsTUFBTSxJQUFJLEtBQUssQ0FBQyw0QkFBNEIsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7YUFDekQ7WUFFRCxNQUFNLEtBQUssR0FBRyxXQUE4QixDQUFDO1lBRTdDLEdBQUcsQ0FBQyxJQUFJLENBQ04sRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUN0QyxxQ0FBcUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUNwRCxDQUFDO1lBRUYsUUFBUSxHQUFHLEtBQUssQ0FBQztRQUNuQixDQUFDLEVBQ0Q7WUFDRSxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU87WUFDckIsT0FBTyxFQUFFLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxFQUFFO2dCQUN0QixHQUFHLENBQUMsSUFBSSxDQUNOLEVBQUUsR0FBRyxFQUFFLEVBQ1AsZ0NBQWdDLElBQUksQ0FBQyxHQUFHLG9CQUFvQixLQUFLLEVBQUUsQ0FDcEUsQ0FBQztZQUNKLENBQUM7U0FDRixDQUNGLENBQUM7UUFFRixPQUFPLFFBQVEsQ0FBQztJQUNsQixDQUFDO0NBQ0YifQ==