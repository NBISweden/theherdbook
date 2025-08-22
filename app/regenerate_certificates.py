#!/usr/bin/env python3
"""
Script to regenerate all certificates for individuals that have digital certificates
in the database but lost their S3 files due to bucket deletion.

This script will:
1. Find all individuals with digital_certificate numbers in the database
2. Generate new certificates for each one
3. Upload them to S3
4. Log the process
"""

import sys
import os
import logging
import argparse
from datetime import datetime

# Add the current directory to the Python path
sys.path.insert(0, os.path.dirname(__file__))

import utils.database as db
import utils.data_access as da
import utils.settings as settings
from utils.cert_acess import (
    get_certificate,
    get_certificate_data,
    sign_data,
    upload_certificate,
    check_certificate_s3
)

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'{settings.service.logfolder}/certificate_regeneration.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

def get_individuals_with_digital_certificates():
    """
    Get all individuals that have digital certificates in the database.
    """
    print("  Executing database query...")
    try:
        # Query for individuals with digital certificates
        print("  Building query...")
        individuals = (
            db.Individual
            .select()
            .where(db.Individual.digital_certificate.is_null(False))
            .order_by(db.Individual.number)
        )
        
        print("  Converting to list...")
        individuals_list = list(individuals)
        print(f"  Found {len(individuals_list)} individuals with digital certificates")
        
        logger.info(f"Found {len(individuals_list)} individuals with digital certificates")
        return individuals_list
    except Exception as e:
        print(f"  Error querying individuals: {e}")
        logger.error(f"Error querying individuals: {e}")
        return []

def get_herd_owners(herd_id):
    """
    Get all users who are owners of a specific herd.
    Returns a list of User objects.
    """
    try:
        owners = []
        for user in db.User.select():
            for privilege in user.privileges:
                if privilege.get("level") == "owner" and privilege.get("herd") == herd_id:
                    owners.append(user)
                    break
        return owners
    except Exception as e:
        logger.error(f"Error getting herd owners for herd {herd_id}: {e}")
        return []

def select_user_for_herd(herd_id, herd_name):
    """
    Find the appropriate user for a herd. If multiple owners exist, prompt for selection.
    """
    owners = get_herd_owners(herd_id)
    
    if not owners:
        logger.warning(f"No owners found for herd {herd_id} ({herd_name})")
        # Try to get the first available user as fallback
        try:
            first_user = db.User.select().first()
            if first_user:
                logger.info(f"Using fallback user: {first_user.fullname or first_user.username}")
                return first_user
        except Exception as e:
            logger.error(f"Error getting fallback user: {e}")
        return None
    
    if len(owners) == 1:
        owner = owners[0]
        logger.info(f"Using single owner for herd {herd_id}: {owner.fullname or owner.username}")
        return owner
    
    # Multiple owners - prompt for selection
    print(f"\nMultiple owners found for herd {herd_id} ({herd_name}):")
    for i, owner in enumerate(owners, 1):
        display_name = owner.fullname or owner.username or owner.email
        print(f"  {i}. {display_name} ({owner.email})")
    
    while True:
        try:
            choice = input(f"Select owner (1-{len(owners)}): ").strip()
            choice_num = int(choice)
            if 1 <= choice_num <= len(owners):
                selected_owner = owners[choice_num - 1]
                display_name = selected_owner.fullname or selected_owner.username or selected_owner.email
                logger.info(f"Selected owner for herd {herd_id}: {display_name}")
                return selected_owner
            else:
                print(f"Please enter a number between 1 and {len(owners)}")
        except ValueError:
            print("Please enter a valid number")
        except KeyboardInterrupt:
            print("\nOperation cancelled by user")
            return None

