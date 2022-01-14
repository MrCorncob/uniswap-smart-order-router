import { flags } from '@oclif/command';
import { SwapRoute } from '../../src';
import { BaseCommand } from '../base-command';
export declare class Quote extends BaseCommand {
    static description: string;
    static flags: {
        version: import("@oclif/parser/lib/flags").IBooleanFlag<void>;
        help: import("@oclif/parser/lib/flags").IBooleanFlag<void>;
        tokenIn: flags.IOptionFlag<string>;
        tokenOut: flags.IOptionFlag<string>;
        recipient: flags.IOptionFlag<string | undefined>;
        amount: flags.IOptionFlag<string>;
        exactIn: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
        exactOut: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
        protocols: flags.IOptionFlag<string | undefined>;
        forceCrossProtocol: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
        topN: import("@oclif/parser/lib/flags").IOptionFlag<number>;
        topNTokenInOut: import("@oclif/parser/lib/flags").IOptionFlag<number>;
        topNSecondHop: import("@oclif/parser/lib/flags").IOptionFlag<number>;
        topNWithEachBaseToken: import("@oclif/parser/lib/flags").IOptionFlag<number>;
        topNWithBaseToken: import("@oclif/parser/lib/flags").IOptionFlag<number>;
        topNWithBaseTokenInSet: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
        topNDirectSwaps: import("@oclif/parser/lib/flags").IOptionFlag<number>;
        maxSwapsPerPath: import("@oclif/parser/lib/flags").IOptionFlag<number>;
        minSplits: import("@oclif/parser/lib/flags").IOptionFlag<number>;
        maxSplits: import("@oclif/parser/lib/flags").IOptionFlag<number>;
        distributionPercent: import("@oclif/parser/lib/flags").IOptionFlag<number>;
        chainId: import("@oclif/parser/lib/flags").IOptionFlag<number>;
        tokenListURI: flags.IOptionFlag<string | undefined>;
        router: flags.IOptionFlag<string>;
        debug: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
        debugJSON: import("@oclif/parser/lib/flags").IBooleanFlag<boolean>;
    };
    doProcess({ flags }: {
        flags: any;
    }): Promise<SwapRoute | null>;
    run(): Promise<void>;
    runRestful(): Promise<void>;
}
