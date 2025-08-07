from web3 import Web3
from celery import shared_task
from .models import Document, User
from .blockchain_utils import get_contract
from celery.exceptions import Retry
import time

@shared_task(bind=True, max_retries=3)
def listen_for_events(self):
    web3 = Web3(Web3.HTTPProvider('http://localhost:8545'))
    contract = get_contract()
    
    event_filter = contract.events.DocumentUploaded.create_filter(fromBlock='latest')
    
    while True:
        try:
            for event in event_filter.get_new_entries():
                handle_document_uploaded(event)
            time.sleep(10)  # Poll every 10 seconds
        except Exception as e:
            self.retry(exc=e, countdown=60)  # Retry after 60 seconds

def handle_document_uploaded(event):
    user_address = event['args']['user']
    ipfs_hash = event['args']['ipfsHash']
    document_type = event['args']['documentType']
    
    # Update database
    user = User.objects.get(profile__wallet_address=user_address)
    Document.objects.create(
        user=user,
        ipfs_hash=ipfs_hash,
        document_type=document_type,
        status='Pending'
    )