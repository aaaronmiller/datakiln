import {
  ASTNode,
  LiteralNode,
  IdentifierNode,
  BinaryNode,
  UnaryNode,
  MemberNode,
  ArrayAccessNode,
  MethodCallNode,
  DKELScope,
  DKELEvaluateResult,
  DKELEvaluateError,
  DKELSecurityError
} from '../types/dkel.js';

// Whitelisted methods for security
const WHITELISTED_METHODS = new Set([
  'length',
  'includes',
  'startsWith',
  'endsWith'
]);

export class DKELEvaluator {
  private recursionDepth: number = 0;
  private readonly MAX_RECURSION_DEPTH = 10;
  private readonly MAX_EVALUATION_TIME_MS = 100;

  evaluate(ast: ASTNode, scope: DKELScope): DKELEvaluateResult {
    const startTime = Date.now();

    try {
      this.recursionDepth = 0;
      const value = this.evaluateNode(ast, scope);

      const elapsed = Date.now() - startTime;
      if (elapsed > this.MAX_EVALUATION_TIME_MS) {
        throw new DKELSecurityError(`Evaluation timeout: ${elapsed}ms > ${this.MAX_EVALUATION_TIME_MS}ms`);
      }

      return { value, errors: [] };
    } catch (error) {
      if (error instanceof DKELEvaluateError || error instanceof DKELSecurityError) {
        return { value: null, errors: [error.message] };
      }
      throw error;
    }
  }

  private evaluateNode(node: ASTNode, scope: DKELScope): any {
    this.checkRecursionDepth();

    switch (node.type) {
      case 'literal':
        return this.evaluateLiteral(node as LiteralNode);

      case 'identifier':
        return this.evaluateIdentifier(node as IdentifierNode, scope);

      case 'binary':
        return this.evaluateBinary(node as BinaryNode, scope);

      case 'unary':
        return this.evaluateUnary(node as UnaryNode, scope);

      case 'member':
        return this.evaluateMember(node as MemberNode, scope);

      case 'array_access':
        return this.evaluateArrayAccess(node as ArrayAccessNode, scope);

      case 'method_call':
        return this.evaluateMethodCall(node as MethodCallNode, scope);

      default:
        throw new DKELEvaluateError(`Unknown AST node type: ${(node as any).type}`);
    }
  }

  private evaluateLiteral(node: LiteralNode): any {
    return node.value;
  }

  private evaluateIdentifier(node: IdentifierNode, scope: DKELScope): any {
    const name = node.name;

    // Reserved keywords
    if (name === 'true') return true;
    if (name === 'false') return false;
    if (name === 'null') return null;

    // Scope resolution
    if (name === 'input') return scope.input;
    if (name === 'workflow') return scope.workflow;
    if (name === 'node') return scope.node;

    throw new DKELEvaluateError(`Undefined identifier: ${name}`);
  }

  private evaluateBinary(node: BinaryNode, scope: DKELScope): any {
    const left = this.evaluateNode(node.left, scope);
    const right = this.evaluateNode(node.right, scope);

    switch (node.operator) {
      case '===': return left === right;
      case '!==': return left !== right;
      case '>': return left > right;
      case '>=': return left >= right;
      case '<': return left < right;
      case '<=': return left <= right;
      case '&&': return left && right;
      case '||': return left || right;
      case '+': return left + right;
      case '-': return left - right;
      case '*': return left * right;
      case '/':
        if (right === 0) throw new DKELEvaluateError('Division by zero');
        return left / right;
      case '%':
        if (right === 0) throw new DKELEvaluateError('Modulo by zero');
        return left % right;
      default:
        throw new DKELEvaluateError(`Unknown binary operator: ${node.operator}`);
    }
  }

  private evaluateUnary(node: UnaryNode, scope: DKELScope): any {
    const operand = this.evaluateNode(node.operand, scope);

    switch (node.operator) {
      case '!': return !operand;
      case '-': return -operand;
      default:
        throw new DKELEvaluateError(`Unknown unary operator: ${node.operator}`);
    }
  }

  private evaluateMember(node: MemberNode, scope: DKELScope): any {
    const object = this.evaluateNode(node.object, scope);

    if (object == null) {
      throw new DKELEvaluateError('Cannot access property of null or undefined');
    }

    // Handle built-in properties
    if (node.property === 'length' && (typeof object === 'string' || Array.isArray(object))) {
      return object.length;
    }

    // Check if this is a method call
    if (typeof object === 'string' || Array.isArray(object)) {
      if (WHITELISTED_METHODS.has(node.property)) {
        // Return the method itself for later invocation
        return (object as any)[node.property].bind(object);
      }
    }

    // Regular property access
    if (typeof object === 'object' && object !== null) {
      return (object as any)[node.property];
    }

    throw new DKELEvaluateError(`Cannot access property '${node.property}' on ${typeof object}`);
  }

  private evaluateArrayAccess(node: ArrayAccessNode, scope: DKELScope): any {
    const array = this.evaluateNode(node.array, scope);
    const index = this.evaluateNode(node.index, scope);

    if (!Array.isArray(array)) {
      throw new DKELEvaluateError('Cannot index into non-array value');
    }

    if (typeof index !== 'number' || !Number.isInteger(index)) {
      throw new DKELEvaluateError('Array index must be an integer');
    }

    if (index < 0 || index >= array.length) {
      throw new DKELEvaluateError(`Array index ${index} out of bounds`);
    }

    return array[index];
  }

  private evaluateMethodCall(node: MethodCallNode, scope: DKELScope): any {
    const object = this.evaluateNode(node.object, scope);

    if (object == null) {
      throw new DKELEvaluateError('Cannot call method on null or undefined');
    }

    // Security check: only allow whitelisted methods
    if (!WHITELISTED_METHODS.has(node.method)) {
      throw new DKELSecurityError(`Method '${node.method}' is not allowed`);
    }

    // Evaluate arguments
    const args = node.args.map(arg => this.evaluateNode(arg, scope));

    // Call the method
    if (typeof object === 'string' || Array.isArray(object)) {
      const method = (object as any)[node.method];
      if (typeof method === 'function') {
        return method.apply(object, args);
      }
    }

    throw new DKELEvaluateError(`Method '${node.method}' not available on ${typeof object}`);
  }

  private checkRecursionDepth(): void {
    this.recursionDepth++;
    if (this.recursionDepth > this.MAX_RECURSION_DEPTH) {
      throw new DKELSecurityError(`Maximum recursion depth exceeded: ${this.MAX_RECURSION_DEPTH}`);
    }
  }
}