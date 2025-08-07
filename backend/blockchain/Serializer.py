from rest_framework import serializers
from .models import UserProfile, Document, VerificationRecord
import re

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['wallet_address', 'phone_number', 'registration_number', 'is_institution']
        read_only_fields = ['is_institution']

class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = [
            'user', 'ipfs_hash', 'document_type', 'file_name', 'file_size',
            'status', 'upload_date', 'verified_by', 'verification_date', 'notes',
            'blockchain_index', 'blockchain_tx_hash'
        ]
        read_only_fields = [
            'user', 'ipfs_hash', 'file_name', 'file_size', 'upload_date',
            'verified_by', 'verification_date', 'blockchain_index', 'blockchain_tx_hash'
        ]

    def validate_ipfs_hash(self, value):
        if not re.match(r'^Qm[1-9A-Za-z]{44}$', value):
            raise serializers.ValidationError("Invalid IPFS hash format.")
        return value

    def validate_document_type(self, value):
        if value not in dict(Document.DOCUMENT_TYPES).keys():
            raise serializers.ValidationError("Invalid document type.")
        return value

class VerificationRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = VerificationRecord
        fields = [
            'document', 'verifier', 'verification_timestamp',
            'status_change', 'notes', 'transaction_hash'
        ]
        read_only_fields = ['verification_timestamp']