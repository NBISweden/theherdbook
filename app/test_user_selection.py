#!/usr/bin/env python3
"""
Test script to verify user selection logic for certificate regeneration.
This script can be run to test the user selection without actually regenerating certificates.
"""

import sys
import os
import argparse

# Change to the code directory where utils is located (files are copied from /api_src to /code)
os.chdir('/code')

import utils.database as db
from regenerate_certificates import get_individuals_with_digital_certificates, select_user_for_herd

def test_user_selection():
    """
    Test the user selection logic for certificate regeneration.
    """
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Test user selection logic for certificate regeneration')
    parser.add_argument('--limit', type=int, help='Limit the number of individuals to test (for testing)')
    args = parser.parse_args()
    
    print("Testing user selection logic for certificate regeneration...")
    if args.limit:
        print(f"Limiting to {args.limit} individuals for testing")
    
    # Initialize database connection
    try:
        db.connect()
        print("✓ Database connection established")
    except Exception as e:
        print(f"✗ Failed to initialize database: {e}")
        return 1
    
    # Get all individuals with digital certificates
    individuals = get_individuals_with_digital_certificates()
    
    if not individuals:
        print("✗ No individuals with digital certificates found")
        return 0
    
    print(f"✓ Found {len(individuals)} individuals with digital certificates")
    
    # Apply limit if specified
    if args.limit and args.limit > 0:
        individuals = individuals[:args.limit]
        print(f"Limited to first {len(individuals)} individuals")
    
    # Test user selection for each unique herd
    processed_herds = set()
    
    for individual in individuals:
        origin_herd = individual.origin_herd
        herd_id = origin_herd.id
        herd_name = origin_herd.herd_name or origin_herd.herd
        
        if herd_id not in processed_herds:
            print(f"\nTesting herd {herd_id} ({herd_name}):")
            user = select_user_for_herd(herd_id, herd_name)
            if user:
                display_name = user.fullname or user.username or user.email
                print(f"  ✓ Selected user: {display_name} ({user.email})")
            else:
                print(f"  ✗ No user found for herd {herd_id}")
            processed_herds.add(herd_id)
    
    print(f"\n✓ Test completed. Processed {len(processed_herds)} unique herds.")
    return 0

if __name__ == "__main__":
    exit_code = test_user_selection()
    sys.exit(exit_code)
