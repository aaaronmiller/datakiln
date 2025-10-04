// DKEL (Data Kiln Expression Language) Types and Interfaces

export type TokenType =
  // Literals
  | 'STRING'
  | 'NUMBER'
  | 'BOOLEAN'
  | 'NULL'
  // Identifiers
  | 'IDENTIFIER'
  // Operators
  | 'DOT'
  | 'LBRACKET'
  | 'RBRACKET'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA'
  | 'NOT'
  | 'MINUS'
  | 'PLUS'
  | 'MULTIPLY'
  | 'DIVIDE'
  | 'MODULO'
  | 'LT'
  | 'LTE'
  | 'GT'
  | 'GTE'
  | 'EQ'
  | 'NEQ'
  | 'AND'
  | 'OR'
  // End of input
  | 'EOF';

export interface Token {
  type: TokenType;
  lexeme: string;
  literal?: any;
  line: number;
  column: number;
}

export type ASTNodeType =
  | 'literal'
  | 'identifier'
  | 'binary'
  | 'unary'
  | 'member'
  | 'array_access'
  | 'method_call';

export interface ASTNode {
  type: ASTNodeType;
}

export interface LiteralNode extends ASTNode {
  type: 'literal';
  value: string | number | boolean | null;
}

export interface IdentifierNode extends ASTNode {
  type: 'identifier';
  name: string;
}

export interface BinaryNode extends ASTNode {
  type: 'binary';
  left: ASTNode;
  operator: string;
  right: ASTNode;
}

export interface UnaryNode extends ASTNode {
  type: 'unary';
  operator: string;
  operand: ASTNode;
}

export interface MemberNode extends ASTNode {
  type: 'member';
  object: ASTNode;
  property: string;
}

export interface ArrayAccessNode extends ASTNode {
  type: 'array_access';
  array: ASTNode;
  index: ASTNode;
}

export interface MethodCallNode extends ASTNode {
  type: 'method_call';
  object: ASTNode;
  method: string;
  args: ASTNode[];
}

export interface DKELScope {
  input: any;
  workflow: {
    state: any;
  };
  node: {
    config: any;
  };
}

export interface DKELParseResult {
  ast: ASTNode;
  errors: string[];
}

export interface DKELEvaluateResult {
  value: any;
  errors: string[];
}

export class DKELParseError extends Error {
  constructor(
    message: string,
    public line: number,
    public column: number
  ) {
    super(message);
    this.name = 'DKELParseError';
  }
}

export class DKELEvaluateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DKELEvaluateError';
  }
}

export class DKELSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DKELSecurityError';
  }
}