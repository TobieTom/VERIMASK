from django.contrib import admin
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

app_name = 'blockchain'

urlpatterns = [
    # Document-related endpoints
    path('documents/upload/', views.DocumentUploadView.as_view(), name='document-upload'),
    path('documents/<int:document_id>/verify/', views.DocumentVerificationView.as_view(), name='document-verify'),
    path('documents/<int:document_id>/', views.DocumentDetailView.as_view(), name='document-detail'),
    path('documents/', views.UserDocumentsView.as_view(), name='user-documents'),
    path('documents/search/', views.DocumentSearchView.as_view(), name='document-search'),
    path('documents/pending/', views.PendingDocumentsView.as_view(), name='pending-documents'),
    path('documents/history/', views.VerificationHistoryView.as_view(), name='verification-history'),
    
    # Auth-related endpoints
    path('auth/register/', views.UserRegistrationView.as_view(), name='register'),
    path('auth/wallet/', views.WalletAuthView.as_view(), name='wallet-auth'),
    path('auth/token/', views.CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/status/', views.AuthStatusView.as_view(), name='auth-status'),
    
    # Profile-related endpoints
    path('profile/update/', views.ProfileUpdateView.as_view(), name='profile-update'),

    # Other authentication-related endpoints
    path('verify-signature/', views.VerifySignatureView.as_view(), name='verify-signature'),
]