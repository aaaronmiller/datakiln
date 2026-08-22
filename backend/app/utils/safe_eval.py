"""Small AST allowlist evaluators for workflow-controlled expressions."""

from __future__ import annotations

import ast
import operator
from typing import Any, Mapping


class UnsafeExpressionError(ValueError):
    """Raised when an expression uses syntax outside the safe subset."""


_BIN_OPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
}

_UNARY_OPS = {
    ast.UAdd: operator.pos,
    ast.USub: operator.neg,
    ast.Not: operator.not_,
}

_CMP_OPS = {
    ast.Eq: operator.eq,
    ast.NotEq: operator.ne,
    ast.Gt: operator.gt,
    ast.GtE: operator.ge,
    ast.Lt: operator.lt,
    ast.LtE: operator.le,
    ast.In: lambda left, right: left in right,
    ast.NotIn: lambda left, right: left not in right,
}

_ALLOWED_STRING_METHODS = {"startswith", "endswith"}

_ALLOWED_FUNCTIONS = {
    "len": len,
    "str": str,
    "int": int,
    "float": float,
    "bool": bool,
    "abs": abs,
    "min": min,
    "max": max,
    "sum": sum,
    "all": all,
    "any": any,
}


def safe_arithmetic_eval(expr: str) -> int | float:
    """Evaluate a numeric constant expression without Python eval."""
    tree = ast.parse(expr, mode="eval")
    result = _eval_node(tree.body, {})
    if not isinstance(result, (int, float)) or isinstance(result, bool):
        raise UnsafeExpressionError("expression did not evaluate to a number")
    return result


def safe_boolean_eval(expr: str, scope: Mapping[str, Any]) -> bool:
    """Evaluate a small boolean expression subset without Python eval."""
    tree = ast.parse(expr, mode="eval")
    return bool(_eval_node(tree.body, scope))


def _eval_node(node: ast.AST, scope: Mapping[str, Any]) -> Any:
    if isinstance(node, ast.Constant):
        return node.value

    if isinstance(node, ast.Name):
        if node.id in scope:
            return scope[node.id]
        raise UnsafeExpressionError(f"unknown name: {node.id}")

    if isinstance(node, ast.BinOp):
        op = _BIN_OPS.get(type(node.op))
        if op is None:
            raise UnsafeExpressionError(f"operator not allowed: {type(node.op).__name__}")
        return op(_eval_node(node.left, scope), _eval_node(node.right, scope))

    if isinstance(node, ast.UnaryOp):
        op = _UNARY_OPS.get(type(node.op))
        if op is None:
            raise UnsafeExpressionError(f"unary operator not allowed: {type(node.op).__name__}")
        return op(_eval_node(node.operand, scope))

    if isinstance(node, ast.BoolOp):
        if isinstance(node.op, ast.And):
            return all(_eval_node(value, scope) for value in node.values)
        if isinstance(node.op, ast.Or):
            return any(_eval_node(value, scope) for value in node.values)
        raise UnsafeExpressionError(f"boolean operator not allowed: {type(node.op).__name__}")

    if isinstance(node, ast.Compare):
        left = _eval_node(node.left, scope)
        for op_node, comparator in zip(node.ops, node.comparators):
            op = _CMP_OPS.get(type(op_node))
            if op is None:
                raise UnsafeExpressionError(f"comparison not allowed: {type(op_node).__name__}")
            right = _eval_node(comparator, scope)
            if not op(left, right):
                return False
            left = right
        return True

    if isinstance(node, ast.Subscript):
        target = _eval_node(node.value, scope)
        key = _eval_node(node.slice, scope)
        return target[key]

    if isinstance(node, ast.List):
        return [_eval_node(elt, scope) for elt in node.elts]

    if isinstance(node, ast.Tuple):
        return tuple(_eval_node(elt, scope) for elt in node.elts)

    if isinstance(node, ast.Dict):
        if any(key is None for key in node.keys):
            raise UnsafeExpressionError("dictionary unpacking is not allowed")
        result = {}
        for key, value in zip(node.keys, node.values):
            if key is None:
                raise UnsafeExpressionError("dictionary unpacking is not allowed")
            result[_eval_node(key, scope)] = _eval_node(value, scope)
        return result

    if isinstance(node, ast.Call):
        return _eval_call(node, scope)

    raise UnsafeExpressionError(f"syntax not allowed: {type(node).__name__}")


def _eval_call(node: ast.Call, scope: Mapping[str, Any]) -> Any:
    if node.keywords:
        raise UnsafeExpressionError("keyword arguments are not allowed")

    if isinstance(node.func, ast.Name) and node.func.id in _ALLOWED_FUNCTIONS:
        args = [_eval_node(arg, scope) for arg in node.args]
        return _ALLOWED_FUNCTIONS[node.func.id](*args)

    if isinstance(node.func, ast.Attribute):
        method = node.func.attr
        if method.startswith("_") or method not in _ALLOWED_STRING_METHODS:
            raise UnsafeExpressionError(f"method not allowed: {method}")
        target = _eval_node(node.func.value, scope)
        args = [_eval_node(arg, scope) for arg in node.args]
        if not isinstance(target, str):
            raise UnsafeExpressionError(f"method target must be a string: {method}")
        return getattr(target, method)(*args)

    raise UnsafeExpressionError("function call not allowed")
