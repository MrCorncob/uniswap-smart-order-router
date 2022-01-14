import {ChainId} from "../../util";

import Joi from "Joi";

const QuoteRequestDTO = Joi.object({
  version: Joi.number().integer(),
  tokenIn: Joi.string()
    .required(),
  tokenOut: Joi.string()
    .required(),
  recipient: Joi.string()
    .optional(),
  amount: Joi.string()
    .required(),
  exactIn: Joi.boolean(),
  exactOut: Joi.boolean(),
  protocols: Joi.string()
    .optional(),
  forceCrossProtocol: Joi.boolean(),

  topN: Joi.number().integer().default(3),
  topNTokenInOut: Joi.number().integer().default(2),
  topNSecondHop: Joi.number().integer().default(0),
  topNWithEachBaseToken: Joi.number().integer().default(2),
  topNWithBaseToken: Joi.number().integer().default(6),
  topNWithBaseTokenInSet: Joi.boolean().default(false),
  topNDirectSwaps: Joi.number().integer().default(2),
  maxSwapsPerPath: Joi.number().integer().default(3),
  minSplits: Joi.number().integer().default(1),
  maxSplits: Joi.number().integer().default(3),
  distributionPercent: Joi.number().integer().default(5),
  chainId: Joi.number().integer().default(ChainId.MAINNET).valid(...Object.values(ChainId)),
  tokenListURI: Joi.string().optional(),
  router: Joi.string().optional().default('alpha'),
  debug: Joi.boolean().default(false),
  debugJSON: Joi.boolean().default(false),
});

export default {
  QuoteRequestDTO
}
