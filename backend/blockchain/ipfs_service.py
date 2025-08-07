import requests
import logging

# Set up logging
logger = logging.getLogger(__name__)

# Hardcoded Pinata credentials
PINATA_API_KEY = "7f1130570d910c888589"
PINATA_API_SECRET = "7f4818ad1a5b881ccfce062651c2e27643315160c29cd6798b09572433abc960"
PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs/'

class IPFSService:
    @staticmethod
    def upload_file(file):
        url = "https://api.pinata.cloud/pinning/pinFileToIPFS"
        
        headers = {
            'pinata_api_key': PINATA_API_KEY,
            'pinata_secret_api_key': PINATA_API_SECRET
        }
        
        logger.info(f"Uploading file to Pinata: {file.name}")
        
        # For file-like objects from Django, reset to beginning
        if hasattr(file, 'seek') and callable(file.seek):
            file.seek(0)
        
        files = {'file': file}
        
        try:
            response = requests.post(url, files=files, headers=headers)
            
            if response.status_code != 200:
                logger.error(f"Pinata API error: {response.text}")
                raise Exception(f"Failed to upload to Pinata: {response.text}")
            
            result = response.json()
            logger.info(f"Successfully uploaded to IPFS with hash: {result.get('IpfsHash')}")
            
            return result['IpfsHash']
        except Exception as e:
            logger.error(f"IPFS upload failed: {str(e)}")
            raise
    
    @staticmethod
    def get_file_url(ipfs_hash):
        if not ipfs_hash:
            return None
        return f"{PINATA_GATEWAY}{ipfs_hash}"