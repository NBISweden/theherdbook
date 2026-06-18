#!/usr/bin/env python3
"""
Debug script to check origin herd vs current herd for a specific rabbit.
"""

import sys
import os

# Change to the code directory where utils is located
os.chdir('/code')

import utils.database as db

def debug_herd_check():
    print("=== Herd Check Debug ===")
    
    # Connect to database
    db.connect()
    
    # Find the specific rabbit
    rabbit_number = "G1055-2415"
    print(f"Looking for rabbit: {rabbit_number}")
    
    try:
        individual = db.Individual.get(db.Individual.number == rabbit_number)
        print(f"✓ Found rabbit: {individual.number}")
        
        # Check origin herd
        origin_herd = individual.origin_herd
        print(f"Origin herd ID: {origin_herd.id}")
        print(f"Origin herd name: {origin_herd.herd}")
        print(f"Origin herd full name: {origin_herd.herd_name}")
        
        # Check current herd (from the property)
        current_herd = individual.current_herd
        print(f"Current herd ID: {current_herd.id}")
        print(f"Current herd name: {current_herd.herd}")
        print(f"Current herd full name: {current_herd.herd_name}")
        
        # Check if they're different
        if origin_herd.id != current_herd.id:
            print("⚠️  WARNING: Origin herd and current herd are different!")
            print(f"   Origin: {origin_herd.herd} (ID: {origin_herd.id})")
            print(f"   Current: {current_herd.herd} (ID: {current_herd.id})")
        else:
            print("✓ Origin herd and current herd are the same")
            
        # Check herd tracking
        print("\nHerd tracking history:")
        tracking = db.HerdTracking.select().where(db.HerdTracking.individual == individual.id).order_by(db.HerdTracking.herd_tracking_date.desc())
        for track in tracking:
            print(f"  {track.herd_tracking_date}: {track.herd.herd} (ID: {track.herd.id})")
            
    except db.DoesNotExist:
        print(f"✗ Rabbit {rabbit_number} not found")
    except Exception as e:
        print(f"✗ Error: {e}")

if __name__ == "__main__":
    debug_herd_check()