def regenerate_certificate(individual, user):
    """
    Regenerate certificate for a single individual.
    """
    try:
        logger.info(f"Processing individual {individual.number} (certificate {individual.digital_certificate})")
        
        # Check if certificate already exists in S3
        try:
            exists = check_certificate_s3(ind_number=individual.number)
            if exists:
                logger.info(f"Certificate for {individual.number} already exists in S3, skipping")
                return True
        except Exception as e:
            # If check fails, assume it doesn't exist and continue
            logger.debug(f"Certificate check failed for {individual.number}: {e}")
        
        # Get individual data as dictionary
        ind_data = individual.as_dict()
        
        # Get certificate data using the user's UUID
        cert_data = get_certificate_data(ind_data, user.uuid)
        
        # Generate certificate
        pdf_bytes = get_certificate(cert_data)
        
        # Sign the certificate
        signed_data = sign_data(pdf_bytes)
        
        # Upload to S3
        uploaded = upload_certificate(
            pdf_bytes=signed_data.getvalue(),
            ind_number=individual.number
        )
        
        if uploaded:
            logger.info(f"Successfully regenerated certificate for {individual.number}")
            return True
        else:
            logger.error(f"Failed to upload certificate for {individual.number}")
            return False
            
    except Exception as e:
        logger.error(f"Error regenerating certificate for {individual.number}: {e}")
        return False

def main():
    """
    Main function to regenerate all certificates.
    """
    print("=== Starting certificate regeneration process ===")
    
    # Parse command line arguments
    print("Parsing command line arguments...")
    parser = argparse.ArgumentParser(description='Regenerate certificates for individuals with digital certificates')
    parser.add_argument('--limit', type=int, help='Limit the number of individuals to process (for testing)')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be done without actually doing it')
    args = parser.parse_args()
    
    print(f"Arguments: limit={args.limit}, dry_run={args.dry_run}")
    logger.info("Starting certificate regeneration process")
    if args.limit:
        logger.info(f"Limiting to {args.limit} individuals for testing")
    if args.dry_run:
        logger.info("DRY RUN MODE - No certificates will be generated or uploaded")
    
    # Initialize database connection
    print("Connecting to database...")
    try:
        db.connect()
        print("✓ Database connected successfully")
        logger.info("Database connection established")
    except Exception as e:
        print(f"✗ Database connection failed: {e}")
        logger.error(f"Failed to initialize database: {e}")
        return 1
    
    # Get all individuals with digital certificates
    print("Getting individuals with digital certificates...")
    individuals = get_individuals_with_digital_certificates()
    
    if not individuals:
        print("No individuals with digital certificates found")
        logger.warning("No individuals with digital certificates found")
        return 0
    
    # Apply limit if specified
    if args.limit and args.limit > 0:
        individuals = individuals[:args.limit]
        logger.info(f"Limited to first {len(individuals)} individuals")
    
    # Process each individual
    success_count = 0
    failure_count = 0
    processed_herds = {}  # Cache for herd owners to avoid repeated prompts
    
    for i, individual in enumerate(individuals, 1):
        logger.info(f"Processing {i}/{len(individuals)}: {individual.number}")
        
        # Get the origin herd for this individual
        origin_herd = individual.origin_herd
        herd_id = origin_herd.id
        herd_name = origin_herd.herd_name or origin_herd.herd
        
        # Get or select user for this herd
        if herd_id not in processed_herds:
            user = select_user_for_herd(herd_id, herd_name)
            if user is None:
                logger.error(f"Could not determine user for herd {herd_id}, skipping individual {individual.number}")
                failure_count += 1
                continue
            processed_herds[herd_id] = user
        else:
            user = processed_herds[herd_id]
        
        if args.dry_run:
            logger.info(f"DRY RUN: Would regenerate certificate for {individual.number} using user {user.fullname or user.username}")
            success_count += 1
        else:
            if regenerate_certificate(individual, user):
                success_count += 1
            else:
                failure_count += 1
    
    logger.info(f"Certificate regeneration completed:")
    logger.info(f"  Total individuals: {len(individuals)}")
    logger.info(f"  Successful: {success_count}")
    logger.info(f"  Failed: {failure_count}")
    
    if args.dry_run:
        logger.info("DRY RUN COMPLETED - No actual changes were made")
        return 0
    
    if failure_count > 0:
        logger.warning(f"{failure_count} certificates failed to regenerate")
        return 1
    
    logger.info("All certificates regenerated successfully")
    return 0

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code) 