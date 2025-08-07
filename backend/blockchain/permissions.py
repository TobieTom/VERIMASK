from rest_framework.permissions import BasePermission

class IsInstitution(BasePermission):
    def has_permission(self, request, view):
        return request.user.profile.is_institution and request.user.is_active

class IsClient(BasePermission):
    def has_permission(self, request, view):
        return not request.user.profile.is_institution and request.user.is_active