from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinLengthValidator, RegexValidator
import uuid

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    wallet_address = models.CharField(
        max_length=42,
        validators=[
            MinLengthValidator(42),
            RegexValidator(regex='^0x[a-fA-F0-9]{40}$', message='Invalid Ethereum address')
        ]
    )
    is_institution = models.BooleanField(default=False)
    registration_number = models.CharField(max_length=100, blank=True)
    phone_number = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    verification_status = models.CharField(
        max_length=20,
        choices=[('Pending', 'Pending'), ('Approved', 'Approved'), ('Rejected', 'Rejected')],
        default='Pending'
    )

    def __str__(self):
        return self.user.username

class Document(models.Model):
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Verified', 'Verified'),
        ('Rejected', 'Rejected'),
    ]
    
    DOCUMENT_TYPES = [
        ('passport', 'Passport'),
        ('drivers_license', 'Driver\'s License'),
        ('national_id', 'National ID'),
        ('utility_bill', 'Utility Bill'),
        ('bank_statement', 'Bank Statement'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='documents')
    ipfs_hash = models.CharField(max_length=100)
    document_type = models.CharField(max_length=50, choices=DOCUMENT_TYPES)
    file_name = models.CharField(max_length=255)
    file_size = models.BigIntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    upload_date = models.DateTimeField(auto_now_add=True)
    verified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='verified_documents')
    verification_date = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    blockchain_index = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)  # Use UUID instead of Integer
    blockchain_tx_hash = models.CharField(max_length=100, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['user']),
            models.Index(fields=['upload_date']),
        ]

    def __str__(self):
        return f"{self.file_name} ({self.document_type})"
    
class VerificationRecord(models.Model):
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name='verification_records')
    verifier = models.ForeignKey(User, on_delete=models.CASCADE, related_name='verification_activities')
    verification_timestamp = models.DateTimeField(auto_now_add=True)
    status_change = models.CharField(max_length=20, choices=Document.STATUS_CHOICES)
    notes = models.TextField(blank=True)
    transaction_hash = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return f"Verification of {self.document.file_name} by {self.verifier.username}"
