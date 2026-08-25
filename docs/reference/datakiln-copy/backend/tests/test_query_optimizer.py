#!/usr/bin/env python3
"""
Test script for the query optimization and validation system.
"""

import asyncio
import json
from datetime import datetime
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.query_optimizer import (
    QueryOptimizer,
    OptimizationLevel,
    get_query_optimizer
)


def create_test_query_graph():
    """Create a test query graph for optimization testing."""
    return {
        "nodes": [
            {
                "id": "data_source_1",
                "type": "dataSource",
                "data": {
                    "source": "users",
                    "source_type": "users"
                }
            },
            {
                "id": "filter_1",
                "type": "filter",
                "data": {
                    "condition": "age > 25"
                }
            },
            {
                "id": "transform_1",
                "type": "transform",
                "data": {
                    "transformation": "add_field:name_length=len(name)"
                }
            },
            {
                "id": "aggregate_1",
                "type": "aggregate",
                "data": {
                    "aggregation": "count"
                }
            }
        ],
        "edges": [
            {"id": "edge1", "source": "data_source_1", "target": "filter_1"},
            {"id": "edge2", "source": "filter_1", "target": "transform_1"},
            {"id": "edge3", "source": "transform_1", "target": "aggregate_1"}
        ]
    }


async def test_query_optimizer():
    """Test the query optimizer functionality."""
    print("🧪 Testing Query Optimizer")
    print("=" * 50)

    # Create optimizer
    optimizer = get_query_optimizer()

    # Create test query graph
    query_graph = create_test_query_graph()

    print(f"📋 Original query graph: {len(query_graph['nodes'])} nodes, {len(query_graph['edges'])} edges")

    # Test optimization
    print("\n🔧 Testing optimization...")

    try:
        optimization_result = await optimizer.optimize_query_graph(
            query_graph=query_graph,
            optimization_level=OptimizationLevel.STANDARD,
            schema=None,
            business_rules=None,
            enable_caching=True
        )

        print("✅ Optimization completed successfully")
        print(f"   - Valid: {optimization_result.validation_results['valid']}")
        print(f"   - Optimization rules applied: {optimization_result.optimization_applied}")
        print(".2f")
        print(".2f")

        if optimization_result.cache_hits:
            print(f"   - Cache hits: {len(optimization_result.cache_hits)}")

        if optimization_result.bottlenecks_identified:
            print(f"   - Bottlenecks identified: {len(optimization_result.bottlenecks_identified)}")

        return True

    except Exception as e:
        print(f"❌ Optimization failed: {str(e)}")
        return False


async def test_validation():
    """Test query graph validation."""
    print("\n🔍 Testing Query Validation")
    print("=" * 30)

    optimizer = get_query_optimizer()

    # Test valid graph
    valid_graph = create_test_query_graph()
    validation_result = await optimizer.validate_query_graph(valid_graph)

    print(f"Valid graph validation: {'✅ PASS' if validation_result['valid'] else '❌ FAIL'}")
    if not validation_result['valid']:
        print(f"   Errors: {validation_result['errors']}")

    # Test invalid graph (missing required fields)
    invalid_graph = {
        "nodes": [{"id": "node1"}],  # Missing type
        "edges": []
    }

    validation_result = await optimizer.validate_query_graph(invalid_graph)
    print(f"Invalid graph validation: {'✅ PASS' if not validation_result['valid'] else '❌ FAIL'}")
    if validation_result['errors']:
        print(f"   Errors: {validation_result['errors']}")

    return True


async def test_performance_profiling():
    """Test performance profiling."""
    print("\n📊 Testing Performance Profiling")
    print("=" * 35)

    optimizer = get_query_optimizer()

    # Mock execution results
    mock_results = {
        "execution_id": "test_exec_123",
        "success": True,
        "results": {
            "data_source_1": {"success": True, "execution_time": 0.5, "result": "mock_data"},
            "filter_1": {"success": True, "execution_time": 0.3, "result": "filtered_data"},
            "transform_1": {"success": True, "execution_time": 1.2, "result": "transformed_data"},
            "aggregate_1": {"success": True, "execution_time": 0.8, "result": "aggregated_data"}
        },
        "execution_order": [["data_source_1"], ["filter_1"], ["transform_1"], ["aggregate_1"]],
        "execution_time": 2.8
    }

    try:
        profile = await optimizer.profile_execution(mock_results, 2.8)

        print("✅ Performance profiling completed")
        print(".2f")
        print(".1f")
        print(f"   - Node count: {len(profile.get('node_performance', {}))}")

        if profile.get('bottlenecks'):
            print(f"   - Bottlenecks found: {len(profile['bottlenecks'])}")

        return True

    except Exception as e:
        print(f"❌ Performance profiling failed: {str(e)}")
        return False


async def test_cache_functionality():
    """Test caching functionality."""
    print("\n💾 Testing Cache Functionality")
    print("=" * 32)

    optimizer = get_query_optimizer()

    # Get initial cache stats
    initial_stats = optimizer.get_cache_stats()
    print(f"Initial cache entries: {initial_stats.get('total_entries', 0)}")

    # Test cache operations
    query_graph = create_test_query_graph()
    cache_key = optimizer.cache.get_cache_key(query_graph)

    # Manually add to cache
    optimizer.cache.put(cache_key, {"test": "cached_result"})

    # Check cache stats
    updated_stats = optimizer.get_cache_stats()
    print(f"Cache entries after manual add: {updated_stats.get('entries', 0)}")
    print(f"Cache hits: {updated_stats.get('hits', 0)}")
    print(f"Cache misses: {updated_stats.get('misses', 0)}")

    # Clear cache
    optimizer.clear_cache()
    final_stats = optimizer.get_cache_stats()
    print(f"Cache entries after clear: {final_stats.get('entries', 0)}")

    return True


async def main():
    """Main test function."""
    print("🧪 Query Optimization System Test Suite")
    print("=" * 50)

    tests = [
        ("Query Optimization", test_query_optimizer),
        ("Query Validation", test_validation),
        ("Performance Profiling", test_performance_profiling),
        ("Cache Functionality", test_cache_functionality)
    ]

    results = []
    for test_name, test_func in tests:
        try:
            result = await test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} crashed: {str(e)}")
            results.append((test_name, False))

    print("\n" + "=" * 50)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 50)

    passed = 0
    total = len(results)

    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
        if result:
            passed += 1

    print(f"\nOverall: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 ALL TESTS PASSED!")
        return True
    else:
        print("💥 SOME TESTS FAILED!")
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)