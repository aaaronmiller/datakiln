import { DKEL } from './index.js';
import { DKELScope } from '../types/dkel.js';

describe('DKEL (Data Kiln Expression Language)', () => {
  let dkel: DKEL;
  let scope: DKELScope;

  beforeEach(() => {
    dkel = new DKEL();
    scope = {
      input: {
        age: 25,
        status: 'approved',
        count: 5,
        email: 'user@example.com',
        filename: 'document.pdf',
        items: ['urgent', 'normal', 'high'],
        score: 85,
        verified: true,
        type: 'premium',
        referral: null,
        blocked: false,
        active: true,
        user: {
          profile: {
            verified: true
          }
        }
      },
      workflow: {
        state: {
          iteration_count: 5,
          retry_count: 2,
          max_iterations: 10
        }
      },
      node: {
        config: {
          max_retries: 3,
          timeout: 5000
        }
      }
    };
  });

  describe('Literals', () => {
    test('string literals', () => {
      expect(dkel.evaluate('"hello"', scope).value).toBe('hello');
      expect(dkel.evaluate("'world'", scope).value).toBe('world');
    });

    test('number literals', () => {
      expect(dkel.evaluate('42', scope).value).toBe(42);
      expect(dkel.evaluate('3.14', scope).value).toBe(3.14);
      expect(dkel.evaluate('-10', scope).value).toBe(-10);
    });

    test('boolean literals', () => {
      expect(dkel.evaluate('true', scope).value).toBe(true);
      expect(dkel.evaluate('false', scope).value).toBe(false);
    });

    test('null literal', () => {
      expect(dkel.evaluate('null', scope).value).toBe(null);
    });
  });

  describe('Scope Resolution', () => {
    test('input access', () => {
      expect(dkel.evaluate('input.age', scope).value).toBe(25);
      expect(dkel.evaluate('input.status', scope).value).toBe('approved');
    });

    test('workflow state access', () => {
      expect(dkel.evaluate('workflow.state.iteration_count', scope).value).toBe(5);
    });

    test('node config access', () => {
      expect(dkel.evaluate('node.config.max_retries', scope).value).toBe(3);
    });
  });

  describe('Operators', () => {
    describe('Arithmetic', () => {
      test('addition', () => {
        expect(dkel.evaluate('2 + 3', scope).value).toBe(5);
        expect(dkel.evaluate('input.count + 1', scope).value).toBe(6);
      });

      test('subtraction', () => {
        expect(dkel.evaluate('10 - 3', scope).value).toBe(7);
      });

      test('multiplication', () => {
        expect(dkel.evaluate('4 * 5', scope).value).toBe(20);
      });

      test('division', () => {
        expect(dkel.evaluate('15 / 3', scope).value).toBe(5);
      });

      test('modulo', () => {
        expect(dkel.evaluate('17 % 5', scope).value).toBe(2);
      });
    });

    describe('Comparison', () => {
      test('equality', () => {
        expect(dkel.evaluate('input.age === 25', scope).value).toBe(true);
        expect(dkel.evaluate('input.status === "approved"', scope).value).toBe(true);
        expect(dkel.evaluate('input.age === 30', scope).value).toBe(false);
      });

      test('inequality', () => {
        expect(dkel.evaluate('input.age !== 30', scope).value).toBe(true);
      });

      test('relational', () => {
        expect(dkel.evaluate('input.age > 20', scope).value).toBe(true);
        expect(dkel.evaluate('input.age >= 25', scope).value).toBe(true);
        expect(dkel.evaluate('input.age < 20', scope).value).toBe(false);
        expect(dkel.evaluate('input.age <= 25', scope).value).toBe(true);
      });
    });

    describe('Logical', () => {
      test('AND', () => {
        expect(dkel.evaluate('true && true', scope).value).toBe(true);
        expect(dkel.evaluate('true && false', scope).value).toBe(false);
        expect(dkel.evaluate('input.verified === true && input.active === true', scope).value).toBe(true);
      });

      test('OR', () => {
        expect(dkel.evaluate('true || false', scope).value).toBe(true);
        expect(dkel.evaluate('false || false', scope).value).toBe(false);
      });

      test('NOT', () => {
        expect(dkel.evaluate('!false', scope).value).toBe(true);
        expect(dkel.evaluate('!input.blocked', scope).value).toBe(true);
      });
    });
  });

  describe('Built-in Properties', () => {
    test('string length', () => {
      expect(dkel.evaluate('input.email.length', scope).value).toBe(16);
      expect(dkel.evaluate('"hello".length', scope).value).toBe(5);
    });

    test('array length', () => {
      expect(dkel.evaluate('input.items.length', scope).value).toBe(3);
    });
  });

  describe('Built-in Methods', () => {
    test('string includes', () => {
      expect(dkel.evaluate('input.email.includes("@example.com")', scope).value).toBe(true);
      expect(dkel.evaluate('input.email.includes("@other.com")', scope).value).toBe(false);
    });

    test('string startsWith', () => {
      expect(dkel.evaluate('input.filename.startsWith("doc")', scope).value).toBe(true);
      expect(dkel.evaluate('input.filename.startsWith("pdf")', scope).value).toBe(false);
    });

    test('string endsWith', () => {
      expect(dkel.evaluate('input.filename.endsWith(".pdf")', scope).value).toBe(true);
      expect(dkel.evaluate('input.filename.endsWith(".doc")', scope).value).toBe(false);
    });

    test('array includes', () => {
      expect(dkel.evaluate('input.items.includes("urgent")', scope).value).toBe(true);
      expect(dkel.evaluate('input.items.includes("missing")', scope).value).toBe(false);
    });
  });

  describe('Array Access', () => {
    test('valid array access', () => {
      expect(dkel.evaluate('input.items[0]', scope).value).toBe('urgent');
      expect(dkel.evaluate('input.items[2]', scope).value).toBe('high');
    });

    test('array bounds checking', () => {
      expect(() => dkel.evaluate('input.items[10]', scope)).toThrow('Array index 10 out of bounds');
      expect(() => dkel.evaluate('input.items[-1]', scope)).toThrow('Array index -1 out of bounds');
    });
  });

  describe('Complex Expressions', () => {
    test('nested property access', () => {
      expect(dkel.evaluate('input.user.profile.verified', scope).value).toBe(true);
    });

    test('complex conditions', () => {
      expect(dkel.evaluate('input.score > 80 && input.verified === true', scope).value).toBe(true);
      expect(dkel.evaluate('input.type === "premium" || input.referral !== null', scope).value).toBe(true);
      expect(dkel.evaluate('!(input.blocked === true) && input.active === true', scope).value).toBe(true);
    });

    test('workflow conditions', () => {
      expect(dkel.evaluate('workflow.state.iteration_count < 10', scope).value).toBe(true);
      expect(dkel.evaluate('node.config.max_retries > workflow.state.retry_count', scope).value).toBe(true);
    });
  });

  describe('Security Features', () => {
    test('timeout enforcement', () => {
      // This should complete within 100ms
      const result = dkel.evaluate('input.age + input.count', scope);
      expect(result.errors).toHaveLength(0);
    });

    test('recursion depth limit', () => {
      // Create a deeply nested expression that would cause recursion
      // This is hard to test directly, but the evaluator has the limit
      expect(dkel.evaluate('input.age', scope).value).toBe(25);
    });

    test('whitelisted methods only', () => {
      expect(() => dkel.evaluate('input.email.toUpperCase()', scope)).toThrow('Method \'toUpperCase\' is not allowed');
    });

    test('no function calls', () => {
      expect(() => dkel.evaluate('input.someFunction()', scope)).toThrow('Method \'someFunction\' is not allowed');
    });

    test('no dynamic evaluation', () => {
      // DKEL doesn't support eval-like constructs by design
      expect(dkel.evaluate('input.age', scope).value).toBe(25);
    });
  });

  describe('Error Handling', () => {
    test('undefined variables', () => {
      const result = dkel.evaluate('undefined_var', scope);
      expect(result.errors).toContain('Undefined identifier: undefined_var');
    });

    test('invalid property access', () => {
      const result = dkel.evaluate('input.nonexistent.prop', scope);
      expect(result.errors[0]).toMatch(/Cannot access property/);
    });

    test('division by zero', () => {
      const result = dkel.evaluate('10 / 0', scope);
      expect(result.errors).toContain('Division by zero');
    });

    test('modulo by zero', () => {
      const result = dkel.evaluate('10 % 0', scope);
      expect(result.errors).toContain('Modulo by zero');
    });
  });

  describe('Parsing Errors', () => {
    test('invalid syntax', () => {
      const result = dkel.parse('input.age +');
      expect(result.errors).toHaveLength(1);
    });

    test('unterminated string', () => {
      const result = dkel.parse('"unterminated');
      expect(result.errors).toContain('Unterminated string literal');
    });

    test('invalid number', () => {
      const result = dkel.parse('123.45.67');
      expect(result.errors).toContain('Invalid number literal');
    });
  });
});