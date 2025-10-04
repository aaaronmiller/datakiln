import {
  Token,
  TokenType,
  ASTNode,
  LiteralNode,
  IdentifierNode,
  BinaryNode,
  UnaryNode,
  MemberNode,
  ArrayAccessNode,
  MethodCallNode,
  DKELParseResult,
  DKELParseError
} from '../types/dkel.js';

export class DKELParser {
  private tokens: Token[] = [];
  private position: number = 0;
  private errors: string[] = [];

  parse(expression: string): DKELParseResult {
    try {
      this.tokens = this.tokenize(expression);
      this.position = 0;
      this.errors = [];

      const ast = this.parseExpression();

      if (this.errors.length > 0) {
        return { ast: ast!, errors: this.errors };
      }

      return { ast, errors: [] };
    } catch (error) {
      if (error instanceof DKELParseError) {
        return { ast: null as any, errors: [error.message] };
      }
      throw error;
    }
  }

  private tokenize(expr: string): Token[] {
    const tokens: Token[] = [];
    let line = 1;
    let column = 1;
    let i = 0;

    while (i < expr.length) {
      const char = expr[i];

      switch (char) {
        case ' ':
        case '\t':
          column++;
          i++;
          break;
        case '\n':
          line++;
          column = 1;
          i++;
          break;
        case '(':
          tokens.push({ type: 'LPAREN', lexeme: '(', line, column });
          column++;
          i++;
          break;
        case ')':
          tokens.push({ type: 'RPAREN', lexeme: ')', line, column });
          column++;
          i++;
          break;
        case ',':
          tokens.push({ type: 'COMMA', lexeme: ',', line, column });
          column++;
          i++;
          break;
        case '[':
          tokens.push({ type: 'LBRACKET', lexeme: '[', line, column });
          column++;
          i++;
          break;
        case ']':
          tokens.push({ type: 'RBRACKET', lexeme: ']', line, column });
          column++;
          i++;
          break;
        case '.':
          tokens.push({ type: 'DOT', lexeme: '.', line, column });
          column++;
          i++;
          break;
        case '+':
          tokens.push({ type: 'PLUS', lexeme: '+', line, column });
          column++;
          i++;
          break;
        case '-':
          tokens.push({ type: 'MINUS', lexeme: '-', line, column });
          column++;
          i++;
          break;
        case '*':
          tokens.push({ type: 'MULTIPLY', lexeme: '*', line, column });
          column++;
          i++;
          break;
        case '/':
          tokens.push({ type: 'DIVIDE', lexeme: '/', line, column });
          column++;
          i++;
          break;
        case '%':
          tokens.push({ type: 'MODULO', lexeme: '%', line, column });
          column++;
          i++;
          break;
        case '<':
          if (i + 1 < expr.length && expr[i + 1] === '=') {
            tokens.push({ type: 'LTE', lexeme: '<=', line, column });
            column += 2;
            i += 2;
          } else {
            tokens.push({ type: 'LT', lexeme: '<', line, column });
            column++;
            i++;
          }
          break;
        case '>':
          if (i + 1 < expr.length && expr[i + 1] === '=') {
            tokens.push({ type: 'GTE', lexeme: '>=', line, column });
            column += 2;
            i += 2;
          } else {
            tokens.push({ type: 'GT', lexeme: '>', line, column });
            column++;
            i++;
          }
          break;
        case '=':
          if (i + 2 < expr.length && expr[i + 1] === '=' && expr[i + 2] === '=') {
            tokens.push({ type: 'EQ', lexeme: '===', line, column });
            column += 3;
            i += 3;
          } else {
            throw new DKELParseError(`Unexpected character: ${char}`, line, column);
          }
          break;
        case '!':
          if (i + 2 < expr.length && expr[i + 1] === '=' && expr[i + 2] === '=') {
            tokens.push({ type: 'NEQ', lexeme: '!==', line, column });
            column += 3;
            i += 3;
          } else {
            tokens.push({ type: 'NOT', lexeme: '!', line, column });
            column++;
            i++;
          }
          break;
        case '&':
          if (i + 1 < expr.length && expr[i + 1] === '&') {
            tokens.push({ type: 'AND', lexeme: '&&', line, column });
            column += 2;
            i += 2;
          } else {
            throw new DKELParseError(`Unexpected character: ${char}`, line, column);
          }
          break;
        case '|':
          if (i + 1 < expr.length && expr[i + 1] === '|') {
            tokens.push({ type: 'OR', lexeme: '||', line, column });
            column += 2;
            i += 2;
          } else {
            throw new DKELParseError(`Unexpected character: ${char}`, line, column);
          }
          break;
        case '"':
        case "'":
          const quote = char;
          let stringValue = '';
          i++; // Skip opening quote
          column++;

          while (i < expr.length && expr[i] !== quote) {
            if (expr[i] === '\\') {
              i++; // Skip backslash
              column++;
              if (i >= expr.length) {
                throw new DKELParseError('Unterminated string literal', line, column);
              }
              // Simple escape handling
              if (expr[i] === quote) {
                stringValue += quote;
              } else if (expr[i] === 'n') {
                stringValue += '\n';
              } else if (expr[i] === 't') {
                stringValue += '\t';
              } else if (expr[i] === '\\') {
                stringValue += '\\';
              } else {
                stringValue += expr[i];
              }
            } else {
              stringValue += expr[i];
            }
            i++;
            column++;
          }

          if (i >= expr.length) {
            throw new DKELParseError('Unterminated string literal', line, column);
          }

          tokens.push({
            type: 'STRING',
            lexeme: expr.substring(i - stringValue.length - 1, i + 1),
            literal: stringValue,
            line,
            column: column - stringValue.length - 1
          });

          i++; // Skip closing quote
          column++;
          break;
        default:
          if (this.isDigit(char)) {
            const start = i;
            let hasDot = false;

            while (i < expr.length && (this.isDigit(expr[i]) || expr[i] === '.')) {
              if (expr[i] === '.') {
                if (hasDot) {
                  throw new DKELParseError('Invalid number literal', line, column);
                }
                hasDot = true;
              }
              i++;
              column++;
            }

            const numStr = expr.substring(start, i);
            const numValue = parseFloat(numStr);

            tokens.push({
              type: 'NUMBER',
              lexeme: numStr,
              literal: numValue,
              line,
              column: column - numStr.length
            });
          } else if (this.isAlpha(char)) {
            const start = i;

            while (i < expr.length && (this.isAlphaNumeric(expr[i]))) {
              i++;
              column++;
            }

            const identifier = expr.substring(start, i);

            let type: TokenType;
            let literal: any = undefined;

            if (identifier === 'true') {
              type = 'BOOLEAN';
              literal = true;
            } else if (identifier === 'false') {
              type = 'BOOLEAN';
              literal = false;
            } else if (identifier === 'null') {
              type = 'NULL';
              literal = null;
            } else {
              type = 'IDENTIFIER';
            }

            tokens.push({
              type,
              lexeme: identifier,
              literal,
              line,
              column: column - identifier.length
            });
          } else {
            throw new DKELParseError(`Unexpected character: ${char}`, line, column);
          }
          break;
      }
    }

    tokens.push({ type: 'EOF', lexeme: '', line, column });
    return tokens;
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isAlpha(char: string): boolean {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_';
  }

  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char);
  }

  private parseExpression(): ASTNode {
    return this.parseLogicalOr();
  }

  private parseLogicalOr(): ASTNode {
    let left = this.parseLogicalAnd();

    while (this.match('OR')) {
      const operator = this.previous().lexeme;
      const right = this.parseLogicalAnd();
      left = {
        type: 'binary',
        left,
        operator,
        right
      } as BinaryNode;
    }

    return left;
  }

  private parseLogicalAnd(): ASTNode {
    let left = this.parseEquality();

    while (this.match('AND')) {
      const operator = this.previous().lexeme;
      const right = this.parseEquality();
      left = {
        type: 'binary',
        left,
        operator,
        right
      } as BinaryNode;
    }

    return left;
  }

  private parseEquality(): ASTNode {
    let left = this.parseRelational();

    while (this.match('EQ', 'NEQ')) {
      const operator = this.previous().lexeme;
      const right = this.parseRelational();
      left = {
        type: 'binary',
        left,
        operator,
        right
      } as BinaryNode;
    }

    return left;
  }

  private parseRelational(): ASTNode {
    let left = this.parseAdditive();

    while (this.match('LT', 'LTE', 'GT', 'GTE')) {
      const operator = this.previous().lexeme;
      const right = this.parseAdditive();
      left = {
        type: 'binary',
        left,
        operator,
        right
      } as BinaryNode;
    }

    return left;
  }

  private parseAdditive(): ASTNode {
    let left = this.parseMultiplicative();

    while (this.match('PLUS', 'MINUS')) {
      const operator = this.previous().lexeme;
      const right = this.parseMultiplicative();
      left = {
        type: 'binary',
        left,
        operator,
        right
      } as BinaryNode;
    }

    return left;
  }

  private parseMultiplicative(): ASTNode {
    let left = this.parseUnary();

    while (this.match('MULTIPLY', 'DIVIDE', 'MODULO')) {
      const operator = this.previous().lexeme;
      const right = this.parseUnary();
      left = {
        type: 'binary',
        left,
        operator,
        right
      } as BinaryNode;
    }

    return left;
  }

  private parseUnary(): ASTNode {
    if (this.match('NOT', 'MINUS')) {
      const operator = this.previous().lexeme;
      const operand = this.parseUnary();
      return {
        type: 'unary',
        operator,
        operand
      } as UnaryNode;
    }

    return this.parseMember();
  }

  private parseMember(): ASTNode {
    let expr = this.parsePrimary();

    while (true) {
      if (this.match('DOT')) {
        const property = this.consume('IDENTIFIER', 'Expected property name after dot').lexeme;

        // Check if this is a method call
        if (this.match('LPAREN')) {
          const args: ASTNode[] = [];

          // Parse arguments
          if (!this.check('RPAREN')) {
            do {
              args.push(this.parseExpression());
            } while (this.match('COMMA'));
          }

          this.consume('RPAREN', 'Expected ) after method arguments');

          expr = {
            type: 'method_call',
            object: expr,
            method: property,
            args
          } as MethodCallNode;
        } else {
          expr = {
            type: 'member',
            object: expr,
            property
          } as MemberNode;
        }
      } else if (this.match('LBRACKET')) {
        const index = this.parseExpression();
        this.consume('RBRACKET', 'Expected ] after array index');
        expr = {
          type: 'array_access',
          array: expr,
          index
        } as ArrayAccessNode;
      } else {
        break;
      }
    }

    return expr;
  }

  private parsePrimary(): ASTNode {
    if (this.match('STRING', 'NUMBER', 'BOOLEAN', 'NULL')) {
      return {
        type: 'literal',
        value: this.previous().literal
      } as LiteralNode;
    }

    if (this.match('IDENTIFIER')) {
      return {
        type: 'identifier',
        name: this.previous().lexeme
      } as IdentifierNode;
    }

    if (this.match('LPAREN')) {
      const expr = this.parseExpression();
      this.consume('RPAREN', 'Expected ) after expression');
      return expr;
    }

    throw new DKELParseError(
      `Expected expression, found ${this.peek().type}`,
      this.peek().line,
      this.peek().column
    );
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) {
      return this.advance();
    }
    throw new DKELParseError(message, this.peek().line, this.peek().column);
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.position++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === 'EOF';
  }

  private peek(): Token {
    return this.tokens[this.position];
  }

  private previous(): Token {
    return this.tokens[this.position - 1];
  }
}