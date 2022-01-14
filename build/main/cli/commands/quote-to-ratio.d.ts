import { flags } from '@oclif/command';
import { BaseCommand } from '../base-command';
export declare class QuoteToRatio extends BaseCommand {
    static description: string;
    static flags: {
        version: import("@oclif/parser/lib/flags").IBooleanFlag<void>;
        help: import("@oclif/parser/lib/flags").IBooleanFlag<void>;
        token0: flags.IOptionFlag<string>;
        token1: flags.IOptionFlag<string>;
        feeAmount: import("@oclif/parser/lib/flags").IOptionFlag<number>;
        token0Balance: flags.IOptionFlag<string>;
        token1Balance: flags.IOptionFlag<string>;
        recipient: flags.IOptionFlag<string>;
        tickLower: import("@oclif/parser/lib/flags").IOptionFlag<number>;
        tickUpper: import("@oclif/parser/lib/flags").IOptionFlag<number>;
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
    run(): Promise<void>;
}
