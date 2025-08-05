#!/usr/bin/env python3
"""
Test runner script for the document processor enhancements.

This script runs all tests and generates a comprehensive report.
"""

import sys
import subprocess
import time
from pathlib import Path

def run_command(command, description):
    """Run a command and return the result."""
    print(f"\n{'='*60}")
    print(f"Running: {description}")
    print(f"Command: {command}")
    print('='*60)
    
    start_time = time.time()
    
    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            cwd=Path(__file__).parent
        )
        
        end_time = time.time()
        duration = end_time - start_time
        
        print(f"Duration: {duration:.2f}s")
        print(f"Return code: {result.returncode}")
        
        if result.stdout:
            print(f"\nSTDOUT:\n{result.stdout}")
        
        if result.stderr:
            print(f"\nSTDERR:\n{result.stderr}")
        
        return result.returncode == 0, result.stdout, result.stderr, duration
        
    except Exception as e:
        print(f"Error running command: {e}")
        return False, "", str(e), 0


def main():
    """Run all tests and generate report."""
    print("Document Processor Enhancement Test Suite")
    print("=" * 60)
    
    test_results = []
    total_start_time = time.time()
    
    # Test commands to run
    test_commands = [
        ("python -m pytest tests/test_document_processor.py -v", "Unit Tests"),
        ("python -m pytest tests/test_integration.py -v", "Integration Tests"),
        ("python -m pytest tests/test_edge_cases.py -v", "Edge Case Tests"),
        ("python -m pytest tests/ -v --tb=short", "All Tests Combined"),
    ]
    
    # Run each test suite
    for command, description in test_commands:
        success, stdout, stderr, duration = run_command(command, description)
        test_results.append({
            'name': description,
            'success': success,
            'duration': duration,
            'stdout': stdout,
            'stderr': stderr
        })
    
    total_duration = time.time() - total_start_time
    
    # Generate summary report
    print(f"\n{'='*60}")
    print("TEST SUMMARY REPORT")
    print('='*60)
    
    successful_tests = sum(1 for result in test_results if result['success'])
    total_tests = len(test_results)
    
    print(f"Total test suites: {total_tests}")
    print(f"Successful: {successful_tests}")
    print(f"Failed: {total_tests - successful_tests}")
    print(f"Total duration: {total_duration:.2f}s")
    
    print(f"\nDetailed Results:")
    for result in test_results:
        status = "✓ PASS" if result['success'] else "✗ FAIL"
        print(f"  {status} {result['name']} ({result['duration']:.2f}s)")
    
    # Show any failures
    failed_tests = [result for result in test_results if not result['success']]
    if failed_tests:
        print(f"\nFAILED TEST DETAILS:")
        for result in failed_tests:
            print(f"\n{result['name']}:")
            if result['stderr']:
                print(f"  Error: {result['stderr']}")
            if "FAILED" in result['stdout']:
                # Extract just the failure summary
                lines = result['stdout'].split('\n')
                for i, line in enumerate(lines):
                    if "FAILED" in line or "ERROR" in line:
                        print(f"  {line}")
    
    # Performance metrics
    print(f"\nPERFORMANCE METRICS:")
    print(f"  Average test suite duration: {total_duration/total_tests:.2f}s")
    fastest = min(test_results, key=lambda x: x['duration'])
    slowest = max(test_results, key=lambda x: x['duration'])
    print(f"  Fastest suite: {fastest['name']} ({fastest['duration']:.2f}s)")
    print(f"  Slowest suite: {slowest['name']} ({slowest['duration']:.2f}s)")
    
    # Exit with appropriate code
    exit_code = 0 if successful_tests == total_tests else 1
    print(f"\nExiting with code: {exit_code}")
    sys.exit(exit_code)


if __name__ == "__main__":
    main()