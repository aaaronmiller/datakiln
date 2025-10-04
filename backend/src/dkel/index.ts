import { DKELParser } from './parser.js';
import { DKELEvaluator } from './evaluator.js';
import { DKELScope, DKELParseResult, DKELEvaluateResult } from '../types/dkel.js';

export class DKEL {
  private parser: DKELParser;
  private evaluator: DKELEvaluator;

  constructor() {
    this.parser = new DKELParser();
    this.evaluator = new DKELEvaluator();
  }

  /**
   * Evaluate a DKEL expression with the given scope
   */
  evaluate(expression: string, scope: DKELScope): DKELEvaluateResult {
    // Parse the expression
    const parseResult = this.parser.parse(expression);

    if (parseResult.errors.length > 0) {
      return { value: null, errors: parseResult.errors };
    }

    // Evaluate the parsed AST
    return this.evaluator.evaluate(parseResult.ast!, scope);
  }

  /**
   * Parse a DKEL expression (for debugging/testing)
   */
  parse(expression: string): DKELParseResult {
    return this.parser.parse(expression);
  }
}

// Export individual classes for advanced usage
export { DKELParser } from './parser.js';
export { DKELEvaluator } from './evaluator.js';

// Export types
export type {
  DKELScope,
  DKELParseResult,
  DKELEvaluateResult,
  ASTNode,
  Token,
  TokenType
} from '../types/dkel.js';